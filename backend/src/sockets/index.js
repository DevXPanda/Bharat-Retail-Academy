import { Server } from 'socket.io';
import env from '../config/env.js';
import User from '../models/User.js';
import LiveClass from '../models/LiveClass.js';
import Enrollment from '../models/Enrollment.js';
import { verifyToken } from '../utils/token.js';
import { markOffline, markOnline, setIo } from '../services/realtime.js';

export function initSockets(httpServer) {
  const io = new Server(httpServer, { cors: { origin: env.clientOrigins, credentials: true } });
  setIo(io);

  io.use(async (socket, next) => {
    try {
      const payload = verifyToken(socket.handshake.auth?.token);
      const user = await User.findById(payload.sub).select('name role status');
      if (!user || user.status === 'inactive') return next(new Error('unauthorized'));
      socket.data.user = user;
      return next();
    } catch {
      return next(new Error('unauthorized'));
    }
  });

  io.on('connection', async (socket) => {
    const { user } = socket.data;
    socket.join(`user:${user.id}`);
    markOnline(user.id);

    const courseIds = user.role === 'student' ? await Enrollment.distinct('course', { student: user._id, status: { $in: ['active', 'completed'] } }) : [];
    courseIds.forEach((id) => socket.join(`course:${id}`));

    socket.on('class:join', async (classId, ack) => {
      try {
        const cls = await LiveClass.findById(classId).select('course teacher batch');
        if (!cls) return ack?.({ ok: false });
        const allowed =
          user.role === 'admin' ||
          String(cls.teacher) === user.id ||
          (user.role === 'student' && courseIds.some((c) => String(c) === String(cls.course)));
        if (!allowed) return ack?.({ ok: false });
        socket.join(`class:${classId}`);
        return ack?.({ ok: true });
      } catch {
        return ack?.({ ok: false });
      }
    });

    socket.on('class:leave', (classId) => socket.leave(`class:${classId}`));

    socket.on('disconnect', () => markOffline(user.id));
  });

  return io;
}
