const router = require('express').Router();
router.get('/', (_req, res) => {
  res.json({ status: 'healthy', service: 'webhook-svc', timestamp: new Date().toISOString() });
});
module.exports = router;
