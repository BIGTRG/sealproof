/**
 * Seal Generator — Dynamic Multi-State Digital Notary Seal
 *
 * Generates the seal appearance based on the notary's commissioning state rules.
 * Falls back to NC defaults (NCGS 10B-72) when no state rules are configured.
 *
 * Seal contents are driven by state_ron_rules:
 *   - seal_state_header   (e.g. "STATE OF NORTH CAROLINA", "COMMONWEALTH OF VIRGINIA")
 *   - seal_state_label    (e.g. "REMOTE ELECTRONIC NOTARY PUBLIC")
 *   - seal_statute_reference (e.g. "NCGS 10B-72", "VA Code § 47.1-2")
 *   - seal_fields_required (which fields must appear on the seal)
 */
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const crypto = require('crypto');

// NC defaults (used when state rules are not loaded)
const DEFAULT_STATE_HEADER = 'STATE OF NORTH CAROLINA';
const DEFAULT_STATE_LABEL = 'REMOTE ELECTRONIC NOTARY PUBLIC';
const DEFAULT_STATUTE_REF = 'NCGS 10B-72';

/**
 * Apply notary seal to a PDF document.
 *
 * @param {Buffer} pdfBuffer     Original document PDF
 * @param {object} sealData      Seal information
 * @param {string} sealData.notaryName
 * @param {string} sealData.commissionNumber
 * @param {string} sealData.commissionExpiry  (ISO date string)
 * @param {string} sealData.notarizationDate  (ISO datetime string)
 * @param {string} sealData.actType           e.g., 'acknowledgment', 'jurat'
 * @param {string} sealData.signerName
 * @param {string} sealData.sessionId
 * @param {string} sealData.stateCode         e.g., 'NC', 'VA', 'TX'
 * @param {string} sealData.county            notary's county (some states require this)
 * @param {object} stateRules    Optional state rules from state-compliance-svc
 * @returns {Buffer} Sealed PDF buffer
 */
async function applySeal(pdfBuffer, sealData, stateRules = null) {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // Resolve state-specific seal config
  const stateHeader = stateRules?.seal_state_header || DEFAULT_STATE_HEADER;
  const stateLabel = stateRules?.seal_state_label || DEFAULT_STATE_LABEL;
  const statuteRef = stateRules?.seal_statute_reference || DEFAULT_STATUTE_REF;

  // Add a new page for the seal (last page)
  const sealPage = pdfDoc.addPage([612, 792]); // Letter size

  const navy = rgb(0.05, 0.1, 0.3);
  const darkGray = rgb(0.2, 0.2, 0.2);
  const gold = rgb(0.7, 0.55, 0.15);

  // Seal border (rectangle)
  const sealX = 56;
  const sealY = 360;
  const sealWidth = 500;
  const sealHeight = 360;

  sealPage.drawRectangle({
    x: sealX,
    y: sealY,
    width: sealWidth,
    height: sealHeight,
    borderColor: navy,
    borderWidth: 3,
  });

  // Inner border
  sealPage.drawRectangle({
    x: sealX + 4,
    y: sealY + 4,
    width: sealWidth - 8,
    height: sealHeight - 8,
    borderColor: gold,
    borderWidth: 1,
  });

  let y = sealY + sealHeight - 35;

  // Header — dynamic per state
  const headerWidth = helveticaBold.widthOfTextAtSize(stateHeader, 14);
  sealPage.drawText(stateHeader, {
    x: sealX + (sealWidth - headerWidth) / 2,
    y,
    size: 14,
    font: helveticaBold,
    color: navy,
  });
  y -= 22;

  const labelWidth = helveticaBold.widthOfTextAtSize(stateLabel, 12);
  sealPage.drawText(stateLabel, {
    x: sealX + (sealWidth - labelWidth) / 2,
    y,
    size: 12,
    font: helveticaBold,
    color: navy,
  });
  y -= 30;

  // Horizontal rule
  sealPage.drawLine({
    start: { x: sealX + 20, y },
    end: { x: sealX + sealWidth - 20, y },
    thickness: 1,
    color: gold,
  });
  y -= 25;

  // Build lines dynamically based on state requirements
  const lines = buildSealLines(sealData, stateRules);

  for (const line of lines) {
    sealPage.drawText(line.label, {
      x: sealX + 30,
      y,
      size: 10,
      font: helveticaBold,
      color: darkGray,
    });
    sealPage.drawText(line.value, {
      x: sealX + 170,
      y,
      size: 10,
      font: helvetica,
      color: darkGray,
    });
    y -= 18;
  }

  y -= 10;

  // Horizontal rule
  sealPage.drawLine({
    start: { x: sealX + 20, y },
    end: { x: sealX + sealWidth - 20, y },
    thickness: 1,
    color: gold,
  });
  y -= 20;

  // Digital signature hash
  const docHash = computeDocumentHash(pdfBuffer, sealData);
  sealPage.drawText('Digital Signature:', {
    x: sealX + 30,
    y,
    size: 8,
    font: helveticaBold,
    color: darkGray,
  });
  y -= 14;
  sealPage.drawText(docHash, {
    x: sealX + 30,
    y,
    size: 7,
    font: helvetica,
    color: darkGray,
  });
  y -= 16;
  sealPage.drawText(`This document bears a tamper-evident digital seal per ${statuteRef}.`, {
    x: sealX + 30,
    y,
    size: 7,
    font: helvetica,
    color: darkGray,
  });

  // Title at top of seal page
  sealPage.drawText('NOTARY SEAL AND CERTIFICATE', {
    x: 170,
    y: 760,
    size: 16,
    font: helveticaBold,
    color: navy,
  });

  const sealedPdf = await pdfDoc.save();
  return Buffer.from(sealedPdf);
}

