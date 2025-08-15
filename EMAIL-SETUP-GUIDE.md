# Email Configuration Setup Guide

## Quick Setup for Gmail

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate App Password**:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a new app password for "Mail"
3. **Update .env file**:

```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-actual-email@gmail.com
EMAIL_PASS=your-16-character-app-password
EMAIL_FROM=ExamMaster <your-actual-email@gmail.com>
```

## Other Email Providers

### Outlook/Hotmail
```env
EMAIL_HOST=smtp-mail.outlook.com
EMAIL_PORT=587
EMAIL_USER=your-email@outlook.com
EMAIL_PASS=your-password
```

### Yahoo
```env
EMAIL_HOST=smtp.mail.yahoo.com
EMAIL_PORT=587
EMAIL_USER=your-email@yahoo.com
EMAIL_PASS=your-app-password
```

## Development Mode

If email is not configured, the system will:
- Show OTP in server console
- Allow development/testing to continue
- Display helpful error messages

## Testing Email Setup

After configuration, restart the backend server:
```bash
cd backend
node working-server.js
```

Try registering a new account - you should see:
- "📧 Email service initialized with: your-email@gmail.com"
- OTP email delivered to the specified address

## Troubleshooting

- **"Email service not configured"**: Update EMAIL_USER and EMAIL_PASS in .env
- **"Authentication failed"**: Check if app password is correct (Gmail users)
- **"Connection timeout"**: Check EMAIL_HOST and EMAIL_PORT settings
- **"Invalid credentials"**: Verify email and password are correct
