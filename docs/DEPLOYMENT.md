# Deployment Guide

CampSight is deployed as a split-service architecture: the React frontend on Netlify and the Express backend on Railway.

## Architecture Overview

```
┌─────────────────────┐         ┌─────────────────────┐
│   Netlify (CDN)     │         │   Railway (API)     │
│                     │         │                     │
│   React SPA         │────────▶│   Express Server    │
│   Static Assets     │  HTTPS  │   SQLite Database   │
│                     │         │   Cron Scheduler    │
└─────────────────────┘         └─────────────────────┘
                                          │
                                          ├────▶ Firebase Auth
                                          ├────▶ Recreation.gov API
                                          └────▶ Resend Email
```

## Frontend Deployment — Netlify

### Initial Setup

1. **Connect Repository**
   - Log in to [Netlify](https://netlify.com)
   - Click "Add new site" → "Import an existing project"
   - Connect your Git provider and select the repository

2. **Configure Build Settings**
   - Build command: `npx nx build web`
   - Publish directory: `dist/apps/web`
   - Base directory: (leave empty)

3. **Set Environment Variables**
   
   Go to **Site configuration → Environment variables** and add:
   
   ```
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
   VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef
   VITE_API_URL=https://your-api.railway.app
   ```

4. **Deploy**
   - Click "Deploy site"
   - Netlify will automatically deploy on every push to your main branch

### Configuration File

The `netlify.toml` file in the repository root configures the build:

```toml
[build]
  command = "npx nx build web"
  publish = "dist/apps/web"
  
  # Only rebuild when frontend changes
  ignore = "git diff --quiet $CACHED_COMMIT_REF $COMMIT_REF -- apps/web libs/shared"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### Custom Domain (Optional)

1. Go to **Domain management → Add custom domain**
2. Follow the instructions to configure DNS
3. Netlify provides automatic HTTPS via Let's Encrypt

### Build Optimization

The `ignore` directive in `netlify.toml` ensures Netlify only rebuilds when:
- Files in `apps/web/` change
- Files in `libs/shared/` change (shared types/schemas)

This saves build minutes and speeds up deployments for backend-only changes.

## Backend Deployment — Railway

### Initial Setup

1. **Connect Repository**
   - Log in to [Railway](https://railway.app)
   - Create a new project
   - Click "Deploy from GitHub repo"
   - Select your repository

2. **Configure Build Settings**
   
   Railway uses `railway.toml` for configuration (already in the repo):
   
   ```toml
   [build]
   builder = "NIXPACKS"
   buildCommand = "npx nx build api"
   
   [deploy]
   startCommand = "node dist/apps/api/main.js"
   healthcheckPath = "/health"
   restartPolicyType = "ON_FAILURE"
   restartPolicyMaxRetries = 10
   
   [watch]
   patterns = [
     "apps/api/**",
     "libs/shared/**",
     "package.json",
     "package-lock.json",
     "nx.json",
     "tsconfig.base.json"
   ]
   ```

3. **Set Up Persistent Storage**
   
   The SQLite database needs persistent storage:
   
   - Go to your service → **Variables** tab
   - Click **New Variable** → **Mount Volume**
   - Mount path: `/data`
   - Size: 1GB (or as needed)

4. **Set Environment Variables**
   
   Go to **Variables** tab and add:
   
   ```
   NODE_ENV=production
   PORT=3333
   DATABASE_PATH=/data/campsight.db
   CORS_ORIGIN=https://your-site.netlify.app
   
   FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
   RESEND_API_KEY=re_xxxxxxxxxxxxx
   RESEND_FROM_EMAIL=noreply@yourdomain.com
   RIDB_API_KEY=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   
   CHECK_INTERVAL=*/15 * * * *
   LOG_LEVEL=info
   ```
   
   **Important:** `FIREBASE_SERVICE_ACCOUNT_JSON` must be a single-line JSON string.

5. **Deploy**
   - Click "Deploy"
   - Railway will automatically deploy on every push to your main branch

### Accessing Logs

Railway provides real-time logs:
- Click on your service
- Go to the **Deployments** tab
- Click on a deployment to view logs

With Pino's JSON logging, you can pipe logs to log aggregators like Datadog, Loki, or CloudWatch.

### Health Checks

Railway automatically monitors the `/health` endpoint (configured in `railway.toml`). If the health check fails, Railway will restart the service according to the restart policy.

The health check endpoint in the API:

```typescript
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});
```

### Scaling (Optional)

Railway supports vertical and horizontal scaling:
- **Vertical:** Upgrade to a larger instance size in the service settings
- **Horizontal:** Add replicas (requires Redis or external session storage for multi-instance deployments)

Note: The current SQLite setup is single-instance only. For multi-instance deployments, migrate to PostgreSQL.

## Continuous Deployment

Both platforms support automatic deployments:

### Netlify
- Deploys automatically when changes are pushed to the main branch
- Only rebuilds when frontend or shared code changes (via `ignore` directive)
- Preview deployments for pull requests

### Railway
- Deploys automatically when changes are pushed to the main branch
- Only rebuilds when backend or shared code changes (via watch patterns)
- Supports branch deployments for testing

## Monitoring and Maintenance

### Logs

**Netlify:**
- Build logs: Site → **Deploys** → Click deployment
- Function logs: Not applicable (static site only)

**Railway:**
- Real-time logs: Service → **Deployments** → Click deployment
- Structured JSON logs (Pino) for easy parsing
- Filter by log level: `info`, `warn`, `error`

### Database Backups

Railway volumes are backed up automatically, but you should also:

1. **Set up periodic exports:**
   ```bash
   # SSH into Railway container (if enabled)
   sqlite3 /data/campsight.db .dump > backup.sql
   ```

2. **Download database locally:**
   - Railway doesn't provide direct file access
   - Consider adding an admin endpoint to export data
   - Or migrate to PostgreSQL with Railway's managed database

### Monitoring Checklist

- [ ] Set up uptime monitoring (e.g., UptimeRobot, Better Uptime)
- [ ] Configure error alerts (check Railway logs)
- [ ] Monitor email quota (Resend dashboard)
- [ ] Check RIDB API rate limits
- [ ] Review Firebase Auth usage

## Cost Estimation

### Netlify
- **Free tier:** 100GB bandwidth, 300 build minutes/month
- **Paid (Pro):** $19/month for higher limits

### Railway
- **Free trial:** $5 credit (no credit card required)
- **Hobby plan:** $5/month for 5 projects
- **Usage-based:** ~$0.000231/GB-hour for resources

### Firebase
- **Spark (Free):** 50K/day auth operations
- **Blaze (Pay as you go):** $0.055 per 50K operations after free tier

### Resend
- **Free tier:** 3,000 emails/month
- **Paid:** $20/month for 50,000 emails

**Estimated monthly cost for moderate usage:** $5-30/month

## Troubleshooting

### Frontend Can't Connect to Backend

1. Check `VITE_API_URL` in Netlify environment variables
2. Verify `CORS_ORIGIN` in Railway matches your Netlify URL
3. Check Railway logs for errors
4. Ensure Railway service is running (check deployment status)

### Database Errors on Railway

1. Verify volume is mounted at `/data`
2. Check `DATABASE_PATH=/data/campsight.db` in environment variables
3. Ensure sufficient disk space in volume settings
4. Check Railway logs for SQLite errors

### Email Notifications Not Sending

1. Verify Resend API key is correct
2. Check sending domain is verified in Resend dashboard
3. Review Resend logs for failures
4. Check Railway logs for email errors

### Authentication Failures

1. Verify Firebase service account JSON is valid and single-line
2. Check Firebase project has Google Auth enabled
3. Ensure frontend Firebase config matches project settings
4. Check browser console for Firebase errors

## Rollback

### Netlify
- Go to **Deploys** → Find previous deploy → Click **Publish deploy**

### Railway
- Go to **Deployments** → Find previous deploy → Click **Redeploy**

## Alternative Deployment Options

### Backend Alternatives
- **Render:** Similar to Railway, free tier available
- **Fly.io:** Global edge deployment
- **AWS EC2/Fargate:** More control, higher complexity
- **Vercel:** Serverless functions (requires architecture changes)

### Frontend Alternatives
- **Vercel:** Similar to Netlify, excellent DX
- **Cloudflare Pages:** Free tier with global CDN
- **AWS S3 + CloudFront:** Cost-effective for high traffic
- **GitHub Pages:** Free, but limited features

### Database Migration
For production scale, consider migrating from SQLite to:
- **Railway PostgreSQL:** Managed database, easy integration
- **Supabase:** PostgreSQL with built-in auth and storage
- **PlanetScale:** MySQL-compatible serverless database
- **Neon:** Serverless PostgreSQL with branching

## Security Checklist

- [ ] All API keys stored in environment variables (not in code)
- [ ] Firebase service account JSON kept secure
- [ ] CORS configured to allow only your frontend domain
- [ ] HTTPS enforced on both frontend and backend
- [ ] Rate limiting enabled on API endpoints
- [ ] Database volume encrypted (Railway default)
- [ ] Regular dependency updates (`npm audit`)

## Next Steps

After deployment:
1. Test the full user flow (sign in, create watch, receive email)
2. Monitor logs for the first few days
3. Set up error tracking (e.g., Sentry)
4. Configure uptime monitoring
5. Document any custom deployment steps for your team
