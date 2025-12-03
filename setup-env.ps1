# Setup script for Windows PowerShell

# Backend .env
$backendEnv = @"
DATABASE_URL="file:./dev.db"
JWT_SECRET="dev-secret-key-change-in-production"
JWT_EXPIRES_IN="7d"
OPENAI_API_KEY="your-openai-api-key-here"
PORT=3001
NODE_ENV="development"
FRONTEND_URL="http://localhost:3000"
MAX_FILE_SIZE=10485760
UPLOAD_DEST="./uploads"
"@

# Frontend .env.local
$frontendEnv = @"
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=dev-nextauth-secret-change-in-production
"@

# Write backend .env
$backendEnv | Out-File -FilePath "backend\.env" -Encoding utf8 -NoNewline

# Write frontend .env.local
$frontendEnv | Out-File -FilePath "frontend\.env.local" -Encoding utf8 -NoNewline

Write-Host "Environment files created successfully!" -ForegroundColor Green
