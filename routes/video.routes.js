const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { ensureTenantAccess, filterByTenant } = require('../middleware/tenantIsolation');
const { upload, handleMulterError } = require('../config/multer');
const {
  uploadVideo,
  getVideos,
  getVideoById,
  updateProcessingStatus,
  deleteVideo,
} = require('../controllers/upload.controller');
const {
  streamVideo,
  getStreamInfo,
} = require('../controllers/streaming.controller');

// Most routes require authentication
// Stream route handles auth internally to support query token
router.use((req, res, next) => {
  // Skip auth middleware for stream route (handled in controller)
  if (req.path.startsWith('/stream/')) {
    return next();
  }
  authenticate(req, res, next);
});
router.use((req, res, next) => {
  // Skip tenant filter for stream route
  if (req.path.startsWith('/stream/')) {
    return next();
  }
  filterByTenant(req, res, next);
});

// Upload video - ADMIN and EDITOR only
router.post(
  '/upload',
  authorize('ADMIN', 'EDITOR'),
  ensureTenantAccess,
  upload.single('video'),
  handleMulterError,
  uploadVideo
);

// Get all videos - All authenticated users
router.get('/', getVideos);

// Stream video - Must be before /:id route to avoid conflicts
// Note: Authentication handled in controller to support query token for video player
router.get('/stream/:id', streamVideo);

// Get stream info - All authenticated users
router.get('/:id/stream-info', getStreamInfo);

// Get single video - All authenticated users (must be last)
router.get('/:id', getVideoById);

// Update processing status - ADMIN only
router.patch(
  '/:id/status',
  authorize('ADMIN'),
  ensureTenantAccess,
  updateProcessingStatus
);

// Delete video - ADMIN and EDITOR
router.delete(
  '/:id',
  authorize('ADMIN', 'EDITOR'),
  ensureTenantAccess,
  deleteVideo
);

module.exports = router;

