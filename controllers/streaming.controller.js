const Video = require('../models/Video');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const fs = require('fs');
const path = require('path');

/**
 * Streaming Controller
 * 
 * Implements HTTP Range Requests (206 Partial Content) for video streaming
 * Allows users to seek through videos efficiently
 */

/**
 * @route   GET /api/videos/stream/:id
 * @desc    Stream video with HTTP Range Request support
 * @access  Private (All roles)
 * 
 * Supports:
 * - HTTP Range Requests (206 Partial Content)
 * - Seeking through videos
 * - Tenant isolation
 * - Role-based access (VIEWER can only see SAFE videos)
 */
const streamVideo = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Support token in query parameter for video player
    let userId, userRole, tenantId;
    if (req.user) {
      userId = req.user.id;
      userRole = req.user.role;
      tenantId = req.user.tenantId;
    } else if (req.query.token) {
      try {
        const decoded = jwt.verify(req.query.token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId).select('-password').populate('tenantId');
        if (!user || !user.isActive || !user.tenantId?.isActive) {
          return res.status(401).json({ success: false, message: 'Unauthorized' });
        }
        userId = user._id.toString();
        userRole = user.role;
        tenantId = user.tenantId._id.toString();
      } catch (error) {
        return res.status(401).json({ success: false, message: 'Invalid token' });
      }
    } else {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    // Find video with tenant isolation
    const query = {
      _id: id,
      tenantId: tenantId,
    };

    // VIEWER can only access public or their own videos
    if (userRole === 'VIEWER') {
      query.$or = [
        { isPublic: true },
        { uploadedBy: userId },
      ];
    }

    const video = await Video.findOne(query);

    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found or access denied',
      });
    }

    // Check if video is safe to stream
    if (video.processingStatus === 'FLAGGED') {
      return res.status(403).json({
        success: false,
        message: 'This video has been flagged and cannot be streamed',
        processingStatus: video.processingStatus,
        processingError: video.processingError,
      });
    }

    // Only allow streaming of COMPLETED videos
    if (video.processingStatus !== 'COMPLETED') {
      return res.status(403).json({
        success: false,
        message: 'Video is still processing',
        processingStatus: video.processingStatus,
      });
    }

    // Check if file exists
    if (!fs.existsSync(video.filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Video file not found',
      });
    }

    // Get file stats
    const stat = fs.statSync(video.filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    // If no range header, send entire file
    if (!range) {
      const head = {
        'Content-Length': fileSize,
        'Content-Type': video.mimeType || 'video/mp4',
        'Accept-Ranges': 'bytes',
      };
      res.writeHead(200, head);
      fs.createReadStream(video.filePath).pipe(res);
      return;
    }

    // Parse range header
    // Format: "bytes=start-end"
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    // Validate range
    if (start >= fileSize || end >= fileSize) {
      res.status(416).json({
        success: false,
        message: 'Range Not Satisfiable',
      });
      return;
    }

    // Calculate chunk size
    const chunksize = (end - start) + 1;
    const file = fs.createReadStream(video.filePath, { start, end });

    // Set headers for 206 Partial Content
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': video.mimeType || 'video/mp4',
      'Cache-Control': 'no-cache',
    };

    res.writeHead(206, head);
    file.pipe(res);

    // Log streaming (optional, can be removed in production)
    console.log(`[Stream] Video ${id} streamed: bytes ${start}-${end}/${fileSize}`);
  } catch (error) {
    console.error('Streaming error:', error);
    res.status(500).json({
      success: false,
      message: 'Error streaming video',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * @route   GET /api/videos/:id/stream-info
 * @desc    Get video streaming information
 * @access  Private (All roles)
 */
const getStreamInfo = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    const tenantId = req.user.tenantId;

    // Find video with tenant isolation
    const query = {
      _id: id,
      tenantId: tenantId,
    };

    // VIEWER can only access public or their own videos
    if (userRole === 'VIEWER') {
      query.$or = [
        { isPublic: true },
        { uploadedBy: userId },
      ];
    }

    const video = await Video.findOne(query)
      .populate('uploadedBy', 'firstName lastName email')
      .select('-filePath'); // Don't expose file path

    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found or access denied',
      });
    }

    // Check if file exists
    let fileSize = 0;
    if (fs.existsSync(video.filePath)) {
      const stat = fs.statSync(video.filePath);
      fileSize = stat.size;
    }

    res.json({
      success: true,
      data: {
        video: {
          id: video._id,
          title: video.title,
          description: video.description,
          duration: video.duration,
          fileSize: fileSize,
          mimeType: video.mimeType,
          processingStatus: video.processingStatus,
          metadata: video.metadata,
          uploadedBy: video.uploadedBy,
          createdAt: video.createdAt,
          views: video.views,
        },
        streamUrl: `/api/videos/stream/${video._id}`,
      },
    });
  } catch (error) {
    console.error('Stream info error:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting stream info',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

module.exports = {
  streamVideo,
  getStreamInfo,
};

