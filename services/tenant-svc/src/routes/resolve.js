/**
 * Tenant resolution routes
 * Called by frontend apps and other services to get tenant branding
 */
const router = require('express').Router();
const Tenant = require('../models/tenant');
const { logger } = require('@sealproof/shared');

/**
 * GET /api/resolve/domain/:domain
 * Resolve tenant by domain — called by frontends on page load
 * Returns public branding payload (no secrets)
 */
router.get('/domain/:domain', async (req, res, next) => {
  try {
    const tenant = await Tenant.resolveByDomain(req.params.domain);
    if (!tenant) {
      return res.status(404).json({ error: 'Unknown domain' });
    }
    if (tenant.status !== 'active') {
      return res.status(403).json({ error: 'Tenant is not active' });
    }
    res.json({ tenant: Tenant.toBrandingPayload(tenant) });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/resolve/slug/:slug
 * Resolve tenant by slug — used for admin references
 */
router.get('/slug/:slug', async (req, res, next) => {
  try {
    const tenant = await Tenant.resolveBySlug(req.params.slug);
    if (!tenant) {
      return res.status(404).json({ error: 'Unknown tenant' });
    }
    res.json({ tenant: Tenant.toBrandingPayload(tenant) });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/resolve/id/:id
 * Resolve tenant by UUID — used internally by other services
 */
router.get('/id/:id', async (req, res, next) => {
  try {
    const tenant = await Tenant.resolveById(req.params.id);
    if (!tenant) {
      return res.status(404).json({ error: 'Unknown tenant' });
    }
    // Internal callers get full record (includes pricing, flags)
    res.json({ tenant });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
