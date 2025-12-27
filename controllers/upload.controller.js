const Video = require('../models/Video');
const Tenant = require('../models/Tenant');
const path = require('path');
const fs = require('fs');
const { startProcessing } = require('../services/processing.service');

/**
 * Upload Video Controller
 * 
 * Handles video uploads with:
 * - Tenant isolation (users can only upload to their tenant)
 * - Processing status tracking
 * - Metadata storage
 * - Large file support via multer
 */

/**
 * @route   POST /api/videos/upload
 * @desc    Upload a video file
 * @access  Private (ADMIN, EDITOR)
 * 
 * The user's tenantId is automatically attached from req.user
 * by the authentication middleware
 */
const uploadVideo = async (req, res) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No video file provided',
      });
    }

    // Get tenant settings for validation
    const tenant = await Tenant.findById(req.user.tenantId);
    if (!tenant) {
      // Clean up uploaded file if tenant not found
      fs.unlinkSync(req.file.path);
      return res.status(404).json({
        success: false,
        message: 'Tenant not found',
      });
    }

    // Check file size against tenant limits
    const maxSizeBytes = tenant.settings.maxVideoSizeMB * 1024 * 1024;
    if (req.file.size > maxSizeBytes) {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        message: `File size exceeds tenant limit of ${tenant.settings.maxVideoSizeMB}MB`,
      });
    }

    // Extract video metadata from request body
    const { title, description, tags, isPublic } = req.body;

    // Create video document in MongoDB
    const video = await Video.create({
      title: title || req.file.originalname,
      description: description || '',
      filename: req.file.filename,
      originalFilename: req.file.originalname,
      filePath: req.file.path,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      processingStatus: 'PENDING', // Will be updated by video processing service
      tenantId: req.user.tenantId, // Enforced by tenant isolation middleware
      uploadedBy: req.user.id,
      tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim())) : [],
      isPublic: isPublic === 'true' || isPublic === true,
    });

    // Populate references for response
    await video.populate('uploadedBy', 'firstName lastName email');
    await video.populate('tenantId', 'name');

    // Trigger video processing asynchronously (non-blocking)
    // Processing will update status and emit Socket.io events
    startProcessing(video._id.toString(), req.user.tenantId);

    res.status(201).json({
      success: true,
      message: 'Video uploaded successfully',
      data: {
        video: {
          id: video._id,
          title: video.title,
          filename: video.filename,
          fileSize: video.fileSize,
          formattedFileSize: video.formattedFileSize,
          processingStatus: video.processingStatus,
          tenantId: video.tenantId,
          uploadedBy: video.uploadedBy,
          createdAt: video.createdAt,
        },
      },
    });
  } catch (error) {
    // Clean up uploaded file on error
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading video',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * @route   GET /api/videos
 * @desc    Get all videos for the authenticated user's tenant
 * @access  Private (All roles)
 */
const getVideos = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build query - tenantId is automatically filtered by tenantIsolation middleware
    const query = {
      tenantId: req.user.tenantId,
    };

    // Filter by processing status if provided
    if (status && ['PENDING', 'PROCESSING', 'COMPLETED', 'FLAGGED'].includes(status)) {
      query.processingStatus = status;
    }

    // Search by title or description
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    // Role-based filtering
    // VIEWER can only see public videos or videos they uploaded
    if (req.user.role === 'VIEWER') {
      query.$or = [
        { isPublic: true },
        { uploadedBy: req.user.id },
      ];
    }

    const videos = await Video.find(query)
      .populate('uploadedBy', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-filePath'); // Don't expose file paths

    const total = await Video.countDocuments(query);

    res.json({
      success: true,
      data: {
        videos,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error('Get videos error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching videos',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * @route   GET /api/videos/:id
 * @desc    Get a single video by ID (tenant-isolated)
 * @access  Private (All roles)
 */
const getVideoById = async (req, res) => {
  try {
    const { id } = req.params;

    const query = {
      _id: id,
      tenantId: req.user.tenantId, // Ensure tenant isolation
    };

    // Role-based access
    if (req.user.role === 'VIEWER') {
      query.$or = [
        { isPublic: true },
        { uploadedBy: req.user.id },
      ];
    }

    const video = await Video.findOne(query)
      .populate('uploadedBy', 'firstName lastName email')
      .populate('tenantId', 'name');

    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found or access denied',
      });
    }

    // Increment view count
    video.views += 1;
    await video.save();

    res.json({
      success: true,
      data: { video },
    });
  } catch (error) {
    console.error('Get video error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching video',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * @route   PATCH /api/videos/:id/status
 * @desc    Update video processing status (ADMIN only)
 * @access  Private (ADMIN)
 */
const updateProcessingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { processingStatus, processingError } = req.body;

    if (!['PENDING', 'PROCESSING', 'COMPLETED', 'FLAGGED'].includes(processingStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid processing status',
      });
    }

    const video = await Video.findOne({
      _id: id,
      tenantId: req.user.tenantId, // Tenant isolation
    });

    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found',
      });
    }

    video.processingStatus = processingStatus;
    if (processingError) {
      video.processingError = processingError;
    }

    await video.save();

    res.json({
      success: true,
      message: 'Processing status updated',
      data: { video },
    });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating processing status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * @route   DELETE /api/videos/:id
 * @desc    Delete a video (ADMIN, EDITOR)
 * @access  Private (ADMIN, EDITOR)
 */
const deleteVideo = async (req, res) => {
  try {
    const { id } = req.params;

    const query = {
      _id: id,
      tenantId: req.user.tenantId, // Tenant isolation
    };

    // EDITOR can only delete their own videos
    if (req.user.role === 'EDITOR') {
      query.uploadedBy = req.user.id;
    }

    const video = await Video.findOne(query);

    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found or access denied',
      });
    }

    // Delete physical file
    if (fs.existsSync(video.filePath)) {
      fs.unlinkSync(video.filePath);
    }

    // Delete thumbnail if exists
    if (video.thumbnailPath && fs.existsSync(video.thumbnailPath)) {
      fs.unlinkSync(video.thumbnailPath);
    }

    // Delete from database
    await Video.deleteOne({ _id: id });

    res.json({
      success: true,
      message: 'Video deleted successfully',
    });
  } catch (error) {
    console.error('Delete video error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting video',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

module.exports = {
  uploadVideo,
  getVideos,
  getVideoById,
  updateProcessingStatus,
  deleteVideo,
};

