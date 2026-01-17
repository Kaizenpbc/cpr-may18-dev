# Backend Deployment Guide - Render.com

This guide will help you deploy your CPR Training System backend to Render.com.

## Prerequisites

- GitHub account (your code is already on GitHub)
- Render.com account (free tier available)
- Your existing MySQL database or willingness to use Render's PostgreSQL

## Option 1: Quick Deploy (Recommended)

### Step 1: Sign Up for Render
1. Go to https://render.com
2. Click "Get Started" or "Sign Up"
3. Sign up with your GitHub account for easier integration

### Step 2: Create a New Web Service
1. From your Render dashboard, click "New +"
2. Select "Web Service"
3. Connect your GitHub repository: `Kaizenpbc/cpr-may18-dev`
4. Render will detect your repository

### Step 3: Configure the Web Service
Fill in the following settings:

**Basic Settings:**
- **Name:** `cpr-training-backend`
- **Region:** Oregon (US West) - or closest to you
- **Branch:** `master`
- **Root Directory:** `backend`
- **Runtime:** Node
- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm start`
- **Plan:** Free

### Step 4: Set Up Database

#### Option A: Use Render PostgreSQL (Recommended for Free Tier)
1. Click "New +" → "PostgreSQL"
2. **Name:** `cpr-training-db`
3. **Database:** `cpr_training`
4. **User:** `cpr_user`
5. **Region:** Same as your web service
6. **Plan:** Free
7. Click "Create Database"

**Note:** You'll need to update your backend code to support PostgreSQL instead of MySQL.

#### Option B: Use External MySQL Database
If you have an existing MySQL database or want to use a service like PlanetScale:
- Keep your MySQL configuration
- You'll add the connection details as environment variables

### Step 5: Configure Environment Variables

In your web service settings, go to the "Environment" tab and add these variables:

**Required Variables:**
```
NODE_ENV=production
PORT=10000
JWT_SECRET=<generate-a-long-random-string>
JWT_REFRESH_SECRET=<generate-another-long-random-string>
SESSION_SECRET=<generate-yet-another-long-random-string>
```

**Database Variables (if using Render PostgreSQL):**
```
DB_HOST=<from-render-database-internal-url>
DB_PORT=5432
DB_USER=cpr_user
DB_PASSWORD=<from-render-database>
DB_NAME=cpr_training
```

**Database Variables (if using external MySQL):**
```
DB_HOST=<your-mysql-host>
DB_PORT=3306
DB_USER=<your-mysql-user>
DB_PASSWORD=<your-mysql-password>
DB_NAME=<your-mysql-database>
```

**CORS Configuration:**
```
CORS_ORIGIN=https://your-netlify-site.netlify.app
```

### Step 6: Deploy
1. Click "Create Web Service"
2. Render will automatically build and deploy your backend
3. Wait for the deployment to complete (5-10 minutes)
4. You'll get a URL like: `https://cpr-training-backend.onrender.com`

### Step 7: Run Database Migrations
After deployment, you need to set up your database schema:

1. Go to your web service in Render
2. Click on "Shell" tab
3. Run these commands:
```bash
npm run migrate
npm run seed
```

### Step 8: Test Your Backend
Visit your backend URL + `/api/v1/health`:
```
https://cpr-training-backend.onrender.com/api/v1/health
```

You should see: `{"status":"ok"}`

## Option 2: Using render.yaml (Infrastructure as Code)

We've created a `render.yaml` file in your project root. To use it:

1. Push the `render.yaml` file to your GitHub repository
2. In Render, click "New +" → "Blueprint"
3. Connect your repository
4. Render will automatically detect the `render.yaml` and set everything up

## Update Frontend to Use Deployed Backend

After your backend is deployed, update your frontend:

### Step 1: Update Vite Config
Edit `frontend/vite.config.ts` and update the proxy target:

```typescript
server: {
  proxy: {
    '/api': {
      target: 'https://cpr-training-backend.onrender.com',
      changeOrigin: true,
      secure: true,
    },
  }
}
```

### Step 2: Create Environment Variable for Production
Create `frontend/.env.production`:

```
VITE_API_URL=https://cpr-training-backend.onrender.com
```

### Step 3: Update API Configuration
If you have an API configuration file, update it to use the environment variable:

```typescript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
```

### Step 4: Redeploy Frontend to Netlify
Commit and push your changes:
```bash
git add .
git commit -m "chore: configure frontend for deployed backend"
git push origin master
```

Netlify will automatically redeploy with the new configuration.

## Important Notes

### Free Tier Limitations
- **Render Free Tier:** Services spin down after 15 minutes of inactivity
- **First request after inactivity:** May take 30-60 seconds (cold start)
- **Database:** 90 days of inactivity before deletion
- **Build minutes:** 500 minutes/month

### Database Migration from MySQL to PostgreSQL

If you choose Render's PostgreSQL, you'll need to:

1. Update `backend/src/config/database.ts` to support PostgreSQL
2. Install `pg` package (already in your dependencies)
3. Update any MySQL-specific queries to PostgreSQL syntax
4. Export your local MySQL data and import to PostgreSQL

### Security Considerations

1. **Never commit secrets** to your repository
2. **Use environment variables** for all sensitive data
3. **Rotate secrets regularly** (JWT secrets, database passwords)
4. **Enable HTTPS** (Render provides this automatically)

## Troubleshooting

### Build Fails
- Check build logs in Render dashboard
- Ensure all dependencies are in `package.json`
- Verify TypeScript compiles locally: `npm run build`

### Database Connection Fails
- Verify environment variables are set correctly
- Check database is in the same region as web service
- Use internal database URL (faster, free)

### CORS Errors
- Ensure `CORS_ORIGIN` matches your Netlify URL exactly
- Include protocol (https://)
- No trailing slash

### Application Crashes
- Check application logs in Render dashboard
- Verify all required environment variables are set
- Check database migrations have run

## Alternative Deployment Options

If Render doesn't work for you, consider:

1. **Railway.app** - Similar to Render, generous free tier
2. **Fly.io** - Good for global deployment
3. **Heroku** - Classic PaaS (paid only now)
4. **DigitalOcean App Platform** - $5/month minimum
5. **AWS Elastic Beanstalk** - More complex but powerful

## Next Steps

After successful deployment:

1. ✅ Test all API endpoints
2. ✅ Verify authentication works
3. ✅ Test database operations
4. ✅ Monitor application logs
5. ✅ Set up error monitoring (optional: Sentry, LogRocket)
6. ✅ Configure custom domain (optional)

## Support

If you encounter issues:
- Check Render documentation: https://render.com/docs
- Review application logs in Render dashboard
- Test locally first to isolate deployment issues
