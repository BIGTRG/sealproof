/**
 * Notification Routes
 *
 * POST /notifications/send            Send a notification (sms, email, or both)
 * POST /notifications/session-event   Trigger notifications for a session lifecycle event
 */
const router = require('express').Router();
const { validate, audit, logger, db } = require('@sealproof/shared');
const { sendSMS } = require('../utils/sms');
const { sendEmail } = require('../utils/email');

// Event -> notification mapping
const EVENT_TEMPLATES = {
  session_created: {
    sms: (d) => `Your notarization session has been created. Session ID: ${d.sessionId}. You'll receive a link to join shortly.`,
    emailSubject: 'Notarization Session Created',
    emailHtml: (d) => `<h2>Session Created</h2><p>Your notarization session (${d.sessionId}) has been created. Please complete identity verification to proceed.</p>`,
  },
  kyc_complete: {
    sms: (d) => `Identity verified! Your notarization session is now in the queue. A notary will be assigned shortly.`,
    emailSubject: 'Identity Verified - Session Queued',
    emailHtml: (d) => `<h2>Identity Verified</h2><p>Your identity has been verified. Your session (${d.sessionId}) is now in the queue.</p>`,
  },
  notary_matched: {
    sms: (d) => `A notary has been assigned to your session. Click here to join: ${d.joinUrl}`,
    emailSubject: 'Notary Assigned - Join Your Session',
    emailHtml: (d) => `<h2>Notary Assigned</h2><p>Your notary is ready. <a href="${d.joinUrl}">Click here to join your session</a>.</p>`,
  },
  session_completed: {
    sms: (d) => `Your notarization is complete! Your sealed documents are available in your account.`,
    emailSubject: 'Notarization Complete',
    emailHtml: (d) => `<h2>Notarization Complete</h2><p>Your documents have been notarized and sealed. Log in to download your documents.</p>`,
  },
  notary_new_session: {
    sms: (d) => `New session assigned: ${d.sessionId}. Customer: ${d.customerName}. Documents: ${d.documentCount}. Join now.`,
    emailSubject: 'New Session Assigned',
    emailHtml: (d) => `<h2>New Session</h2><p>Session ${d.sessionId} has been assigned to you. Please join the video room.</p>`,
  },
};

// POST /notifications/send — Generic send
router.post('/send',
  validate({ body: { channel: { required: true }, recipient: { required: true } } }),
  async (req, res, next) => {
    try {
      const { channel, recipient, subject, body, html } = req.body;
      let result;

      if (channel === 'sms' || channel === 'both') {
        result = await sendSMS({ to: recipient.phone, body });
      }
      if (channel === 'email' || channel === 'both') {
        result = await sendEmail({ to: recipient.email, subject, html: html || body });
      }

      await audit.emitAuditLog({ eventType: `notification.${channel}`, actorType: 'system', payload: { recipient: recipient.email || recipient.phone, channel } });
      res.json({ data: { status: 'sent', channel } });
    } catch (err) { next(err); }
  }
);

// POST /notifications/session-event — Event-driven notifications
router.post('/session-event',
  validate({ body: { event: { required: true }, session_id: { required: true } } }),
  async (req, res, next) => {
    try {
      const { event, session_id, data } = req.body;
      const template = EVENT_TEMPLATES[event];
      if (!template) {
        return res.status(400).json({ error: { message: `Unknown event: ${event}` } });
      }

      // Get session + customer info
      const session = await db.query(
        `SELECT ns.*, c.email, c.phone, c.full_name
         FROM notarization_sessions ns
         LEFT JOIN customers c ON c.id = ns.customer_id
         WHERE ns.id = $1`,
        [session_id]
      );
      const sess = session.rows[0];
      if (!sess) return res.status(404).json({ error: { message: 'Session not found' } });

      const templateData = { sessionId: session_id, ...data, customerName: sess.full_name };
      const results = [];

      // Send SMS if phone available
      if (sess.phone && template.sms) {
        try {
          const smsResult = await sendSMS({ to: sess.phone, body: template.sms(templateData) });
          results.push({ channel: 'sms', ...smsResult });
        } catch (err) { results.push({ channel: 'sms', status: 'failed', error: err.message }); }
      }

      // Send email if available
      if (sess.email && template.emailHtml) {
        try {
          const emailResult = await sendEmail({ to: sess.email, subject: template.emailSubject, html: template.emailHtml(templateData) });
          results.push({ channel: 'email', ...emailResult });
        } catch (err) { results.push({ channel: 'email', status: 'failed', error: err.message }); }
      }

      logger.info('Session event notifications sent', { event, sessionId: session_id, results });
      res.json({ data: { event, session_id, notifications: results } });
    } catch (err) { next(err); }
  }
);

module.exports = router;
