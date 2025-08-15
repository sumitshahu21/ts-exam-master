const nodemailer = require('nodemailer');
require('dotenv').config();

// Email service configuration
class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  initializeTransporter() {
    try {
      // Check if email configuration exists
      if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS || 
          process.env.EMAIL_USER === 'your-email@gmail.com' || 
          process.env.EMAIL_PASS === 'your-app-password') {
        console.warn('⚠️  Email service not configured. Please update EMAIL_USER and EMAIL_PASS in .env file');
        console.warn('⚠️  For Gmail: Enable 2FA and generate an App Password');
        console.warn('⚠️  Registration will work but no emails will be sent');
        return;
      }

      // Create transporter with email configuration
      this.transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.EMAIL_PORT) || 587,
        secure: false, // true for 465, false for other ports
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      console.log('📧 Email service initialized with:', process.env.EMAIL_USER);
    } catch (error) {
      console.error('❌ Failed to initialize email service:', error);
    }
  }

  // Generate 6-digit OTP
  generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Check if email service is properly configured
  isConfigured() {
    return this.transporter !== null && 
           process.env.EMAIL_USER && 
           process.env.EMAIL_PASS &&
           process.env.EMAIL_USER !== 'your-email@gmail.com' &&
           process.env.EMAIL_PASS !== 'your-app-password';
  }

  // Send OTP email
  async sendOTPEmail(email, otp, firstName) {
    try {
      if (!this.transporter) {
        throw new Error('Email service not configured. Please set up EMAIL_USER and EMAIL_PASS in .env file');
      }

      const mailOptions = {
        from: {
          name: 'ExamMaster',
          address: process.env.EMAIL_USER
        },
        to: email,
        subject: 'Verify Your Email Address - OTP Code',
        html: this.generateOTPEmailTemplate(otp, firstName)
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('✅ OTP email sent successfully:', info.messageId);
      return { success: true, messageId: info.messageId };

    } catch (error) {
      console.error('❌ Failed to send OTP email:', error);
      return { success: false, error: error.message };
    }
  }

  // Generate OTP email template
  generateOTPEmailTemplate(otp, firstName) {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Verification</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px 20px;
            text-align: center;
            border-radius: 10px 10px 0 0;
          }
          .content {
            background: #f8f9fa;
            padding: 30px 20px;
            border-radius: 0 0 10px 10px;
          }
          .otp-code {
            background: #007bff;
            color: white;
            font-size: 32px;
            font-weight: bold;
            text-align: center;
            padding: 20px;
            margin: 20px 0;
            border-radius: 8px;
            letter-spacing: 5px;
          }
          .warning {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            color: #856404;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
          }
          .footer {
            text-align: center;
            color: #6c757d;
            font-size: 14px;
            margin-top: 30px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🔐 Email Verification</h1>
          <p>ExamMaster</p>
        </div>
        
        <div class="content">
          <h2>Hello ${firstName}!</h2>
          
          <p>Thank you for registering with ExamMaster. To complete your registration, please verify your email address using the OTP code below:</p>
          
          <div class="otp-code">
            ${otp}
          </div>
          
          <p><strong>Important:</strong></p>
          <ul>
            <li>This OTP code is valid for <strong>10 minutes</strong> only</li>
            <li>Enter this code in the verification screen to activate your account</li>
            <li>Do not share this code with anyone</li>
          </ul>
          
          <div class="warning">
            <strong>⚠️ Security Notice:</strong> If you didn't request this verification, please ignore this email. Your account will not be created without email verification.
          </div>
          
          <p>If you're having trouble with verification, please contact our support team.</p>
          
          <p>Best regards,<br>
          <strong>ExamMaster Team</strong></p>
        </div>
        
        
        
        
      </body>
      </html>
    `;
  }

  // Send welcome email after successful verification
  async sendWelcomeEmail(email, firstName) {
    try {
      if (!this.transporter) {
        throw new Error('Email service not initialized');
      }

      const mailOptions = {
        from: {
          name: 'ExamMaster Team',
          address: process.env.EMAIL_USER
        },
        to: email,
        subject: 'Welcome to ExamMaster! 🎉',
        html: this.generateWelcomeEmailTemplate(firstName)
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('✅ Welcome email sent successfully:', info.messageId);
      return { success: true, messageId: info.messageId };

    } catch (error) {
      console.error('❌ Failed to send welcome email:', error);
      return { success: false, error: error.message };
    }
  }

  // Generate welcome email template
  generateWelcomeEmailTemplate(firstName) {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
            color: white;
            padding: 30px 20px;
            text-align: center;
            border-radius: 10px 10px 0 0;
          }
          .content {
            background: #f8f9fa;
            padding: 30px 20px;
            border-radius: 0 0 10px 10px;
          }
          .feature-list {
            background: white;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            border-left: 4px solid #28a745;
          }
          .cta-button {
            display: inline-block;
            background: #007bff;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 5px;
            font-weight: bold;
            margin: 20px 0;
          }
          .footer {
            text-align: center;
            color: #6c757d;
            font-size: 14px;
            margin-top: 30px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🎉 Welcome to ExamMaster!</h1>
          <p>Your account is now active</p>
        </div>
        
        <div class="content">
          <h2>Hello ${firstName}!</h2>
          
          <p>Congratulations! Your email has been successfully verified and your account is now active. You can now access all features of ExamMaster.</p>
          
          <div class="feature-list">
            <h3>What you can do now:</h3>
            <ul>
              <li>📚 <strong>Take Practice Tests:</strong> Access a variety of exams and assessments</li>
              <li>📊 <strong>Track Performance:</strong> View detailed results and analytics</li>
              <li>🎯 <strong>Improve Skills:</strong> Use performance insights to focus on weak areas</li>
              <li>📈 <strong>Monitor Progress:</strong> Track your improvement over time</li>
            </ul>
          </div>
          
          <p>Ready to get started? Login to your account and begin your learning journey!</p>
          
          <div style="text-align: center;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/login" class="cta-button">
              Login to Your Account
            </a>
          </div>
          
          <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
          
          <p>Happy learning!<br>
          <strong>ExamMaster Team</strong></p>
        </div>
        
        <div class="footer">
          <p>You're receiving this email because you successfully registered for ExamMaster.</p>
          <p>&copy; 2024 ExamMaster. All rights reserved.</p>
        </div>
      </body>
      </html>
    `;
  }

  // Test email configuration
  // Send password reset OTP email
  async sendPasswordResetOTP(email, otp, firstName) {
    if (!this.isConfigured()) {
      throw new Error('Email service not configured');
    }

    const mailOptions = {
      name: 'ExamMaster Team', 
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Password Reset - ExamMaster',
      html: this.getPasswordResetEmailTemplate(otp, firstName)
    };

    try {
      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ Password reset OTP email sent successfully:', result.messageId);
      return result;
    } catch (error) {
      console.error('❌ Failed to send password reset email:', error);
      throw error;
    }
  }

  // Password reset email template
  getPasswordResetEmailTemplate(otp, firstName) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset - ExamMaster</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f7fafc; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">🔒 Password Reset</h1>
            <p style="color: #e2e8f0; margin: 10px 0 0 0; font-size: 16px;">ExamMaster Security</p>
          </div>
          
          <!-- Content -->
          <div style="padding: 40px 20px;">
            <h2 style="color: #2d3748; margin: 0 0 20px 0; font-size: 24px; font-weight: 600;">Hello ${firstName || 'User'}!</h2>
            
            <p style="color: #4a5568; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">
              We received a request to reset your password for your ExamMaster account. If you didn't make this request, please ignore this email.
            </p>
            
            <p style="color: #4a5568; line-height: 1.6; margin: 0 0 30px 0; font-size: 16px;">
              To reset your password, please use the following 6-digit verification code:
            </p>
            
            <!-- OTP Code -->
            <div style="background-color: #f7fafc; border: 2px dashed #4299e1; border-radius: 12px; padding: 30px; text-align: center; margin: 0 0 30px 0;">
              <div style="font-size: 36px; font-weight: 700; color: #2b6cb0; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                ${otp}
              </div>
              <p style="color: #718096; margin: 15px 0 0 0; font-size: 14px;">
                This code will expire in 10 minutes
              </p>
            </div>
            
            <!-- Security Notice -->
            <div style="background-color: #fff5f5; border-left: 4px solid #f56565; padding: 20px; margin: 0 0 30px 0; border-radius: 0 8px 8px 0;">
              <h3 style="color: #c53030; margin: 0 0 10px 0; font-size: 16px; font-weight: 600;">🛡️ Security Notice</h3>
              <p style="color: #742a2a; margin: 0; font-size: 14px; line-height: 1.5;">
                • Never share this code with anyone<br>
                • ExamMaster staff will never ask for this code<br>
                • If you didn't request this reset, please secure your account immediately
              </p>
            </div>
            
            <p style="color: #718096; line-height: 1.6; margin: 0; font-size: 14px;">
              If you have any questions or need assistance, please contact our support team.
            </p>
          </div>
          
          <!-- Footer -->
          <div style="background-color: #edf2f7; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #718096; margin: 0; font-size: 12px;">
              © ${new Date().getFullYear()} ExamMaster. All rights reserved.
            </p>
            <p style="color: #a0aec0; margin: 5px 0 0 0; font-size: 11px;">
              This is an automated message.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Test email connection
  async testEmailConnection() {
    try {
      if (!this.transporter) {
        throw new Error('Email service not initialized');
      }

      await this.transporter.verify();
      console.log('✅ Email service connection verified');
      return { success: true };
    } catch (error) {
      console.error('❌ Email service connection failed:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new EmailService();
