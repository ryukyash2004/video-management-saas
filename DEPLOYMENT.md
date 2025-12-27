# Deployment Guide

This guide covers deploying the Video Management SaaS to Vercel (Frontend) and Render (Backend).

## Architecture

- **Frontend**: React + Vite (Deploy to Vercel)
- **Backend**: Node.js + Express (Deploy to Render)
- **Database**: MongoDB Atlas (Cloud)
- **File Storage**: Local filesystem (Render) or S3 (Production)

## Prerequisites

1. GitHub account
2. Vercel account (free tier available)
3. Render account (free tier available)
4. MongoDB Atlas account (free tier available)

---

## Part 1: Backend Deployment (Render)

### Step 1: Prepare Backend

1. **Create `render.yaml`** in the backend root:

```yaml
services:
  - type: web
    name: video-management-api
    env: node
    buildCommand: npm install
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 10000
      - key: MONGODB_URI
        sync: false
      - key: JWT_SECRET
        generateValue: true
      - key: JWT_EXPIRES_IN
        value: 7d
      - key: CLIENT_URL
        value: https://your-frontend.vercel.app
```

2. **Update `package.json`** to ensure start script:

```json
{
  "scripts": {
    "start": "node server.js"
  }
}
```

### Step 2: Deploy to Render

1. **Push to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/yourusername/video-management-saas.git
   git push -u origin main
   ```

2. **Create Render Service**:
   - Go to [Render Dashboard](https://dashboard.render.com)
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select the repository
   - Configure:
     - **Name**: `video-management-api`
     - **Root Directory**: `video-management-saas` (or root if backend is at root)
     - **Environment**: `Node`
     - **Build Command**: `npm install`
     - **Start Command**: `npm start`
     - **Plan**: Free (or paid for better performance)

3. **Set Environment Variables** in Render Dashboard:
   ```
   NODE_ENV=production
   PORT=10000
   MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/dbname
   JWT_SECRET=your-super-secret-key-min-32-chars
   JWT_EXPIRES_IN=7d
   CLIENT_URL=https://your-frontend.vercel.app
   ```

4. **Deploy**: Click "Create Web Service"

5. **Note the URL**: `https://video-management-api.onrender.com`

### Step 3: Configure CORS

Update `server.js` CORS configuration:

```javascript
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
```

---

## Part 2: Frontend Deployment (Vercel)

### Step 1: Prepare Frontend

1. **Create `vercel.json`** in frontend root:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

2. **Update `.env.production`**:

```env
VITE_API_URL=https://video-management-api.onrender.com/api
VITE_SOCKET_URL=https://video-management-api.onrender.com
```

### Step 2: Deploy to Vercel

#### Option A: Vercel CLI

```bash
cd frontend
npm install -g vercel
vercel login
vercel
```

