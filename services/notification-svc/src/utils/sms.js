/**
 * SMS via Twilio
 */
const { config, logger } = require('@sealproof/shared');

let twilioClient = null;

function getClient() {
  if (!twilioClient && config.twilio.accountSid && config.twilio.authToken) {
    const twilio = require('twilio');
    twilioClient = twilio(config.twilio.accountSid, config.twilio.authToken);
  }
  return twilioClient;
}

async function sendSMS({ to, body }) {
  const client = getClient();
  if (!client) {
    logger.warn('Twilio not configured, SMS skipped', { to });
    return { status: 'skipped', reason: 'twilio_not_configured' };
  }

  try {
    const message = await client.messages.create({
      body,
      from: config.twilio.fromNumber,
      to,
    });
    logger.info('SMS sent', { to, sid: message.sid });
    return { status: 'sent', sid: message.sid };
  } catch (err) {
    logger.error('SMS failed', { error: err.message, to });
    throw Object.assign(new Error(`SMS failed: ${err.message}`), { status: 502 });
  }
}

module.exports = { sendSMS };
