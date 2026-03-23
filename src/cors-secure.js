/**
 * Secure CORS Configuration Module
 * 
 * Provides secure Cross-Origin Resource Sharing configuration with:
 * - Environment-based origin whitelisting
 * - Proper HTTP methods and headers
 * - Credential handling
 * - CSRF protection
 * 
 * @version 1.0.0
 * @module cors
 */

// Parse allowed origins from environment
const getAllowedOrigins = () => {
  const origins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
    : [];
  
  // Add development origins if in development mode
  if (process.env.NODE_ENV === 'development') {
    origins.push(
      'http://localhost:3000',
      'http://localhost:4321',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:4321'
    );
  }
  
  // Add production origins
  if (process.env.PRODUCTION_URL) {
    origins.push(process.env.PRODUCTION_URL);
  }
  
  // Remove empty strings and duplicates
  return [...new Set(origins.filter(origin => origin.length > 0))];
};

// Validate origin against whitelist
const isValidOrigin = (origin) => {
  if (!origin) return false;
  
  const allowedOrigins = getAllowedOrigins();
  
  // If no origins are specified, deny all requests for security
  if (allowedOrigins.length === 0) {
    return false;
  }
  
  return allowedOrigins.some(allowedOrigin => {
    // Exact match
    if (allowedOrigin === origin) {
      return true;
    }
    
    // Wildcard subdomain matching (*.example.com)
    if (allowedOrigin.startsWith('*.')) {
      const domain = allowedOrigin.substring(2);
      return origin.endsWith(domain) && origin !== domain;
    }
    
    return false;
  });
};

// Get appropriate CORS headers for a given origin
const getCorsHeaders = (origin) => {
  const allowedOrigins = getAllowedOrigins();
  
  // If the origin is not allowed, return restrictive headers
  if (!isValidOrigin(origin)) {
    return {
      'Access-Control-Allow-Origin': 'null',
      'Access-Control-Allow-Methods': '',
      'Access-Control-Allow-Headers': '',
      'Access-Control-Allow-Credentials': 'false',
      'Access-Control-Max-Age': '0'
    };
  }
  
  // Determine the allow-origin header value
  let allowOrigin;
  if (allowedOrigins.includes('*')) {
    allowOrigin = '*';
  } else {
    allowOrigin = origin;
  }
  
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-API-Version, X-CSRF-Token',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400', // 24 hours
    'Access-Control-Expose-Headers': 'X-Request-ID, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset',
    'Vary': 'Origin'
  };
};

// CORS middleware for API routes
const corsMiddleware = (request, response, options = {}) => {
  const origin = request.headers.get('origin');
  const method = request.method;
  
  // Get CORS headers
  const corsHeaders = getCorsHeaders(origin);
  
  // Apply additional security headers
  const securityHeaders = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Content-Security-Policy': options.csp || "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self'",
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    ...corsHeaders
  };
  
  // Handle preflight requests
  if (method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        ...securityHeaders,
        'Content-Length': '0'
      }
    });
  }
  
  // For actual requests, return the security headers to be used in the response
  return securityHeaders;
};

// Validate request for CSRF protection
const validateCsrfToken = (request) => {
  // Skip CSRF validation for safe methods
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(request.method)) {
    return true;
  }
  
  // Get CSRF token from headers or body
  const csrfToken = request.headers.get('x-csrf-token') || 
                   request.headers.get('x-xsrf-token') ||
                   (request.body && request.body._csrf);
  
  if (!csrfToken) {
    throw new Error('CSRF token required');
  }
  
  // Here you would validate the token against the session
  // For now, we'll just check that it exists and has a reasonable format
  if (typeof csrfToken !== 'string' || csrfToken.length < 32) {
    throw new Error('Invalid CSRF token');
  }
  
  return true;
};

// Generate CSRF token
const generateCsrfToken = () => {
  const crypto = require('crypto');
  return crypto.randomBytes(32).toString('hex');
};