Follow prompts:
- Set up and deploy? **Yes**
- Which scope? **Your account**
- Link to existing project? **No**
- Project name? **video-management-frontend**
- Directory? **./**
- Override settings? **No**

#### Option B: Vercel Dashboard

1. **Push frontend to GitHub** (separate repo or monorepo)
2. Go to [Vercel Dashboard](https://vercel.com/dashboard)
3. Click "Add New..." → "Project"
4. Import your GitHub repository
5. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
6. **Add Environment Variables**:
   ```
   VITE_API_URL=https://video-management-api.onrender.com/api
   VITE_SOCKET_URL=https://video-management-api.onrender.com
   ```
7. Click "Deploy"

### Step 3: Update Backend CORS

After frontend is deployed, update Render environment variable:
```
CLIENT_URL=https://your-frontend.vercel.app
```

Redeploy backend if needed.

---

## Part 3: MongoDB Atlas Setup

1. **Create Cluster**:
   - Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
   - Create free M0 cluster
   - Choose region closest to your Render region

2. **Configure Network Access**:
   - Add IP: `0.0.0.0/0` (allow all) or Render's IP ranges

3. **Create Database User**:
   - Database Access → Add New User
   - Username/Password
   - Save credentials

4. **Get Connection String**:
   - Connect → Connect your application
   - Copy connection string
   - Replace `<password>` with your password
   - Use in Render `MONGODB_URI`

---

## Part 4: Socket.io Configuration

### Update Socket.io CORS

In `config/socket.js`:

```javascript
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "*",
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});
```

---

## Part 5: File Storage (Production)

For production, use cloud storage instead of local filesystem:

### Option A: AWS S3

1. Install `aws-sdk`:
   ```bash
   npm install aws-sdk
   ```

2. Update `config/multer.js` to use S3 storage

3. Set environment variables:
   ```
   AWS_ACCESS_KEY_ID=your-key
   AWS_SECRET_ACCESS_KEY=your-secret
   AWS_BUCKET_NAME=your-bucket
   AWS_REGION=us-east-1
   ```

### Option B: Render Disk (Temporary)

Render provides persistent disk storage. Files persist across deploys but are lost if service is deleted.

---

## Part 6: Environment Variables Summary

### Backend (Render)

```
NODE_ENV=production
PORT=10000
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
CLIENT_URL=https://your-frontend.vercel.app
```

### Frontend (Vercel)

```
VITE_API_URL=https://video-management-api.onrender.com/api
VITE_SOCKET_URL=https://video-management-api.onrender.com
```

---

## Part 7: Testing Deployment

1. **Test Backend**:
   ```bash
   curl https://video-management-api.onrender.com/health
   ```

2. **Test Frontend**:
   - Visit your Vercel URL
   - Login with test credentials
   - Upload a video
   - Check Socket.io connection

3. **Test Streaming**:
   - Upload a video
   - Wait for processing
   - Play video in player

---

## Troubleshooting

### Backend Issues

**Issue**: MongoDB connection fails
- **Solution**: Check network access in Atlas, verify connection string

**Issue**: CORS errors
- **Solution**: Verify `CLIENT_URL` matches frontend URL exactly

**Issue**: Socket.io not connecting
- **Solution**: Check CORS settings, verify WebSocket support on Render

### Frontend Issues

**Issue**: API calls fail
- **Solution**: Verify `VITE_API_URL` is correct, check CORS

**Issue**: Socket.io not connecting
- **Solution**: Verify `VITE_SOCKET_URL`, check backend CORS

**Issue**: Build fails
- **Solution**: Check Node version, ensure all dependencies are in `package.json`

---

## Production Checklist

- [ ] MongoDB Atlas cluster created and configured
- [ ] Backend deployed to Render
- [ ] Frontend deployed to Vercel
- [ ] Environment variables set correctly
- [ ] CORS configured for both services
- [ ] Socket.io CORS configured
- [ ] File storage configured (S3 or Render disk)
- [ ] JWT_SECRET is strong and secure
- [ ] Health check endpoint working
- [ ] Video upload working
- [ ] Video streaming working
- [ ] Socket.io real-time updates working
- [ ] RBAC working correctly

---

## Cost Estimation

### Free Tier (Development/Small Scale)

- **Vercel**: Free (unlimited personal projects)
- **Render**: Free (spins down after 15 min inactivity)
- **MongoDB Atlas**: Free (512MB storage)

### Paid Tier (Production)

- **Vercel Pro**: $20/month (team features)
- **Render**: $7/month per service (always on)
- **MongoDB Atlas**: $9/month (M10 cluster, 10GB storage)

---

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Render Documentation](https://render.com/docs)
- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/)
- [Socket.io Deployment Guide](https://socket.io/docs/v4/deployment/)

---

## Support

For issues:
1. Check Render logs: Dashboard → Service → Logs
2. Check Vercel logs: Dashboard → Project → Deployments → Logs
3. Check MongoDB Atlas logs: Monitoring → Logs

