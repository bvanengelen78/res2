# PowerShell script to fix all requireAuth: true to requireAuth: false for demo mode
# This script systematically updates all serverless functions for demo mode compatibility

Write-Host "🔧 Fixing authentication requirements for demo mode..." -ForegroundColor Yellow

# Get all JavaScript files in the api directory that contain requireAuth: true
$files = Get-ChildItem -Path "api" -Recurse -Include "*.js" | Where-Object {
    (Get-Content $_.FullName -Raw) -match "requireAuth:\s*true"
}

Write-Host "📁 Found $($files.Count) files with requireAuth: true" -ForegroundColor Cyan

foreach ($file in $files) {
    Write-Host "🔄 Processing: $($file.FullName)" -ForegroundColor Green
    
    # Read the file content
    $content = Get-Content $file.FullName -Raw
    
    # Replace requireAuth: true with requireAuth: false and add comment
    $newContent = $content -replace "requireAuth:\s*true,", "requireAuth: false, // Changed to false for demo mode"
    
    # Write the updated content back to the file
    Set-Content -Path $file.FullName -Value $newContent -NoNewline
    
    Write-Host "✅ Updated: $($file.Name)" -ForegroundColor Green
}

Write-Host "🎉 All authentication requirements fixed for demo mode!" -ForegroundColor Green
Write-Host "📋 Summary: Updated $($files.Count) serverless functions" -ForegroundColor Cyan

# List the files that were updated
Write-Host "`n📝 Updated files:" -ForegroundColor Yellow
foreach ($file in $files) {
    Write-Host "  - $($file.FullName.Replace((Get-Location).Path + '\', ''))" -ForegroundColor White
}

Write-Host "`n🚀 Ready for Vercel deployment!" -ForegroundColor Green
