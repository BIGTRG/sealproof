/**
 * Tenant CRUD routes (admin only)
 * Create, update, list, and manage white-label tenants
 */
const router = require('express').Router();
const Tenant = require('../models/tenant');
const { logger, pool } = require('@sealproof/shared');

/**
 * GET /api/tenants
 * List all tenants (admin console)
 */
router.get('/', async (req, res, next) => {
  try {
    const { status, limit, offset } = req.query;
    const tenants = await Tenant.list({
      status,
      limit: parseInt(limit) || 50,
      offset: parseInt(offset) || 0,
    });
    res.json({ tenants, count: tenants.length });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/tenants/:id
 * Get single tenant by ID
 */
router.get('/:id', async (req, res, next) => {
  try {
    const tenant = await Tenant.resolveById(req.params.id);
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });
    res.json({ tenant });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/tenants
 * Create a new white-label tenant
 */
router.post('/', async (req, res, next) => {
  try {
    const { slug, companyName, domain } = req.body;
    if (!slug || !companyName || !domain) {
      return res.status(400).json({ error: 'slug, companyName, and domain are required' });
    }

    // Check for slug/domain conflicts
    const existing = await pool.query(
      'SELECT id FROM tenants WHERE slug = $1 OR domain = $2',
      [slug, domain]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Slug or domain already in use' });
    }

    const tenant = await Tenant.create(req.body);
    logger.info(`New tenant created: ${tenant.slug} (${tenant.domain})`);
    res.status(201).json({ tenant });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/tenants/:id
 * Update an existing tenant
 */
router.patch('/:id', async (req, res, next) => {
  try {
    const tenant = await Tenant.update(req.params.id, req.body);
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });
    logger.info(`Tenant updated: ${tenant.slug}`);
    res.json({ tenant });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/tenants/:id/activate
 * Move tenant from onboarding to active
 */
router.post('/:id/activate', async (req, res, next) => {
  try {
    const tenant = await Tenant.resolveById(req.params.id);
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

    // Validate minimum requirements before activation
    const missing = [];
    if (!tenant.logo_url) missing.push('logo_url');
    if (!tenant.support_email) missing.push('support_email');
    if (!tenant.legal_entity) missing.push('legal_entity');

    if (missing.length > 0) {
      return res.status(400).json({
        error: 'Missing required fields for activation',
        missing,
      });
    }

    const updated = await Tenant.update(req.params.id, { status: 'active' });
    logger.info(`Tenant activated: ${updated.slug}`);
    res.json({ tenant: updated });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/tenants/:id/suspend
 * Suspend a tenant (disables all access)
 */
router.post('/:id/suspend', async (req, res, next) => {
  try {
    const updated = await Tenant.update(req.params.id, { status: 'suspended' });
    if (!updated) return res.status(404).json({ error: 'Tenant not found' });
    logger.info(`Tenant suspended: ${updated.slug}`);
    res.json({ tenant: updated });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/tenants/:id/stats
 * Get session/revenue stats for a tenant
 */
router.get('/:id/stats', async (req, res, next) => {
  try {
    const { rows: [stats] } = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'completed') AS completed_sessions,
        COUNT(*) FILTER (WHERE status IN ('created','queued','matched','in_progress')) AS active_sessions,
        COUNT(DISTINCT customer_id) AS unique_customers,
        COUNT(DISTINCT notary_id) FILTER (WHERE notary_id IS NOT NULL) AS active_notaries
      FROM notarization_sessions
      WHERE tenant_id = $1
    `, [req.params.id]);

    const { rows: [revenue] } = await pool.query(`
      SELECT
        COALESCE(SUM(amount_cents), 0) AS total_revenue_cents,
        COUNT(*) AS total_transactions
      FROM payment_transactions
      WHERE tenant_id = $1 AND status = 'captured'
    `, [req.params.id]);

    res.json({ stats: { ...stats, ...revenue } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
