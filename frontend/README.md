# Video Management SaaS - Frontend

React frontend for the Video Management SaaS platform built with Vite, React, and Tailwind CSS.

## Features

- 🎥 Video dashboard with grid layout
- 📤 Video upload with progress tracking
- ▶️ Video player with HTTP Range Request streaming
- 🔐 JWT authentication
- 👥 Role-based access control (RBAC)
- 🔴 Real-time processing updates via Socket.io
- ⚠️ Flagged video warnings
- 📱 Responsive design

## Tech Stack

- **React 18** - UI framework
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **React Router** - Routing
- **Socket.io Client** - Real-time updates
- **Axios** - HTTP client

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Backend server running (see main README)

### Installation

1. **Navigate to frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Create environment file**:
   ```bash
   cp .env.example .env
   ```

4. **Update `.env`**:
   ```env
   VITE_API_URL=http://localhost:3000/api
   VITE_SOCKET_URL=http://localhost:3000
   ```

5. **Start development server**:
   ```bash
   npm run dev
   ```

6. **Open browser**:
   Navigate to `http://localhost:5173`

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── Dashboard.jsx      # Main dashboard with video grid
│   │   ├── VideoPlayer.jsx    # Video player component
│   │   ├── VideoCard.jsx       # Video card component
│   │   ├── UploadModal.jsx     # Upload modal
│   │   └── Login.jsx           # Login page
│   ├── utils/
│   │   ├── api.js             # Axios configuration
│   │   └── auth.js            # Authentication utilities
│   ├── App.jsx                # Main app component
│   ├── main.jsx               # Entry point
│   └── index.css              # Global styles
├── index.html
├── package.json
├── vite.config.js
└── tailwind.config.js
```

## Components

### Dashboard

Main dashboard showing:
- Video grid with thumbnails
- Processing status badges
- Real-time progress bars (Socket.io)
- Upload button (hidden for VIEWER role)
- User info and logout

### VideoPlayer

Video player component with:
- HTTP Range Request streaming
- SAFE/FLAGGED video handling
- Processing status display
- Video metadata
- Warning overlay for flagged videos

### UploadModal

Upload modal with:
- File selection
- Title and description inputs
- Upload progress bar
- Error handling
- RBAC check (only ADMIN/EDITOR)

### VideoCard

Video card showing:
- Thumbnail placeholder
- Processing status badge
- Progress bar (when processing)
- Duration
- Click to play

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `http://localhost:3000/api` |
| `VITE_SOCKET_URL` | Socket.io server URL | `http://localhost:3000` |

## Building for Production

```bash
npm run build
```

Output will be in `dist/` directory.

## Deployment

See `../DEPLOYMENT.md` for detailed deployment instructions to Vercel.

## Features in Detail

### Real-Time Updates

The dashboard connects to Socket.io and listens for:
- `video_processing_progress` - Progress updates
- `video_processing_complete` - Processing completion
- `video_processing_error` - Processing errors

### RBAC Implementation

- **ADMIN**: Full access, can upload, view all videos
- **EDITOR**: Can upload, view all videos
- **VIEWER**: Can only view public videos or own videos, cannot upload

### Video Streaming

Uses HTTP Range Requests (206 Partial Content) for:
- Seeking through videos
- Efficient bandwidth usage
- Progressive loading

### Flagged Videos

- Show warning overlay
- Cannot be played
- Display reason for flagging

## Troubleshooting

### Socket.io not connecting

- Check `VITE_SOCKET_URL` is correct
- Verify backend CORS settings
- Check browser console for errors

### API calls failing

- Verify `VITE_API_URL` is correct
- Check backend is running
- Verify JWT token is valid

### Build errors

- Clear `node_modules` and reinstall
- Check Node.js version (18+)
- Verify all dependencies are installed

## Development

### Adding New Components

1. Create component in `src/components/`
2. Import and use in `App.jsx` or parent component
3. Add Tailwind classes for styling

### Styling

Uses Tailwind CSS utility classes. Customize in `tailwind.config.js`.

## License

ISC

