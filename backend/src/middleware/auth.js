import jwt from 'jsonwebtoken';
import config from '../config.js';
import { ApiError } from './errorHandler.js';

/**
 * Authentication middleware for protecting admin routes.
 * Verifies Bearer JWT token and attaches admin identity to request object.
 */
export function requireAdminAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(
      new ApiError(401, 'UNAUTHORIZED', 'Access denied. Missing or malformed authentication token.')
    );
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    req.admin = {
      id: payload.id,
      email: payload.email
    };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(new ApiError(401, 'TOKEN_EXPIRED', 'Your session has expired. Please sign in again.'));
    }
    return next(new ApiError(401, 'INVALID_TOKEN', 'Invalid authentication credentials.'));
  }
}
