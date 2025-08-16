const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sql = require('mssql');

// Import route handlers, standardized evaluation, and email service
const initQuestionRoutes = require('./routes/questions');
const { evaluateStandardizedAnswer } = require('./standardized-evaluation');
const { evaluateAndFormatAnswer } = require('./new-standardized-evaluation');
const emailService = require('./emailService');

const app = express();

// Database configuration - using environment variables for security
const config = {
  server: process.env.DB_SERVER || 'localhost',
  port: parseInt(process.env.DB_PORT) || 1433,
  database: process.env.DB_NAME || 'exam_db',
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || '',
  options: {
    encrypt: process.env.NODE_ENV === 'production' ? true : false,
    trustServerCertificate: process.env.NODE_ENV === 'production' ? false : true,
    enableArithAbort: true,
  },
  connectionTimeout: 30000,
  requestTimeout: 30000,
};

// Middleware
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Database connection
let pool;

async function connectDB() {
  try {
    pool = await sql.connect(config);
    console.log('✅ Connected to Azure SQL Database');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
  }
}

// Registration endpoint - Step 1: Send OTP
app.post('/api/auth/register', async (req, res) => {
  try {
    console.log('📝 Registration attempt (OTP):', req.body);
    
    // Check if database is connected
    if (!pool) {
      console.error('❌ Database pool not initialized');
      return res.status(500).json({ message: 'Database connection not available' });
    }
    
    const { email, password, firstName, lastName, role = 'student', adminCode } = req.body;

    // Validate input
    if (!email || !password || !firstName || !lastName) {
      console.log('❌ Missing required fields');
      return res.status(400).json({ 
        message: 'Email, password, first name, and last name are required' 
      });
    }

    // Validate admin code if role is admin
    if (role === 'admin') {
      if (!adminCode || adminCode.trim().length === 0) {
        console.log('❌ Admin code required for admin registration');
        return res.status(400).json({ 
          message: 'Admin invite code is required for administrator accounts' 
        });
      }

      // Check if admin code exists and is not used
      const adminCodeResult = await pool.request()
        .input('code', sql.NVarChar, adminCode.trim())
        .query('SELECT id, is_used, used_by FROM admin_invite_codes WHERE code = @code');

      if (adminCodeResult.recordset.length === 0) {
        console.log('❌ Invalid admin code');
        return res.status(400).json({ 
          message: 'Invalid admin invite code' 
        });
      }

      const codeRecord = adminCodeResult.recordset[0];
      if (codeRecord.is_used) {
        console.log('❌ Admin code already used');
        return res.status(400).json({ 
          message: 'This admin invite code has already been used' 
        });
      }

      console.log('✅ Valid admin code provided');
    }

    // Validate input
    if (!email || !password || !firstName || !lastName) {
      console.log('❌ Missing required fields');
      return res.status(400).json({ 
        message: 'Email, password, first name, and last name are required' 
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    // Validate password strength
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    // Check if user already exists
    const existingUserResult = await pool.request()
      .input('email', sql.VarChar, email)
      .query('SELECT id, is_email_verified FROM users WHERE email = @email');

    if (existingUserResult.recordset.length > 0) {
      const existingUser = existingUserResult.recordset[0];
      if (existingUser.is_email_verified) {
        console.log('❌ User already exists and verified');
        return res.status(409).json({ message: 'User already exists with this email' });
      } else {
        // User exists but not verified, delete the old record and allow re-registration
        await pool.request()
          .input('email', sql.VarChar, email)
          .query('DELETE FROM users WHERE email = @email AND is_email_verified = 0');
        console.log('🗑️ Removed unverified user record');
      }
    }

    // Check OTP rate limiting
    const otpAttemptsResult = await pool.request()
      .input('email', sql.VarChar, email)
      .query(`
        SELECT attempt_count, blocked_until 
        FROM otp_attempts 
        WHERE email = @email 
        AND last_attempt_at > DATEADD(HOUR, -1, GETDATE())
      `);

    if (otpAttemptsResult.recordset.length > 0) {
      const attempts = otpAttemptsResult.recordset[0];
      if (attempts.blocked_until && new Date(attempts.blocked_until) > new Date()) {
        return res.status(429).json({ 
          message: 'Too many OTP requests. Please try again later.',
          retryAfter: attempts.blocked_until
        });
      }
      if (attempts.attempt_count >= 5) {
        // Block for 30 minutes
        await pool.request()
          .input('email', sql.VarChar, email)
          .input('blockedUntil', sql.DateTime2, new Date(Date.now() + 30 * 60 * 1000))
          .query(`
            UPDATE otp_attempts 
            SET blocked_until = @blockedUntil, last_attempt_at = GETDATE()
            WHERE email = @email
          `);
        return res.status(429).json({ 
          message: 'Too many OTP requests. Account temporarily blocked. Please try again after 30 minutes.'
        });
      }
    }

    // Generate OTP
    const otp = emailService.generateOTP();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    // Hash password for temporary storage
    const passwordHash = await bcrypt.hash(password, 12);
    console.log('🔐 Password hashed');

    // Store user data temporarily (unverified)
    const userInsertResult = await pool.request()
      .input('email', sql.VarChar, email)
      .input('password_hash', sql.VarChar, passwordHash)
      .input('first_name', sql.VarChar, firstName)
      .input('last_name', sql.VarChar, lastName)
      .input('role', sql.VarChar, role)
      .input('otp_code', sql.VarChar, otp)
      .input('otp_expires_at', sql.DateTime2, otpExpiresAt)
      .input('admin_code', sql.VarChar, role === 'admin' ? adminCode : null)
      .query(`
        INSERT INTO users (email, password_hash, first_name, last_name, role, otp_code, otp_expires_at, is_email_verified, admin_code_used)
        OUTPUT INSERTED.id
        VALUES (@email, @password_hash, @first_name, @last_name, @role, @otp_code, @otp_expires_at, 0, @admin_code)
      `);

    // Update or insert OTP attempts tracking
    await pool.request()
      .input('email', sql.VarChar, email)
      .query(`
        IF EXISTS (SELECT 1 FROM otp_attempts WHERE email = @email)
          UPDATE otp_attempts 
          SET attempt_count = attempt_count + 1, last_attempt_at = GETDATE()
          WHERE email = @email
        ELSE
          INSERT INTO otp_attempts (email, attempt_count, last_attempt_at)
          VALUES (@email, 1, GETDATE())
      `);

    // Send OTP email
    try {
      const emailResult = await emailService.sendOTPEmail(email, otp, firstName);
      
      if (!emailResult.success) {
        console.error('❌ Failed to send OTP email:', emailResult.error);
        
        // If email service is not configured, show helpful message
        if (emailResult.error.includes('not configured')) {
          return res.status(500).json({ 
            message: 'Email service not configured. Please contact administrator to set up email credentials.',
            devNote: 'Update EMAIL_USER and EMAIL_PASS in .env file'
          });
        }
        
        // Clean up the user record if email fails
        await pool.request()
          .input('email', sql.VarChar, email)
          .query('DELETE FROM users WHERE email = @email AND is_email_verified = 0');
        
        return res.status(500).json({ 
          message: 'Failed to send verification email. Please try again.' 
        });
      }
    } catch (emailError) {
      console.error('❌ Failed to send OTP email:', emailError);
      
      // If email service is not configured, provide development bypass
      if (emailError.message.includes('not configured')) {
        console.log('🔧 Development mode: Email not configured, using console OTP');
        console.log(`🔑 OTP for ${email}: ${otp}`);
        
        return res.status(200).json({
          success: true,
          message: 'Registration initiated. EMAIL NOT CONFIGURED - Check server console for OTP.',
          email: email,
          otpExpiresAt: otpExpiresAt.toISOString(),
          devOTP: otp // Only for development
        });
      }
      
      // Clean up the user record if email fails
      await pool.request()
        .input('email', sql.VarChar, email)
        .query('DELETE FROM users WHERE email = @email AND is_email_verified = 0');
      
      return res.status(500).json({ 
        message: 'Failed to send verification email. Please try again.' 
      });
    }

    console.log('✅ OTP sent successfully to:', email);

    res.status(200).json({
      success: true,
      message: 'Registration initiated. Please check your email for OTP verification.',
      email: email,
      otpExpiresAt: otpExpiresAt.toISOString()
    });

  } catch (error) {
    console.error('❌ Registration error:', error);
    res.status(500).json({ 
      message: 'Registration failed', 
      error: error.message 
    });
  }
});

// OTP Verification endpoint - Step 2: Verify OTP and complete registration
app.post('/api/auth/verify-otp', async (req, res) => {
  try {
    console.log('🔐 OTP verification attempt:', { email: req.body.email, otp: req.body.otp });
    
    const { email, otp } = req.body;

    // Validate input
    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    // Find user with matching email and OTP
    const userResult = await pool.request()
      .input('email', sql.VarChar, email)
      .input('otp', sql.VarChar, otp)
      .query(`
        SELECT id, email, first_name, last_name, role, otp_expires_at, is_email_verified, admin_code_used
        FROM users 
        WHERE email = @email AND otp_code = @otp
      `);

    if (userResult.recordset.length === 0) {
      console.log('❌ Invalid email or OTP');
      return res.status(400).json({ message: 'Invalid email or OTP code' });
    }

    const user = userResult.recordset[0];

    // Check if already verified
    if (user.is_email_verified) {
      return res.status(400).json({ message: 'Email already verified. Please login.' });
    }

    // Check if OTP has expired
    if (new Date() > new Date(user.otp_expires_at)) {
      console.log('❌ OTP expired');
      return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
    }

    // Mark email as verified and clear OTP
    await pool.request()
      .input('userId', sql.Int, user.id)
      .input('verifiedAt', sql.DateTime2, new Date())
      .query(`
        UPDATE users 
        SET is_email_verified = 1, 
            email_verified_at = @verifiedAt,
            otp_code = NULL,
            otp_expires_at = NULL
        WHERE id = @userId
      `);

    // If this is an admin user, mark the admin code as used
    if (user.role === 'admin' && user.admin_code_used) {
      await pool.request()
        .input('code', sql.NVarChar, user.admin_code_used)
        .input('userId', sql.Int, user.id)
        .input('usedAt', sql.DateTime2, new Date())
        .query(`
          UPDATE admin_invite_codes 
          SET is_used = 1, used_by = @userId, used_at = @usedAt
          WHERE code = @code AND is_used = 0
        `);
      console.log('✅ Admin invite code marked as used:', user.admin_code_used);
    }

    // Clear OTP attempts
    await pool.request()
      .input('email', sql.VarChar, email)
      .query('DELETE FROM otp_attempts WHERE email = @email');

    // Send welcome email
    await emailService.sendWelcomeEmail(email, user.first_name);

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, userId: user.id, email: user.email, role: user.role },
      'exam-portal-super-secure-jwt-secret-key-2024',
      { expiresIn: '24h' }
    );

    console.log('✅ Email verified and user registered:', user.email);

    res.status(200).json({
      success: true,
      message: 'Email verified successfully! Registration completed.',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        isEmailVerified: true
      },
      token
    });

  } catch (error) {
    console.error('❌ OTP verification error:', error);
    res.status(500).json({ 
      message: 'OTP verification failed', 
      error: error.message 
    });
  }
});

// Resend OTP endpoint
app.post('/api/auth/resend-otp', async (req, res) => {
  try {
    console.log('🔄 Resend OTP request:', req.body.email);
    
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Find unverified user
    const userResult = await pool.request()
      .input('email', sql.VarChar, email)
      .query(`
        SELECT id, first_name, is_email_verified
        FROM users 
        WHERE email = @email AND is_email_verified = 0
      `);

    if (userResult.recordset.length === 0) {
      return res.status(404).json({ 
        message: 'No pending verification found for this email' 
      });
    }

    const user = userResult.recordset[0];

    // Check rate limiting
    const otpAttemptsResult = await pool.request()
      .input('email', sql.VarChar, email)
      .query(`
        SELECT attempt_count, blocked_until, last_attempt_at
        FROM otp_attempts 
        WHERE email = @email
      `);

    if (otpAttemptsResult.recordset.length > 0) {
      const attempts = otpAttemptsResult.recordset[0];
      
      // Check if blocked
      if (attempts.blocked_until && new Date(attempts.blocked_until) > new Date()) {
        return res.status(429).json({ 
          message: 'Too many requests. Please try again later.',
          retryAfter: attempts.blocked_until
        });
      }

      // Check if too many attempts in short time
      const timeDiff = new Date() - new Date(attempts.last_attempt_at);
      if (timeDiff < 60000) { // Less than 1 minute
        return res.status(429).json({ 
          message: 'Please wait at least 1 minute before requesting a new OTP'
        });
      }
    }

    // Generate new OTP
    const otp = emailService.generateOTP();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    // Update user with new OTP
    await pool.request()
      .input('userId', sql.Int, user.id)
      .input('otp', sql.VarChar, otp)
      .input('expiresAt', sql.DateTime2, otpExpiresAt)
      .query(`
        UPDATE users 
        SET otp_code = @otp, otp_expires_at = @expiresAt
        WHERE id = @userId
      `);

    // Update attempts counter
    await pool.request()
      .input('email', sql.VarChar, email)
      .query(`
        UPDATE otp_attempts 
        SET attempt_count = attempt_count + 1, last_attempt_at = GETDATE()
        WHERE email = @email
      `);

    // Send new OTP email
    const emailResult = await emailService.sendOTPEmail(email, otp, user.first_name);
    
    if (!emailResult.success) {
      return res.status(500).json({ 
        message: 'Failed to send OTP email. Please try again.' 
      });
    }

    console.log('✅ New OTP sent to:', email);

    res.status(200).json({
      success: true,
      message: 'New OTP sent successfully. Please check your email.',
      otpExpiresAt: otpExpiresAt.toISOString()
    });

  } catch (error) {
    console.error('❌ Resend OTP error:', error);
    res.status(500).json({ 
      message: 'Failed to resend OTP', 
      error: error.message 
    });
  }
});

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    console.log('🔑 Login attempt:', { email: req.body.email });
    
    // Check if database is connected
    if (!pool) {
      console.error('❌ Database pool not initialized');
      return res.status(500).json({ message: 'Database connection not available' });
    }
    
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Find user
    const userResult = await pool.request()
      .input('email', sql.VarChar, email)
      .query('SELECT id, email, password_hash, first_name, last_name, role, is_active, is_email_verified FROM users WHERE email = @email');

    if (userResult.recordset.length === 0) {
      console.log('❌ User not found');
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const user = userResult.recordset[0];

    if (!user.is_active) {
      return res.status(401).json({ message: 'Account is deactivated' });
    }

    // Check email verification
    if (!user.is_email_verified) {
      console.log('❌ Email not verified');
      return res.status(403).json({ 
        message: 'Please verify your email address before logging in',
        emailVerificationRequired: true,
        email: user.email
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      console.log('❌ Invalid password');
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, userId: user.id, email: user.email, role: user.role },
      'exam-portal-super-secure-jwt-secret-key-2024',
      { expiresIn: '24h' }
    );

    console.log('✅ Login successful');

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role
      },
      token
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ 
      message: 'Login failed. Please try again.',
      error: error.message 
    });
  }
});

