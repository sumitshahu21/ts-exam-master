
**Project Settings → Environment Variables**

### Database Configuration
```
DB_SERVER=your-sql-server.database.windows.net
DB_PORT=1433
DB_NAME=your_db_name
DB_USER=your_db_user
DB_PASSWORD=your_db_password
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
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=ExamMaster <your-email@gmail.com>
```

### Frontend Configuration
```
VITE_API_BASE_URL=/api
```


- All variables should be set to **Production** environment
- Do not include quotes around the values
- The `VITE_API_BASE_URL=/api` allows frontend to use relative URLs

