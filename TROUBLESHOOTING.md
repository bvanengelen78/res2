# ResourceFlow Migration Troubleshooting Guide

## Common Issues and Solutions

### 1. Environment Variables Issues

#### Problem: "SUPABASE_URL must be set" error
**Solution:**
- Check your `.env` file exists in the project root
- Verify the SUPABASE_URL format: `https://your-project-id.supabase.co`
- Ensure no extra spaces or quotes around the value

#### Problem: "DATABASE_URL must be set" error
**Solution:**
- Verify your DATABASE_URL format: `postgresql://postgres:password@db.project-id.supabase.co:5432/postgres`
- Replace `password` with your actual database password
- Replace `project-id` with your actual Supabase project ID

### 2. Database Connection Issues

#### Problem: "Connection refused" or "timeout" errors
**Solutions:**
1. **Check Supabase project status**: Ensure your project is not paused
2. **Verify credentials**: Double-check your database password
3. **Check network**: Ensure you're not behind a restrictive firewall
4. **URL encoding**: If your password contains special characters, URL-encode them

#### Problem: "password authentication failed"
**Solutions:**
- Verify you're using the correct database password
- Reset your database password in Supabase settings if needed
- Ensure the password in DATABASE_URL matches exactly

### 3. Migration Script Issues

#### Problem: "relation already exists" errors
**Solution:**
- This is normal if you've run the script before
- The script uses `CREATE TABLE IF NOT EXISTS` so it's safe to re-run

#### Problem: "permission denied" errors
**Solution:**
- Ensure you're running the script in your own Supabase project
- Check that you have admin access to the project

### 4. Application Startup Issues

#### Problem: TypeScript compilation errors
**Solution:**
- These are pre-existing issues, not migration-related
- The app will still run despite TypeScript warnings
- Use `npm run dev` to start with hot reloading

#### Problem: "Cannot find module" errors
**Solutions:**
1. Run `npm install` to ensure all dependencies are installed
2. Delete `node_modules` and `package-lock.json`, then run `npm install`
3. Check that all required dependencies are in package.json

### 5. Runtime Issues

#### Problem: "Table doesn't exist" errors
**Solutions:**
1. Verify migration script ran successfully
2. Check table names in Supabase Table Editor
3. Run the verification script: `verify-migration.sql`

#### Problem: Authentication not working
**Solutions:**
1. Check JWT_SECRET is set in .env
2. Verify user tables exist in database
3. Check browser console for authentication errors

## Diagnostic Commands

### Test Database Connection
```bash
node test-db-connection.js
```

### Check Environment Variables
```bash
# Windows
echo %SUPABASE_URL%
echo %DATABASE_URL%

# Or check in Node.js
node -e "require('dotenv').config(); console.log(process.env.SUPABASE_URL)"
```

### Verify Tables in Database
Run this in Supabase SQL Editor:
```sql
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
```

### Check Application Logs
```bash
npm run dev
# Check console output for specific error messages
```

## Getting Help

### Before Asking for Help
1. Run the database connectivity test
2. Check the browser console for errors
3. Verify all environment variables are set
4. Confirm migration script ran without errors

### Information to Provide
- Error messages (full stack trace)
- Environment variable status (without revealing actual values)
- Database connectivity test results
- Browser console errors (if applicable)

### Quick Fixes Checklist
- [ ] `.env` file exists and has correct values
- [ ] Supabase project is active (not paused)
- [ ] Migration script completed successfully
- [ ] All dependencies installed (`npm install`)
- [ ] No firewall blocking database connections
- [ ] Database password doesn't contain unescaped special characters

## Recovery Steps

### If Migration Fails Completely
1. **Reset database**: Drop all tables in Supabase SQL Editor:
   ```sql
   DROP SCHEMA public CASCADE;
   CREATE SCHEMA public;
   ```
2. **Re-run migration**: Execute `supabase-migration.sql` again
3. **Verify**: Run `verify-migration.sql`

### If Application Won't Start
1. **Clean install**:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```
2. **Check environment**: Verify `.env` file is correct
3. **Test database**: Run `node test-db-connection.js`

### If Data is Lost
- Supabase provides automatic backups
- Check "Database" → "Backups" in your Supabase dashboard
- You can restore from a previous backup if needed
