/**
 * IDology API Client
 *
 * Knowledge-Based Authentication via IDology's ExpectID IQ product.
 * Generates questions from credit history and public records.
 *
 * Flow:
 *   1. Submit signer PII -> get questions
 *   2. Submit answers -> get pass/fail result
 *   3. Optional challenge questions if initial fails
 *
 * Docs: https://www.idology.com/developer-docs/
 */
const axios = require('axios');
const { config, logger } = require('@sealproof/shared');

const idologyClient = axios.create({
  baseURL: config.idology?.baseUrl || 'https://web.idologylive.com/api',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  timeout: 30000,
});

/**
 * Start a KBA session — submit signer info, get questions back.
 *
 * @param {object} signer
 * @param {string} signer.firstName
 * @param {string} signer.lastName
 * @param {string} signer.address
 * @param {string} signer.city
 * @param {string} signer.state (2-letter code)
 * @param {string} signer.zip
 * @param {string} signer.ssn4 (last 4 digits of SSN, optional but improves quality)
 * @param {string} signer.dob  (YYYY-MM-DD)
 * @param {object} options
 * @param {number} options.questionCount — number of questions (default 5)
 * @returns {object} { sessionId, questions: [{ id, text, choices }], expiresAt }
 */
/**
 * Sandbox mode: KBA_MODE=sandbox, or IDology credentials missing. Presents a
 * fixed, clearly-labelled question set; the first choice of each question is
 * correct. Used to exercise the flow before production credentials land.
 */
function isSandbox() {
  if (process.env.KBA_MODE === 'sandbox') return true;
  if (process.env.KBA_MODE === 'live') return false;
  return !config.idology?.username || !config.idology?.password;
}

const SANDBOX_QUESTIONS = [
  { id: 'street', text: 'Which of the following streets have you previously lived on?', choices: ['Maple Avenue', 'Ridgecrest Drive', 'Harbor Lane', 'None of the above'] },
  { id: 'vehicle', text: 'Which vehicle have you owned or leased?', choices: ['Honda Accord', 'Ford F-150', 'Toyota Camry', 'None of the above'] },
  { id: 'county', text: 'In which county have you lived?', choices: ['Wake County', 'Mecklenburg County', 'Guilford County', 'None of the above'] },
  { id: 'lender', text: 'With which lender have you held a loan?', choices: ['Truist', 'Wells Fargo', 'Navy Federal', 'None of the above'] },
  { id: 'employer', text: 'Which of these has been an employer of yours?', choices: ['Carolina Health Partners', 'Blue Ridge Logistics', 'Piedmont Software', 'None of the above'] },
];

