# Database Setup Guide - CAFFE Electoral Observer System

## Prerequisites

1. **Node.js** (v18 or higher)
2. **npm** or **yarn**
3. **Neon Database Account** (free tier available)

## Step 1: Get Neon Database Connection String

### Create Neon Database:
1. Go to [https://console.neon.tech](https://console.neon.tech)
2. Sign up/Login to your account
3. Click "Create Project"
4. Choose a project name (e.g., "caffe-electoral-observer")
5. Select a region (choose closest to your users)
6. Click "Create Project"

### Get Connection String:
1. In your Neon project dashboard, click "Connection Details"
2. Copy the connection string that looks like:
   ```
   postgresql://[user]:[password]@[hostname]/[database]?sslmode=require
   ```

## Step 2: Configure Environment Variables

### Update your `.env` file:

```bash
# Replace the DATABASE_URL with your actual Neon connection string
DATABASE_URL=postgresql://your_username:your_password@your_hostname/your_database?sslmode=require

# Example:
DATABASE_URL=postgresql://alex:password123@ep-cool-forest-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
```

### Required Environment Variables:
```bash
# Database (REQUIRED)
DATABASE_URL=your_neon_connection_string

# Security (REQUIRED)
SESSION_SECRET=caffe-electoral-observer-secret-key-2024
JWT_SECRET=caffe-electoral-observer-secret-2024
ENCRYPTION_KEY=caffe-electoral-observer-2024-secure-key

# Base URL (REQUIRED)
BASE_URL=http://localhost:5000
```

## Step 3: Install Dependencies

```bash
npm install
```

## Step 4: Run Database Migration

```bash
# This will create all tables in your database
npm run db:push
```

## Step 5: Verify Database Connection

```bash
# Start the development server
npm run dev
```

## Step 6: Test Database Connection

The application should start without database errors. You can verify by:

1. **Check Server Logs**: Look for successful database connection messages
2. **Access Admin Panel**: Go to `/admin` and try to log in
3. **Check Database Tables**: In Neon console, verify tables were created

## Database Schema Overview

Your database will include these main tables:

### Core Tables:
- `users` - Electoral observers and administrators
- `parishes` - Jamaican parishes
- `polling_stations` - Voting locations
- `assignments` - Observer assignments to stations
- `check_ins` - Location tracking
- `reports` - Incident and routine reports
- `documents` - Uploaded files and evidence

### Training System:
- `courses` - Training programs
- `course_modules` - Course sections
- `course_lessons` - Individual lessons
- `enrollments` - User course enrollments
- `training_completions` - Completed training
- `certificates` - Earned certificates

### Communication:
- `messages` - Direct messages
- `chat_rooms` - Group chat rooms
- `chat_messages` - Chat room messages
- `notifications` - System notifications

### Analytics:
- `audit_logs` - System activity logs
- `settings` - Application configuration
- `training_analytics` - Training performance data

## Troubleshooting

### Common Issues:

1. **"DATABASE_URL must be set"**
   - Ensure your `.env` file exists and has the correct DATABASE_URL
   - Check that the connection string is properly formatted

2. **"Connection failed"**
   - Verify your Neon database is active
   - Check if your IP is whitelisted (if using IP restrictions)
   - Ensure the connection string is correct

3. **"Table already exists"**
   - Run `npm run db:push` again (it's safe to run multiple times)
   - Or use `npm run db:generate` to create migration files

4. **"Permission denied"**
   - Check your Neon database user permissions
   - Ensure the user has CREATE, INSERT, UPDATE, DELETE permissions

### Reset Database (if needed):

```bash
# Drop all tables and recreate them
npm run db:push --force
```

## Security Notes

1. **Never commit your `.env` file** to version control
2. **Use strong secrets** for SESSION_SECRET, JWT_SECRET, and ENCRYPTION_KEY
3. **Rotate secrets** periodically in production
4. **Use environment-specific** connection strings (dev/staging/prod)

## Production Deployment

For production deployment:

1. **Use production database** (not free tier)
2. **Set up connection pooling** for better performance
3. **Configure backups** in Neon console
4. **Use environment variables** in your deployment platform
5. **Set up monitoring** for database performance

## Support

If you encounter issues:

1. Check the Neon documentation: [https://neon.tech/docs](https://neon.tech/docs)
2. Verify your connection string format
3. Check the application logs for specific error messages
4. Ensure all required environment variables are set 