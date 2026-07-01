const router = require('express').Router();
const { db } = require('@sealproof/shared');

router.get('/', async (_req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ status: 'healthy', service: 'session-orchestrator-svc', timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(503).json({ status: 'unhealthy', error: err.message });
  }
});

module.exports = router;
