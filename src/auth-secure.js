/**
 * Authentication System Module
 * 
 * Provides secure user authentication with:
 * - JWT token generation and validation
 * - Password hashing and verification
 * - User session management
 * - Rate limiting and security features
 * 
 * @version 1.0.0
 * @module auth
 */

import crypto from 'crypto';
import { executeQuery } from './database-secure.js';

// JWT Configuration
const JWT_CONFIG = {
  secret: process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex'),
  expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  algorithm: 'HS256'
};

// Rate limiting configuration
const RATE_LIMITS = {
  login: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxAttempts: 5
  },
  register: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxAttempts: 3
  }
};

// In-memory rate limiting store (in production, use Redis)
const rateLimitStore = new Map();

// User validation schema
const USER_VALIDATION = {
  username: {
    minLength: 3,
    maxLength: 20,
    pattern: /^[a-zA-Z0-9_]+$/,
    required: true
  },
  password: {
    minLength: 8,
    maxLength: 100,
    requireUppercase: true,
    requireLowercase: true,
    requireNumber: true,
    requireSpecial: true,
    required: true
  },
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    maxLength: 100,
    required: false
  }
};

// Hash password using bcrypt-like algorithm (crypto fallback)
const hashPassword = async (password) => {
  return new Promise((resolve, reject) => {
    // Generate salt
    const salt = crypto.randomBytes(16).toString('hex');
    
    // Hash password with salt
    crypto.pbkdf2(password, salt, 10000, 64, 'sha512', (err, derivedKey) => {
      if (err) {
        reject(err);
        return;
      }
      
      // Combine salt and hash
      const hash = salt + ':' + derivedKey.toString('hex');
      resolve(hash);
    });
  });
};

// Verify password
const verifyPassword = async (password, hashedPassword) => {
  return new Promise((resolve, reject) => {
    const [salt, hash] = hashedPassword.split(':');
    
    crypto.pbkdf2(password, salt, 10000, 64, 'sha512', (err, derivedKey) => {
      if (err) {
        reject(err);
        return;
      }
      
      const isMatch = derivedKey.toString('hex') === hash;
      resolve(isMatch);
    });
  });
};

// Generate JWT token (simplified implementation)
const generateToken = (payload) => {
  const header = {
    alg: JWT_CONFIG.algorithm,
    typ: 'JWT'
  };
  
  const now = Math.floor(Date.now() / 1000);
  const tokenPayload = {
    ...payload,
    iat: now,
    exp: now + (24 * 60 * 60) // 24 hours expiration
  };
  
  // Base64Url encode
  const encodeBase64Url = (str) => {
    return Buffer.from(JSON.stringify(str))
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  };
  
  const encodedHeader = encodeBase64Url(header);
  const encodedPayload = encodeBase64Url(tokenPayload);
  
  // Create signature (simplified - in production use proper JWT library)
  const signature = crypto
    .createHmac('sha256', JWT_CONFIG.secret)
    .update(encodedHeader + '.' + encodedPayload)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  
  return `${encodedHeader}.${encodedPayload}.${signature}`;
};

// Verify JWT token
const verifyToken = (token) => {
  try {
    const [encodedHeader, encodedPayload, signature] = token.split('.');
    
    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', JWT_CONFIG.secret)
      .update(encodedHeader + '.' + encodedPayload)
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
    
    if (signature !== expectedSignature) {
      throw new Error('Invalid token signature');
    }
    
    // Decode payload
    const payload = JSON.parse(
      Buffer.from(encodedPayload, 'base64').toString()
    );
    
    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      throw new Error('Token expired');
    }
    
    return payload;
  } catch (error) {
    throw new Error('Invalid token: ' + error.message);
  }
};

// Rate limiting middleware
const rateLimiter = (type, identifier) => {
  const key = `${type}:${identifier}`;
  const limit = RATE_LIMITS[type];
  
  if (!limit) {
    return { allowed: true };
  }
  
  const now = Date.now();
  const record = rateLimitStore.get(key) || {
    count: 0,
    resetTime: now + limit.windowMs
  };
  
  // Reset counter if window has passed
  if (now > record.resetTime) {
    record.count = 0;
    record.resetTime = now + limit.windowMs;
  }
  
  record.count++;
  rateLimitStore.set(key, record);
  
  return {
    allowed: record.count <= limit.maxAttempts,
    remaining: Math.max(0, limit.maxAttempts - record.count),
    resetTime: record.resetTime
  };
};

