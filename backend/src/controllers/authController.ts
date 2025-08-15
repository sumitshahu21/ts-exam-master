import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import DatabaseService from '../config/database';
import { AuthRequest } from '../middleware/auth';

export class AuthController {
  private db: DatabaseService;

  constructor() {
    this.db = DatabaseService.getInstance();
  }

  public register = async (req: Request, res: Response) => {
    try {
      const { email, password, firstName, lastName, role = 'student' } = req.body;

      // Validate input
      if (!email || !password || !firstName || !lastName) {
        return res.status(400).json({ 
          message: 'Email, password, first name, and last name are required' 
        });
      }

      // Check if user already exists
      const existingUser = await this.db.executeQuery(
        'SELECT id FROM users WHERE email = @param0',
        [email]
      );

      if (existingUser.recordset.length > 0) {
        return res.status(409).json({ message: 'User already exists with this email' });
      }

      // Hash password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Insert new user
      const result = await this.db.executeQuery(`
        INSERT INTO users (email, password_hash, first_name, last_name, role)
        OUTPUT INSERTED.id, INSERTED.email, INSERTED.first_name, INSERTED.last_name, INSERTED.role
        VALUES (@param0, @param1, @param2, @param3, @param4)
      `, [email, passwordHash, firstName, lastName, role]);

      const user = result.recordset[0];

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET || 'fallback-secret',
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
      );

      res.status(201).json({
        message: 'User registered successfully',
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
      console.error('Registration error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  };

  public login = async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      // Validate input
      if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
      }

      // Find user
      const result = await this.db.executeQuery(
        'SELECT id, email, password_hash, first_name, last_name, role, is_active FROM users WHERE email = @param0',
        [email]
      );

      if (result.recordset.length === 0) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      const user = result.recordset[0];

      if (!user.is_active) {
        return res.status(401).json({ message: 'Account is deactivated' });
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);

      if (!isPasswordValid) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET || 'fallback-secret',
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
      );

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
      console.error('Login error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  };

  public getProfile = async (req: Request & AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const result = await this.db.executeQuery(
        'SELECT id, email, first_name, last_name, role, profile_photo, created_at FROM users WHERE id = @param0',
        [req.user.id]
      );

      if (result.recordset.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }

      const user = result.recordset[0];

      res.json({
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
          profilePhoto: user.profile_photo,
          createdAt: user.created_at
        }
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  };

  public updateProfile = async (req: Request & AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const { firstName, lastName } = req.body;

      if (!firstName || !lastName) {
        return res.status(400).json({ message: 'First name and last name are required' });
      }

      await this.db.executeQuery(
        'UPDATE users SET first_name = @param0, last_name = @param1, updated_at = GETDATE() WHERE id = @param2',
        [firstName, lastName, req.user.id]
      );

      res.json({ message: 'Profile updated successfully' });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  };
}