// Forgot Password - Step 1: Send OTP to email
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    console.log('🔑 Forgot password request:', { email: req.body.email });
    
    const { email } = req.body;

    // Validate input
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Check if user exists and is verified
    const userResult = await pool.request()
      .input('email', sql.VarChar, email)
      .query('SELECT id, first_name, last_name, email, is_email_verified, password_reset_attempts, last_password_reset_attempt FROM users WHERE email = @email');

    if (userResult.recordset.length === 0) {
      // Don't reveal if user exists for security
      return res.status(200).json({
        success: true,
        message: 'If an account with this email exists, you will receive password reset instructions.'
      });
    }

    const user = userResult.recordset[0];

    if (!user.is_email_verified) {
      return res.status(400).json({ 
        message: 'Please verify your email address first before resetting password.' 
      });
    }

    // Rate limiting: Check reset attempts (max 5 per 30 minutes)
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    if (user.last_password_reset_attempt && 
        new Date(user.last_password_reset_attempt) > thirtyMinutesAgo && 
        user.password_reset_attempts >= 5) {
      return res.status(429).json({ 
        message: 'Too many password reset attempts. Please try again in 30 minutes.' 
      });
    }

    // Generate OTP
    const resetOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Update user with reset OTP
    await pool.request()
      .input('email', sql.VarChar, email)
      .input('resetOtp', sql.VarChar, resetOtp)
      .input('otpExpiresAt', sql.DateTime2, otpExpiresAt)
      .input('attempts', sql.Int, (user.password_reset_attempts || 0) + 1)
      .input('lastAttempt', sql.DateTime2, new Date())
      .query(`
        UPDATE users 
        SET reset_password_otp = @resetOtp,
            reset_password_expires = @otpExpiresAt,
            password_reset_attempts = @attempts,
            last_password_reset_attempt = @lastAttempt
        WHERE email = @email
      `);

    // Send password reset email
    try {
      if (emailService.isConfigured()) {
        await emailService.sendPasswordResetOTP(email, resetOtp, user.first_name);
        console.log('✅ Password reset OTP sent successfully to:', email);
      } else {
        console.log('⚠️ Email service not configured, password reset OTP:', resetOtp);
      }
    } catch (emailError) {
      console.error('❌ Failed to send password reset email:', emailError);
      // Clean up the reset token if email fails
      await pool.request()
        .input('email', sql.VarChar, email)
        .query('UPDATE users SET reset_password_otp = NULL, reset_password_expires = NULL WHERE email = @email');
      
      return res.status(500).json({ 
        message: 'Failed to send password reset email. Please try again.' 
      });
    }

    res.status(200).json({
      success: true,
      message: 'If an account with this email exists, you will receive password reset instructions.',
      email: email
    });

  } catch (error) {
    console.error('❌ Forgot password error:', error);
    res.status(500).json({ 
      message: 'Password reset request failed. Please try again.',
      error: error.message 
    });
  }
});

// Reset Password - Step 2: Verify OTP and reset password
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    console.log('🔐 Password reset verification:', { email: req.body.email, otp: req.body.otp });
    
    const { email, otp, newPassword } = req.body;

    // Validate input
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: 'Email, OTP, and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    // Find user and verify OTP
    const userResult = await pool.request()
      .input('email', sql.VarChar, email)
      .input('otp', sql.VarChar, otp)
      .query(`
        SELECT id, first_name, last_name, email, reset_password_otp, reset_password_expires 
        FROM users 
        WHERE email = @email AND reset_password_otp = @otp
      `);

    if (userResult.recordset.length === 0) {
      return res.status(400).json({ message: 'Invalid or expired reset code' });
    }

    const user = userResult.recordset[0];

    // Check if OTP is expired
    if (!user.reset_password_expires || new Date() > new Date(user.reset_password_expires)) {
      return res.status(400).json({ message: 'Reset code has expired. Please request a new one.' });
    }

    // Hash new password
    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password and clear reset fields
    await pool.request()
      .input('userId', sql.Int, user.id)
      .input('passwordHash', sql.VarChar, newPasswordHash)
      .query(`
        UPDATE users 
        SET password_hash = @passwordHash,
            reset_password_otp = NULL,
            reset_password_expires = NULL,
            password_reset_attempts = 0,
            last_password_reset_attempt = NULL
        WHERE id = @userId
      `);

    console.log('✅ Password reset successful for user:', user.email);

    res.status(200).json({
      success: true,
      message: 'Password reset successful. You can now login with your new password.',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name
      }
    });

  } catch (error) {
    console.error('❌ Password reset error:', error);
    res.status(500).json({ 
      message: 'Password reset failed. Please try again.',
      error: error.message 
    });
  }
});

// Resend Password Reset OTP
app.post('/api/auth/resend-reset-otp', async (req, res) => {
  try {
    console.log('🔄 Resend password reset OTP request:', { email: req.body.email });
    
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Check if user exists and has a pending reset
    const userResult = await pool.request()
      .input('email', sql.VarChar, email)
      .query(`
        SELECT id, first_name, email, password_reset_attempts, last_password_reset_attempt
        FROM users 
        WHERE email = @email AND is_email_verified = 1
      `);

    if (userResult.recordset.length === 0) {
      return res.status(400).json({ message: 'No password reset request found for this email' });
    }

    const user = userResult.recordset[0];

    // Rate limiting
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    if (user.last_password_reset_attempt && 
        new Date(user.last_password_reset_attempt) > thirtyMinutesAgo && 
        user.password_reset_attempts >= 5) {
      return res.status(429).json({ 
        message: 'Too many password reset attempts. Please try again in 30 minutes.' 
      });
    }

    // Generate new OTP
    const resetOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Update user with new reset OTP
    await pool.request()
      .input('email', sql.VarChar, email)
      .input('resetOtp', sql.VarChar, resetOtp)
      .input('otpExpiresAt', sql.DateTime2, otpExpiresAt)
      .input('attempts', sql.Int, (user.password_reset_attempts || 0) + 1)
      .input('lastAttempt', sql.DateTime2, new Date())
      .query(`
        UPDATE users 
        SET reset_password_otp = @resetOtp,
            reset_password_expires = @otpExpiresAt,
            password_reset_attempts = @attempts,
            last_password_reset_attempt = @lastAttempt
        WHERE email = @email
      `);

    // Send email
    try {
      if (emailService.isConfigured()) {
        await emailService.sendPasswordResetOTP(email, resetOtp, user.first_name);
      } else {
        console.log('⚠️ Email service not configured, password reset OTP:', resetOtp);
      }
    } catch (emailError) {
      console.error('❌ Failed to resend password reset email:', emailError);
      return res.status(500).json({ message: 'Failed to send password reset email' });
    }

    res.status(200).json({
      success: true,
      message: 'New password reset code sent to your email'
    });

  } catch (error) {
    console.error('❌ Resend password reset OTP error:', error);
    res.status(500).json({ 
      message: 'Failed to resend password reset code',
      error: error.message 
    });
  }
});

// Test endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Backend server is running',
    timestamp: new Date().toISOString()
  });
});

// Authentication middleware
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    // Verify the token
    const decoded = jwt.verify(token, 'exam-portal-super-secure-jwt-secret-key-2024');
    
    // Get user details from database to ensure user still exists
    const userResult = await pool.request()
      .input('userId', sql.Int, decoded.id || decoded.userId)
      .query('SELECT id, email, role, first_name, last_name FROM users WHERE id = @userId AND is_active = 1');

    if (userResult.recordset.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token. User not found.'
      });
    }

    // Attach user info to request
    req.user = {
      id: userResult.recordset[0].id,
      email: userResult.recordset[0].email,
      role: userResult.recordset[0].role,
      firstName: userResult.recordset[0].first_name,
      lastName: userResult.recordset[0].last_name
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(403).json({
      success: false,
      message: 'Invalid token.'
    });
  }
};

// Admin authentication middleware
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.'
    });
  }
  next();
};

// Create or update exam
app.post('/api/exams', authenticateToken, requireAdmin, async (req, res) => {
  try {
    console.log('🆕 Creating/updating exam:', req.body.title);
    console.log('📋 Full request body:', req.body);
    
    const {
      id,
      title,
      subject,
      description,
      duration,
      totalQuestions,
      totalMarks,
      passingScore,
      isPublished,
      scheduledStartTime,
      scheduledEndTime
    } = req.body;

    console.log('📊 isPublished value:', isPublished, typeof isPublished);
    const statusValue = isPublished ? 'published' : 'draft';
    console.log('🔄 Will set status to:', statusValue);

    // Get the authenticated user ID
    const createdBy = req.user.id;

    let result;
    if (id) {
      console.log('🔄 UPDATE MODE - Exam ID:', id);
      // Update existing exam - use the corrected column names and include total_questions
      const request = pool.request()
        .input('id', sql.Int, id)
        .input('title', sql.VarChar, title)
        .input('subject', sql.VarChar, subject || 'General')
        .input('description', sql.Text, description)
        .input('duration', sql.Int, duration)
        .input('total_marks', sql.Int, totalMarks || 0)
        .input('total_questions', sql.Int, totalQuestions || 0)
        .input('passing_marks', sql.Int, passingScore || 70)
        .input('status', sql.VarChar, statusValue)
        .input('is_published', sql.Bit, isPublished ? 1 : 0)
        .input('scheduled_start', sql.DateTime, scheduledStartTime || null)
        .input('scheduled_end', sql.DateTime, scheduledEndTime || null)
        .input('updated_at', sql.DateTime, new Date());

      console.log('🗄️ About to execute UPDATE with status:', statusValue, 'is_published:', isPublished ? 1 : 0, 'total_questions:', totalQuestions);
      
      result = await request.query(`
          UPDATE exams SET
            title = @title,
            subject = @subject,
            description = @description,
            duration = @duration,
            total_marks = @total_marks,
            total_questions = @total_questions,
            passing_marks = @passing_marks,
            status = @status,
            is_published = @is_published,
            scheduled_start = @scheduled_start,
            scheduled_end = @scheduled_end,
            updated_at = @updated_at
          WHERE id = @id
        `);
      
      console.log('✅ UPDATE result rowsAffected:', result.rowsAffected);
    } else {
      console.log('🆕 CREATE MODE - New exam');
      // Create new exam - use the corrected column names and include total_questions
      const request = pool.request()
        .input('title', sql.VarChar, title)
        .input('subject', sql.VarChar, subject || 'General')
        .input('description', sql.Text, description)
        .input('duration', sql.Int, duration)
        .input('total_marks', sql.Int, totalMarks || 0)
        .input('total_questions', sql.Int, totalQuestions || 0)
        .input('passing_marks', sql.Int, passingScore || 70)
        .input('status', sql.VarChar, statusValue)
        .input('is_published', sql.Bit, isPublished ? 1 : 0)
        .input('scheduled_start', sql.DateTime, scheduledStartTime || null)
        .input('scheduled_end', sql.DateTime, scheduledEndTime || null)
        .input('created_by', sql.Int, createdBy)
        .input('created_at', sql.DateTime, new Date())
        .input('updated_at', sql.DateTime, new Date());

      console.log('🗄️ About to execute INSERT with status:', statusValue, 'is_published:', isPublished ? 1 : 0, 'total_questions:', totalQuestions);
      
      result = await request.query(`
          INSERT INTO exams (
            title, subject, description, duration, total_marks, total_questions, passing_marks,
            status, is_published, scheduled_start, scheduled_end, created_by, created_at, updated_at
          )
          OUTPUT INSERTED.id
          VALUES (
            @title, @subject, @description, @duration, @total_marks, @total_questions, @passing_marks,
            @status, @is_published, @scheduled_start, @scheduled_end, @created_by, @created_at, @updated_at
          )
        `);
      
      console.log('✅ INSERT result:', result.recordset[0]);
    }

    const examId = id || result.recordset[0].id;
    
    // Verify what was actually saved in the database
    const verifyResult = await pool.request()
      .input('examId', sql.Int, examId)
      .query(`
        SELECT id, title, status, is_published
        FROM exams 
        WHERE id = @examId
      `);
    
    const savedExam = verifyResult.recordset[0];
    console.log('🔍 Verification - What was actually saved:', {
      id: savedExam.id,
      title: savedExam.title,
      status: savedExam.status,
      is_published_bit_value: savedExam.is_published
    });
    
    console.log(`✅ Exam ${id ? 'updated' : 'created'} successfully with ID: ${examId}`);
    
    res.json({
      success: true,
      message: `Exam ${id ? 'updated' : 'created'} successfully`,
      examId: examId,
      isPublished: isPublished || false
    });

  } catch (error) {
    console.error('❌ Error saving exam:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to save exam', 
      error: error.message 
    });
  }
});

