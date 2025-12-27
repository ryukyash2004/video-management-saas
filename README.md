# Enterprise Video Analysis & Multi-Tenant Streaming Platform

> A production-ready, enterprise-grade SaaS platform for video management, real-time sensitivity analysis, and optimized streaming with strict multi-tenant data isolation.

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.18-blue.svg)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-7.0-green.svg)](https://www.mongodb.com/)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://reactjs.org/)
[![License](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Key Features](#key-features)
- [Technical Stack](#technical-stack)
- [Getting Started](#getting-started)
- [API Documentation](#api-documentation)
- [Security](#security)
- [Deployment](#deployment)
- [Roadmap](#roadmap)
- [Contributing](#contributing)

---

## 🎯 Overview

The **Enterprise Video Analysis & Multi-Tenant Streaming Platform** is a comprehensive SaaS solution designed for organizations requiring secure, scalable video management with intelligent content analysis. The platform provides:

- **Multi-Tenant Architecture**: Complete data isolation with tenant-scoped resources
- **Real-Time Processing**: Live status updates during video analysis via WebSocket
- **Optimized Streaming**: HTTP Range Request support for efficient, seekable playback
- **Intelligent Analysis**: Automated sensitivity scanning with classification (SAFE/FLAGGED)
- **Role-Based Access Control**: Granular permissions (Admin, Editor, Viewer)
- **Enterprise Security**: JWT authentication, password hashing, tenant isolation

---

## 🏗️ Architecture

### Three-Tier Architecture

The platform follows a modern three-tier architecture pattern:

```
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                        │
│  React + Vite + Tailwind CSS (Frontend)                      │
│  • Real-time UI updates via Socket.io                       │
│  • Responsive video player with seeking                     │
│  • Role-based UI components                                  │
└─────────────────────────────────────────────────────────────┘
                            ↕ HTTP/WebSocket
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                         │
│  Node.js + Express (Backend API)                            │
│  • RESTful API endpoints                                     │
│  • JWT authentication & authorization                       │
│  • Socket.io real-time communication                        │
│  • Agentic Processing Pipeline                               │
│  • HTTP Range Request streaming                              │
└─────────────────────────────────────────────────────────────┘
                            ↕ Mongoose ODM
┌─────────────────────────────────────────────────────────────┐
│                      Data Layer                              │
│  MongoDB (Database)                                          │
│  • Multi-tenant data isolation                              │
│  • Indexed queries for performance                           │
│  • File system storage (tenant-organized)                    │
└─────────────────────────────────────────────────────────────┘
```

### Agentic Processing Pipeline

The platform implements an **Agentic Processing Pipeline** that autonomously processes videos through multiple stages:

```
┌─────────────┐
│   UPLOAD    │  User uploads video file
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   PENDING   │  Video document created, queued for processing
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ PROCESSING  │  Active processing stage
│             │  ├─ Metadata Extraction (FFmpeg)
│             │  ├─ AI Sensitivity Scan (10s simulation)
│             │  └─ Real-time progress updates (Socket.io)
└──────┬──────┘
       │
       ├──────────────┬──────────────┐
       ▼              ▼              ▼
┌──────────┐   ┌──────────┐   ┌──────────┐
│ COMPLETED│   │ FLAGGED  │   │  ERROR   │
│   SAFE   │   │  UNSAFE  │   │  STATE   │
└──────────┘   └──────────┘   └──────────┘
```

**Processing Stages:**

1. **PENDING** → Video uploaded, awaiting processing
2. **PROCESSING** → Active analysis:
   - **0-25%**: Metadata extraction (duration, resolution, codec, bitrate)
   - **25-75%**: AI sensitivity scan (keyword detection, content analysis)
   - **75-100%**: Finalization and classification
3. **COMPLETED** → Video classified as SAFE, ready for streaming
4. **FLAGGED** → Video contains sensitive content, blocked from playback

**Real-Time Updates**: Each stage emits progress updates via Socket.io to tenant-specific rooms (`tenant_{tenantId}`), providing live feedback to users.

---

## ✨ Key Features

### 1. Multi-Tenancy with Strict Data Isolation

**Implementation**: Every resource (User, Video) includes a `tenantId` field that is:
- **Required** at the schema level (Mongoose validation)
- **Indexed** for efficient querying (compound indexes)
- **Enforced** at multiple layers:
  - Database queries (automatic filtering)
  - Middleware (tenant isolation validation)
  - File storage (tenant-specific directories)

**Security Layers:**
```
┌─────────────────────────────────────────┐
│ 1. Schema-Level: tenantId required      │
│    → MongoDB validation                 │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│ 2. JWT Payload: tenantId embedded       │
│    → User's tenant enforced in token    │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│ 3. Middleware: Automatic filtering      │
│    → All queries scoped to tenantId     │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│ 4. Application Logic: Explicit checks   │
│    → Controller-level validation        │
└─────────────────────────────────────────┘
```

**Result**: Complete data segregation - users can only access resources belonging to their tenant, with zero cross-tenant data leakage.

### 2. Real-Time Feedback via Socket.io

**Integration**: WebSocket-based real-time communication provides live updates during video processing.

**Architecture:**
- **Tenant-Based Rooms**: Users automatically join `tenant_{tenantId}` room on connection
- **JWT Authentication**: Socket connections authenticated via JWT token
- **Progress Events**: Emitted at each processing stage (0%, 25%, 50%, 75%, 100%)
- **Completion Events**: Final status (COMPLETED/FLAGGED) broadcast to tenant room

**Event Flow:**
```javascript
// Client connects with JWT
socket = io('ws://server', { auth: { token: jwt } })

// Automatically joins tenant room
socket.on('connected', { room: 'tenant_123' })

// Receives progress updates
socket.on('video_processing_progress', {
  videoId: '...',
  progress: 50,
  stage: 'AI Sensitivity Scan',
  message: 'Running content analysis...'
})

// Receives completion
socket.on('video_processing_complete', {
  videoId: '...',
  status: 'COMPLETED',
  video: { ... }
})
```

**Frontend Integration**: React components subscribe to Socket.io events, updating UI in real-time with progress bars and status badges.

### 3. Optimized Streaming with HTTP Range Requests

**Implementation**: HTTP 206 Partial Content responses enable efficient, seekable video playback.

**How It Works:**
1. **Client Request**: Browser requests specific byte range
   ```
   GET /api/videos/stream/:id
   Range: bytes=0-1048575
   Authorization: Bearer <token>
   ```

2. **Server Response**: Returns only requested chunk
   ```
   HTTP/1.1 206 Partial Content
   Content-Range: bytes 0-1048575/52428800
   Content-Length: 1048576
   Content-Type: video/mp4
   Accept-Ranges: bytes
   ```

3. **Benefits**:
   - ✅ **Efficient Bandwidth**: Only requested chunks transferred
   - ✅ **Seeking Support**: Users can jump to any position
   - ✅ **Progressive Loading**: Video starts playing while downloading
   - ✅ **Memory Efficient**: No need to load entire file into memory
   - ✅ **Browser Native**: Works with standard HTML5 `<video>` element

**Streaming Controller Features:**
- Automatic range parsing and validation
- Tenant isolation enforcement
- Role-based access (VIEWER restrictions)
- FLAGGED video blocking
- Query parameter token support for video player

### 4. Security Implementation

#### JWT-Based Role-Based Access Control (RBAC)

**Roles:**
- **ADMIN**: Full access to all tenant resources, can manage processing status
- **EDITOR**: Can upload, edit, and delete own videos, view all tenant videos
- **VIEWER**: Read-only access to public videos or own videos, cannot upload

**Implementation:**
```javascript
// JWT Payload Structure
{
  userId: "user_id",
  // Embedded in token for stateless auth
}

// Request Object (after auth middleware)
req.user = {
  id: "user_id",
  email: "user@example.com",
  role: "ADMIN" | "EDITOR" | "VIEWER",
  tenantId: "tenant_id"  // Critical for isolation
}

// Authorization Middleware
authorize('ADMIN', 'EDITOR')  // Only these roles allowed
```

**Enforcement Points:**
- Route-level: `authorize()` middleware
- Controller-level: Role checks in business logic
- Query-level: VIEWER role filters results
- Frontend: UI elements hidden based on role

#### Password Security with Bcrypt

**Implementation:**
- **Hashing**: Bcrypt with 10 salt rounds
- **Storage**: Passwords never stored in plaintext
- **Comparison**: Secure password verification method
- **Pre-save Hook**: Automatic hashing before database save

```javascript
// Password hashing (automatic on save)
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Password verification
user.comparePassword(candidatePassword)  // Returns boolean
```

---

## 🛠️ Technical Stack

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| **Node.js** | 18+ | Runtime environment |
| **Express.js** | 4.18+ | Web framework |
| **MongoDB** | 7.0+ | NoSQL database |
| **Mongoose** | 7.5+ | ODM for MongoDB |
| **Socket.io** | 4.6+ | Real-time WebSocket communication |
| **FFmpeg** | Latest | Video metadata extraction |
| **fluent-ffmpeg** | 2.1+ | FFmpeg Node.js wrapper |
| **jsonwebtoken** | 9.0+ | JWT authentication |
| **bcryptjs** | 2.4+ | Password hashing |
| **multer** | 1.4+ | File upload handling |

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 18.2+ | UI framework |
| **Vite** | 5.0+ | Build tool & dev server |
| **Tailwind CSS** | 3.3+ | Utility-first CSS framework |
| **React Router** | 6.20+ | Client-side routing |
| **Socket.io Client** | 4.6+ | Real-time updates |
| **Axios** | 1.6+ | HTTP client |

### Development Tools

- **nodemon**: Auto-restart on file changes
- **dotenv**: Environment variable management

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18 or higher
- **MongoDB** (local installation or MongoDB Atlas account)
- **npm** or **yarn** package manager
- **FFmpeg** (optional - bundled via `ffmpeg-static` package)

### Step 1: Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd video-management-saas

# Install backend dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### Step 2: Environment Configuration

Create a `.env` file in the project root:

```bash
cp .env.example .env  # If .env.example exists, or create manually
```

**Required Environment Variables:**

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/video-management-saas
# OR for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/video-management-saas?retryWrites=true&w=majority

# JWT Authentication
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-change-in-production
JWT_EXPIRES_IN=7d

# CORS (for production)
CLIENT_URL=http://localhost:5173
```

**Frontend Environment** (`frontend/.env`):

```env
VITE_API_URL=http://localhost:3000/api
VITE_SOCKET_URL=http://localhost:3000
```

### Step 3: Database Setup

#### Option A: MongoDB Atlas (Recommended)

1. Create account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free M0 cluster
3. Get connection string and update `MONGODB_URI` in `.env`
4. Configure network access (allow `0.0.0.0/0` for development)

#### Option B: Local MongoDB

```bash
# Start MongoDB service
mongod

# Or on Windows
net start MongoDB
```

### Step 4: Bootstrap System

**Create your first tenant:**

```bash
node scripts/createTenant.js "Your Company Name" "company-domain"
```

**Output:**
```
✅ Tenant created successfully!

Tenant Details:
================
ID: 507f1f77bcf86cd799439011
Name: Your Company Name
Domain: company-domain

Use this Tenant ID when registering users:
507f1f77bcf86cd799439011
```

**Save the Tenant ID** - you'll need it for user registration.

### Step 5: Start Backend Server

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

Server will start on `http://localhost:3000`

### Step 6: Register and Login

**Register a user via API:**

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "SecurePassword123!",
    "firstName": "John",
    "lastName": "Doe",
    "role": "ADMIN",
    "tenantId": "507f1f77bcf86cd799439011"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "...",
      "email": "admin@example.com",
      "role": "ADMIN",
      "tenantId": "507f1f77bcf86cd799439011"
    }
  }
}
```

**Login to retrieve JWT:**

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "SecurePassword123!"
  }'
```

**Save the JWT token** - use it in `Authorization: Bearer <token>` header for authenticated requests.

### Step 7: Start Frontend

```bash
cd frontend
npm run dev
```

Frontend will start on `http://localhost:5173`

**Login in the browser** using the credentials you registered.

### Step 8: Test the Platform

1. **Upload a video** (as ADMIN or EDITOR):
   - Click "Upload Video" button
   - Select a video file
   - Watch real-time processing progress

2. **Test sensitivity flagging**:
   - Upload a video named `test_flag_video.mp4`
   - Video will be automatically FLAGGED
   - Try to play - should show warning overlay

3. **Test streaming**:
   - Wait for video to reach COMPLETED status
   - Click on video card
   - Video should play with seeking support

---

## 📡 API Documentation

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "role": "ADMIN" | "EDITOR" | "VIEWER",
  "tenantId": "tenant_object_id"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

### Video Management Endpoints

#### Upload Video
```http
POST /api/videos/upload
Authorization: Bearer <jwt-token>
Content-Type: multipart/form-data

Form Data:
- video: <file>
- title: "Video Title"
- description: "Video description"
- tags: "tag1,tag2"
- isPublic: false
```

#### Get All Videos
```http
GET /api/videos?page=1&limit=10&status=COMPLETED&search=keyword
Authorization: Bearer <jwt-token>
```

#### Get Video by ID
```http
GET /api/videos/:id
Authorization: Bearer <jwt-token>
```

#### Stream Video (HTTP Range Request)
```http
GET /api/videos/stream/:id
Authorization: Bearer <jwt-token>
Range: bytes=0-1048575
```

#### Get Stream Info
```http
GET /api/videos/:id/stream-info
Authorization: Bearer <jwt-token>
```

#### Update Processing Status (ADMIN only)
```http
PATCH /api/videos/:id/status
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "processingStatus": "COMPLETED" | "FLAGGED",
  "processingError": "Optional error message"
}
```

#### Delete Video (ADMIN, EDITOR)
```http
DELETE /api/videos/:id
Authorization: Bearer <jwt-token>
```

---

## 🔒 Security

### Multi-Layer Security Architecture

1. **Authentication**: JWT-based stateless authentication
2. **Authorization**: Role-based access control (RBAC)
3. **Data Isolation**: Multi-tenant data segregation
4. **Password Security**: Bcrypt hashing with salt
5. **Input Validation**: Request validation and sanitization
6. **CORS**: Configurable cross-origin resource sharing
7. **File Validation**: MIME type and size checks

### Security Best Practices

- ✅ Strong JWT secrets (minimum 32 characters)
- ✅ Password complexity requirements (enforced in schema)
- ✅ HTTPS in production (required for JWT security)
- ✅ Environment variables for sensitive data
- ✅ Tenant isolation at every layer
- ✅ Role-based UI and API restrictions

---

## 🚀 Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions to:
- **Vercel** (Frontend)
- **Render** (Backend)
- **MongoDB Atlas** (Database)

### Production Checklist

- [ ] Set strong `JWT_SECRET` (32+ characters, random)
- [ ] Configure MongoDB Atlas with proper network access
- [ ] Set `NODE_ENV=production`
- [ ] Configure CORS with production frontend URL
- [ ] Set up file storage (AWS S3 recommended)
- [ ] Enable HTTPS for all services
- [ ] Configure environment variables in hosting platform
- [ ] Set up monitoring and logging

---

## 🗺️ Roadmap

### Phase 1: Infrastructure Scaling (Q1 2024)

- [ ] **AWS S3 Integration**: Migrate file storage to S3 for scalability
  - Implement S3 upload/download handlers
  - Configure CDN (CloudFront) for video delivery
  - Implement lifecycle policies for cost optimization

- [ ] **Message Queue**: Implement Bull/BullMQ for processing queue
  - Move video processing to background workers
  - Implement job retry mechanisms
  - Add processing priority queues

### Phase 2: Advanced AI/ML Integration (Q2 2024)

- [ ] **TensorFlow.js Integration**: Client-side ML model for content analysis
  - Implement NSFW detection model
  - Real-time frame-by-frame analysis
  - Custom model training pipeline

- [ ] **AWS Rekognition Integration**: Enterprise-grade content moderation
  - Explicit content detection
  - Celebrity recognition
  - Text detection and moderation
  - Face detection and analysis

- [ ] **Custom ML Pipeline**: Train domain-specific models
  - Industry-specific content rules
  - Custom sensitivity thresholds
  - Multi-model ensemble approach

### Phase 3: Enhanced Features (Q3 2024)

- [ ] **Video Transcoding**: Multiple resolution support
  - Adaptive bitrate streaming (HLS/DASH)
  - Thumbnail generation
  - Video preview clips

- [ ] **Advanced Analytics**: Video performance metrics
  - View analytics dashboard
  - Engagement tracking
  - Processing time analytics

- [ ] **Collaboration Features**: Team workflows
  - Video sharing and permissions
  - Comments and annotations
  - Approval workflows

### Phase 4: Enterprise Features (Q4 2024)

- [ ] **SSO Integration**: SAML/OAuth support
- [ ] **Audit Logging**: Comprehensive activity logs
- [ ] **Compliance**: GDPR, SOC 2, HIPAA support
- [ ] **API Rate Limiting**: Advanced throttling
- [ ] **Webhook System**: Event notifications

---

## 📚 Additional Documentation

- [Frontend Setup Guide](./FRONTEND_SETUP.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [Processing Pipeline Details](./README_PROCESSING.md)
- [Streaming Implementation](./STREAMING_AND_FRONTEND.md)

---

## 🤝 Contributing

This is an enterprise SaaS platform. For contributions:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the ISC License.

---

## 👥 Support

For enterprise support, deployment assistance, or custom development:

- **Documentation**: See `/docs` directory
- **Issues**: Open a GitHub issue
- **Security**: Report security vulnerabilities privately

---

**Built with ❤️ for enterprise video management**
