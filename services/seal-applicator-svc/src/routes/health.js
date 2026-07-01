const router = require('express').Router();

router.get('/', async (_req, res) => {
  res.json({ status: 'healthy', service: 'seal-applicator-svc', timestamp: new Date().toISOString() });
});

module.exports = router;
