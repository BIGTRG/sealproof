/**
 * Payout Routes
 *
 * GET /payouts/mine     Payout history for the current notary
 * GET /payouts/summary  Earnings summary (today / week / month)
 *
 * TODO: resolve notary from Clerk-authenticated user once production
 * auth is wired. Until then, falls back to the first active notary.
 */
const router = require('express').Router();
const { db } = require('@sealproof/shared');

async function currentNotaryId() {
  const r = await db.query(
    'SELECT id FROM notaries WHERE is_active = true ORDER BY created_at ASC LIMIT 1'
  );
  return r.rows[0] ? r.rows[0].id : null;
}

router.get('/mine', async (req, res, next) => {
  try {
    const nid = await currentNotaryId();
    if (!nid) return res.json([]);
    const r = await db.query(
      `SELECT id, amount_cents, status, created_at
       FROM payment_transactions
       WHERE notary_id = $1 AND type = 'payout'
       ORDER BY created_at DESC LIMIT 50`,
      [nid]
    );
    res.json(r.rows.map((p) => ({
      id: p.id,
      amount: p.amount_cents / 100,
      status: p.status === 'succeeded' ? 'paid' : p.status,
      paidAt: p.created_at,
    })));
  } catch (err) { next(err); }
});

router.get('/summary', async (req, res, next) => {
  try {
    const nid = await currentNotaryId();
    if (!nid) {
      return res.json({ today: 0, sessionsToday: 0, thisWeek: 0, sessionsThisWeek: 0, thisMonth: 0, sessionsThisMonth: 0 });
    }
    const r = await db.query(
      `SELECT
        COALESCE(SUM(notary_payout_cents) FILTER (WHERE completed_at::date = CURRENT_DATE), 0) AS today_c,
        COUNT(*) FILTER (WHERE completed_at::date = CURRENT_DATE) AS today_n,
        COALESCE(SUM(notary_payout_cents) FILTER (WHERE completed_at >= date_trunc('week', now())), 0) AS week_c,
        COUNT(*) FILTER (WHERE completed_at >= date_trunc('week', now())) AS week_n,
        COALESCE(SUM(notary_payout_cents) FILTER (WHERE completed_at >= date_trunc('month', now())), 0) AS month_c,
        COUNT(*) FILTER (WHERE completed_at >= date_trunc('month', now())) AS month_n
       FROM notarization_sessions
       WHERE notary_id = $1 AND status = 'completed'`,
      [nid]
    );
    const s = r.rows[0];
    res.json({
      today: s.today_c / 100,
      sessionsToday: Number(s.today_n),
      thisWeek: s.week_c / 100,
      sessionsThisWeek: Number(s.week_n),
      thisMonth: s.month_c / 100,
      sessionsThisMonth: Number(s.month_n),
    });
  } catch (err) { next(err); }
});

module.exports = router;
