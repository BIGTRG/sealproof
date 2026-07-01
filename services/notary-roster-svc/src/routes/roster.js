/**
 * Roster Routes — Who is on shift, who is available.
 *
 * GET /roster/available?state=NC     Currently-available notaries
 * GET /roster/active-shifts          All active shifts with notary info
 * GET /roster/coverage-map           Coverage gaps by state/time
 */
const router = require('express').Router();
const { db } = require('@sealproof/shared');
const Shift = require('../models/shift');
const Presence = require('../models/presence');

// ---------------------------------------------------------------------------
// GET /roster/available — Currently-available notaries
// Combines: active shift in DB + Redis presence with status=available
// + no active session (checked via notarization_sessions)
// ---------------------------------------------------------------------------
router.get('/available', async (req, res, next) => {
  try {
    const state = req.query.state || null;

    // 1. Get notaries who are present in Redis and available
    const presentNotaries = await Presence.getAvailable();
    if (presentNotaries.length === 0) {
      return res.json({ data: [], count: 0 });
    }

    const presentIds = presentNotaries.map((p) => p.notary_id);

    // 2. Cross-reference with DB: must be active notary + active shift
    const placeholders = presentIds.map((_, i) => `$${i + 1}`).join(', ');
    const values = [...presentIds];
    let stateFilter = '';
    if (state) {
      stateFilter = `AND n.state = $${values.length + 1}`;
      values.push(state);
    }

    const result = await db.query(
      `SELECT n.id, n.display_name, n.full_legal_name, n.languages, n.state,
              n.per_session_cents, ns.id AS shift_id, ns.shift_start, ns.shift_end
       FROM notaries n
       JOIN notary_shifts ns ON ns.notary_id = n.id AND ns.status = 'active'
       WHERE n.id IN (${placeholders})
         AND n.is_active = true
         ${stateFilter}
       ORDER BY n.display_name`,
      values
    );

    // 3. Filter out notaries with an active session
    const notaryIds = result.rows.map((r) => r.id);
    if (notaryIds.length > 0) {
      const busyPlaceholders = notaryIds.map((_, i) => `$${i + 1}`).join(', ');
      const busyResult = await db.query(
        `SELECT DISTINCT notary_id FROM notarization_sessions
         WHERE notary_id IN (${busyPlaceholders})
           AND status IN ('matched_to_notary', 'in_session')`,
        notaryIds
      );
      const busyIds = new Set(busyResult.rows.map((r) => r.notary_id));
      const available = result.rows.filter((r) => !busyIds.has(r.id));
      return res.json({ data: available, count: available.length });
    }

    res.json({ data: result.rows, count: result.rows.length });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /roster/active-shifts — All currently active shifts
// ---------------------------------------------------------------------------
router.get('/active-shifts', async (req, res, next) => {
  try {
    const shifts = await Shift.getActiveShifts(req.query.state);
    res.json({ data: shifts, count: shifts.length });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /roster/coverage-map — Coverage gaps analysis
// ---------------------------------------------------------------------------
router.get('/coverage-map', async (req, res, next) => {
  try {
    // Show next 24 hours of shift coverage in 1-hour blocks
    const result = await db.query(
      `WITH hours AS (
         SELECT generate_series(
           date_trunc('hour', NOW()),
           date_trunc('hour', NOW()) + INTERVAL '24 hours',
           INTERVAL '1 hour'
         ) AS hour_start
       )
       SELECT h.hour_start,
              COUNT(DISTINCT ns.notary_id) AS notaries_on_shift
       FROM hours h
       LEFT JOIN notary_shifts ns
         ON ns.shift_start <= h.hour_start + INTERVAL '1 hour'
         AND ns.shift_end > h.hour_start
         AND ns.status IN ('scheduled', 'active')
       LEFT JOIN notaries n ON n.id = ns.notary_id AND n.is_active = true
       GROUP BY h.hour_start
       ORDER BY h.hour_start`
    );

    const gaps = result.rows.filter((r) => parseInt(r.notaries_on_shift) === 0);

    res.json({
      data: {
        coverage: result.rows,
        gaps: gaps.map((g) => g.hour_start),
        total_gaps: gaps.length,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
