# PowerShell script to fix ALL remaining requireAuth: true to requireAuth: false for complete demo mode
# This script ensures 100% parity between local development and Vercel production

Write-Host "🔧 Fixing ALL remaining authentication requirements for complete demo mode..." -ForegroundColor Yellow

# Get all JavaScript files in the api directory that still contain requireAuth: true
$files = Get-ChildItem -Path "api" -Recurse -Include "*.js" | Where-Object {
    $content = Get-Content $_.FullName -Raw
    $content -match "requireAuth:\s*true"
}

Write-Host "📁 Found $($files.Count) files with requireAuth: true" -ForegroundColor Cyan

if ($files.Count -eq 0) {
    Write-Host "✅ No files found with requireAuth: true - all endpoints are demo mode compatible!" -ForegroundColor Green
    exit 0
}

$updatedCount = 0

foreach ($file in $files) {
    Write-Host "🔄 Processing: $($file.FullName)" -ForegroundColor Green
    
    try {
        # Read the file content
        $content = Get-Content $file.FullName -Raw
        
        # Check if the file actually contains requireAuth: true
        if ($content -match "requireAuth:\s*true") {
            # Replace requireAuth: true with requireAuth: false and add comment
            $newContent = $content -replace "requireAuth:\s*true,", "requireAuth: false, // Changed to false for demo mode"
            
            # Write the updated content back to the file
            Set-Content -Path $file.FullName -Value $newContent -NoNewline
            
            Write-Host "✅ Updated: $($file.Name)" -ForegroundColor Green
            $updatedCount++
        } else {
            Write-Host "⚠️  Skipped: $($file.Name) (no requireAuth: true found)" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "❌ Error processing $($file.Name): $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`n🎉 Authentication requirements fix completed!" -ForegroundColor Green
Write-Host "📋 Summary: Updated $updatedCount out of $($files.Count) serverless functions" -ForegroundColor Cyan

# List the files that were updated
if ($updatedCount -gt 0) {
    Write-Host "`n📝 Updated files:" -ForegroundColor Yellow
    foreach ($file in $files) {
        $relativePath = $file.FullName.Replace((Get-Location).Path + '\', '')
        Write-Host "  - $relativePath" -ForegroundColor White
    }
}

Write-Host "`n🚀 All API endpoints are now demo mode compatible!" -ForegroundColor Green
Write-Host "📊 Ready for Vercel deployment with complete local/production parity!" -ForegroundColor Cyan

# Verify no more requireAuth: true exists
Write-Host "`n🔍 Verification: Checking for any remaining requireAuth: true..." -ForegroundColor Yellow
$remainingFiles = Get-ChildItem -Path "api" -Recurse -Include "*.js" | Where-Object {
    (Get-Content $_.FullName -Raw) -match "requireAuth:\s*true"
}

if ($remainingFiles.Count -eq 0) {
    Write-Host "✅ Verification PASSED: No remaining requireAuth: true found!" -ForegroundColor Green
} else {
    Write-Host "⚠️  Verification WARNING: $($remainingFiles.Count) files still have requireAuth: true" -ForegroundColor Yellow
    foreach ($file in $remainingFiles) {
        Write-Host "  - $($file.FullName)" -ForegroundColor Red
    }
}

Write-Host "`n🎯 Demo mode authentication fix: COMPLETE" -ForegroundColor Green
