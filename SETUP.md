# Setup Guide

## MongoDB Setup

### Option 1: Local MongoDB

1. **Install MongoDB** (if not already installed)
   - Windows: Download from [MongoDB Download Center](https://www.mongodb.com/try/download/community)
   - Or use Chocolatey: `choco install mongodb`

2. **Start MongoDB Service**
   ```powershell
   # Check if MongoDB service is running
   Get-Service MongoDB
   
   # Start MongoDB service (if not running)
   Start-Service MongoDB
   
   # Or start manually
   mongod
   ```

3. **Verify MongoDB is running**
   ```powershell
   # Test connection
   mongosh
   # Or older versions: mongo
   ```

### Option 2: MongoDB Atlas (Cloud - Recommended for Development)

1. **Create a free account** at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)

2. **Create a cluster** (free tier available)

3. **Get connection string**:
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your database user password

4. **Update .env file**:
   ```env
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/video-management-saas?retryWrites=true&w=majority
   ```

## Environment Setup

1. **Create .env file** in the project root:
   ```env
   PORT=3000
   MONGODB_URI=mongodb://localhost:27017/video-management-saas
   JWT_SECRET=your-super-secret-jwt-key-change-in-production-min-32-chars
   JWT_EXPIRES_IN=7d
   NODE_ENV=development
   ```

2. **Install dependencies**:
   ```powershell
   npm install
   ```

3. **Create your first tenant**:
   ```powershell
   node scripts/createTenant.js "Acme Corp" "acme"
   ```

4. **Start the server**:
   ```powershell
   npm run dev
   ```

## Quick Test

Once MongoDB is running and the server is started:

1. **Register a user** (replace `<tenant-id>` with ID from createTenant script):
   ```powershell
   curl -X POST http://localhost:3000/api/auth/register `
     -H "Content-Type: application/json" `
     -d '{\"email\":\"admin@test.com\",\"password\":\"password123\",\"firstName\":\"Admin\",\"lastName\":\"User\",\"role\":\"ADMIN\",\"tenantId\":\"<tenant-id>\"}'
   ```

2. **Login**:
   ```powershell
   curl -X POST http://localhost:3000/api/auth/login `
     -H "Content-Type: application/json" `
     -d '{\"email\":\"admin@test.com\",\"password\":\"password123\"}'
   ```

## Troubleshooting

### MongoDB Connection Refused

**Error**: `connect ECONNREFUSED ::1:27017`

**Solutions**:
1. Make sure MongoDB service is running
2. Check if MongoDB is installed
3. Try using MongoDB Atlas instead
4. Verify your `.env` file has the correct `MONGODB_URI`

### Port Already in Use

**Error**: `Port 3000 is already in use`

**Solution**: Change `PORT` in `.env` to a different port (e.g., 3001)

### Module Not Found

**Error**: `Cannot find module 'xyz'`

**Solution**: Run `npm install` to install all dependencies