// Check if the request is from a secure context
const isSecureRequest = (request) => {
  // Check if the connection is HTTPS
  if (request.headers.get('x-forwarded-proto') === 'https') {
    return true;
  }
  
  // Check for forwarded HTTPS
  const forwarded = request.headers.get('forwarded');
  if (forwarded && forwarded.includes('proto=https')) {
    return true;
  }
  
  // In production, require HTTPS
  if (process.env.NODE_ENV === 'production') {
    return false;
  }
  
  // Allow HTTP in development
  return true;
};

// Security headers middleware
const securityHeaders = (response, additionalHeaders = {}) => {
  const headers = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Strict-Transport-Security': process.env.NODE_ENV === 'production' ? 
      'max-age=31536000; includeSubDomains; preload' : '',
    ...additionalHeaders
  };
  
  // Remove empty headers
  Object.keys(headers).forEach(key => {
    if (!headers[key]) {
      delete headers[key];
    }
  });
  
  return headers;
};

// Rate limiting headers
const rateLimitHeaders = (limit, remaining, reset) => ({
  'X-RateLimit-Limit': limit.toString(),
  'X-RateLimit-Remaining': remaining.toString(),
  'X-RateLimit-Reset': reset.toString()
});

// API version checking
const validateApiVersion = (request) => {
  const apiVersion = request.headers.get('x-api-version');
  const supportedVersions = ['1', '1.0'];
  
  if (apiVersion && !supportedVersions.includes(apiVersion)) {
    throw new Error(`Unsupported API version: ${apiVersion}`);
  }
  
  return true;
};

// Content type validation
const validateContentType = (request, allowedTypes = ['application/json']) => {
  const contentType = request.headers.get('content-type');
  
  if (!contentType) {
    return true; // Some requests don't have content type
  }
  
  const mainType = contentType.split(';')[0].trim();
  
  if (!allowedTypes.includes(mainType)) {
    throw new Error(`Unsupported content type: ${mainType}`);
  }
  
  return true;
};

// Request ID generation
const generateRequestId = () => {
  const crypto = require('crypto');
  return crypto.randomBytes(16).toString('hex');
};

// Request logging middleware
const logRequest = (request, response, startTime) => {
  const requestId = response.headers.get('x-request-id');
  const endTime = Date.now();
  const duration = endTime - startTime;
  
  console.log(`[${requestId}] ${request.method} ${request.url} - ${response.status} - ${duration}ms`);
};

// Error response formatter with security headers
const createErrorResponse = (message, status = 500, error = null) => {
  const requestId = generateRequestId();
  
  // Sanitize error message
  const sanitizedMessage = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : message;
  
  const headers = {
    'Content-Type': 'application/json',
    'X-Request-ID': requestId,
    ...securityHeaders()
  };
  
  const body = {
    success: false,
    error: sanitizedMessage,
    timestamp: new Date().toISOString()
  };
  
  // Include error details in development
  if (process.env.NODE_ENV !== 'production' && error) {
    body.details = error.message;
    body.stack = error.stack;
  }
  
  return {
    status,
    headers,
    body: JSON.stringify(body)
  };
};

// Success response formatter with security headers
const createSuccessResponse = (data, status = 200, message = 'Success') => {
  const requestId = generateRequestId();
  
  const headers = {
    'Content-Type': 'application/json',
    'X-Request-ID': requestId,
    ...securityHeaders()
  };
  
  const body = {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString()
  };
  
  return {
    status,
    headers,
    body: JSON.stringify(body)
  };
};

// Export the CORS module
export {
  getAllowedOrigins,
  isValidOrigin,
  getCorsHeaders,
  corsMiddleware,
  validateCsrfToken,
  generateCsrfToken,
  isSecureRequest,
  securityHeaders,
  rateLimitHeaders,
  validateApiVersion,
  validateContentType,
  generateRequestId,
  logRequest,
  createErrorResponse,
  createSuccessResponse
};

// Export default for backward compatibility
export default {
  getAllowedOrigins,
  isValidOrigin,
  getCorsHeaders,
  corsMiddleware,
  validateCsrfToken,
  generateCsrfToken,
  isSecureRequest,
  securityHeaders,
  rateLimitHeaders,
  validateApiVersion,
  validateContentType,
  generateRequestId,
  logRequest,
  createErrorResponse,
  createSuccessResponse
};