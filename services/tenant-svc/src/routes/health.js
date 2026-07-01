const router = require('express').Router();
router.get('/', (_req, res) => res.json({ service: 'tenant-svc', status: 'ok' }));
module.exports = router;
