# ResourceFlow Deployment Guide

## 🚀 Vercel Deployment Checklist

### Prerequisites
- [ ] Supabase project created and configured
- [ ] GitHub repository connected to Vercel
- [ ] All environment variables ready

### Required Environment Variables for Vercel

Set these in **Vercel Dashboard > Project > Settings > Environment Variables**:

| Variable | Environment | Value | Notes |
|----------|-------------|-------|-------|
| `SUPABASE_URL` | Production | `https://your-project-id.supabase.co` | From Supabase API settings |
| `SUPABASE_ANON_KEY` | Production | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | From Supabase API settings |
| `SUPABASE_SERVICE_ROLE_KEY` | Production | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | From Supabase API settings |
| `DATABASE_URL` | Production | `postgresql://postgres:password@db.project.supabase.co:5432/postgres` | From Supabase Database settings |
| `JWT_SECRET` | Production | `your-64-character-random-string` | Generate securely |
| `JWT_REFRESH_SECRET` | Production | `your-64-character-random-string` | Generate securely |
| `NODE_ENV` | Production | `production` | Set to production |
| `JWT_EXPIRES_IN` | Production | `15m` | Optional, defaults to 15m |
| `JWT_REFRESH_EXPIRES_IN` | Production | `7d` | Optional, defaults to 7d |
| `SESSION_SECRET` | Production | `your-32-character-random-string` | Optional |

### Generate Secure Secrets

```bash
# Generate JWT secrets (run these commands locally)
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"
node -e "console.log('JWT_REFRESH_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"
node -e "console.log('SESSION_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
```

### Deployment Steps

1. **Verify Configuration Files**
   - [ ] `vercel.json` exists and is properly configured
   - [ ] `package.json` has `vercel-build` script
   - [ ] `vite.config.ts` uses `__dirname` correctly

2. **Set Environment Variables**
   - [ ] All required variables set in Vercel dashboard
   - [ ] Production values are secure and different from development

3. **Deploy**
   - [ ] Push changes to main branch
   - [ ] Verify Vercel build succeeds
   - [ ] Test deployed application

### Troubleshooting

**Build Fails:**
- Check build logs in Vercel dashboard
- Verify all dependencies are in `package.json`
- Ensure environment variables are set

**API Routes Don't Work:**
- Verify `vercel.json` routes configuration
- Check serverless function logs
- Validate environment variables

**Database Connection Issues:**
- Verify `DATABASE_URL` format
- Check Supabase project is active
- Validate connection string credentials

**Authentication Problems:**
- Ensure JWT secrets are set and secure
- Verify Supabase keys are correct
- Check CORS configuration

### Post-Deployment Verification

Test these endpoints after deployment:

```bash
# Health check
curl https://your-app.vercel.app/api/health

# Database health
curl https://your-app.vercel.app/api/health/database

# Frontend loads
curl https://your-app.vercel.app/
```

### Security Notes

- ⚠️ Never commit `.env` files to repository
- ✅ Use different secrets for production vs development
- ✅ Regularly rotate JWT secrets
- ✅ Monitor Vercel function logs for errors
- ✅ Keep Supabase service role key secure

### Support

If deployment issues persist:
1. Check Vercel build logs
2. Review Supabase project status
3. Validate all environment variables
4. Test API endpoints individually
