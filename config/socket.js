const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Socket.io Configuration
 * 
 * Handles real-time video processing updates with tenant-based rooms.
 * Users are automatically joined to their tenant room: tenant_{tenantId}
 */

let io;

/**
 * Initialize Socket.io server
 * @param {http.Server} server - HTTP server instance
 * @returns {Server} Socket.io server instance
 */
const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || "*",
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // Authentication middleware for Socket.io
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Fetch user with tenant information
      const user = await User.findById(decoded.userId)
        .select('-password')
        .populate('tenantId', 'name isActive');

      if (!user || !user.isActive) {
        return next(new Error('Authentication error: Invalid or inactive user'));
      }

      if (!user.tenantId || !user.tenantId.isActive) {
        return next(new Error('Authentication error: Tenant is inactive'));
      }

      // Attach user info to socket
      socket.userId = user._id.toString();
      socket.userRole = user.role;
      socket.tenantId = user.tenantId._id.toString();
      socket.tenantName = user.tenantId.name;

      next();
    } catch (error) {
      if (error.name === 'JsonWebTokenError') {
        return next(new Error('Authentication error: Invalid token'));
      }
      if (error.name === 'TokenExpiredError') {
        return next(new Error('Authentication error: Token expired'));
      }
      next(new Error('Authentication error: ' + error.message));
    }
  });

  // Connection handler
  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id} (User: ${socket.userId}, Tenant: ${socket.tenantId})`);

    // Join tenant-specific room
    const tenantRoom = `tenant_${socket.tenantId}`;
    socket.join(tenantRoom);
    console.log(`User ${socket.userId} joined room: ${tenantRoom}`);

    // Emit connection confirmation
    socket.emit('connected', {
      message: 'Connected to video processing updates',
      tenantId: socket.tenantId,
      room: tenantRoom,
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });

    // Handle join room request (for additional rooms if needed)
    socket.on('join_room', (roomName) => {
      // Only allow joining tenant-specific rooms
      if (roomName.startsWith(`tenant_${socket.tenantId}`)) {
        socket.join(roomName);
        socket.emit('room_joined', { room: roomName });
      } else {
        socket.emit('error', { message: 'Unauthorized room access' });
      }
    });

    // Handle leave room request
    socket.on('leave_room', (roomName) => {
      socket.leave(roomName);
      socket.emit('room_left', { room: roomName });
    });
  });

  return io;
};

/**
 * Emit progress update to tenant room
 * @param {string} tenantId - Tenant ID
 * @param {string} videoId - Video ID
 * @param {number} progress - Progress percentage (0-100)
 * @param {string} stage - Current processing stage
 * @param {object} data - Additional data to send
 */
const emitProgress = (tenantId, videoId, progress, stage, data = {}) => {
  if (!io) {
    console.warn('Socket.io not initialized. Cannot emit progress.');
    return;
  }

  const tenantRoom = `tenant_${tenantId}`;
  
  io.to(tenantRoom).emit('video_processing_progress', {
    videoId,
    progress,
    stage,
    timestamp: new Date().toISOString(),
    ...data,
  });

  console.log(`[Socket] Progress update to ${tenantRoom}: ${progress}% - ${stage} (Video: ${videoId})`);
};

/**
 * Emit processing completion
 * @param {string} tenantId - Tenant ID
 * @param {string} videoId - Video ID
 * @param {string} status - Final status (COMPLETED, FLAGGED)
 * @param {object} videoData - Video data
 */
const emitCompletion = (tenantId, videoId, status, videoData = {}) => {
  if (!io) {
    console.warn('Socket.io not initialized. Cannot emit completion.');
    return;
  }

  const tenantRoom = `tenant_${tenantId}`;
  
  io.to(tenantRoom).emit('video_processing_complete', {
    videoId,
    status,
    timestamp: new Date().toISOString(),
    ...videoData,
  });

  console.log(`[Socket] Completion update to ${tenantRoom}: ${status} (Video: ${videoId})`);
};

/**
 * Emit processing error
 * @param {string} tenantId - Tenant ID
 * @param {string} videoId - Video ID
 * @param {string} error - Error message
 */
const emitError = (tenantId, videoId, error) => {
  if (!io) {
    console.warn('Socket.io not initialized. Cannot emit error.');
    return;
  }

  const tenantRoom = `tenant_${tenantId}`;
  
  io.to(tenantRoom).emit('video_processing_error', {
    videoId,
    error,
    timestamp: new Date().toISOString(),
  });

  console.error(`[Socket] Error update to ${tenantRoom}: ${error} (Video: ${videoId})`);
};

/**
 * Get Socket.io instance
 * @returns {Server} Socket.io server instance
 */
const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized. Call initializeSocket() first.');
  }
  return io;
};

module.exports = {
  initializeSocket,
  emitProgress,
  emitCompletion,
  emitError,
  getIO,
};

