import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import DatabaseService from '../config/database';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
  };
}

export const authenticateToken = async (req: Request & AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'Access token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || '') as any;
    
    // Verify user still exists in database
    const db = DatabaseService.getInstance();
    const result = await db.executeQuery(
      'SELECT id, email, role, is_active FROM users WHERE id = @param0',
      [decoded.userId]
    );

    if (result.recordset.length === 0) {
      return res.status(401).json({ message: 'User not found' });
    }

    const user = result.recordset[0];
    
    if (!user.is_active) {
      return res.status(401).json({ message: 'Account is deactivated' });
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role
    };

    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};

export const authorizeRole = (roles: string[]) => {
  return (req: Request & AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    next();
  };
};
