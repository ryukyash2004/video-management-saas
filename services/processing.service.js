const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');
const Video = require('../models/Video');
const { emitProgress, emitCompletion, emitError } = require('../config/socket');

// Try to set FFmpeg path from ffmpeg-static package
try {
  const ffmpegPath = require('ffmpeg-static');
  if (ffmpegPath) {
    ffmpeg.setFfmpegPath(ffmpegPath);
    console.log('[FFmpeg] Using bundled FFmpeg from ffmpeg-static');
  }
} catch (error) {
  // FFmpeg-static not available, use system FFmpeg
  console.log('[FFmpeg] Using system FFmpeg (ensure ffmpeg is installed)');
}

/**
 * Video Processing Service
 * 
 * Handles:
 * - Metadata extraction using FFmpeg
 * - Simulated AI sensitivity analysis
 * - Non-blocking async processing
 * - Real-time progress updates via Socket.io
 */

// Keywords that trigger FLAGGED status (case-insensitive)
const SENSITIVITY_KEYWORDS = [
  'test_flag',
  'flag',
  'sensitive',
  'nsfw',
  'explicit',
];

/**
 * Extract video metadata using FFmpeg
 * @param {string} filePath - Path to video file
 * @returns {Promise<object>} Video metadata
 */
const extractMetadata = (filePath) => {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(filePath)) {
      return reject(new Error('Video file not found'));
    }

    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        return reject(new Error(`FFprobe error: ${err.message}`));
      }

      const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
      const audioStream = metadata.streams.find(stream => stream.codec_type === 'audio');

      const extractedMetadata = {
        duration: metadata.format.duration || 0,
        width: videoStream?.width || null,
        height: videoStream?.height || null,
        bitrate: metadata.format.bit_rate ? parseInt(metadata.format.bit_rate) : null,
        codec: videoStream?.codec_name || null,
        frameRate: videoStream?.r_frame_rate ? parseFloat(videoStream.r_frame_rate.split('/')[0]) / parseFloat(videoStream.r_frame_rate.split('/')[1]) : null,
        audioCodec: audioStream?.codec_name || null,
        size: metadata.format.size ? parseInt(metadata.format.size) : null,
      };

      resolve(extractedMetadata);
    });
  });
};

/**
 * Simulate AI Sensitivity Scan
 * Checks filename for keywords and simulates a 10-second scan
 * @param {string} filename - Video filename
 * @returns {Promise<{status: string, reason?: string}>} Scan result
 */
const simulateAISensitivityScan = async (filename) => {
  // Simulate 10-second AI processing delay
  await new Promise(resolve => setTimeout(resolve, 10000));

  // Check filename for sensitivity keywords (case-insensitive)
  const filenameLower = filename.toLowerCase();
  const hasKeyword = SENSITIVITY_KEYWORDS.some(keyword => 
    filenameLower.includes(keyword.toLowerCase())
  );

  if (hasKeyword) {
    const matchedKeyword = SENSITIVITY_KEYWORDS.find(keyword => 
      filenameLower.includes(keyword.toLowerCase())
    );
    return {
      status: 'FLAGGED',
      reason: `Sensitivity keyword detected: "${matchedKeyword}"`,
    };
  }

  // Random flagging for demonstration (10% chance)
  // In production, this would be replaced with actual AI analysis
  const randomFlag = Math.random() < 0.1;
  
  if (randomFlag) {
    return {
      status: 'FLAGGED',
      reason: 'AI analysis detected potential content issues',
    };
  }

  return {
    status: 'SAFE',
  };
};

/**
 * Process video asynchronously
 * This function is non-blocking and runs in the background
 * @param {string} videoId - MongoDB Video document ID
 * @param {string} tenantId - Tenant ID for Socket.io room
 */
const processVideo = async (videoId, tenantId) => {
  try {
    console.log(`[Processing] Starting video processing: ${videoId}`);

    // Update status to PROCESSING
    const video = await Video.findById(videoId);
    if (!video) {
      throw new Error('Video not found');
    }

    video.processingStatus = 'PROCESSING';
    await video.save();

    // Emit initial progress
    emitProgress(tenantId, videoId, 0, 'Initializing', {
      message: 'Video processing started',
    });

    // Stage 1: Extract Metadata (25% progress)
    emitProgress(tenantId, videoId, 10, 'Extracting Metadata', {
      message: 'Analyzing video file...',
    });

    let metadata;
    try {
      metadata = await extractMetadata(video.filePath);
      console.log(`[Processing] Metadata extracted for ${videoId}:`, metadata);
    } catch (error) {
      console.error(`[Processing] Metadata extraction failed:`, error);
      throw new Error(`Metadata extraction failed: ${error.message}`);
    }

    // Update video with metadata
    video.duration = Math.round(metadata.duration);
    video.metadata = {
      width: metadata.width,
      height: metadata.height,
      bitrate: metadata.bitrate,
      codec: metadata.codec,
      frameRate: metadata.frameRate,
    };

    emitProgress(tenantId, videoId, 25, 'Metadata Extracted', {
      message: 'Video metadata extracted successfully',
      metadata: {
        duration: video.duration,
        resolution: `${metadata.width}x${metadata.height}`,
        codec: metadata.codec,
      },
    });

    // Stage 2: AI Sensitivity Scan (50% progress)
    emitProgress(tenantId, videoId, 30, 'AI Sensitivity Scan', {
      message: 'Running AI content analysis...',
    });

    const scanResult = await simulateAISensitivityScan(video.originalFilename);
    
    emitProgress(tenantId, videoId, 75, 'AI Scan Complete', {
      message: 'Content analysis completed',
      scanResult: scanResult.status,
    });

    // Stage 3: Finalize (100% progress)
    emitProgress(tenantId, videoId, 90, 'Finalizing', {
      message: 'Finalizing video processing...',
    });

    // Update video status based on scan result
    if (scanResult.status === 'FLAGGED') {
      video.processingStatus = 'FLAGGED';
      video.processingError = scanResult.reason || 'Content flagged by AI analysis';
    } else {
      video.processingStatus = 'COMPLETED';
    }

    await video.save();

    // Emit completion
    emitProgress(tenantId, videoId, 100, 'Completed', {
      message: 'Video processing completed',
      status: video.processingStatus,
    });

    emitCompletion(tenantId, videoId, video.processingStatus, {
      video: {
        id: video._id,
        title: video.title,
        processingStatus: video.processingStatus,
        duration: video.duration,
        metadata: video.metadata,
      },
    });

    console.log(`[Processing] Video processing completed: ${videoId} - Status: ${video.processingStatus}`);
  } catch (error) {
    console.error(`[Processing] Error processing video ${videoId}:`, error);

    // Update video status to FLAGGED on error
    try {
      const video = await Video.findById(videoId);
      if (video) {
        video.processingStatus = 'FLAGGED';
        video.processingError = error.message;
        await video.save();
      }
    } catch (updateError) {
      console.error(`[Processing] Failed to update video status:`, updateError);
    }

    // Emit error
    emitError(tenantId, videoId, error.message);
  }
};

/**
 * Start video processing in background (non-blocking)
 * @param {string} videoId - MongoDB Video document ID
 * @param {string} tenantId - Tenant ID for Socket.io room
 */
const startProcessing = (videoId, tenantId) => {
  // Process asynchronously without blocking
  processVideo(videoId, tenantId).catch(error => {
    console.error(`[Processing] Unhandled error in background processing:`, error);
  });
};

module.exports = {
  processVideo,
  startProcessing,
  extractMetadata,
  simulateAISensitivityScan,
};