function sandboxStart() {
  const shuffle = (arr) => arr.map((v) => [Math.random(), v]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
  const questions = SANDBOX_QUESTIONS.map((q) => {
    const order = shuffle([0, 1, 2, 3]);
    return {
      id: q.id,
      text: q.text,
      choices: order.map((orig) => ({ id: `${orig + 1}`, text: q.choices[orig] })),
    };
  });
  return {
    sessionId: `sbx_kba_${Date.now().toString(36)}`,
    questions,
    questionCount: questions.length,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    mode: 'sandbox',
  };
}

function sandboxSubmit(answers, minCorrect) {
  const correctCount = answers.filter((a) => String(a.answerId) === '1').length;
  const passed = correctCount >= minCorrect;
  return { passed, correctCount, totalQuestions: SANDBOX_QUESTIONS.length, minRequired: minCorrect, details: { result: passed ? 'pass' : 'fail', challengeAvailable: false, mode: 'sandbox' } };
}

async function startSession(signer, options = {}) {
  if (isSandbox()) {
    logger.info('KBA sandbox session started', { signer: `${signer.firstName} ${signer.lastName}`.trim() });
    return sandboxStart();
  }
  try {
    const params = new URLSearchParams({
      username: config.idology?.username || '',
      password: config.idology?.password || '',
      firstName: signer.firstName,
      lastName: signer.lastName,
      address: signer.address || '',
      city: signer.city || '',
      state: signer.state || '',
      zip: signer.zip || '',
      ...(signer.ssn4 ? { ssnLast4: signer.ssn4 } : {}),
      ...(signer.dob ? { dob: formatDob(signer.dob) } : {}),
    });

    const response = await idologyClient.post('/idiq.svc', params);
    const data = parseXmlResponse(response.data);

    if (data.error) {
      logger.error('IDology session start failed', { error: data.error });
      throw Object.assign(new Error(`IDology error: ${data.error}`), { status: 502 });
    }

    const questions = extractQuestions(data);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h expiry

    return {
      sessionId: data.idNumber || data.transactionId,
      questions,
      questionCount: questions.length,
      expiresAt: expiresAt.toISOString(),
    };
  } catch (err) {
    if (err.status === 502) throw err;
    logger.error('IDology request failed', { error: err.message });
    throw Object.assign(new Error(`IDology API error: ${err.message}`), { status: 502 });
  }
}

/**
 * Submit answers to KBA questions.
 *
 * @param {string} sessionId — IDology session/transaction ID
 * @param {Array<{questionId: string, answerId: string}>} answers
 * @returns {object} { passed, correctCount, totalQuestions, details }
 */
async function submitAnswers(sessionId, answers, minCorrect = 4) {
  if (String(sessionId).startsWith('sbx_kba_')) return sandboxSubmit(answers, minCorrect);
  try {
    const params = new URLSearchParams({
      username: config.idology?.username || '',
      password: config.idology?.password || '',
      idNumber: sessionId,
    });

    // Add each answer
    answers.forEach((a, i) => {
      params.append(`question${i + 1}Type`, a.questionId);
      params.append(`question${i + 1}Answer`, a.answerId);
    });

    const response = await idologyClient.post('/idiq-answer.svc', params);
    const data = parseXmlResponse(response.data);

    if (data.error) {
      logger.error('IDology answer submission failed', { error: data.error, sessionId });
      throw Object.assign(new Error(`IDology error: ${data.error}`), { status: 502 });
    }

    const correctCount = parseInt(data.correctAnswers || '0');
    const totalQuestions = parseInt(data.totalQuestions || answers.length);
    const passed = correctCount >= minCorrect;

    return {
      passed,
      correctCount,
      totalQuestions,
      minRequired: minCorrect,
      details: {
        result: data.result || (passed ? 'pass' : 'fail'),
        challengeAvailable: data.challengeAvailable === 'true',
      },
    };
  } catch (err) {
    if (err.status === 502) throw err;
    logger.error('IDology answer request failed', { error: err.message, sessionId });
    throw Object.assign(new Error(`IDology API error: ${err.message}`), { status: 502 });
  }
}

/**
 * Parse IDology XML response into a flat object.
 * IDology returns XML; we parse the key fields we need.
 */
function parseXmlResponse(xmlString) {
  const result = {};
  const fieldPatterns = [
    'idNumber', 'transactionId', 'error', 'result',
    'correctAnswers', 'totalQuestions', 'challengeAvailable',
  ];

  for (const field of fieldPatterns) {
    const match = xmlString.match(new RegExp(`<${field}>([^<]*)</${field}>`));
    if (match) result[field] = match[1];
  }

  // Extract questions
  const questionBlocks = xmlString.match(/<question>[\s\S]*?<\/question>/g);
  if (questionBlocks) {
    result.questions = questionBlocks.map(block => {
      const type = block.match(/<type>([^<]*)<\/type>/)?.[1] || '';
      const prompt = block.match(/<prompt>([^<]*)<\/prompt>/)?.[1] || '';
      const choiceMatches = block.match(/<choice>([^<]*)<\/choice>/g) || [];
      const choices = choiceMatches.map(c => c.replace(/<\/?choice>/g, ''));
      return { type, prompt, choices };
    });
  }

  return result;
}

/**
 * Extract questions from parsed IDology response into our format.
 */
function extractQuestions(data) {
  if (!data.questions) return [];
  return data.questions.map((q, i) => ({
    id: q.type || `q${i + 1}`,
    text: q.prompt,
    choices: q.choices.map((c, j) => ({ id: `${j + 1}`, text: c })),
  }));
}

function formatDob(dob) {
  // Accept YYYY-MM-DD, return MM/DD/YYYY for IDology
  const parts = dob.split('-');
  if (parts.length === 3) return `${parts[1]}/${parts[2]}/${parts[0]}`;
  return dob;
}

module.exports = { startSession, submitAnswers, isSandbox };
