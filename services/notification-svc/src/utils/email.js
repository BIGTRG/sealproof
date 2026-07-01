/**
 * Email via SendGrid
 */
const { config, logger } = require('@sealproof/shared');

let sgMail = null;

function getClient() {
  if (!sgMail && config.sendgrid.apiKey) {
    sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(config.sendgrid.apiKey);
  }
  return sgMail;
}

async function sendEmail({ to, subject, html, text, from }) {
  const client = getClient();
  if (!client) {
    logger.warn('SendGrid not configured, email skipped', { to });
    return { status: 'skipped', reason: 'sendgrid_not_configured' };
  }

  try {
    const [response] = await client.send({
      to,
      from: from || config.sendgrid.fromEmail,
      subject,
      html,
      text,
    });
    logger.info('Email sent', { to, statusCode: response.statusCode });
    return { status: 'sent', statusCode: response.statusCode };
  } catch (err) {
    logger.error('Email failed', { error: err.message, to });
    throw Object.assign(new Error(`Email failed: ${err.message}`), { status: 502 });
  }
}

module.exports = { sendEmail };
