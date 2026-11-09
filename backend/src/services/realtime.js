let io = null;
const online = new Map();

export const setIo = (instance) => {
  io = instance;
};

export const emitToUser = (userId, event, payload) => io?.to(`user:${userId}`).emit(event, payload);

export const emitToRoom = (room, event, payload) => io?.to(room).emit(event, payload);

export const markOnline = (userId) => online.set(String(userId), (online.get(String(userId)) || 0) + 1);

export const markOffline = (userId) => {
  const count = (online.get(String(userId)) || 1) - 1;
  if (count <= 0) online.delete(String(userId));
  else online.set(String(userId), count);
};

export const isOnline = (userId) => online.has(String(userId));