// Validate user input
const validateUserInput = (userData) => {
  const errors = [];
  
  for (const [field, rules] of Object.entries(USER_VALIDATION)) {
    const value = userData[field];
    
    if (rules.required && (value === undefined || value === null || value === '')) {
      errors.push(`${field} is required`);
      continue;
    }
    
    if (value !== undefined && value !== null && value !== '') {
      // Check length
      if (rules.minLength && value.length < rules.minLength) {
        errors.push(`${field} must be at least ${rules.minLength} characters`);
      }
      
      if (rules.maxLength && value.length > rules.maxLength) {
        errors.push(`${field} must be no more than ${rules.maxLength} characters`);
      }
      
      // Check pattern
      if (rules.pattern && !rules.pattern.test(value)) {
        errors.push(`${field} contains invalid characters`);
      }
      
      // Password-specific validations
      if (field === 'password') {
        if (rules.requireUppercase && !/[A-Z]/.test(value)) {
          errors.push('Password must contain at least one uppercase letter');
        }
        
        if (rules.requireLowercase && !/[a-z]/.test(value)) {
          errors.push('Password must contain at least one lowercase letter');
        }
        
        if (rules.requireNumber && !/[0-9]/.test(value)) {
          errors.push('Password must contain at least one number');
        }
        
        if (rules.requireSpecial && !/[!@#$%^&*(),.?":{}|<>]/.test(value)) {
          errors.push('Password must contain at least one special character');
        }
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

// Sanitize user input
const sanitizeUserInput = (userData) => {
  const sanitized = {};
  
  for (const [key, value] of Object.entries(userData)) {
    if (typeof value === 'string') {
      // Remove potentially dangerous characters
      sanitized[key] = value
        .replace(/[<>]/g, '') // Remove HTML tags
        .replace(/['"]/g, '') // Remove quotes
        .trim();
    } else if (typeof value === 'boolean' || typeof value === 'number') {
      sanitized[key] = value;
    }
    // Objects and arrays are not sanitized for security reasons
  }
  
  return sanitized;
};

// Create user table if it doesn't exist
const initializeUsersTable = async () => {
  try {
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE,
        password_hash TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login DATETIME,
        is_active BOOLEAN DEFAULT 1,
        failed_attempts INTEGER DEFAULT 0,
        locked_until DATETIME
      )
    `);
    
    // Create indexes
    await executeQuery(`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`);
    await executeQuery(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
    
    console.log('✅ Users table initialized');
  } catch (error) {
    console.error('❌ Failed to initialize users table:', error);
    throw error;
  }
};

// Register new user
const registerUser = async (userData) => {
  try {
    // Validate input
    const validation = validateUserInput(userData);
    if (!validation.valid) {
      throw new Error('Validation failed: ' + validation.errors.join(', '));
    }
    
    // Sanitize input
    const sanitized = sanitizeUserInput(userData);
    
    // Check rate limiting
    const rateLimit = rateLimiter('register', sanitized.username);
    if (!rateLimit.allowed) {
      throw new Error('Too many registration attempts. Please try again later.');
    }
    
    // Check if username already exists
    const existingUser = await executeQuery(
      'SELECT id FROM users WHERE username = $1',
      [sanitized.username]
    );
    
    if (existingUser.rows.length > 0) {
      throw new Error('Username already exists');
    }
    
    // Hash password
    const passwordHash = await hashPassword(sanitized.password);
    
    // Create user
    const result = await executeQuery(`
      INSERT INTO users (username, email, password_hash) 
      VALUES ($1, $2, $3) 
      RETURNING id, username, email, created_at
    `, [sanitized.username, sanitized.email || null, passwordHash]);
    
    const user = result.rows[0];
    
    // Generate token
    const token = generateToken({
      userId: user.id,
      username: user.username
    });
    
    return {
      user,
      token
    };
  } catch (error) {
    throw new Error('Registration failed: ' + error.message);
  }
};

// Login user
const loginUser = async (username, password) => {
  try {
    // Check rate limiting
    const rateLimit = rateLimiter('login', username);
    if (!rateLimit.allowed) {
      throw new Error('Too many login attempts. Please try again later.');
    }
    
    // Find user
    const result = await executeQuery(
      'SELECT id, username, password_hash, failed_attempts, locked_until FROM users WHERE username = $1',
      [username]
    );
    
    if (result.rows.length === 0) {
      throw new Error('Invalid username or password');
    }
    
    const user = result.rows[0];
    
    // Check if account is locked
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      throw new Error('Account is temporarily locked. Please try again later.');
    }
    
    // Verify password
    const isPasswordValid = await verifyPassword(password, user.password_hash);
    if (!isPasswordValid) {
      // Increment failed attempts
      await executeQuery(`
        UPDATE users 
        SET failed_attempts = failed_attempts + 1,
            locked_until = CASE 
              WHEN failed_attempts >= 4 THEN datetime('now', '+15 minutes')
              ELSE NULL
            END
        WHERE id = $1
      `, [user.id]);
      
      throw new Error('Invalid username or password');
    }
    
    // Reset failed attempts and update last login
    await executeQuery(`
      UPDATE users 
      SET failed_attempts = 0,
          locked_until = NULL,
          last_login = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [user.id]);
    
    // Generate token
    const token = generateToken({
      userId: user.id,
      username: user.username
    });
    
    return {
      user: {
        id: user.id,
        username: user.username
      },
      token
    };
  } catch (error) {
    throw new Error('Login failed: ' + error.message);
  }
};

// Verify authentication token
const verifyAuthToken = (token) => {
  try {
    const payload = verifyToken(token);
    return payload;
  } catch (error) {
    throw new Error('Invalid authentication token: ' + error.message);
  }
};

// Authentication middleware
const authenticateRequest = (request) => {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('Authorization header required');
    }
    
    const token = authHeader.substring(7);
    const payload = verifyAuthToken(token);
    
    return payload;
  } catch (error) {
    throw new Error('Authentication failed: ' + error.message);
  }
};

// Check if user owns the resource
const authorizeResource = (user, resourceUserId) => {
  if (!user || !user.userId) {
    throw new Error('User not authenticated');
  }
  
  if (user.userId.toString() !== resourceUserId.toString()) {
    throw new Error('Unauthorized access to resource');
  }
  
  return true;
};

// Initialize users table on module load
(async () => {
  try {
    await initializeUsersTable();
  } catch (error) {
    console.error('❌ Failed to initialize authentication system:', error);
  }
})();

// Export the authentication module
export {
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken,
  validateUserInput,
  sanitizeUserInput,
  registerUser,
  loginUser,
  verifyAuthToken,
  authenticateRequest,
  authorizeResource,
  rateLimiter
};

// Export default for backward compatibility
export default {
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken,
  validateUserInput,
  sanitizeUserInput,
  registerUser,
  loginUser,
  verifyAuthToken,
  authenticateRequest,
  authorizeResource,
  rateLimiter
};