# Video Processing Pipeline

## Overview

The Video Processing Pipeline provides real-time video processing with metadata extraction and AI sensitivity analysis.

## Architecture

### Components

1. **Socket.io Server** (`config/socket.js`)
   - Real-time communication
   - Tenant-based rooms: `tenant_{tenantId}`
   - JWT authentication for Socket connections

2. **Processing Service** (`services/processing.service.js`)
   - FFmpeg metadata extraction
   - Simulated AI sensitivity scan
   - Non-blocking async processing
   - Progress updates via Socket.io

### Processing Stages

1. **Initialization (0-10%)**
   - Video file validation
   - Status update to PROCESSING

2. **Metadata Extraction (10-25%)**
   - Duration, resolution, codec, bitrate
   - Frame rate, audio codec
   - Updates video document

3. **AI Sensitivity Scan (30-75%)**
   - 10-second simulated AI processing
   - Keyword-based flagging
   - Random flagging (10% chance)

4. **Finalization (90-100%)**
   - Status update (COMPLETED or FLAGGED)
   - Completion event emission

## Socket.io Events

### Client → Server

- `connect` - Connect with JWT token in `auth.token` or `Authorization` header
- `join_room` - Join additional rooms (tenant-scoped)
- `leave_room` - Leave a room

### Server → Client

- `connected` - Connection confirmation
- `video_processing_progress` - Progress updates
  ```json
  {
    "videoId": "video_id",
    "progress": 50,
    "stage": "AI Sensitivity Scan",
    "message": "Running AI content analysis...",
    "timestamp": "2025-12-27T18:00:00.000Z"
  }
  ```
- `video_processing_complete` - Processing completed
  ```json
  {
    "videoId": "video_id",
    "status": "COMPLETED",
    "timestamp": "2025-12-27T18:00:00.000Z",
    "video": { ... }
  }
  ```
- `video_processing_error` - Processing error
  ```json
  {
    "videoId": "video_id",
    "error": "Error message",
    "timestamp": "2025-12-27T18:00:00.000Z"
  }
  ```

## Client Integration

### JavaScript/TypeScript Example

```javascript
import io from 'socket.io-client';

// Connect with JWT token
const socket = io('http://localhost:3000', {
  auth: {
    token: 'your-jwt-token-here'
  }
});

// Listen for connection
socket.on('connected', (data) => {
  console.log('Connected to tenant room:', data.room);
});

// Listen for progress updates
socket.on('video_processing_progress', (data) => {
  console.log(`Video ${data.videoId}: ${data.progress}% - ${data.stage}`);
  // Update UI progress bar
});

// Listen for completion
socket.on('video_processing_complete', (data) => {
  console.log(`Video ${data.videoId} processing complete: ${data.status}`);
  // Update UI
});

// Listen for errors
socket.on('video_processing_error', (data) => {
  console.error(`Error processing video ${data.videoId}:`, data.error);
});
```

### React Example

```jsx
import { useEffect, useState } from 'react';
import io from 'socket.io-client';

function VideoProcessingStatus({ videoId, token }) {
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('');
  const [status, setStatus] = useState('PENDING');

  useEffect(() => {
    const socket = io('http://localhost:3000', {
      auth: { token }
    });

    socket.on('video_processing_progress', (data) => {
      if (data.videoId === videoId) {
        setProgress(data.progress);
        setStage(data.stage);
      }
    });

    socket.on('video_processing_complete', (data) => {
      if (data.videoId === videoId) {
        setStatus(data.status);
        setProgress(100);
      }
    });

    return () => socket.disconnect();
  }, [videoId, token]);

  return (
    <div>
      <div>Status: {status}</div>
      <div>Stage: {stage}</div>
      <progress value={progress} max={100} />
      <div>{progress}%</div>
    </div>
  );
}
```

## Sensitivity Analysis

### Keyword-Based Flagging

Videos with these keywords in the filename are automatically flagged:
- `test_flag`
- `flag`
- `sensitive`
- `nsfw`
- `explicit`

Example: `test_flag_video.mp4` → FLAGGED

### Random Flagging

10% of videos are randomly flagged for demonstration purposes.

### Customization

Edit `services/processing.service.js`:
```javascript
const SENSITIVITY_KEYWORDS = [
  'test_flag',
  'flag',
  // Add your keywords here
];
```

## FFmpeg Requirements

### Option 1: Using ffmpeg-static (Recommended)

The package includes a bundled FFmpeg binary. No installation needed.

### Option 2: System FFmpeg

Install FFmpeg on your system:

**Windows:**
```powershell
choco install ffmpeg
```

**macOS:**
```bash
brew install ffmpeg
```

**Linux:**
```bash
sudo apt-get install ffmpeg
```

## Testing

### 1. Upload a Video

```bash
curl -X POST http://localhost:3000/api/videos/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "video=@test_video.mp4" \
  -F "title=Test Video"
```

### 2. Connect with Socket.io

```javascript
const socket = io('http://localhost:3000', {
  auth: { token: 'YOUR_JWT_TOKEN' }
});

socket.on('video_processing_progress', console.log);
socket.on('video_processing_complete', console.log);
```

### 3. Test Flagging

Upload a video named `test_flag_video.mp4` - it will be automatically flagged.

## Processing Flow

```
Upload Video
    ↓
Create Video Document (PENDING)
    ↓
Start Background Processing
    ↓
[Socket] Progress: 0% - Initializing
    ↓
Extract Metadata (FFmpeg)
    ↓
[Socket] Progress: 25% - Metadata Extracted
    ↓
AI Sensitivity Scan (10 seconds)
    ↓
[Socket] Progress: 75% - AI Scan Complete
    ↓
Update Status (COMPLETED/FLAGGED)
    ↓
[Socket] Progress: 100% - Completed
    ↓
[Socket] Completion Event
```

## Error Handling

- If metadata extraction fails → Status: FLAGGED, Error message stored
- If processing fails → Status: FLAGGED, Error message stored
- Errors are emitted via Socket.io `video_processing_error` event
- Video document is always updated, even on error

## Performance

- **Non-blocking**: Processing runs asynchronously
- **Scalable**: Can be moved to a separate worker process
- **Real-time**: Progress updates via WebSocket
- **Efficient**: Only processes when video is uploaded

## Future Enhancements

- [ ] Move to message queue (Bull, RabbitMQ)
- [ ] Separate worker processes
- [ ] Thumbnail generation
- [ ] Video transcoding (multiple resolutions)
- [ ] Real AI/ML integration
- [ ] Processing queue management
- [ ] Retry mechanism for failed processing

