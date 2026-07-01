const router = require('express').Router();
router.get('/', (_req, res) => {
  res.json({ status: 'healthy', service: 'payment-svc', timestamp: new Date().toISOString() });
});
module.exports = router;
