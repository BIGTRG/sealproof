/**
 * LiveKit Server SDK Wrapper
 *
 * Room creation, token issuance, recording control.
 * Uses the livekit-server-sdk package.
 */
const { AccessToken, RoomServiceClient, EgressClient } = require('livekit-server-sdk');
const { config, logger } = require('@sealproof/shared');

const roomService = new RoomServiceClient(
  config.livekit.wsUrl,
  config.livekit.apiKey,
  config.livekit.apiSecret
);

const egressClient = new EgressClient(
  config.livekit.wsUrl,
  config.livekit.apiKey,
  config.livekit.apiSecret
);

/**
 * Room naming convention: sealproof-{sessionId}
 */
function roomName(sessionId) {
  return `sealproof-${sessionId}`;
}

/**
 * Create a LiveKit room for a notarization session.
 */
async function createRoom(sessionId, options = {}) {
  const name = roomName(sessionId);
  try {
    const room = await roomService.createRoom({
      name,
      emptyTimeout: options.emptyTimeout || 300,      // 5 min empty → auto-destroy
      maxParticipants: options.maxParticipants || 10,  // customer + notary + signers + witnesses
      metadata: JSON.stringify({
        session_id: sessionId,
        created_at: new Date().toISOString(),
        platform: 'sealproof',
      }),
    });
    logger.info('LiveKit room created', { roomName: name, sessionId });
    return room;
  } catch (err) {
    logger.error('Failed to create LiveKit room', { error: err.message, sessionId });
    throw Object.assign(new Error(`LiveKit room creation failed: ${err.message}`), { status: 502 });
  }
}

/**
 * Generate a participant access token.
 *
 * @param {string} sessionId
 * @param {object} participant
 * @param {string} participant.identity  Unique ID (e.g., user UUID)
 * @param {string} participant.name      Display name
 * @param {string} participant.role      'customer' | 'notary' | 'signer' | 'witness'
 */
async function generateToken(sessionId, participant) {
  const name = roomName(sessionId);

  const token = new AccessToken(config.livekit.apiKey, config.livekit.apiSecret, {
    identity: participant.identity,
    name: participant.name,
    metadata: JSON.stringify({
      role: participant.role,
      session_id: sessionId,
    }),
    ttl: 3600, // 1 hour
  });

  // Grant permissions based on role
  const isNotary = participant.role === 'notary';
  token.addGrant({
    room: name,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
    // Only notaries can control recording via data messages
    roomAdmin: isNotary,
    roomRecord: isNotary,
  });

  return token.toJwt();
}

/**
 * Start room composite recording (captures all participants).
 * Recordings are saved to the configured S3 bucket via LiveKit Egress.
 */
async function startRecording(sessionId) {
  const name = roomName(sessionId);
  try {
    const output = {
      s3: {
        accessKey: config.aws.accessKeyId,
        secret: config.aws.secretAccessKey,
        region: config.aws.region,
        bucket: config.aws.recordingBucket,
        forcePathStyle: false,
      },
      filepath: `recordings/${sessionId}/{room_name}-{time}.mp4`,
    };

    const egress = await egressClient.startRoomCompositeEgress(name, {
      file: {
        fileType: 'MP4',
        filepath: output.filepath,
        output: { s3: output.s3 },
      },
    });

    logger.info('Recording started', { sessionId, egressId: egress.egressId });
    return { egressId: egress.egressId, status: 'recording' };
  } catch (err) {
    logger.error('Failed to start recording', { error: err.message, sessionId });
    throw Object.assign(new Error(`Recording start failed: ${err.message}`), { status: 502 });
  }
}

/**
 * Stop a recording by egress ID.
 */
async function stopRecording(egressId) {
  try {
    const egress = await egressClient.stopEgress(egressId);
    logger.info('Recording stopped', { egressId });
    return egress;
  } catch (err) {
    logger.error('Failed to stop recording', { error: err.message, egressId });
    throw Object.assign(new Error(`Recording stop failed: ${err.message}`), { status: 502 });
  }
}

/**
 * Destroy (delete) a room after session completion.
 */
async function destroyRoom(sessionId) {
  const name = roomName(sessionId);
  try {
    await roomService.deleteRoom(name);
    logger.info('LiveKit room destroyed', { roomName: name, sessionId });
  } catch (err) {
    logger.warn('Failed to destroy LiveKit room (may already be gone)', { error: err.message, sessionId });
  }
}

/**
 * List participants in a room.
 */
async function listParticipants(sessionId) {
  const name = roomName(sessionId);
  try {
    const participants = await roomService.listParticipants(name);
    return participants;
  } catch (err) {
    logger.warn('Failed to list participants', { error: err.message, sessionId });
    return [];
  }
}

module.exports = {
  createRoom, generateToken, startRecording, stopRecording,
  destroyRoom, listParticipants, roomName,
};
