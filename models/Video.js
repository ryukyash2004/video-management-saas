const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Video title is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    filename: {
      type: String,
      required: [true, 'Filename is required'],
    },
    originalFilename: {
      type: String,
      required: [true, 'Original filename is required'],
    },
    filePath: {
      type: String,
      required: [true, 'File path is required'],
    },
    fileSize: {
      type: Number,
      required: [true, 'File size is required'],
    },
    mimeType: {
      type: String,
      required: [true, 'MIME type is required'],
    },
    duration: {
      type: Number, // Duration in seconds
    },
    thumbnailPath: {
      type: String,
    },
    processingStatus: {
      type: String,
      enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FLAGGED'],
      default: 'PENDING',
      required: true,
      index: true,
    },
    processingError: {
      type: String,
    },
    metadata: {
      width: Number,
      height: Number,
      bitrate: Number,
      codec: String,
      frameRate: Number,
    },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: [true, 'Tenant ID is required'],
      index: true, // Critical for multi-tenant data isolation
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Uploader is required'],
    },
    tags: [{
      type: String,
      trim: true,
    }],
    isPublic: {
      type: Boolean,
      default: false,
    },
    views: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient tenant-based queries
videoSchema.index({ tenantId: 1, createdAt: -1 });
videoSchema.index({ tenantId: 1, processingStatus: 1 });
videoSchema.index({ tenantId: 1, uploadedBy: 1 });
videoSchema.index({ tenantId: 1, isPublic: 1 });

// Virtual for formatted file size
videoSchema.virtual('formattedFileSize').get(function () {
  const bytes = this.fileSize;
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
});

module.exports = mongoose.model('Video', videoSchema);