// Get all exams (for admin)
app.get('/api/exams', async (req, res) => {
  try {
    console.log('🔍 Fetching all exams for admin...');
    
    const result = await pool.request().query(`
      SELECT 
        id, title, subject, description, duration,
        total_marks, passing_marks as passing_score,
        status, is_published, scheduled_start as scheduled_start_time, 
        scheduled_end as scheduled_end_time,
        created_at, updated_at
      FROM exams
      ORDER BY created_at DESC
    `);

    console.log(`✅ Found ${result.recordset.length} exams`);

    // Add question counts and recalculate total marks
    const examsWithQuestionCounts = await Promise.all(
      result.recordset.map(async (exam) => {
        try {
          const questionResult = await pool.request()
            .input('examId', sql.Int, exam.id)
            .query('SELECT COUNT(*) as question_count FROM questions WHERE exam_id = @examId AND is_active = 1');
          
          // Get all questions to recalculate total marks including case study sub-questions
          const questionsResult = await pool.request()
            .input('examId', sql.Int, exam.id)
            .query('SELECT question_type, marks, question_data FROM questions WHERE exam_id = @examId AND is_active = 1');
          
          // Calculate total marks including case study sub-question marks
          const calculatedTotalMarks = questionsResult.recordset.reduce((sum, q) => {
            let questionMarks = 0;
            
            // For case study questions, use ONLY sub-question marks (not main question marks)
            if (q.question_type === 'case-study' && q.question_data) {
              try {
                const questionData = JSON.parse(q.question_data);
                if (questionData.subQuestions) {
                  const subQuestionMarks = questionData.subQuestions.reduce((subSum, subQ) => {
                    return subSum + (subQ.marks || 0);
                  }, 0);
                  questionMarks = subQuestionMarks; // Use ONLY sub-question marks
                }
              } catch (parseError) {
                console.warn(`⚠️ Failed to parse question_data for question ${q.id}:`, parseError);
              }
            } else {
              // For all other question types, use the main question marks
              questionMarks = q.marks;
            }
            
            return sum + questionMarks;
          }, 0);
          
          return {
            ...exam,
            total_questions: questionResult.recordset[0].question_count || 0,
            total_marks: calculatedTotalMarks // Use calculated total marks
          };
        } catch (error) {
          console.error(`Error getting question count for exam ${exam.id}:`, error);
          return {
            ...exam,
            total_questions: 0
          };
        }
      })
    );

    res.json(examsWithQuestionCounts);
  } catch (error) {
    console.error('❌ Error fetching exams:', error);
    console.error('Error details:', error);
    res.status(500).json({ 
      message: 'Failed to fetch exams',
      error: error.message 
    });
  }
});

// Get published exams (for students)
app.get('/api/exams/published', async (req, res) => {
  try {
    const result = await pool.request().query(`
      SELECT 
        id, title, subject, description, duration,
        scheduled_start_time, scheduled_end_time, created_at
      FROM exams
      WHERE is_published = 1
      ORDER BY scheduled_start_time ASC, created_at DESC
    `);

    res.json(result.recordset);
  } catch (error) {
    console.error('❌ Error fetching published exams:', error);
    res.status(500).json({ message: 'Failed to fetch published exams' });
  }
});

// Get specific exam with questions
app.get('/api/exams/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT 
          id, title, subject, description, duration, 
          total_marks, passing_marks as passing_score,
          status, is_published, scheduled_start as scheduled_start_time, 
          scheduled_end as scheduled_end_time,
          created_at, updated_at
        FROM exams
        WHERE id = @id
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    const exam = result.recordset[0];
    
    console.log(`✅ Successfully fetched exam ${id}:`, exam);
    
    res.json({
      success: true,
      data: exam
    });
  } catch (error) {
    console.error('❌ Error fetching exam:', error);
    console.error('❌ Stack trace:', error.stack);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch exam',
      error: error.message 
    });
  }
});

// Publish exam
app.post('/api/exams/:id/publish', async (req, res) => {
  try {
    const { id } = req.params;
    const { scheduledStartTime, scheduledEndTime } = req.body;
    
    await pool.request()
      .input('id', sql.Int, id)
      .input('is_published', sql.Bit, true)
      .input('scheduled_start_time', sql.DateTime, scheduledStartTime || null)
      .input('scheduled_end_time', sql.DateTime, scheduledEndTime || null)
      .input('updated_at', sql.DateTime, new Date())
      .query(`
        UPDATE exams SET
          is_published = @is_published,
          scheduled_start_time = @scheduled_start_time,
          scheduled_end_time = @scheduled_end_time,
          updated_at = @updated_at
        WHERE id = @id
      `);

    console.log(`✅ Exam ${id} published successfully`);
    
    res.json({
      success: true,
      message: 'Exam published successfully',
      scheduledStartTime,
      scheduledEndTime
    });

  } catch (error) {
    console.error('❌ Error publishing exam:', error);
    res.status(500).json({ message: 'Failed to publish exam' });
  }
});

// Delete exam and all associated questions
app.delete('/api/exams/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`🗑️ Deleting exam ${id} and all associated questions`);

    // Begin transaction
    const transaction = new sql.Transaction(pool);
    
    try {
      await transaction.begin();
      
      // First, delete all questions associated with this exam
      const deleteQuestionsResult = await transaction.request()
        .input('examId', sql.Int, id)
        .query('DELETE FROM questions WHERE exam_id = @examId');

      console.log(`✅ Deleted ${deleteQuestionsResult.rowsAffected[0]} questions for exam ${id}`);

      // Then, delete the exam itself
      const deleteExamResult = await transaction.request()
        .input('examId', sql.Int, id)
        .query('DELETE FROM exams WHERE id = @examId');

      if (deleteExamResult.rowsAffected[0] === 0) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Exam not found'
        });
      }

      await transaction.commit();
      
      console.log(`✅ Exam ${id} and all associated questions deleted successfully`);
      
      res.json({
        success: true,
        message: 'Exam and all associated questions deleted successfully',
        deletedQuestions: deleteQuestionsResult.rowsAffected[0],
        deletedExam: deleteExamResult.rowsAffected[0]
      });

    } catch (transactionError) {
      await transaction.rollback();
      throw transactionError;
    }

  } catch (error) {
    console.error('❌ Error deleting exam:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete exam',
      error: error.message
    });
  }
});

// Update exam
app.put('/api/exams/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const examData = req.body;
    
    console.log(`🔄 PUT - Updating exam ${id} with data:`, examData);
    console.log('📊 PUT - isPublished value:', examData.isPublished, typeof examData.isPublished);
    const statusValue = examData.isPublished ? 'published' : 'draft';
    console.log('🔄 PUT - Will set status to:', statusValue);

    // Validate required fields
    if (!examData.title && !examData.subject && examData.isPublished === undefined) {
      return res.status(400).json({
        success: false,
        message: 'At least one field must be provided for update'
      });
    }

    const request = pool.request()
      .input('id', sql.Int, id)
      .input('updated_at', sql.DateTime, new Date());

    let updateFields = ['updated_at = @updated_at'];
    
    if (examData.title) {
      request.input('title', sql.NVarChar(255), examData.title);
      updateFields.push('title = @title');
    }
    if (examData.subject) {
      request.input('subject', sql.NVarChar(100), examData.subject);
      updateFields.push('subject = @subject');
    }
    if (examData.description !== undefined) {
      request.input('description', sql.Text, examData.description || '');
      updateFields.push('description = @description');
    }
    if (examData.duration) {
      request.input('duration', sql.Int, examData.duration);
      updateFields.push('duration = @duration');
    }
    if (examData.passingScore) {
      request.input('passing_marks', sql.Int, examData.passingScore);
      updateFields.push('passing_marks = @passing_marks');
    }
    if (examData.isPublished !== undefined) {
      request.input('status', sql.NVarChar(20), statusValue);
      request.input('is_published', sql.Bit, examData.isPublished ? 1 : 0);
      updateFields.push('status = @status');
      updateFields.push('is_published = @is_published');
      console.log('🗄️ PUT - About to execute UPDATE with status:', statusValue, 'and is_published:', examData.isPublished ? 1 : 0);
    }
    if (examData.scheduledStartTime !== undefined) {
      request.input('scheduled_start', sql.DateTime, examData.scheduledStartTime || null);
      updateFields.push('scheduled_start = @scheduled_start');
    }
    if (examData.scheduledEndTime !== undefined) {
      request.input('scheduled_end', sql.DateTime, examData.scheduledEndTime || null);
      updateFields.push('scheduled_end = @scheduled_end');
    }

    const result = await request.query(`
        UPDATE exams SET
          ${updateFields.join(', ')}
        WHERE id = @id
      `);

    console.log('✅ PUT - UPDATE result rowsAffected:', result.rowsAffected);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }

    // Verify what was actually saved in the database
    const verifyResult = await pool.request()
      .input('examId', sql.Int, id)
      .query(`
        SELECT id, title, status, is_published
        FROM exams 
        WHERE id = @examId
      `);
    
    const savedExam = verifyResult.recordset[0];
    console.log('🔍 PUT Verification - What was actually saved:', {
      id: savedExam.id,
      title: savedExam.title,
      status: savedExam.status,
      is_published_bit_value: savedExam.is_published
    });

    console.log(`✅ Exam ${id} updated successfully`);
    
    res.json({
      success: true,
      message: 'Exam updated successfully',
      examId: parseInt(id)
    });

  } catch (error) {
    console.error('❌ Error updating exam:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update exam',
      error: error.message
    });
  }
});

// Test database connection endpoint
app.get('/api/test-db', async (req, res) => {
  try {
    const result = await pool.request().query('SELECT COUNT(*) as userCount FROM users');
    res.json({ 
      status: 'OK', 
      message: 'Database connection successful',
      userCount: result.recordset[0].userCount
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'ERROR', 
      message: 'Database connection failed',
      error: error.message
    });
  }
});

// ===== QUESTIONS API ENDPOINTS =====

// Validate question data based on type
const validateQuestionData = (questionType, questionData) => {
  // Basic validation - you can expand this later
  if (!questionData) {
    throw new Error('Question data is required');
  }
  
  switch (questionType) {
    case 'single-choice':
      if (!questionData.options || !Array.isArray(questionData.options)) {
        throw new Error('Single choice questions must have options array');
      }
      // Make correctAnswer optional for now - frontend might send correctAnswers array
      break;
    case 'multiple-choice':
      if (!questionData.options || !Array.isArray(questionData.options)) {
        throw new Error('Multiple choice questions must have options array');
      }
      // Make correctAnswers optional for now - let it be flexible
      break;
    case 'drag-drop':
      if (!questionData.dragDropItems && !questionData.dragItems) {
        throw new Error('Drag-drop questions must have dragDropItems or dragItems');
      }
      if (!questionData.dragDropTargets && !questionData.dropTargets) {
        throw new Error('Drag-drop questions must have dragDropTargets or dropTargets');
      }
      break;
    case 'case-study':
      // Case study validation can be flexible
      break;
    case 'short-answer':
    case 'code':
      // These can be flexible for now
      break;
  }
  
  return true;
};

// Create question
app.post('/api/questions', authenticateToken, requireAdmin, async (req, res) => {
  try {
    console.log('📝 Creating question:', req.body);
    
    const {
      examId,
      questionType,
      questionText,
      marks,
      explanation,
      questionData,
      orderIndex
    } = req.body;

    // Validate required fields
    if (!examId || !questionType || !questionData) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: examId, questionType, questionData'
      });
    }

    // Validate question data
    try {
      validateQuestionData(questionType, questionData);
    } catch (validationError) {
      return res.status(400).json({
        success: false,
        message: 'Invalid question data',
        error: validationError.message
      });
    }

    // Check current table schema
    const schemaCheck = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'questions'
      ORDER BY ORDINAL_POSITION
    `);
    console.log('📊 Current questions table schema:', schemaCheck.recordset);

    // Get next order index if not provided
    let finalOrderIndex = orderIndex;
    if (!finalOrderIndex) {
      const orderResult = await pool.request()
        .input('examId', sql.Int, examId)
        .query(`
          SELECT COALESCE(MAX(order_index), 0) + 1 as next_index
          FROM questions 
          WHERE exam_id = @examId AND is_active = 1
        `);
      finalOrderIndex = orderResult.recordset[0].next_index;
    }

    // Use the simplified schema - only insert into existing columns
    const insertQuery = `
      INSERT INTO questions (
        exam_id, 
        question_type, 
        question_data, 
        marks, 
        order_index,
        is_active
      )
      OUTPUT INSERTED.id
      VALUES (
        @examId, 
        @questionType, 
        @questionData, 
        @marks,
        @orderIndex,
        1
      )
    `;

    // Prepare the complete question data JSON
    const completeQuestionData = {
      questionText: questionText || questionData.questionText,
      points: marks || questionData.points,
      explanation: explanation || questionData.explanation || '',
      ...questionData
    };

    const request = pool.request()
      .input('examId', sql.Int, examId)
      .input('questionType', sql.NVarChar(50), questionType)
      .input('questionData', sql.NVarChar(sql.MAX), JSON.stringify(completeQuestionData))
      .input('marks', sql.Int, marks || questionData.points || 5)
      .input('orderIndex', sql.Int, finalOrderIndex);

    console.log('🔧 Inserting question with data:', {
      examId,
      questionType,
      questionData: completeQuestionData,
      marks: marks || questionData.points || 5,
      orderIndex: finalOrderIndex
    });

    const result = await request.query(insertQuery);
    const questionId = result.recordset[0].id;

    console.log('✅ Question created with ID:', questionId);

    res.status(201).json({
      success: true,
      message: 'Question created successfully',
      data: {
        questionId: questionId,
        orderIndex: finalOrderIndex
      }
    });

  } catch (error) {
    console.error('❌ Error creating question:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create question',
      error: error.message
    });
  }
});

// Get all questions for an exam
app.get('/api/questions/exam/:examId', authenticateToken, async (req, res) => {
  try {
    const { examId } = req.params;
    
    console.log(`🔍 Fetching questions for exam ${examId}`);
    
    // Use the correct column names based on actual database schema
    const selectQuery = `
      SELECT id, exam_id, question_type, marks, 
             question_data, order_index, is_active, created_at, updated_at
      FROM questions 
      WHERE exam_id = @examId AND is_active = 1 
      ORDER BY order_index ASC
    `;

    const result = await pool.request()
      .input('examId', sql.Int, examId)
      .query(selectQuery);

    console.log(`✅ Found ${result.recordset.length} questions for exam ${examId}`);

    const questions = result.recordset.map(question => {
      let questionData = null;
      try {
        questionData = question.question_data ? JSON.parse(question.question_data) : {};
      } catch (parseError) {
        console.warn(`⚠️ Failed to parse question_data for question ${question.id}:`, parseError);
        questionData = {};
      }

      return {
        ...question,
        question_data: questionData,
        // Extract question_text from question_data for frontend compatibility
        question_text: questionData.questionText || questionData.question || ''
      };
    });

    // Calculate total points including case study sub-question marks
    const totalPoints = questions.reduce((sum, q) => {
      let questionMarks = 0;
      
      // For case study questions, use ONLY sub-question marks (not main question marks)
      if (q.question_type === 'case-study' && q.question_data && q.question_data.subQuestions) {
        const subQuestionMarks = q.question_data.subQuestions.reduce((subSum, subQ) => {
          return subSum + (subQ.marks || 0);
        }, 0);
        console.log(`📊 Case study question ${q.id}: Main marks ignored, Sub-question marks: ${subQuestionMarks}`);
        questionMarks = subQuestionMarks; // Use ONLY sub-question marks
      } else {
        // For all other question types, use the main question marks
        questionMarks = q.marks;
      }
      
      return sum + questionMarks;
    }, 0);
    
    res.json({
      success: true,
      data: questions,
      totalQuestions: questions.length,
      totalPoints: totalPoints
    });
  } catch (error) {
    console.error('❌ Error fetching questions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch questions',
      error: error.message
    });
  }
});

// Get single question by ID
app.get('/api/questions/:questionId', authenticateToken, async (req, res) => {
  try {
    const { questionId } = req.params;
    
    // Validate questionId is a number
    const questionIdNum = parseInt(questionId);
    if (isNaN(questionIdNum)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid question ID. Must be a number.'
      });
    }
    
    const result = await pool.request()
      .input('questionId', sql.Int, questionIdNum)
      .query('SELECT * FROM questions WHERE id = @questionId AND is_active = 1');

    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    const question = result.recordset[0];
    question.question_data = JSON.parse(question.question_data);
    
    res.json({
      success: true,
      data: question
    });
  } catch (error) {
    console.error('❌ Error fetching question:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch question',
      error: error.message
    });
  }
});

// Update question
app.put('/api/questions/:questionId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { questionId } = req.params;
    const {
      questionText,
      marks,
      explanation,
      questionData
    } = req.body;

    console.log(`🔧 Updating question ${questionId}:`, { questionText, marks, questionData });

    // Check if updated_at column exists
    const updatedAtColumnCheck = await pool.request().query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'questions' AND COLUMN_NAME = 'updated_at'
    `);
    
    const hasUpdatedAtColumn = updatedAtColumnCheck.recordset.length > 0;

    // Prepare the complete question data JSON
    const completeQuestionData = {
      questionText: questionText || questionData?.questionText,
      points: marks || questionData?.points,
      explanation: explanation || questionData?.explanation || '',
      ...questionData
    };

    let request = pool.request()
      .input('questionId', sql.Int, questionId)
      .input('marks', sql.Int, marks)
      .input('questionData', sql.NVarChar(sql.MAX), JSON.stringify(completeQuestionData));

    let setParts = [
      'marks = COALESCE(@marks, marks)',
      'question_data = COALESCE(@questionData, question_data)'
    ];

    if (hasUpdatedAtColumn) {
      setParts.push('updated_at = @updatedAt');
      request.input('updatedAt', sql.DateTime, new Date());
    }

    const updateQuery = `UPDATE questions SET ${setParts.join(', ')} WHERE id = @questionId`;

    console.log('🔧 Executing update query:', updateQuery);
    const result = await request.query(updateQuery);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    console.log('✅ Question updated successfully');

    res.json({
      success: true,
      message: 'Question updated successfully'
    });

  } catch (error) {
    console.error('❌ Error updating question:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update question',
      error: error.message
    });
  }
});

