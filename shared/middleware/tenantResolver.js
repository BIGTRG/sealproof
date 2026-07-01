/**
 * SealProof — Tenant Resolution Middleware
 * 
 * Resolves the current tenant from the request and attaches it to req.tenant.
 * Resolution order:
 *   1. X-Tenant-ID header (internal service-to-service calls)
 *   2. Origin/Host header domain lookup
 *   3. Falls back to default tenant (SealProof)
 *
 * Every downstream handler gets req.tenant with the full tenant record.
 * All DB queries for tenant-scoped data should include WHERE tenant_id = req.tenant.id
 */
const { pool, redis, logger } = require('../index');

const CACHE_TTL = 300;
const DEFAULT_SLUG = 'sealproof';

async function resolveTenantFromDomain(domain) {
  if (!domain) return null;

  // Strip port if present
  const cleanDomain = domain.split(':')[0].toLowerCase();

  const cacheKey = `tenant:domain:${cleanDomain}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const { rows } = await pool.query(
    `SELECT t.* FROM tenants t
     WHERE t.domain = $1
        OR t.notary_domain = $1
        OR t.admin_domain = $1
        OR t.api_domain = $1
        OR EXISTS (
          SELECT 1 FROM tenant_domains td
          WHERE td.domain = $1 AND td.tenant_id = t.id AND td.verified = TRUE
        )
     LIMIT 1`,
    [cleanDomain]
  );

  if (rows.length === 0) return null;
  await redis.set(cacheKey, JSON.stringify(rows[0]), 'EX', CACHE_TTL);
  return rows[0];
}

async function resolveTenantById(id) {
  const cacheKey = `tenant:id:${id}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const { rows } = await pool.query('SELECT * FROM tenants WHERE id = $1', [id]);
  if (rows.length === 0) return null;

  await redis.set(cacheKey, JSON.stringify(rows[0]), 'EX', CACHE_TTL);
  return rows[0];
}

async function getDefaultTenant() {
  const cacheKey = `tenant:slug:${DEFAULT_SLUG}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const { rows } = await pool.query('SELECT * FROM tenants WHERE slug = $1', [DEFAULT_SLUG]);
  if (rows.length === 0) {
    logger.error('Default tenant (sealproof) not found in database');
    return null;
  }

  await redis.set(cacheKey, JSON.stringify(rows[0]), 'EX', CACHE_TTL);
  return rows[0];
}

/**
 * Express middleware — attaches req.tenant
 */
function tenantResolver(opts = {}) {
  const { required = true } = opts;

  return async (req, res, next) => {
    try {
      let tenant = null;

      // 1. Check X-Tenant-ID header (service-to-service)
      const tenantId = req.headers['x-tenant-id'];
      if (tenantId) {
        tenant = await resolveTenantById(tenantId);
      }

      // 2. Check Host / Origin header
      if (!tenant) {
        const host = req.hostname || req.headers.host || req.headers.origin;
        if (host) {
          const domain = host.replace(/^https?:\/\//, '').split('/')[0];
          tenant = await resolveTenantFromDomain(domain);
        }
      }

      // 3. Fall back to default tenant
      if (!tenant) {
        tenant = await getDefaultTenant();
      }

      if (!tenant && required) {
        return res.status(400).json({ error: 'Could not resolve tenant' });
      }

      if (tenant && tenant.status === 'suspended') {
        return res.status(403).json({ error: 'This service is temporarily unavailable' });
      }

      req.tenant = tenant;
      req.tenantId = tenant ? tenant.id : null;
      next();
    } catch (err) {
      logger.error('Tenant resolution error', { error: err.message });
      next(err);
    }
  };
}

module.exports = tenantResolver;
