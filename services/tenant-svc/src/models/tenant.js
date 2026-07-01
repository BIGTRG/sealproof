/**
 * Tenant data-access layer
 * Handles CRUD and caching for tenant records
 */
const { pool, redis } = require('@sealproof/shared');

const CACHE_TTL = 300; // 5 minutes
const CACHE_PREFIX = 'tenant:';

/**
 * Resolve tenant by domain — first checks Redis cache, then DB
 */
async function resolveByDomain(domain) {
  const cacheKey = `${CACHE_PREFIX}domain:${domain}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const { rows } = await pool.query(
    `SELECT t.* FROM tenants t
     WHERE t.domain = $1
        OR t.notary_domain = $1
        OR t.admin_domain = $1
        OR t.api_domain = $1
        OR EXISTS (SELECT 1 FROM tenant_domains td WHERE td.domain = $1 AND td.tenant_id = t.id AND td.verified = TRUE)
     LIMIT 1`,
    [domain]
  );

  if (rows.length === 0) return null;

  const tenant = rows[0];
  await redis.set(cacheKey, JSON.stringify(tenant), 'EX', CACHE_TTL);
  return tenant;
}

/**
 * Resolve tenant by slug
 */
async function resolveBySlug(slug) {
  const cacheKey = `${CACHE_PREFIX}slug:${slug}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const { rows } = await pool.query('SELECT * FROM tenants WHERE slug = $1', [slug]);
  if (rows.length === 0) return null;

  const tenant = rows[0];
  await redis.set(cacheKey, JSON.stringify(tenant), 'EX', CACHE_TTL);
  return tenant;
}

/**
 * Resolve tenant by ID
 */
async function resolveById(id) {
  const cacheKey = `${CACHE_PREFIX}id:${id}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const { rows } = await pool.query('SELECT * FROM tenants WHERE id = $1', [id]);
  if (rows.length === 0) return null;

  const tenant = rows[0];
  await redis.set(cacheKey, JSON.stringify(tenant), 'EX', CACHE_TTL);
  return tenant;
}

/**
 * Get the public branding object (safe to send to frontend)
 */
function toBrandingPayload(tenant) {
  if (!tenant) return null;
  return {
    slug:            tenant.slug,
    companyName:     tenant.company_name,
    domain:          tenant.domain,
    logoUrl:         tenant.logo_url,
    faviconUrl:      tenant.favicon_url,
    primaryColor:    tenant.primary_color,
    secondaryColor:  tenant.secondary_color,
    accentColor:     tenant.accent_color,
    supportEmail:    tenant.support_email,
    supportPhone:    tenant.support_phone,
    legalEntity:     tenant.legal_entity,
    termsUrl:        tenant.terms_url,
    privacyUrl:      tenant.privacy_url,
    enableB2c:       tenant.enable_b2c,
    enableB2b:       tenant.enable_b2b,
    enableRush:      tenant.enable_rush,
    b2cStandardPriceCents: tenant.b2c_standard_price_cents,
    b2cRushPriceCents:     tenant.b2c_rush_price_cents,
  };
}

/**
 * Create a new tenant
 */
async function create(data) {
  const { rows } = await pool.query(
    `INSERT INTO tenants (
      slug, company_name, domain,
      logo_url, favicon_url, primary_color, secondary_color, accent_color,
      support_email, support_phone, legal_entity, terms_url, privacy_url,
      notary_domain, admin_domain, api_domain,
      email_from_name, email_from_addr,
      b2c_standard_price_cents, b2c_rush_price_cents, notary_payout_cents,
      enable_b2c, enable_b2b, enable_api, enable_rush,
      status
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26
    ) RETURNING *`,
    [
      data.slug, data.companyName, data.domain,
      data.logoUrl, data.faviconUrl, data.primaryColor || '#1a1a2e',
      data.secondaryColor || '#16213e', data.accentColor || '#0f3460',
      data.supportEmail, data.supportPhone, data.legalEntity,
      data.termsUrl, data.privacyUrl,
      data.notaryDomain, data.adminDomain, data.apiDomain,
      data.emailFromName || data.companyName, data.emailFromAddr,
      data.b2cStandardPriceCents || 2500, data.b2cRushPriceCents || 4500,
      data.notaryPayoutCents,
      data.enableB2c !== false, data.enableB2b !== false,
      data.enableApi !== false, data.enableRush !== false,
      'onboarding'
    ]
  );
  return rows[0];
}

/**
 * Update a tenant
 */
async function update(id, data) {
  const fields = [];
  const values = [];
  let idx = 1;

  const allowedFields = [
    'company_name', 'domain', 'logo_url', 'favicon_url',
    'primary_color', 'secondary_color', 'accent_color',
    'support_email', 'support_phone', 'legal_entity', 'terms_url', 'privacy_url',
    'notary_domain', 'admin_domain', 'api_domain',
    'email_from_name', 'email_from_addr', 'email_header_logo',
    'b2c_standard_price_cents', 'b2c_rush_price_cents', 'notary_payout_cents',
    'enable_b2c', 'enable_b2b', 'enable_api', 'enable_rush', 'status'
  ];

  for (const field of allowedFields) {
    // Convert camelCase keys to snake_case for matching
    const camelKey = field.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    if (data[camelKey] !== undefined) {
      fields.push(`${field} = $${idx}`);
      values.push(data[camelKey]);
      idx++;
    }
  }

  if (fields.length === 0) return resolveById(id);

  fields.push(`updated_at = NOW()`);
  values.push(id);

  const { rows } = await pool.query(
    `UPDATE tenants SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  );

  // Invalidate cache
  if (rows[0]) {
    await redis.del(`${CACHE_PREFIX}id:${id}`);
    await redis.del(`${CACHE_PREFIX}slug:${rows[0].slug}`);
    await redis.del(`${CACHE_PREFIX}domain:${rows[0].domain}`);
  }

  return rows[0] || null;
}

/**
 * List all tenants (admin use)
 */
async function list({ status, limit = 50, offset = 0 } = {}) {
  let query = 'SELECT * FROM tenants';
  const params = [];
  if (status) {
    query += ' WHERE status = $1';
    params.push(status);
  }
  query += ` ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
  const { rows } = await pool.query(query, params);
  return rows;
}

module.exports = {
  resolveByDomain,
  resolveBySlug,
  resolveById,
  toBrandingPayload,
  create,
  update,
  list,
};
