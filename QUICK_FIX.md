# Quick Fix: MongoDB Connection Error

## The Problem
```
Error: connect ECONNREFUSED ::1:27017, connect ECONNREFUSED 127.0.0.1:27017
```

This means MongoDB is not running on your local machine.

## Solution Options

### Option 1: Start Local MongoDB (If Installed)

**Check if MongoDB is installed:**
```powershell
# Check if mongod.exe exists
Get-Command mongod -ErrorAction SilentlyContinue
```

**If MongoDB is installed, start it:**
```powershell
# Option A: Start as Windows Service (if installed as service)
Start-Service MongoDB

# Option B: Start manually in a new terminal
mongod --dbpath "C:\data\db"
# (You may need to create C:\data\db directory first)
```

**Verify it's running:**
```powershell
# Test connection
mongosh
# Or: mongo (for older versions)
```

### Option 2: Use MongoDB Atlas (Easiest - Recommended)

1. **Go to**: https://www.mongodb.com/cloud/atlas/register
2. **Create free account** (no credit card needed)
3. **Create a free cluster** (M0 - Free tier)
4. **Get connection string**:
   - Click "Connect" → "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your database user password
5. **Update your .env file**:
   ```env
   MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/video-management-saas?retryWrites=true&w=majority
   ```

### Option 3: Install MongoDB (If Not Installed)

**Using Chocolatey:**
```powershell
# Install Chocolatey first if needed: https://chocolatey.org/install
choco install mongodb
```

**Or download from**: https://www.mongodb.com/try/download/community

**After installation:**
```powershell
# Create data directory
New-Item -ItemType Directory -Path "C:\data\db" -Force

# Start MongoDB
mongod --dbpath "C:\data\db"
```

## After Fixing MongoDB Connection

Once MongoDB is running, try again:
```powershell
node scripts/createTenant.js "Acme Corp" "acme"
```

## Quick Test

Test if MongoDB is accessible:
```powershell
# Try connecting with mongosh
mongosh mongodb://localhost:27017
```

If this works, your script should work too!