// Delete question (soft delete)
app.delete('/api/questions/:questionId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { questionId } = req.params;
    
    const result = await pool.request()
      .input('questionId', sql.Int, questionId)
      .input('updatedAt', sql.DateTime, new Date())
      .query(`
        UPDATE questions SET
          is_active = 0,
          updated_at = @updatedAt
        WHERE id = @questionId
      `);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    res.json({
      success: true,
      message: 'Question deleted successfully'
    });

  } catch (error) {
    console.error('❌ Error deleting question:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete question',
      error: error.message
    });
  }
});

// Get questions by type
app.get('/api/questions/exam/:examId/type/:questionType', authenticateToken, async (req, res) => {
  try {
    const { examId, questionType } = req.params;
    
    const result = await pool.request()
      .input('examId', sql.Int, examId)
      .input('questionType', sql.NVarChar(50), questionType)
      .query(`
        SELECT * FROM questions 
        WHERE exam_id = @examId 
        AND question_type = @questionType 
        AND is_active = 1
        ORDER BY order_index ASC
      `);

    const questions = result.recordset.map(question => ({
      ...question,
      question_data: JSON.parse(question.question_data)
    }));

    res.json({
      success: true,
      data: questions
    });
  } catch (error) {
    console.error('❌ Error fetching questions by type:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch questions by type',
      error: error.message
    });
  }
});

// ===== TEST ATTEMPTS API ENDPOINTS =====

// Start a new test attempt
app.post('/api/test-attempts/start', authenticateToken, async (req, res) => {
  try {
    const { examId } = req.body;
    const userId = req.user.id;

    console.log(`📝 Starting NEW test attempt for user ${userId}, exam ${examId}`);

    // Check if exam exists and is published
    const examCheck = await pool.request()
      .input('examId', sql.Int, examId)
      .query(`
        SELECT id, title, duration, is_published, scheduled_start_time, scheduled_end_time, allow_multiple_attempts
        FROM exams 
        WHERE id = @examId AND is_published = 1
      `);

    if (examCheck.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found or not published'
      });
    }

    const exam = examCheck.recordset[0];

    // Check basic scheduling constraints
    const now = new Date();
    if (exam.scheduled_start_time && new Date(exam.scheduled_start_time) > now) {
      return res.status(400).json({
        success: false,
        message: 'Exam has not started yet'
      });
    }

    if (exam.scheduled_end_time && new Date(exam.scheduled_end_time) < now) {
      return res.status(410).json({
        success: false,
        message: 'Exam has ended',
        status: 'ended'
      });
    }

    // Check if user already completed this exam (if multiple attempts not allowed)
    if (!exam.allow_multiple_attempts) {
      const completedCheck = await pool.request()
        .input('userId', sql.Int, userId)
        .input('examId', sql.Int, examId)
        .query(`
          SELECT id FROM testAttempt 
          WHERE user_id = @userId AND exam_id = @examId 
          AND status = 'completed'
        `);

      if (completedCheck.recordset.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'You have already completed this exam'
        });
      }
    }

    // Atomic check-then-create to prevent duplicates
    const transaction = new sql.Transaction(pool);
    await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);

    try {
      // Check for existing in_progress attempt with lock
      const existingAttempt = await transaction.request()
        .input('userId', sql.Int, userId)
        .input('examId', sql.Int, examId)
        .query(`
          SELECT TOP 1 id, start_time 
          FROM testAttempt WITH (UPDLOCK, HOLDLOCK)
          WHERE user_id = @userId AND exam_id = @examId AND status = 'in_progress'
          ORDER BY created_at DESC
        `);

      let attemptId, startTime;

      if (existingAttempt.recordset.length > 0) {
        // Return existing attempt
        attemptId = existingAttempt.recordset[0].id;
        startTime = existingAttempt.recordset[0].start_time;
        console.log(`🔄 Using existing in_progress attempt ${attemptId} for user ${userId}, exam ${examId}`);
      } else {
        // Create new attempt
        const now2 = new Date();
        const insertResult = await transaction.request()
          .input('userId', sql.Int, userId)
          .input('examId', sql.Int, examId)
          .input('startTime', sql.DateTime, now2)
          .input('createdAt', sql.DateTime, now2)
          .input('status', sql.VarChar(20), 'in_progress')
          .query(`
            INSERT INTO testAttempt (user_id, exam_id, start_time, status, created_at)
            OUTPUT INSERTED.id, INSERTED.start_time
            VALUES (@userId, @examId, @startTime, @status, @createdAt)
          `);
        
        attemptId = insertResult.recordset[0].id;
        startTime = insertResult.recordset[0].start_time;
        console.log(`✅ NEW test attempt ${attemptId} started for user ${userId}`);
      }

      await transaction.commit();

      res.status(201).json({
        success: true,
        message: 'Test attempt started successfully',
        isResume: false,
        data: {
          attemptId: attemptId,
          examId: examId,
          startTime: startTime,
          duration: exam.duration,
          examTitle: exam.title
        }
      });

    } catch (transactionError) {
      await transaction.rollback();
      throw transactionError;
    }

  } catch (error) {
    console.error('❌ Error starting test attempt:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start test attempt',
      error: error.message
    });
  }
});

// Get student's test attempts
app.get('/api/test-attempts/student', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id; // Changed from studentId to userId

    const result = await pool.request()
      .input('userId', sql.Int, userId)
      .query(`
        SELECT 
          ta.id,
          ta.exam_id,
          ta.start_time,
          ta.status,
          ta.is_submitted,
          ta.is_auto_expired,
          ta.is_auto_ended
        FROM testAttempt ta
        JOIN exams e ON ta.exam_id = e.id
        WHERE ta.user_id = @userId
        ORDER BY ta.start_time DESC
      `);

    res.json({
      success: true,
      data: result.recordset
    });
  } catch (error) {
    console.error('❌ Error fetching test attempts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch test attempts',
      error: error.message
    });
  }
});

// Get student's completed test results with scores
app.get('/api/test-attempts/student/results', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    console.log(`📊 Getting completed test results for student ${userId}`);

    const result = await pool.request()
      .input('userId', sql.Int, userId)
      .query(`
        SELECT 
          ta.id as attempt_id,
          ta.exam_id,
          ta.start_time,
          ta.end_time,
          ta.status,
          ta.total_score,
          ta.is_submitted,
          e.title as exam_title,
          e.subject,
          e.duration,
          e.passing_score,
          r.percentage,
          r.grade,
          r.obtained_marks,
          r.total_marks,
          CASE WHEN COALESCE(r.percentage, ta.total_score, 0) >= e.passing_score THEN 1 ELSE 0 END as is_passed
        FROM testAttempt ta
        JOIN exams e ON ta.exam_id = e.id
        LEFT JOIN results r ON ta.id = r.attempt_id
        WHERE ta.user_id = @userId AND ta.status = 'completed' AND ta.is_submitted = 1
        ORDER BY ta.start_time DESC
      `);

    console.log(`✅ Found ${result.recordset.length} completed test results for student`);

    res.json({
      success: true,
      data: result.recordset
    });
  } catch (error) {
    console.error('❌ Error fetching student results:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch student results',
      error: error.message
    });
  }
});

// Get exam status for student dashboard
app.get('/api/exams/:examId/status', authenticateToken, async (req, res) => {
  try {
    const { examId } = req.params;
    const userId = req.user.id;

    console.log(`📊 Getting exam status for user ${userId}, exam ${examId}`);

    // Get exam details with scheduling info
    const examResult = await pool.request()
      .input('examId', sql.Int, examId)
      .query(`
        SELECT 
          id, title, subject, duration, is_published, 
          scheduled_start, scheduled_end, allow_multiple_attempts,
          passing_marks, total_marks
        FROM exams 
        WHERE id = @examId
      `);

    if (examResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }

    const exam = examResult.recordset[0];

    // Get user's attempts for this exam
    const attemptsResult = await pool.request()
      .input('userId', sql.Int, userId)
      .input('examId', sql.Int, examId)
      .query(`
        SELECT 
          id, status, start_time, end_time, total_score, percentage,
          is_submitted, is_auto_expired, is_auto_ended,
          created_at
        FROM testAttempt 
        WHERE user_id = @userId AND exam_id = @examId
        ORDER BY created_at DESC
      `);

    const attempts = attemptsResult.recordset;
    const now = new Date();
    
    // Determine current exam status
    let examStatus = 'available';
    let canStart = true;
    let statusMessage = 'You can start this exam';
    let statusColor = 'green';

    // Check scheduling constraints
    if (!exam.is_published) {
      examStatus = 'unpublished';
      canStart = false;
      statusMessage = 'Exam is not published';
      statusColor = 'gray';
    } else if (exam.scheduled_start && new Date(exam.scheduled_start) > now) {
      examStatus = 'not_started';
      canStart = false;
      statusMessage = `Exam starts on ${new Date(exam.scheduled_start).toLocaleString()}`;
      statusColor = 'blue';
    } else if (exam.scheduled_end && new Date(exam.scheduled_end) < now) {
      examStatus = 'ended';
      canStart = false;
      statusMessage = 'Exam has ended';
      statusColor = 'red';
    }

    // Check attempt history
    if (attempts.length > 0 && canStart) {
      const latestAttempt = attempts[0];
      
      if (latestAttempt.status === 'in_progress') {
        examStatus = 'in_progress';
        statusMessage = 'Resume your test';
        statusColor = 'orange';
      } else if (latestAttempt.status === 'completed') {
        if (!exam.allow_multiple_attempts) {
          examStatus = 'completed';
          canStart = false;
          statusMessage = latestAttempt.is_auto_expired ? 
            'Test completed (time expired)' : 'Test completed';
          statusColor = 'gray';
        } else {
          examStatus = 'retake_available';
          statusMessage = 'Retake available';
          statusColor = 'green';
        }
      } else if (latestAttempt.status === 'ended') {
        examStatus = 'ended';
        canStart = false;
        statusMessage = 'Test ended due to schedule';
        statusColor = 'red';
      }
    }

    res.json({
      success: true,
      data: {
        examId: exam.id,
        examTitle: exam.title,
        subject: exam.subject,
        duration: exam.duration,
        totalMarks: exam.total_marks,
        passingMarks: exam.passing_marks,
        isPublished: exam.is_published,
        scheduledStart: exam.scheduled_start_time,
        scheduledEnd: exam.scheduled_end_time,
        allowMultipleAttempts: exam.allow_multiple_attempts,
        status: examStatus,
        canStart: canStart,
        statusMessage: statusMessage,
        statusColor: statusColor,
        attempts: attempts.map(attempt => ({
          id: attempt.id,
          status: attempt.status,
          startTime: attempt.start_time,
          endTime: attempt.end_time,
          score: attempt.total_score,
          percentage: attempt.percentage,
          isSubmitted: attempt.is_submitted,
          isAutoExpired: attempt.is_auto_expired,
          isAutoEnded: attempt.is_auto_ended,
          createdAt: attempt.created_at
        }))
      }
    });

  } catch (error) {
    console.error('❌ Error getting exam status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get exam status',
      error: error.message
    });
  }
});

