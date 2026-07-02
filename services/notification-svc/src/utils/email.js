/**
 * Email via SMTP (Nodemailer)
 */
const nodemailer = require('nodemailer');
const { config, logger } = require('@sealproof/shared');

let transporter = null;

function getTransporter() {
  if (!transporter && config.smtp && config.smtp.host) {
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: false, // STARTTLS
      auth: {
        user: config.smtp.user,
        pass: config.smtp.pass,
      },
    });
  }
  return transporter;
}

async function sendEmail({ to, subject, html, text, from }) {
  const t = getTransporter();
  if (!t) {
    logger.warn('SMTP not configured, email skipped', { to });
    return { status: 'skipped', reason: 'smtp_not_configured' };
  }

  try {
    const info = await t.sendMail({
      from: from || config.smtp.from,
      to,
      subject,
      html,
      text,
    });
    logger.info('Email sent', { to, messageId: info.messageId });
    return { status: 'sent', messageId: info.messageId };
  } catch (err) {
    logger.error('Email failed', { error: err.message, to });
    throw Object.assign(new Error(`Email failed: ${err.message}`), { status: 502 });
  }
}

module.exports = { sendEmail };
