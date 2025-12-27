# PowerShell script to test the Video Management SaaS API
# Make sure the server is running first: npm run dev

$baseUrl = "http://localhost:3000"

Write-Host "`n🧪 Testing Video Management SaaS API`n" -ForegroundColor Cyan
Write-Host "=====================================`n"

# Test 1: Health Check
Write-Host "1. Testing Health Endpoint..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "$baseUrl/health" -Method Get
    Write-Host "   ✅ Server is running" -ForegroundColor Green
    Write-Host "   Response: $($health.message)`n" -ForegroundColor Gray
} catch {
    Write-Host "   ❌ Server not responding. Make sure 'npm run dev' is running`n" -ForegroundColor Red
    exit 1
}

# Get tenant ID from user
Write-Host "2. Register a new user" -ForegroundColor Yellow
$tenantId = Read-Host "   Enter Tenant ID (from createTenant script)"
$email = Read-Host "   Enter email"
$password = Read-Host "   Enter password" -AsSecureString
$passwordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($password))

$registerBody = @{
    email = $email
    password = $passwordPlain
    firstName = "Test"
    lastName = "User"
    role = "ADMIN"
    tenantId = $tenantId
} | ConvertTo-Json

try {
    $registerResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/register" -Method Post -Body $registerBody -ContentType "application/json"
    Write-Host "   ✅ User registered successfully" -ForegroundColor Green
    Write-Host "   Token: $($registerResponse.data.token.Substring(0, 50))..." -ForegroundColor Gray
    $token = $registerResponse.data.token
} catch {
    Write-Host "   ❌ Registration failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "   Details: $responseBody" -ForegroundColor Red
    }
    exit 1
}

# Test 3: Login
Write-Host "`n3. Testing Login..." -ForegroundColor Yellow
$loginBody = @{
    email = $email
    password = $passwordPlain
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
    Write-Host "   ✅ Login successful" -ForegroundColor Green
    $token = $loginResponse.data.token
    Write-Host "   User: $($loginResponse.data.user.firstName) $($loginResponse.data.user.lastName)" -ForegroundColor Gray
    Write-Host "   Role: $($loginResponse.data.user.role)" -ForegroundColor Gray
    Write-Host "   Tenant: $($loginResponse.data.user.tenantName)`n" -ForegroundColor Gray
} catch {
    Write-Host "   ❌ Login failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 4: Get Videos (should be empty)
Write-Host "4. Testing Get Videos..." -ForegroundColor Yellow
$headers = @{
    "Authorization" = "Bearer $token"
}

try {
    $videosResponse = Invoke-RestMethod -Uri "$baseUrl/api/videos" -Method Get -Headers $headers
    Write-Host "   ✅ Videos endpoint working" -ForegroundColor Green
    Write-Host "   Total videos: $($videosResponse.data.pagination.total)" -ForegroundColor Gray
} catch {
    Write-Host "   ❌ Failed to get videos: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n✅ API Testing Complete!`n" -ForegroundColor Green
Write-Host "You can now test video upload with:" -ForegroundColor Cyan
Write-Host '  curl -X POST http://localhost:3000/api/videos/upload \' -ForegroundColor Gray
$tokenPreview = if ($token) { $token.Substring(0, 20) } else { 'YOUR_TOKEN' }
Write-Host ('    -H "Authorization: Bearer ' + $tokenPreview + '..." \') -ForegroundColor Gray
Write-Host '    -F "video=@path/to/video.mp4" \' -ForegroundColor Gray
Write-Host '    -F "title=My Video"' -ForegroundColor Gray
Write-Host ''

