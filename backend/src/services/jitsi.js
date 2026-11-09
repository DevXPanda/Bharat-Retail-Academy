import jwt from 'jsonwebtoken';
import env from '../config/env.js';

function jaasToken({ user, moderator, ttlSeconds = 3 * 60 * 60 }) {
  const now = Math.floor(Date.now() / 1000);
  const privateKey = env.JAAS_PRIVATE_KEY.replace(/\\n/g, '\n');
  return jwt.sign(
    {
      aud: 'jitsi',
      iss: 'chat',
      iat: now,
      nbf: now - 10,
      exp: now + ttlSeconds,
      sub: env.JAAS_APP_ID,
      room: '*',
      context: {
        user: { id: String(user.id), name: user.name, email: user.email, avatar: user.avatar || '', moderator: moderator ? 'true' : 'false' },
        features: { recording: moderator ? 'true' : 'false', livestreaming: 'false', transcription: 'false', 'outbound-call': 'false' },
      },
    },
    privateKey,
    { algorithm: 'RS256', header: { kid: env.JAAS_KEY_ID, typ: 'JWT', alg: 'RS256' } },
  );
}

export function buildJitsiJoin({ roomName, user, moderator, ttlSeconds }) {
  if (env.jaasEnabled) {
    return {
      domain: '8x8.vc',
      scriptUrl: `https://8x8.vc/${env.JAAS_APP_ID}/external_api.js`,
      roomName: `${env.JAAS_APP_ID}/${roomName}`,
      jwt: jaasToken({ user, moderator, ttlSeconds }),
      displayName: user.name,
      email: user.email,
      moderator,
    };
  }
  return {
    domain: env.JITSI_DOMAIN,
    scriptUrl: `https://${env.JITSI_DOMAIN}/external_api.js`,
    roomName,
    jwt: null,
    displayName: user.name,
    email: user.email,
    moderator,
  };
}
