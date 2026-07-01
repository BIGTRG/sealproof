const router = require('express').Router();

router.get('/', async (_req, res) => {
  res.json({ status: 'healthy', service: 'esign-bridge-svc', timestamp: new Date().toISOString() });
});

module.exports = router;
