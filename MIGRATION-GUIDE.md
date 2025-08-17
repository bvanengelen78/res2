# ResourceFlow Migration Guide: Replit to Supabase

This guide will help you migrate your ResourceFlow application from Replit to a standalone setup using Supabase as the database backend.

## Prerequisites

1. **Supabase Account**: Create a free account at [supabase.com](https://supabase.com)
2. **Node.js**: Ensure you have Node.js 18+ installed
3. **Git**: For version control (optional but recommended)

## Step 1: Set Up Supabase Project

1. **Create a new Supabase project**:
   - Go to [supabase.com/dashboard](https://supabase.com/dashboard)
   - Click "New Project"
   - Choose your organization
   - Enter project name: "ResourceFlow" (or your preferred name)
   - Enter a strong database password
   - Select a region close to your users
   - Click "Create new project"

2. **Get your project credentials**:
   - Go to Project Settings → API
   - Copy the following values:
     - Project URL
     - Anon (public) key
   - Go to Project Settings → Database
   - Copy the connection string (you'll need to replace `[YOUR-PASSWORD]` with your database password)

## Step 2: Configure Environment Variables

1. **Create a `.env` file** in your project root:
   ```bash
   cp .env.example .env
   ```

2. **Update the `.env` file** with your Supabase credentials:
   ```env
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_ANON_KEY=your-anon-key-here
   DATABASE_URL=postgresql://postgres:your-password@db.your-project-id.supabase.co:5432/postgres
   NODE_ENV=development
   SESSION_SECRET=your-session-secret-here
   ```

## Step 3: Set Up Database Schema

1. **Open Supabase SQL Editor**:
   - Go to your Supabase dashboard
   - Click on "SQL Editor" in the sidebar

2. **Run the migration script**:
   - Copy the contents of `supabase-migration.sql`
   - Paste it into the SQL Editor
   - Click "Run" to execute the script

3. **Verify tables were created**:
   - Go to "Table Editor" in the sidebar
   - You should see all the ResourceFlow tables

## Step 4: Install Dependencies

Run the following command to install all required dependencies:

```bash
npm install
```

## Step 5: Test the Application

1. **Start the development server**:
   ```bash
   npm run dev
   ```

2. **Open your browser** and navigate to `http://localhost:5000`

3. **Verify functionality**:
   - Check that the application loads without errors
   - Test database connectivity by trying to view resources or projects
   - Test user authentication if you have existing users

## Step 6: Data Migration (If Needed)

If you have existing data in your Replit/Neon database:

1. **Export data from your old database**:
   - Use `pg_dump` or export via your database admin interface
   - Export as SQL or CSV format

2. **Import data to Supabase**:
   - Use the Supabase SQL Editor for SQL imports
   - Use the Table Editor for CSV imports
   - Or use a database migration tool

## Step 7: Configure Row Level Security (Optional but Recommended)

For production use, configure Row Level Security policies in Supabase:

1. Go to Authentication → Policies in your Supabase dashboard
2. Create policies for each table based on your role-based access requirements
3. Example policy for resources table:
   ```sql
   CREATE POLICY "Users can view active resources" ON resources
   FOR SELECT USING (is_active = true);
   ```

## Step 8: Production Deployment

For production deployment:

1. **Update environment variables** for production
2. **Build the application**:
   ```bash
   npm run build
   ```
3. **Deploy to your preferred hosting platform** (Vercel, Netlify, Railway, etc.)
4. **Configure production database settings** in Supabase

## Troubleshooting

### Common Issues:

1. **Database connection errors**:
   - Verify your DATABASE_URL is correct
   - Check that your database password doesn't contain special characters that need URL encoding
   - Ensure your Supabase project is not paused

2. **Missing tables**:
   - Re-run the migration script in Supabase SQL Editor
   - Check for any SQL errors in the execution log

3. **Authentication issues**:
   - Verify SUPABASE_URL and SUPABASE_ANON_KEY are correct
   - Check that your environment variables are loaded properly

4. **Port conflicts**:
   - The application runs on port 5000 by default
   - If the port is in use, you can modify the port in `server/index.ts`

### Getting Help:

- Check the browser console for JavaScript errors
- Check the server logs for backend errors
- Verify all environment variables are set correctly
- Ensure all dependencies are installed with `npm install`

## Next Steps

After successful migration:

1. **Set up monitoring** and logging for your production environment
2. **Configure backups** in Supabase
3. **Set up CI/CD** for automated deployments
4. **Configure custom domain** if needed
5. **Set up email notifications** using Supabase Auth or external email service

## Support

If you encounter issues during migration:

1. Check this guide for common solutions
2. Review the Supabase documentation
3. Check the application logs for specific error messages
4. Ensure all environment variables are correctly configured
