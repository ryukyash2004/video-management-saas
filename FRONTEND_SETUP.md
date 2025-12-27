# Frontend Quick Setup Guide

## Quick Start

1. **Install dependencies**:
   ```bash
   cd frontend
   npm install
   ```

2. **Set up environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your backend URL
   ```

3. **Start development server**:
   ```bash
   npm run dev
   ```

4. **Open browser**: `http://localhost:5173`

## First Time Setup

1. **Create a tenant** (backend):
   ```bash
   cd ..
   node scripts/createTenant.js "My Company" "mycompany"
   ```

2. **Register a user** (backend):
   - Use the test API script or curl
   - Or use the frontend registration (if implemented)

3. **Login** with your credentials

4. **Upload a video** (if ADMIN/EDITOR role)

5. **Watch real-time processing** in the dashboard

## Testing

### Test Upload
1. Login as ADMIN or EDITOR
2. Click "Upload Video"
3. Select a video file
4. Watch progress in dashboard

### Test Streaming
1. Wait for video to process (COMPLETED status)
2. Click on video card
3. Video should play with seeking support

### Test Flagging
1. Upload video named `test_flag_video.mp4`
2. Video will be flagged
3. Try to play - should show warning

### Test RBAC
1. Login as VIEWER
2. Upload button should be hidden
3. Can only view public/own videos

## Common Issues

**Port 5173 already in use**:
- Change port in `vite.config.js`

**CORS errors**:
- Check backend CORS settings
- Verify `VITE_API_URL` is correct

**Socket.io not connecting**:
- Check `VITE_SOCKET_URL`
- Verify backend Socket.io is running
- Check browser console

