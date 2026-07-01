const router = require('express').Router();
router.get('/', (req, res) => res.json({ status: 'ok', service: 'state-compliance-svc' }));
module.exports = router;
