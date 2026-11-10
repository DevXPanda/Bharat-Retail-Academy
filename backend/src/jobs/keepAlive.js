import env from '../config/env.js';

// Render's free web services fall asleep after about 15 minutes without traffic. While the server is awake it calls its
// own public address every few minutes (through Render's router, so it counts as real traffic) and never goes idle.
// Render sets RENDER_EXTERNAL_URL itself; KEEP_ALIVE_URL can override it. Nothing runs on a laptop without either one.
export function startKeepAlive() {
  if (!env.keepAliveUrl) return null;
  const target = `${env.keepAliveUrl}/api/v1/health`;
  const everyMs = Math.max(1, env.KEEP_ALIVE_MINUTES) * 60 * 1000;

  const ping = async () => {
    try {
      const res = await fetch(target, { signal: AbortSignal.timeout(20000), headers: { 'User-Agent': 'keep-alive' } });
      if (!res.ok) console.warn(`Keep-alive ping got ${res.status}`);
    } catch (err) {
      console.warn(`Keep-alive ping failed: ${err.message}`);
    }
  };

  const timer = setInterval(ping, everyMs);
  timer.unref();
  console.log(`Keep-alive on: pinging ${target} every ${env.KEEP_ALIVE_MINUTES} min`);
  return timer;
}