/**
 * Build the seal detail lines based on state rules.
 * Different states require different fields on the seal.
 */
function buildSealLines(sealData, stateRules) {
  const requiredFields = stateRules?.seal_fields_required || [
    'notary_name', 'commission_number', 'commission_expiry',
    'state', 'notarial_act_type', 'date_time',
  ];

  const allFields = {
    notary_name: { label: 'Notary:', value: sealData.notaryName },
    commission_number: { label: 'Commission #:', value: sealData.commissionNumber },
    commission_expiry: { label: 'Commission Expires:', value: formatDate(sealData.commissionExpiry) },
    state: { label: 'State:', value: getStateName(sealData.stateCode) },
    county: { label: 'County:', value: sealData.county || 'N/A' },
    notarial_act_type: { label: 'Notarial Act:', value: formatActType(sealData.actType) },
    signer_name: { label: 'Signer:', value: sealData.signerName },
    date_time: { label: 'Date & Time:', value: formatDateTime(sealData.notarizationDate) },
    session_id: { label: 'Session ID:', value: sealData.sessionId },
    fee_charged: { label: 'Fee Charged:', value: sealData.feeCents ? `$${(sealData.feeCents / 100).toFixed(2)}` : 'N/A' },
    id_method: { label: 'ID Verification:', value: sealData.idMethod || 'Credential Analysis + KBA' },
  };

  const lines = [];

  // Always include required fields first
  for (const field of requiredFields) {
    if (allFields[field]) {
      lines.push(allFields[field]);
    }
  }

  // Add signer and session ID if not already included (these are always useful)
  const includedLabels = new Set(lines.map(l => l.label));
  if (!includedLabels.has('Signer:') && sealData.signerName) {
    lines.push(allFields.signer_name);
  }
  if (!includedLabels.has('Session ID:') && sealData.sessionId) {
    lines.push(allFields.session_id);
  }

  return lines;
}

/**
 * Compute a tamper-evident hash over the document + seal data.
 */
function computeDocumentHash(pdfBuffer, sealData) {
  const payload = JSON.stringify({
    document_sha256: crypto.createHash('sha256').update(pdfBuffer).digest('hex'),
    notary: sealData.notaryName,
    commission: sealData.commissionNumber,
    state: sealData.stateCode || 'NC',
    session: sealData.sessionId,
    timestamp: sealData.notarizationDate,
  });
  return crypto.createHash('sha256').update(payload).digest('hex');
}

function formatDate(iso) {
  if (!iso) return 'N/A';
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatDateTime(iso) {
  if (!iso) return new Date().toISOString();
  return new Date(iso).toLocaleString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'short',
  });
}

function formatActType(type) {
  const map = {
    acknowledgment: 'Acknowledgment',
    jurat: 'Jurat (Verification on Oath or Affirmation)',
    copy_certification: 'Copy Certification',
    signature_witnessing: 'Signature Witnessing',
    oath_affirmation: 'Oath or Affirmation',
  };
  return map[type] || type || 'Acknowledgment';
}

function getStateName(code) {
  const states = {
    AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
    CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', DC: 'District of Columbia',
    FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois',
    IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana',
    ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota',
    MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada',
    NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York',
    NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon',
    PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota',
    TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia',
    WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
  };
  return states[code] || code || 'North Carolina';
}

module.exports = { applySeal, computeDocumentHash };
