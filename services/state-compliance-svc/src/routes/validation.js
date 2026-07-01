/**
 * Compliance Validation Routes
 *
 * POST   /api/compliance/validate-session    Check if a session can proceed
 * GET    /api/compliance/doc-types/:state    Get allowed doc types for a state
 * GET    /api/compliance/states-for-doc/:docType  Get states that allow a doc type
 */
const router = require('express').Router();
const { validate, logger } = require('@sealproof/shared');
const sessionValidator = require('../utils/sessionValidator');

// ---------------------------------------------------------------------------
// POST /api/compliance/validate-session
// ---------------------------------------------------------------------------
router.post('/validate-session',
  validate({
    body: {
      state_code: { required: true, type: 'string' },
    },
  }),
  async (req, res, next) => {
    try {
      const { state_code, document_type, signer_location } = req.body;
      const result = await sessionValidator.validateSession({
        stateCode: state_code,
        documentType: document_type,
        signerLocation: signer_location,
      });

      logger.info('Session validation', {
        stateCode: state_code,
        documentType: document_type,
        valid: result.valid,
        errorCount: result.errors.length,
      });

      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/compliance/doc-types/:stateCode
// ---------------------------------------------------------------------------
router.get('/doc-types/:stateCode', async (req, res, next) => {
  try {
    const allDocTypes = ['deed', 'poa', 'will', 'trust', 'affidavit', 'mortgage', 'healthcare_directive', 'other'];
    const results = [];

    for (const docType of allDocTypes) {
      const allowed = await sessionValidator.isDocTypeAllowed(req.params.stateCode, docType);
      results.push({ doc_type: docType, allowed });
    }

    res.json({ data: results, state_code: req.params.stateCode });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/compliance/states-for-doc/:docType
// ---------------------------------------------------------------------------
router.get('/states-for-doc/:docType', async (req, res, next) => {
  try {
    const states = await sessionValidator.getStatesForDocType(req.params.docType);
    res.json({ data: states, doc_type: req.params.docType, count: states.length });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
