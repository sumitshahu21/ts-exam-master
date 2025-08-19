# Vercel Environment Variables Setup Guide

## Required Environment Variables for Vercel Deployment

Add these environment variables in your Vercel Dashboard:
**Project Settings → Environment Variables**

### Database Configuration
```
DB_SERVER=""
DB_PORT=1433
DB_NAME=""
DB_USER=ntms
DB_PASSWORD=""
DB_ENCRYPT=true
DB_TRUST_SERVER_CERTIFICATE=false
```

### Application Configuration
```
NODE_ENV=production
JWT_SECRET=your-super-secret-jwt-key-here-change-in-production
PORT=3000
```

### Email Configuration (Gmail SMTP)
```
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=21107004.sumit.shahu@gmail.com
EMAIL_PASS=""
EMAIL_FROM=ExamMaster <21107004.sumit.shahu@gmail.com>
```

### Frontend Configuration
```
VITE_API_BASE_URL=/api
```

## Setup Instructions

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project: `ts-exam-master`
3. Navigate to: **Settings** → **Environment Variables**
4. Add each variable above with the **Environment** set to **Production**
5. Redeploy your application

## Important Notes

- All variables should be set to **Production** environment
- Do not include quotes around the values
- The `VITE_API_BASE_URL=/api` allows frontend to use relative URLs
- Backend will be accessible at `https://your-app.vercel.app/api/*`