// Get remaining time for an active test attempt
app.get('/api/test-attempts/:attemptId/remaining-time', authenticateToken, async (req, res) => {
  try {
    const { attemptId } = req.params;
    const userId = req.user.id;

    const result = await pool.request()
      .input('attemptId', sql.Int, attemptId)
      .input('userId', sql.Int, userId)
      .query(`
        SELECT 
          ta.start_time,
          ta.status,
          e.duration,
          e.scheduled_end_time,
          DATEDIFF(MINUTE, ta.start_time, GETDATE()) as elapsed_minutes
        FROM testAttempt ta
        JOIN exams e ON ta.exam_id = e.id
        WHERE ta.id = @attemptId AND ta.user_id = @userId AND ta.status = 'in_progress'
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Active test attempt not found'
      });
    }

    const attempt = result.recordset[0];
    const elapsedMinutes = attempt.elapsed_minutes;
    const examDurationMinutes = attempt.duration;
    
    // Calculate remaining time based on exam duration
    let remainingMinutes = Math.max(0, examDurationMinutes - elapsedMinutes);
    
    // Also check against scheduled end time if set
    if (attempt.scheduled_end_time) {
      const scheduledRemainingMinutes = Math.max(0, 
        Math.floor((new Date(attempt.scheduled_end_time) - new Date()) / 60000)
      );
      remainingMinutes = Math.min(remainingMinutes, scheduledRemainingMinutes);
    }

    res.json({
      success: true,
      data: {
        remainingMinutes: remainingMinutes,
        elapsedMinutes: elapsedMinutes,
        totalDurationMinutes: examDurationMinutes,
        isExpired: remainingMinutes === 0
      }
    });

  } catch (error) {
    console.error('❌ Error getting remaining time:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get remaining time',
      error: error.message
    });
  }
});

// Get all test attempts (admin only) - must come before /:attemptId route
app.get('/api/test-attempts/all', authenticateToken, requireAdmin, async (req, res) => {
  try {
    console.log('🔍 Getting all test attempts for admin');
    
    const result = await pool.request()
      .query(`
        SELECT 
          ta.id,
          ta.user_id,
          ta.exam_id,
          e.title as exam_title,
          e.subject,
          e.duration,
          ta.start_time,
          ta.end_time,
          ta.status,
          ta.total_score,
          ta.is_submitted,
          u.first_name,
          u.last_name,
          u.email
        FROM testAttempt ta
        JOIN exams e ON ta.exam_id = e.id
        JOIN users u ON ta.user_id = u.id
        ORDER BY ta.created_at DESC
      `);

    res.json({
      success: true,
      data: result.recordset
    });
  } catch (error) {
    console.error('❌ Error fetching all test attempts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch test attempts',
      error: error.message
    });
  }
});

// Get specific test attempt details
app.get('/api/test-attempts/:attemptId', authenticateToken, async (req, res) => {
  try {
    const { attemptId } = req.params;
    console.log('🔍 test-attempts route hit with attemptId:', attemptId);
    
    // Validate attemptId is a number
    const attemptIdNum = parseInt(attemptId);
    if (isNaN(attemptIdNum)) {
      console.error('❌ Invalid attemptId:', attemptId);
      return res.status(400).json({
        success: false,
        message: 'Validation failed for parameter \'attemptId\'. Invalid number.'
      });
    }
    
    const userId = req.user.id;

    let query = `
      SELECT 
        ta.id,
        ta.user_id,
        ta.exam_id,
        e.title as exam_title,
        e.subject,
        e.duration,
        ta.start_time,
        ta.end_time,
        ta.status,
        ta.total_score,
        ta.is_submitted,
        u.first_name,
        u.last_name,
        u.email
      FROM testAttempt ta
      JOIN exams e ON ta.exam_id = e.id
      JOIN users u ON ta.user_id = u.id
      WHERE ta.id = @attemptId
    `;

    // Students can only see their own attempts, admins can see all
    if (req.user.role !== 'admin') {
      query += ' AND ta.user_id = @userId';
    }

    const request = pool.request()
      .input('attemptId', sql.Int, attemptId);
    
    if (req.user.role !== 'admin') {
      request.input('userId', sql.Int, userId);
    }

    const result = await request.query(query);

    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Test attempt not found'
      });
    }

    res.json({
      success: true,
      data: result.recordset[0]
    });
  } catch (error) {
    console.error('❌ Error fetching test attempt:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch test attempt',
      error: error.message
    });
  }
});

// ===== ANSWERS API ENDPOINTS =====

// Submit answer for a question
app.post('/api/answers/submit', authenticateToken, async (req, res) => {
  try {
    const { attemptId, questionId, studentAnswer } = req.body;
    const userId = req.user.id;

    console.log(`📝 Submitting answer for attempt ${attemptId}, question ${questionId}`);

    // Input validation
    if (!attemptId || !questionId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: attemptId, questionId'
      });
    }

    // Validate numeric IDs
    const attemptIdNum = parseInt(attemptId);
    const questionIdNum = parseInt(questionId);
    
    if (isNaN(attemptIdNum) || isNaN(questionIdNum)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid ID format. IDs must be numbers.'
      });
    }

    // Validate that this attempt belongs to the user and is active
    const attemptCheck = await pool.request()
      .input('attemptId', sql.Int, attemptIdNum)
      .input('userId', sql.Int, userId)
      .query(`
        SELECT id, status 
        FROM testAttempt 
        WHERE id = @attemptId AND user_id = @userId
      `);

    if (attemptCheck.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Test attempt not found'
      });
    }

    if (attemptCheck.recordset[0].status !== 'in_progress') {
      return res.status(400).json({
        success: false,
        message: 'Test attempt is not active'
      });
    }

    // Get question details for validation
    const questionResult = await pool.request()
      .input('questionId', sql.Int, questionIdNum)
      .query(`
        SELECT id, question_type, marks, question_data
        FROM questions 
        WHERE id = @questionId AND is_active = 1
      `);

    if (questionResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    const question = questionResult.recordset[0];
    let questionData = {};
    
    try {
      questionData = JSON.parse(question.question_data);
    } catch (parseError) {
      console.error('❌ Error parsing question data:', parseError.message);
      questionData = { questionText: 'Question data parse error' };
    }

    // Validate student answer format based on question type
    if (studentAnswer === undefined || studentAnswer === null) {
      return res.status(400).json({
        success: false,
        message: 'Student answer is required'
      });
    }

    // Type-specific validation to prevent data corruption
    if (question.question_type === 'multiple-choice' && studentAnswer !== null && !Array.isArray(studentAnswer)) {
      console.warn(`⚠️ Invalid multiple-choice answer format for question ${questionIdNum}:`, studentAnswer);
      // Convert to array if it's a single value, otherwise set empty array
      const fixedAnswer = typeof studentAnswer === 'number' ? [studentAnswer] : [];
      console.log(`🔧 Fixed to:`, fixedAnswer);
      req.body.studentAnswer = fixedAnswer; // Fix the request data
    }

    // Use NEW standardized evaluation logic that stores in required format
    let isCorrect = false;
    let pointsEarned = 0;
    let formattedAnswer = {};
    
    try {
      console.log('🧮 Using NEW standardized evaluation for:', {
        questionType: question.question_type,
        questionId: questionIdNum,
        studentAnswer: studentAnswer
      });
      
      const scoreResult = evaluateAndFormatAnswer(
        question.question_type, 
        question.question_data, // Pass the raw question_data JSON
        studentAnswer, 
        question.marks,
        questionData.questionText || 'Question text not available'
      );
      
      isCorrect = scoreResult.isCorrect;
      pointsEarned = scoreResult.pointsEarned;
      formattedAnswer = scoreResult.formattedAnswer;
      
      console.log('✅ NEW standardized evaluation result:', {
        isCorrect,
        pointsEarned,
        totalMarks: question.marks,
        formattedAnswer: JSON.stringify(formattedAnswer, null, 2)
      });
      
    } catch (scoreError) {
      console.error('❌ Error calculating score:', scoreError.message);
      console.error('❌ Score error stack:', scoreError.stack);
      
      // Fallback scoring - use required format
      isCorrect = false;
      pointsEarned = 0;
      formattedAnswer = {
        questionType: question.question_type,
        studentAnswer: studentAnswer,
        is_correct: false,
        marks_obtained: 0,
        error: `Scoring error: ${scoreError.message}`,
        timestamp: new Date().toISOString()
      };
    }

    // Check if answer already exists (update) or create new - using new studentAnswer table
    let result;
    
    try {
      const existingAnswer = await pool.request()
        .input('attemptId', sql.Int, attemptIdNum)
        .input('questionId', sql.Int, questionIdNum)
        .query(`
          SELECT id FROM studentAnswer 
          WHERE attempt_id = @attemptId AND question_id = @questionId
        `);

      if (existingAnswer.recordset.length > 0) {
        // Update existing answer
        console.log('🔧 About to UPDATE existing answer with data:', {
          answerId: existingAnswer.recordset[0].id,
          isCorrect,
          pointsEarned,
          formattedAnswerType: typeof formattedAnswer
        });
        
        const answerJson = JSON.stringify(formattedAnswer);
        if (answerJson.length > 8000) {
          console.warn('⚠️ Answer JSON is very large, truncating...');
        }
        
        result = await pool.request()
          .input('answerId', sql.Int, existingAnswer.recordset[0].id)
          .input('studentAnswer', sql.NVarChar(sql.MAX), answerJson)
          .input('isCorrect', sql.Bit, isCorrect)
          .input('marksObtained', sql.Decimal(5,2), pointsEarned)
          .input('updatedAt', sql.DateTime, new Date())
          .query(`
            UPDATE studentAnswer SET
              student_answer = @studentAnswer,
              is_correct = @isCorrect,
              marks_obtained = @marksObtained,
              updated_at = @updatedAt
            WHERE id = @answerId
          `);
      } else {
        // Create new answer
        console.log('🔧 About to INSERT new answer with data:', {
          attemptId,
          questionId,
          isCorrect,
          pointsEarned,
          formattedAnswerType: typeof formattedAnswer
        });
        
        const answerJson = JSON.stringify(formattedAnswer);
        if (answerJson.length > 8000) {
          console.warn('⚠️ Answer JSON is very large, truncating...');
        }
        
        result = await pool.request()
          .input('attemptId', sql.Int, attemptIdNum)
          .input('questionId', sql.Int, questionIdNum)
          .input('studentAnswer', sql.NVarChar(sql.MAX), answerJson)
          .input('isCorrect', sql.Bit, isCorrect)
          .input('marksObtained', sql.Decimal(5,2), pointsEarned)
          .input('createdAt', sql.DateTime, new Date())
          .query(`
            INSERT INTO studentAnswer (attempt_id, question_id, student_answer, is_correct, marks_obtained, created_at)
            OUTPUT INSERTED.id
            VALUES (@attemptId, @questionId, @studentAnswer, @isCorrect, @marksObtained, @createdAt)
          `);
      }
      
    } catch (dbError) {
      console.error('❌ Database error during answer submission:', dbError.message);
      console.error('❌ DB error stack:', dbError.stack);
      
      return res.status(500).json({
        success: false,
        message: 'Database error while saving answer',
        error: 'Internal server error'
      });
    }

    console.log(`✅ Answer submitted for question ${questionIdNum}, ${isCorrect ? 'correct' : 'incorrect'}, ${pointsEarned} points`);

    res.json({
      success: true,
      message: 'Answer submitted successfully',
      data: {
        isCorrect: isCorrect,
        pointsEarned: pointsEarned,
        totalMarks: question.marks,
        formattedAnswer: formattedAnswer
      }
    });

  } catch (error) {
    console.error('❌ Error submitting answer:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit answer',
      error: error.message
    });
  }
});

// Get answers for a test attempt
app.get('/api/answers/attempt/:attemptId', authenticateToken, async (req, res) => {
  try {
    const { attemptId } = req.params;
    const userId = req.user.id;

    // Verify access rights - using new studentAnswer and testAttempt tables
    let query = `
      SELECT 
        a.id,
        a.question_id,
        q.question_data,
        q.question_type,
        q.marks,
        a.student_answer,
        a.is_correct,
        a.marks_obtained,
        a.created_at,
        a.updated_at
      FROM studentAnswer a
      JOIN questions q ON a.question_id = q.id
      JOIN testAttempt ta ON a.attempt_id = ta.id
      WHERE a.attempt_id = @attemptId
    `;

    // Students can only see their own answers, admins can see all
    if (req.user.role !== 'admin') {
      query += ' AND ta.user_id = @userId';
    }

    const request = pool.request()
      .input('attemptId', sql.Int, attemptId);
    
    if (req.user.role !== 'admin') {
      request.input('userId', sql.Int, userId);
    }

    const result = await request.query(query);

    const answers = result.recordset.map(answer => {
      let questionData = {};
      try {
        questionData = answer.question_data ? JSON.parse(answer.question_data) : {};
      } catch (parseError) {
        console.warn(`⚠️ Failed to parse question_data for answer ${answer.id}:`, parseError);
      }

      return {
        ...answer,
        question_text: questionData.questionText || questionData.question || 'Question text not available',
        student_answer: JSON.parse(answer.student_answer)
      };
    });

    res.json({
      success: true,
      data: answers
    });
  } catch (error) {
    console.error('❌ Error fetching answers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch answers',
      error: error.message
    });
  }
});

// ===== RESULTS API ENDPOINTS =====

// Submit test attempt and calculate final results
app.post('/api/test-attempts/:attemptId/submit', authenticateToken, async (req, res) => {
  try {
    const { attemptId } = req.params;
    const userId = req.user.id; // Changed from studentId to userId

    console.log(`🎯 Submitting test attempt ${attemptId} for final grading`);

    // First, check ALL records for this attemptId to debug duplicate issue
    console.log(`🔍 DEBUG: Checking all records for attempt ${attemptId}...`);
    const debugResult = await pool.request()
      .input('attemptId', sql.Int, attemptId)
      .query(`
        SELECT id, user_id, exam_id, status, start_time, end_time, is_submitted, created_at, updated_at
        FROM testAttempt 
        WHERE id = @attemptId
      `);
    
    console.log(`🔍 DEBUG: Found ${debugResult.recordset.length} records for attempt ${attemptId}:`, debugResult.recordset);

    // Verify attempt belongs to user and is in progress
    const attemptResult = await pool.request()
      .input('attemptId', sql.Int, attemptId)
      .input('userId', sql.Int, userId)
      .query(`
        SELECT ta.id, ta.exam_id, ta.start_time, ta.status, e.title, e.passing_marks as passing_score
        FROM testAttempt ta
        JOIN exams e ON ta.exam_id = e.id
        WHERE ta.id = @attemptId AND ta.user_id = @userId AND ta.status = 'in_progress'
      `);

    if (attemptResult.recordset.length === 0) {
      console.log(`❌ DEBUG: No in_progress attempt found for attemptId ${attemptId}, userId ${userId}`);
      
      // Check if attempt exists with different status
      const statusCheck = await pool.request()
        .input('attemptId', sql.Int, attemptId)
        .input('userId', sql.Int, userId)
        .query(`
          SELECT id, status, is_submitted
          FROM testAttempt 
          WHERE id = @attemptId AND user_id = @userId
        `);
      
      if (statusCheck.recordset.length > 0) {
        const currentStatus = statusCheck.recordset[0];
        console.log(`⚠️ DEBUG: Attempt exists with status '${currentStatus.status}', is_submitted: ${currentStatus.is_submitted}`);
        
        if (currentStatus.status === 'completed') {
          return res.status(400).json({
            success: false,
            message: 'Test attempt already completed'
          });
        }
      }
      
      return res.status(404).json({
        success: false,
        message: 'Active test attempt not found'
      });
    }

    const attempt = attemptResult.recordset[0];
    const endTime = new Date();

    // Calculate total score and statistics - using new studentAnswer table
    const answersResult = await pool.request()
      .input('attemptId', sql.Int, attemptId)
      .query(`
        SELECT 
          COUNT(*) as total_answered,
          SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) as correct_answers,
          SUM(marks_obtained) as total_score
        FROM studentAnswer a
        WHERE a.attempt_id = @attemptId
      `);

    // Get total possible marks from questions
    const examMarksResult = await pool.request()
      .input('examId', sql.Int, attempt.exam_id)
      .query(`
        SELECT 
          COUNT(*) as question_count,
          SUM(marks) as total_possible_marks
        FROM questions 
        WHERE exam_id = @examId AND is_active = 1
      `);

    const stats = answersResult.recordset[0];
    const examStats = examMarksResult.recordset[0];
    const questionCount = examStats.question_count || 0;
    const totalPossibleMarks = examStats.total_possible_marks || 0;
    
    const totalScore = stats.total_score || 0;
    const percentageScore = totalPossibleMarks > 0 ? 
      (totalScore / totalPossibleMarks) * 100 : 0;
    
    const grade = percentageScore >= attempt.passing_score ? 'PASS' : 'FAIL';
    const passed = percentageScore >= attempt.passing_score;
    const timeTaken = Math.round((endTime - new Date(attempt.start_time)) / 60000); // minutes

    // Begin transaction for final submission
    const transaction = new sql.Transaction(pool);
    
    try {
      await transaction.begin();
      
      // EXTRA SAFETY: Check one more time that record exists and is in_progress within transaction
      const finalCheck = await transaction.request()
        .input('attemptId', sql.Int, attemptId)
        .input('userId', sql.Int, userId)
        .query(`
          SELECT id, status, is_submitted, exam_id
          FROM testAttempt 
          WHERE id = @attemptId AND user_id = @userId
        `);
      
      if (finalCheck.recordset.length === 0) {
        console.error(`❌ TRANSACTION ERROR: No attempt found for ${attemptId}`);
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Test attempt not found in transaction'
        });
      }
      
      const currentRecord = finalCheck.recordset[0];
      console.log(`🔍 TRANSACTION CHECK: Current record status='${currentRecord.status}', is_submitted=${currentRecord.is_submitted}`);
      
      if (currentRecord.status === 'completed') {
        console.error(`❌ TRANSACTION ERROR: Attempt ${attemptId} already completed`);
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Test attempt already completed'
        });
      }
      
      if (currentRecord.status !== 'in_progress') {
        console.error(`❌ TRANSACTION ERROR: Attempt ${attemptId} status is '${currentRecord.status}', not 'in_progress'`);
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: `Test attempt status is '${currentRecord.status}', cannot complete`
        });
      }
      
      // Update testAttempt with final scores and completion status - UPDATE SINGLE RECORD ONLY
      console.log(`🔧 UPDATING attempt ${attemptId} from 'in_progress' to 'completed'...`);
      const updateResult = await transaction.request()
        .input('attemptId', sql.Int, attemptId)
        .input('userId', sql.Int, userId)
        .input('endTime', sql.DateTime, endTime)
        .input('updatedAt', sql.DateTime, endTime)
        .input('totalScore', sql.Decimal(5,2), totalScore)
        .input('percentage', sql.Decimal(5,2), percentageScore)
        .input('timeTaken', sql.Int, timeTaken)
        .input('isSubmitted', sql.Bit, 1)
        .query(`
          UPDATE testAttempt SET
            end_time = @endTime,
            updated_at = @updatedAt,
            status = 'completed',
            total_score = @totalScore,
            percentage = @percentage,
            time_taken = @timeTaken,
            is_submitted = @isSubmitted
          WHERE id = @attemptId 
            AND user_id = @userId 
            AND status = 'in_progress'
        `);

      console.log(`✅ Test attempt ${attemptId} update result:`, {
        rowsAffected: updateResult.rowsAffected,
        attemptId: attemptId,
        totalScore: totalScore,
        percentageScore: percentageScore
      });
      
      // Verify the update was successful
      if (updateResult.rowsAffected[0] === 0) {
        console.error(`❌ No rows updated for attempt ${attemptId} - attempt may not exist or not in correct state`);
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Failed to update test attempt - attempt may already be completed or not found'
        });
      }

      console.log(`✅ Test attempt ${attemptId} updated to completed status`);

      // Verify the update was actually persisted
      const verifyUpdate = await transaction.request()
        .input('verifyAttemptId', sql.Int, attemptId)
        .query(`
          SELECT id, status, total_score, percentage, end_time, is_submitted
          FROM testAttempt 
          WHERE id = @verifyAttemptId
        `);
      
      if (verifyUpdate.recordset.length > 0) {
        const updatedRecord = verifyUpdate.recordset[0];
        console.log(`🔍 Verification - Updated record:`, {
          id: updatedRecord.id,
          status: updatedRecord.status,
          total_score: updatedRecord.total_score,
          percentage: updatedRecord.percentage,
          end_time: updatedRecord.end_time,
          is_submitted: updatedRecord.is_submitted
        });
      } else {
        console.error(`❌ Verification failed - No record found for attempt ${attemptId}`);
      }

      // Check if results record already exists to prevent duplicates
      const existingResults = await transaction.request()
        .input('attemptId', sql.Int, attemptId)
        .query(`SELECT id FROM results WHERE attempt_id = @attemptId`);

      // Only create results record if one doesn't exist
      if (existingResults.recordset.length === 0) {
        await transaction.request()
          .input('attemptId', sql.Int, attemptId)
          .input('totalQuestions', sql.Int, questionCount)
          .input('correctAnswers', sql.Int, stats.correct_answers || 0)
          .input('wrongAnswers', sql.Int, (stats.total_answered || 0) - (stats.correct_answers || 0))
          .input('unanswered', sql.Int, questionCount - (stats.total_answered || 0))
          .input('totalMarks', sql.Decimal(5,2), totalPossibleMarks)
          .input('obtainedMarks', sql.Decimal(5,2), totalScore)
          .input('percentage', sql.Decimal(5,2), percentageScore)
          .input('grade', sql.VarChar(10), grade)
          .input('status', sql.NVarChar(20), percentageScore >= attempt.passing_score ? 'pass' : 'fail')
          .input('createdAt', sql.DateTime, endTime)
          .query(`
            INSERT INTO results (
              attempt_id, total_questions, correct_answers, wrong_answers,
              unanswered, total_marks, obtained_marks, percentage, grade, status, created_at
            )
            VALUES (
              @attemptId, @totalQuestions, @correctAnswers, @wrongAnswers,
              @unanswered, @totalMarks, @obtainedMarks, @percentage, @grade, @status, @createdAt
            )
          `);
        console.log(`✅ Created new results record for attempt ${attemptId}`);
      } else {
        console.log(`⚠️ Results record already exists for attempt ${attemptId}, skipping creation`);
      }

      // FINAL SAFETY CHECK: Ensure no duplicate records exist for this user/exam
      const duplicateCheck = await transaction.request()
        .input('userId', sql.Int, userId)
        .input('examId', sql.Int, attempt.exam_id)
        .query(`
          SELECT COUNT(*) as count, 
                 SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_count,
                 SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_count
          FROM testAttempt 
          WHERE user_id = @userId AND exam_id = @examId
        `);
      
      const dupStats = duplicateCheck.recordset[0];
      console.log(`🔍 FINAL CHECK: User ${userId}, Exam ${attempt.exam_id} - Total: ${dupStats.count}, Completed: ${dupStats.completed_count}, In Progress: ${dupStats.in_progress_count}`);
      
      if (dupStats.in_progress_count > 0) {
        console.warn(`⚠️ WARNING: Still have ${dupStats.in_progress_count} in_progress records after completion!`);
      }

      await transaction.commit();
      
      console.log(`✅ Test attempt ${attemptId} submitted successfully - Grade: ${grade}, Score: ${percentageScore.toFixed(2)}%`);
      
      res.json({
        success: true,
        message: 'Test submitted successfully',
        data: {
          attemptId: attemptId,
          totalQuestions: questionCount,
          questionsAnswered: stats.total_answered || 0,
          correctAnswers: stats.correct_answers || 0,
          totalScore: totalScore,
          totalMarks: totalPossibleMarks,
          percentageScore: parseFloat(percentageScore.toFixed(2)),
          grade: grade,
          timeTaken: timeTaken,
          passed: passed
        }
      });

    } catch (transactionError) {
      await transaction.rollback();
      throw transactionError;
    }

  } catch (error) {
    console.error('❌ Error submitting test:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit test',
      error: error.message
    });
  }
});

// Get results for a test attempt
app.get('/api/results/attempt/:attemptId', authenticateToken, async (req, res) => {
  try {
    const { attemptId } = req.params;
    const userId = req.user.id;

    let query = `
      SELECT 
        r.*,
        ta.user_id,
        ta.exam_id,
        e.title as exam_title,
        e.subject,
        e.passing_score,
        u.first_name,
        u.last_name,
        u.email
      FROM results r
      JOIN testAttempt ta ON r.attempt_id = ta.id
      JOIN exams e ON ta.exam_id = e.id
      JOIN users u ON ta.user_id = u.id
      WHERE r.attempt_id = @attemptId
    `;

    // Students can only see their own results, admins can see all
    if (req.user.role !== 'admin') {
      query += ' AND ta.user_id = @userId';
    }

    const request = pool.request()
      .input('attemptId', sql.Int, attemptId);
    
    if (req.user.role !== 'admin') {
      request.input('userId', sql.Int, userId);
    }

    const result = await request.query(query);

    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Results not found'
      });
    }

    res.json({
      success: true,
      data: result.recordset[0]
    });
  } catch (error) {
    console.error('❌ Error fetching results:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch results',
      error: error.message
    });
  }
});

// Get detailed results for a test attempt including questions and answers
app.get('/api/results/attempt/:attemptId/detailed', authenticateToken, async (req, res) => {
  try {
    const { attemptId } = req.params;
    const userId = req.user.id;

    // First, get the basic attempt and result information
    let attemptQuery = `
      SELECT 
        ta.id,
        ta.user_id,
        ta.exam_id,
        ta.start_time,
        ta.end_time,
        ta.status,
        ta.total_score,
        ta.is_submitted,
        e.title as exam_title,
        e.subject,
        e.duration,
        e.passing_score,
        e.total_questions,
        u.first_name,
        u.last_name,
        u.email,
        r.percentage,
        r.grade,
        CASE WHEN COALESCE(r.percentage, ta.total_score, 0) >= e.passing_score THEN 1 ELSE 0 END as is_passed
      FROM testAttempt ta
      JOIN exams e ON ta.exam_id = e.id
      JOIN users u ON ta.user_id = u.id
      LEFT JOIN results r ON ta.id = r.attempt_id
      WHERE ta.id = @attemptId
    `;

    // Students can only see their own results, admins can see all
    if (req.user.role !== 'admin') {
      attemptQuery += ' AND ta.user_id = @userId';
    }

    const attemptRequest = pool.request()
      .input('attemptId', sql.Int, attemptId);
    
    if (req.user.role !== 'admin') {
      attemptRequest.input('userId', sql.Int, userId);
    }

    const attemptResult = await attemptRequest.query(attemptQuery);

    if (attemptResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Test attempt not found'
      });
    }

    const attemptData = attemptResult.recordset[0];

    // Get all questions for this exam with student answers
    const questionsQuery = `
      SELECT 
        q.id,
        JSON_VALUE(q.question_data, '$.questionText') as question_text,
        q.question_data,
        q.question_type,
        q.marks,
        q.order_index,
        sa.student_answer,
        sa.is_correct,
        sa.marks_obtained as points_earned
      FROM questions q
      LEFT JOIN studentAnswer sa ON q.id = sa.question_id AND sa.attempt_id = @attemptId
      WHERE q.exam_id = @examId
      ORDER BY q.order_index
    `;

    const questionsResult = await pool.request()
      .input('attemptId', sql.Int, attemptId)
      .input('examId', sql.Int, attemptData.exam_id)
      .query(questionsQuery);

    // Format the response
    const detailedResult = {
      attempt: {
        id: attemptData.id,
        user_id: attemptData.user_id,
        exam_id: attemptData.exam_id,
        start_time: attemptData.start_time,
        end_time: attemptData.end_time,
        status: attemptData.status,
        total_score: attemptData.total_score,
        is_submitted: attemptData.is_submitted
      },
      exam: {
        title: attemptData.exam_title,
        subject: attemptData.subject,
        duration: attemptData.duration,
        passing_score: attemptData.passing_score,
        total_questions: attemptData.total_questions
      },
      user: {
        first_name: attemptData.first_name,
        last_name: attemptData.last_name,
        email: attemptData.email
      },
      result: {
        total_score: attemptData.total_score,
        percentage: attemptData.percentage,
        grade: attemptData.grade,
        is_passed: attemptData.is_passed
      },
      questions: questionsResult.recordset.map(q => ({
        id: q.id,
        question_text: q.question_text,
        question_type: q.question_type,
        marks: q.marks,
        question_data: q.question_data ? JSON.parse(q.question_data) : null,
        student_answer: q.student_answer ? JSON.parse(q.student_answer) : null,
        correct_answer: q.question_data ? JSON.parse(q.question_data).correctAnswers || JSON.parse(q.question_data).correct_answer : null,
        is_correct: q.is_correct || false,
        points_earned: q.points_earned || 0
      }))
    };

    res.json({
      success: true,
      data: detailedResult
    });
  } catch (error) {
    console.error('❌ Error fetching detailed results:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch detailed results',
      error: error.message
    });
  }
});

// Get all results for an exam (admin only)
app.get('/api/results/exam/:examId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { examId } = req.params;

    const result = await pool.request()
      .input('examId', sql.Int, examId)
      .query(`
        SELECT 
          r.*,
          ta.user_id,
          ta.created_at as start_time,
          ta.updated_at as end_time,
          u.first_name,
          u.last_name,
          u.email,
          e.title as exam_title
        FROM results r
        JOIN testAttempt ta ON r.attempt_id = ta.id
        JOIN users u ON ta.user_id = u.id
        JOIN exams e ON ta.exam_id = e.id
        WHERE ta.exam_id = @examId
        ORDER BY r.percentage DESC, ta.updated_at ASC
      `);

    res.json({
      success: true,
      data: result.recordset
    });
  } catch (error) {
    console.error('❌ Error fetching exam results:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch exam results',
      error: error.message
    });
  }
});

// Get all results (admin only) - for general results overview
app.get('/api/results/all', authenticateToken, requireAdmin, async (req, res) => {
  try {
    console.log('🔍 Getting all results for admin');

    // Extract pagination and search parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const status = req.query.status || 'all';
    const offset = (page - 1) * limit;

    console.log('📊 Request parameters:', { page, limit, search, status, offset });

    // Build WHERE clause for search and filters
    let whereClause = '';
    let searchParams = [];
    
    if (search) {
      whereClause += ` AND (
        u.first_name LIKE @search 
        OR u.last_name LIKE @search 
        OR u.email LIKE @search 
        OR e.title LIKE @search 
        OR e.subject LIKE @search
      )`;
      searchParams.push(['search', sql.NVarChar(500), `%${search}%`]);
    }
    
    if (status !== 'all') {
      whereClause += ` AND ta.status = @status`;
      searchParams.push(['status', sql.NVarChar(50), status]);
    }

    // Get total count for pagination (all matching records, not just current page)
    let countQuery = `
      SELECT COUNT(*) as total_count
      FROM results r
      JOIN testAttempt ta ON r.attempt_id = ta.id
      JOIN users u ON ta.user_id = u.id
      JOIN exams e ON ta.exam_id = e.id
      WHERE 1=1 ${whereClause}
    `;

    // Also get attempts without results for total count
    let attemptsCountQuery = `
      SELECT COUNT(*) as attempts_count
      FROM testAttempt ta
      JOIN users u ON ta.user_id = u.id
      JOIN exams e ON ta.exam_id = e.id
      LEFT JOIN results r ON ta.id = r.attempt_id
      WHERE r.id IS NULL ${whereClause}
    `;

    // Build the main query with pagination
    let mainQuery = `
      SELECT 
        r.id as result_id,
        ta.id as attempt_id,
        r.percentage,
        r.grade,
        r.status as result_status,
        r.created_at,
        ta.user_id,
        ta.exam_id,
        ta.start_time,
        ta.end_time,
        ta.status,
        ta.total_score,
        u.first_name,
        u.last_name,
        u.email,
        e.title as exam_title,
        e.subject,
        e.passing_score,
        e.duration
      FROM results r
      JOIN testAttempt ta ON r.attempt_id = ta.id
      JOIN users u ON ta.user_id = u.id
      JOIN exams e ON ta.exam_id = e.id
      WHERE 1=1 ${whereClause}
    `;

    let attemptsQuery = `
      SELECT 
        NULL as result_id,
        ta.id as attempt_id,
        NULL as percentage,
        NULL as grade,
        NULL as result_status,
        ta.start_time as created_at,
        ta.user_id,
        ta.exam_id,
        ta.start_time,
        ta.end_time,
        ta.status,
        ta.total_score,
        u.first_name,
        u.last_name,
        u.email,
        e.title as exam_title,
        e.subject,
        e.passing_score,
        e.duration
      FROM testAttempt ta
      JOIN users u ON ta.user_id = u.id
      JOIN exams e ON ta.exam_id = e.id
      LEFT JOIN results r ON ta.id = r.attempt_id
      WHERE r.id IS NULL ${whereClause}
    `;

    // Execute count queries
    let countRequest = pool.request();
    let attemptsCountRequest = pool.request();
    searchParams.forEach(([name, type, value]) => {
      countRequest.input(name, type, value);
      attemptsCountRequest.input(name, type, value);
    });

    const [countResult, attemptsCountResult] = await Promise.all([
      countRequest.query(countQuery),
      attemptsCountRequest.query(attemptsCountQuery)
    ]);

    const totalResults = countResult.recordset[0].total_count;
    const totalAttempts = attemptsCountResult.recordset[0].attempts_count;
    const totalRecords = totalResults + totalAttempts;

    console.log('📊 Total counts:', { 
      totalResults, 
      totalAttempts, 
      totalRecords,
      requestedPage: page,
      requestedLimit: limit 
    });

    // Execute main queries with pagination applied to combined results
    let mainRequest = pool.request();
    let attemptsRequest = pool.request();
    searchParams.forEach(([name, type, value]) => {
      mainRequest.input(name, type, value);
      attemptsRequest.input(name, type, value);
    });

    // Combine both queries with UNION ALL and apply pagination
    const combinedQuery = `
      SELECT * FROM (
        ${mainQuery}
        UNION ALL
        ${attemptsQuery}
      ) combined_results
      ORDER BY created_at DESC, start_time DESC
      OFFSET ${offset} ROWS
      FETCH NEXT ${limit} ROWS ONLY
    `;

    let combinedRequest = pool.request();
    searchParams.forEach(([name, type, value]) => {
      combinedRequest.input(name, type, value);
    });

    const result = await combinedRequest.query(combinedQuery);

    console.log('✅ Results query completed, found:', result.recordset.length, 'results for page', page);

    // Format the combined results consistently
    const formattedResults = result.recordset.map(row => ({
      id: row.id,
      attempt_id: row.attempt_id,
      user_id: row.user_id,
      exam_id: row.exam_id,
      exam_title: row.exam_title,
      subject: row.subject,
      first_name: row.first_name,
      last_name: row.last_name,
      email: row.email,
      start_time: row.start_time,
      end_time: row.end_time,
      status: row.status || 'completed',
      total_score: row.percentage || row.total_score,
      passing_score: row.passing_score,
      duration: row.duration,
      is_passed: (row.percentage || row.total_score || 0) >= (row.passing_score || 70),
      grade: row.grade,
      created_at: row.created_at
    }));

    // Calculate statistics for ALL matching records (not just current page)
    // Get all matching records for statistics calculation
    let statsQuery = `
      SELECT 
        ta.status,
        COALESCE(r.percentage, ta.total_score, 0) as score,
        CASE WHEN COALESCE(r.percentage, ta.total_score, 0) >= e.passing_score THEN 1 ELSE 0 END as is_passed
      FROM testAttempt ta
      JOIN users u ON ta.user_id = u.id
      JOIN exams e ON ta.exam_id = e.id
      LEFT JOIN results r ON ta.id = r.attempt_id
      WHERE 1=1 ${whereClause}
    `;

    let statsRequest = pool.request();
    searchParams.forEach(([name, type, value]) => {
      statsRequest.input(name, type, value);
    });

    const statsResult = await statsRequest.query(statsQuery);
    const allFilteredRecords = statsResult.recordset;

    // Calculate filtered statistics
    const totalAttemptsFiltered = allFilteredRecords.length;
    const completedResults = allFilteredRecords.filter(r => r.status === 'completed');
    const avgScore = completedResults.length > 0 
      ? completedResults.reduce((sum, r) => sum + (r.score || 0), 0) / completedResults.length 
      : 0;
    const passRate = completedResults.length > 0 
      ? (completedResults.filter(r => r.is_passed).length / completedResults.length) * 100 
      : 0;

    const pagination = {
      currentPage: page,
      totalPages: Math.ceil(totalRecords / limit),
      totalRecords,
      recordsPerPage: limit,
      hasNextPage: page < Math.ceil(totalRecords / limit),
      hasPrevPage: page > 1
    };

    const statistics = {
      totalAttempts: totalAttemptsFiltered,
      completed: completedResults.length,
      avgScore: parseFloat(avgScore.toFixed(1)),
      passRate: parseFloat(passRate.toFixed(1))
    };

    console.log('📊 Filtered statistics:', statistics);
    console.log('📊 Pagination info:', pagination);

    res.json({
      success: true,
      data: formattedResults,
      pagination,
      statistics
    });
  } catch (error) {
    console.error('❌ Error fetching all results:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch all results',
      error: error.message
    });
  }
});

// Helper function to calculate score and format answer based on question type
function calculateScore(questionType, questionData, studentAnswer, totalMarks, questionText) {
  let isCorrect = false;
  let pointsEarned = 0;
  let formattedAnswer = {};

  try {
    // Input validation
    if (!questionType || !questionData || totalMarks === undefined) {
      throw new Error('Missing required parameters for score calculation');
    }

    // Ensure totalMarks is a valid number
    totalMarks = parseFloat(totalMarks) || 0;
    
    // Default questionText if not provided
    questionText = questionText || 'Question text not available';

    switch (questionType) {
      case 'single-choice':
        try {
          // Extract correct answer from question data
          let correctOptions = [];
          if (questionData.correctAnswers && Array.isArray(questionData.correctAnswers)) {
            correctOptions = questionData.correctAnswers;
          } else if (questionData.correctAnswer !== undefined) {
            correctOptions = [questionData.correctAnswer];
          } else if (questionData.correct_answer !== undefined) {
            correctOptions = [questionData.correct_answer];
          }

          // Handle student answer
          let rawStudentAnswer = studentAnswer;
          if (studentAnswer && studentAnswer.rawAnswer !== undefined) {
            rawStudentAnswer = studentAnswer.rawAnswer;
          } else if (studentAnswer && studentAnswer.selectedOptions !== undefined) {
            rawStudentAnswer = studentAnswer.selectedOptions;
          }

          const selectedOptionStrings = Array.isArray(rawStudentAnswer) ? rawStudentAnswer : [rawStudentAnswer];
          
          // Convert "opt0", "opt1" format to numbers for comparison
          const selectedOptions = selectedOptionStrings
            .filter(opt => opt !== null && opt !== undefined)
            .map(opt => {
              if (typeof opt === 'string' && opt.startsWith('opt')) {
                const num = parseInt(opt.replace('opt', ''));
                return isNaN(num) ? opt : num;
              }
              return opt;
            });

          // Check if student answer matches correct answer
          if (selectedOptions.length === 1 && correctOptions.includes(selectedOptions[0])) {
            isCorrect = true;
            pointsEarned = totalMarks;
          }

          formattedAnswer = {
            questionText: questionText,
            questionType: 'single-choice',
            selectedOptions: selectedOptions,
            correctOptions: correctOptions,
            isCorrect: isCorrect,
            pointsEarned: pointsEarned,
            totalMarks: totalMarks,
            rawAnswer: rawStudentAnswer
          };
        } catch (scError) {
          console.error('Error in single-choice scoring:', scError.message);
          formattedAnswer = {
            questionText: questionText,
            questionType: 'single-choice',
            rawAnswer: studentAnswer,
            isCorrect: false,
            pointsEarned: 0,
            totalMarks: totalMarks,
            error: 'Single choice scoring error'
          };
        }
        break;

      case 'multiple-choice':
        try {
          // Extract correct answers
          let correctAnswers = questionData.correctAnswers || questionData.correct_answers || [];
          if (!Array.isArray(correctAnswers)) {
            correctAnswers = [correctAnswers];
          }

          // Handle student answer
          let studentOptions = studentAnswer;
          if (studentAnswer && studentAnswer.selectedOptions) {
            studentOptions = studentAnswer.selectedOptions;
          } else if (studentAnswer && studentAnswer.rawAnswer) {
            studentOptions = studentAnswer.rawAnswer;
          }

          if (!Array.isArray(studentOptions)) {
            studentOptions = [studentOptions];
          }

          // Convert opt format to numbers
          const studentSelections = studentOptions
            .filter(opt => opt !== null && opt !== undefined)
            .map(opt => {
              if (typeof opt === 'string' && opt.startsWith('opt')) {
                const num = parseInt(opt.replace('opt', ''));
                return isNaN(num) ? opt : num;
              }
              return opt;
            });

          // Calculate partial credit
          const correctSelections = studentSelections.filter(opt => correctAnswers.includes(opt));
          const incorrectSelections = studentSelections.filter(opt => !correctAnswers.includes(opt));
          
          if (studentSelections.length === correctAnswers.length && 
              correctSelections.length === correctAnswers.length && 
              incorrectSelections.length === 0) {
            isCorrect = true;
            pointsEarned = totalMarks;
          } else if (correctSelections.length > 0) {
            // Partial credit: (correct selections / total correct) * total marks
            pointsEarned = Math.max(0, (correctSelections.length / correctAnswers.length) * totalMarks - 
                                      (incorrectSelections.length * 0.25 * totalMarks));
            pointsEarned = Math.round(pointsEarned * 100) / 100; // Round to 2 decimal places
          }

          formattedAnswer = {
            questionText: questionText,
            questionType: 'multiple-choice',
            selectedOptions: studentSelections,
            correctOptions: correctAnswers,
            isCorrect: isCorrect,
            pointsEarned: pointsEarned,
            totalMarks: totalMarks,
            partialCredit: true
          };
        } catch (mcError) {
          console.error('Error in multiple-choice scoring:', mcError.message);
          formattedAnswer = {
            questionText: questionText,
            questionType: 'multiple-choice',
            rawAnswer: studentAnswer,
            isCorrect: false,
            pointsEarned: 0,
            totalMarks: totalMarks,
            error: 'Multiple choice scoring error'
          };
        }
        break;

      case 'drag-drop':
        // Handle drag and drop questions
        const dragDropTargets = questionData.dragDropTargets || questionData.dropTargets || [];
        let studentMappings = studentAnswer;
        
        if (studentAnswer && studentAnswer.mappings) {
          studentMappings = studentAnswer.mappings;
        } else if (studentAnswer && studentAnswer.dragDropMappings) {
          studentMappings = studentAnswer.dragDropMappings;
        }

        let correctMappings = 0;
        let totalMappings = dragDropTargets.length;

        if (Array.isArray(studentMappings) && totalMappings > 0) {
          studentMappings.forEach(mapping => {
            const target = dragDropTargets.find(t => t.id === mapping.targetId);
            if (target && target.correctItemId === mapping.itemId) {
              correctMappings++;
            }
          });

          if (correctMappings === totalMappings) {
            isCorrect = true;
            pointsEarned = totalMarks;
          } else if (correctMappings > 0) {
            pointsEarned = (correctMappings / totalMappings) * totalMarks;
            pointsEarned = Math.round(pointsEarned * 100) / 100;
          }
        }

        formattedAnswer = {
          questionText: questionText,
          questionType: 'drag-drop',
          studentMappings: studentMappings,
          correctMappings: correctMappings,
          totalMappings: totalMappings,
          isCorrect: isCorrect,
          pointsEarned: pointsEarned,
          totalMarks: totalMarks
        };
        break;

      case 'case-study':
        // Handle case study with sub-questions - NON-RECURSIVE APPROACH
        const subQuestions = questionData.subQuestions || [];
        let studentSubAnswers = studentAnswer;
        
        if (studentAnswer && studentAnswer.subAnswers) {
          studentSubAnswers = studentAnswer.subAnswers;
        }

        let totalSubQuestions = subQuestions.length;
        let correctSubAnswers = 0;
        let earnedSubMarks = 0;

        if (Array.isArray(studentSubAnswers) && totalSubQuestions > 0) {
          subQuestions.forEach((subQ, index) => {
            const subMarks = subQ.marks || (totalMarks / totalSubQuestions);
            
            if (studentSubAnswers[index]) {
              try {
                // Handle sub-question scoring without recursion
                let subIsCorrect = false;
                let subPointsEarned = 0;
                
                const subAnswer = studentSubAnswers[index];
                const subType = subQ.type || subQ.question_type || 'single-choice';
                
                if (subType === 'single-choice') {
                  const correctAnswer = subQ.correctAnswer || subQ.correct_answer;
                  if (correctAnswer !== undefined && subAnswer === correctAnswer) {
                    subIsCorrect = true;
                    subPointsEarned = subMarks;
                  }
                } else if (subType === 'multiple-choice') {
                  const correctAnswers = subQ.correctAnswers || subQ.correct_answers || [];
                  const studentAnswers = Array.isArray(subAnswer) ? subAnswer : [subAnswer];
                  if (correctAnswers.length === studentAnswers.length && 
                      correctAnswers.every(ans => studentAnswers.includes(ans))) {
                    subIsCorrect = true;
                    subPointsEarned = subMarks;
                  }
                } else {
                  // For other types, give partial credit if answer exists
                  if (subAnswer && subAnswer.toString().trim().length > 0) {
                    subIsCorrect = false; // Requires manual review
                    subPointsEarned = subMarks * 0.5; // Partial credit
                  }
                }
                
                if (subIsCorrect) {
                  correctSubAnswers++;
                }
                earnedSubMarks += subPointsEarned;
                
              } catch (subError) {
                console.warn(`⚠️ Error processing sub-question ${index}:`, subError.message);
                // Continue processing other sub-questions
              }
            }
          });

          isCorrect = correctSubAnswers === totalSubQuestions;
          pointsEarned = earnedSubMarks;
        }

        formattedAnswer = {
          questionText: questionText,
          questionType: 'case-study',
          subAnswers: studentSubAnswers,
          correctSubAnswers: correctSubAnswers,
          totalSubQuestions: totalSubQuestions,
          isCorrect: isCorrect,
          pointsEarned: pointsEarned,
          totalMarks: totalMarks
        };
        break;

      case 'short-answer':
      case 'text':
        // For text-based questions, award full marks (manual grading required)
        const textAnswer = studentAnswer || '';
        const answerText = typeof textAnswer === 'string' ? textAnswer : 
                          (textAnswer.text || textAnswer.answer || JSON.stringify(textAnswer));
        
        // Basic validation - if answer is provided, give full marks for now
        if (answerText.trim().length > 0) {
          isCorrect = true;
          pointsEarned = totalMarks;
        }

        formattedAnswer = {
          questionText: questionText,
          questionType: questionType,
          answerText: answerText,
          isCorrect: isCorrect,
          pointsEarned: pointsEarned,
          totalMarks: totalMarks,
          requiresManualGrading: true
        };
        break;

      default:
        console.warn(`⚠️ Unknown question type: ${questionType}`);
        formattedAnswer = {
          questionText: questionText,
          questionType: questionType,
          rawAnswer: studentAnswer,
          isCorrect: false,
          pointsEarned: 0,
          totalMarks: totalMarks,
          error: 'Unknown question type'
        };
    }

    console.log(`📊 Score calculated for ${questionType}: ${pointsEarned}/${totalMarks} (${isCorrect ? 'correct' : 'incorrect'})`);
    
    return {
      isCorrect: isCorrect,
      pointsEarned: Math.max(0, pointsEarned), // Ensure non-negative
      formattedAnswer: formattedAnswer
    };

  } catch (error) {
    console.error('❌ Error calculating score:', error);
    return {
      isCorrect: false,
      pointsEarned: 0,
      formattedAnswer: {
        questionText: questionText,
        questionType: questionType,
        rawAnswer: studentAnswer,
        isCorrect: false,
        pointsEarned: 0,
        totalMarks: totalMarks,
        error: error.message
      }
    };
  }
}

// Admin Code Management Endpoints
app.post('/api/admin/generate-invite-code', authenticateToken, requireAdmin, async (req, res) => {
  try {
    console.log('🔑 Admin generating invite code:', req.user.email);
    
    // Generate 16-character code with mixed case, numbers, and symbols
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&*';
    let code = '';
    
    for (let i = 0; i < 16; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    // Insert the new code
    await pool.request()
      .input('code', sql.NVarChar, code)
      .input('createdBy', sql.Int, req.user.id)
      .query(`
        INSERT INTO admin_invite_codes (code, created_by)
        VALUES (@code, @createdBy)
      `);
    
    console.log('✅ New admin invite code generated by:', req.user.email);
    
    res.status(200).json({
      success: true,
      message: 'Admin invite code generated successfully',
      code: code
    });

  } catch (error) {
    console.error('❌ Error generating admin code:', error);
    res.status(500).json({ 
      message: 'Failed to generate admin invite code',
      error: error.message 
    });
  }
});

app.get('/api/admin/invite-codes', authenticateToken, requireAdmin, async (req, res) => {
  try {
    console.log('📋 Admin requesting invite codes list:', req.user.email);
    
    const result = await pool.request().query(`
      SELECT 
        ac.id,
        ac.code,
        ac.is_used,
        ac.created_at,
        ac.used_at,
        u.email as used_by_email,
        u.first_name + ' ' + u.last_name as used_by_name,
        creator.email as created_by_email,
        creator.first_name + ' ' + creator.last_name as created_by_name
      FROM admin_invite_codes ac
      LEFT JOIN users u ON ac.used_by = u.id
      LEFT JOIN users creator ON ac.created_by = creator.id
      ORDER BY ac.created_at DESC
    `);
    
    res.status(200).json({
      success: true,
      codes: result.recordset
    });

  } catch (error) {
    console.error('❌ Error fetching admin codes:', error);
    res.status(500).json({ 
      message: 'Failed to fetch admin invite codes',
      error: error.message 
    });
  }
});

// ===== SECURITY VIOLATION LOGGING ENDPOINT =====

// Log security violations during exam attempts
app.post('/api/security/log-violation', authenticateToken, async (req, res) => {
  try {
    const { attemptId, violationType, details, timestamp } = req.body;
    const userId = req.user.id;

    console.log(`🚨 Security violation logged - User: ${userId}, Attempt: ${attemptId}, Type: ${violationType}`);

    // Validate that the attempt belongs to the user
    const attemptCheck = await pool.request()
      .input('attemptId', sql.Int, attemptId)
      .input('userId', sql.Int, userId)
      .query(`
        SELECT id, status, exam_id
        FROM testAttempt 
        WHERE id = @attemptId AND user_id = @userId
      `);

    if (attemptCheck.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Test attempt not found'
      });
    }

    const attempt = attemptCheck.recordset[0];

    // Create security_violations table if it doesn't exist
    try {
      await pool.request().query(`
        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='security_violations' AND xtype='U')
        BEGIN
          CREATE TABLE security_violations (
            id INT IDENTITY(1,1) PRIMARY KEY,
            attempt_id INT NOT NULL,
            user_id INT NOT NULL,
            exam_id INT NOT NULL,
            violation_type VARCHAR(50) NOT NULL,
            details NVARCHAR(MAX),
            violation_timestamp DATETIME2 NOT NULL,
            created_at DATETIME2 DEFAULT GETDATE(),
            FOREIGN KEY (attempt_id) REFERENCES testAttempt(id),
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (exam_id) REFERENCES exams(id)
          )
        END
      `);
    } catch (tableError) {
      console.warn('⚠️ Could not create security_violations table:', tableError.message);
    }

    // Log the violation
    try {
      await pool.request()
        .input('attemptId', sql.Int, attemptId)
        .input('userId', sql.Int, userId)
        .input('examId', sql.Int, attempt.exam_id)
        .input('violationType', sql.VarChar(50), violationType)
        .input('details', sql.NVarChar(sql.MAX), details || '')
        .input('violationTimestamp', sql.DateTime2, new Date(timestamp))
        .input('createdAt', sql.DateTime2, new Date())
        .query(`
          INSERT INTO security_violations 
          (attempt_id, user_id, exam_id, violation_type, details, violation_timestamp, created_at)
          VALUES 
          (@attemptId, @userId, @examId, @violationType, @details, @violationTimestamp, @createdAt)
        `);

      console.log(`✅ Security violation logged: ${violationType} for attempt ${attemptId}`);
    } catch (insertError) {
      console.warn('⚠️ Could not insert security violation (table may not exist):', insertError.message);
      // Continue without failing - this is not critical functionality
    }

    res.json({
      success: true,
      message: 'Security violation logged successfully'
    });

  } catch (error) {
    console.error('❌ Error logging security violation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to log security violation',
      error: error.message
    });
  }
});

const PORT = 5000;

// Start server
const startServer = async () => {
  try {
    // Connect to database first
    await connectDB();
    
    // Start server only after database connection is established
    app.listen(PORT, () => {
      console.log(`🚀 Backend server running on http://localhost:${PORT}`);
      console.log('📊 Endpoints available:');
      console.log('  POST /api/auth/register - User registration');
      console.log('  POST /api/auth/verify-otp - Verify registration OTP');
      console.log('  POST /api/auth/resend-otp - Resend registration OTP');
      console.log('  POST /api/auth/login - User login');
      console.log('  POST /api/auth/forgot-password - Request password reset');
      console.log('  POST /api/auth/reset-password - Reset password with OTP');
      console.log('  POST /api/auth/resend-reset-otp - Resend password reset OTP');
      console.log('  POST /api/exams - Create/update exam');
      console.log('  GET /api/exams - Get all exams (admin)');
      console.log('  GET /api/exams/published - Get published exams (students)');
      console.log('  GET /api/exams/:id - Get specific exam');
      console.log('  PUT /api/exams/:id - Update exam (admin)');
      console.log('  POST /api/exams/:id/publish - Publish exam');
      console.log('  DELETE /api/exams/:id - Delete exam and all questions (admin)');
      console.log('  POST /api/questions - Create question (admin)');
      console.log('  GET /api/questions/exam/:examId - Get exam questions');
      console.log('  GET /api/questions/:id - Get single question');
      console.log('  PUT /api/questions/:id - Update question (admin)');
      console.log('  DELETE /api/questions/:id - Delete question (admin)');
      console.log('  GET /api/questions/exam/:examId/type/:type - Get questions by type');
      console.log('  GET /api/health - Health check');
      console.log('  GET /api/test-db - Database test');
      console.log('');
      console.log('📝 Test Attempts:');
      console.log('  POST /api/test-attempts/start - Start new test attempt');
      console.log('  GET /api/test-attempts/student - Get student attempts');
      console.log('  GET /api/test-attempts/:id - Get attempt details');
      console.log('  POST /api/test-attempts/:id/submit - Submit test for grading');
      console.log('');
      console.log('✏️ Answers:');
      console.log('  POST /api/answers/submit - Submit answer for question');
      console.log('  GET /api/answers/attempt/:id - Get all answers for attempt');
      console.log('');
      console.log('🎯 Results:');
      console.log('  GET /api/results/attempt/:id - Get results for attempt');
      console.log('  GET /api/results/attempt/:id/detailed - Get detailed results with questions');
      console.log('  GET /api/results/exam/:id - Get all results for exam (admin)');
      console.log('  GET /api/results/all - Get all results (admin)');
      console.log('');
      console.log('🛡️ Security:');
      console.log('  POST /api/security/log-violation - Log security violations during exam');
      console.log('');
      console.log('👑 Admin:');
      console.log('  POST /api/admin/generate-invite-code - Generate admin invite code');
      console.log('  GET /api/admin/invite-codes - Get all admin invite codes');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();

// Graceful shutdown handling
process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

module.exports = app;
