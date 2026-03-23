/**
 * Standardized API Response Utilities
 * Provides consistent response formatting across all API endpoints
 * 
 * @module utils/responseUtils
 */

/**
 * Creates a standardized API response
 * @param {Object} data - The response data
 * @param {string} message - Response message
 * @param {number} status - HTTP status code
 * @param {Object} headers - Additional response headers
 * @returns {Response} Formatted Response object
 */
function createResponse(data = null, message = 'Success', status = 200, headers = {}) {
  const response = {
    success: status >= 200 && status < 300,
    data: data,
    message: message,
    timestamp: new Date().toISOString()
  };

  const defaultHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    ...headers
  };

  return new Response(JSON.stringify(response), {
    status: status,
    headers: defaultHeaders
  });
}

/**
 * Creates a success response
 * @param {Object} data - The response data
 * @param {string} message - Success message
 * @param {number} status - HTTP status code (default: 200)
 * @param {Object} headers - Additional response headers
 * @returns {Response} Success Response object
 */
function createSuccessResponse(data = null, message = 'Success', status = 200, headers = {}) {
  return createResponse(data, message, status, headers);
}

/**
 * Creates an error response
 * @param {string} message - Error message
 * @param {number} status - HTTP status code
 * @param {Object} data - Additional error data
 * @param {Object} headers - Additional response headers
 * @returns {Response} Error Response object
 */
function createErrorResponse(message = 'Internal Server Error', status = 500, data = null, headers = {}) {
  return createResponse(data, message, status, headers);
}

/**
 * Handles API errors consistently
 * @param {Error} error - The error object
 * @param {string} context - Context where the error occurred
 * @returns {Response} Formatted error response
 */
function handleApiError(error, context = 'API operation') {
  console.error(`Error in ${context}:`, error);
  
  // Handle specific error types
  if (error.code === '23505') { // PostgreSQL unique violation
    return createErrorResponse('Resource already exists', 409);
  }
  
  if (error.code === '23503') { // PostgreSQL foreign key violation
    return createErrorResponse('Referenced resource not found', 404);
  }
  
  if (error.code === '23502') { // PostgreSQL not null violation
    return createErrorResponse('Required field is missing', 400);
  }
  
  if (error.message.includes('not found')) {
    return createErrorResponse('Resource not found', 404);
  }
  
  if (error.message.includes('unauthorized')) {
    return createErrorResponse('Unauthorized access', 401);
  }
  
  if (error.message.includes('forbidden')) {
    return createErrorResponse('Access forbidden', 403);
  }
  
  if (error.message.includes('Invalid task ID')) {
    return createErrorResponse('Invalid task ID', 400);
  }
  
  if (error.message.includes('Task text is required')) {
    return createErrorResponse('Task text is required', 400);
  }
  
  if (error.message.includes('Task text must be 200 characters or less')) {
    return createErrorResponse('Task text must be 200 characters or less', 400);
  }
  
  if (error.message.includes('No valid fields to update')) {
    return createErrorResponse('No valid fields to update', 400);
  }
  
  // Default error response
  return createErrorResponse(
    error.message || 'Internal Server Error',
    error.statusCode || 500
  );
}

/**
 * Validates required fields in request body
 * @param {Object} body - Request body object
 * @param {Array<string>} requiredFields - List of required field names
 * @returns {Object} Validation result { valid: boolean, missingFields: string[] }
 */
function validateRequestBody(body, requiredFields = []) {
  const missingFields = requiredFields.filter(field => {
    const value = body[field];
    return value === undefined || value === null || value === '';
  });
  
  return {
    valid: missingFields.length === 0,
    missingFields: missingFields
  };
}

/**
 * Creates a validation error response
 * @param {Array<string>} missingFields - List of missing field names
 * @returns {Response} Validation error response
 */
function createValidationError(missingFields) {
  const message = `Missing required fields: ${missingFields.join(', ')}`;
  return createErrorResponse(message, 400, { missingFields });
}

/**
 * Validates task ID
 * @param {string|number} id - Task ID to validate
 * @returns {Object} Validation result { valid: boolean, error: string|null }
 */
function validateTaskId(id) {
  if (!id || id === undefined || id === null) {
    return { valid: false, error: 'Task ID is required' };
  }
  
  if (isNaN(parseInt(id))) {
    return { valid: false, error: 'Task ID must be a number' };
  }
  
  if (parseInt(id) <= 0) {
    return { valid: false, error: 'Task ID must be a positive number' };
  }
  
  return { valid: true, error: null };
}

/**
 * Creates a paginated response
 * @param {Array} data - The data array
 * @param {number} page - Current page number
 * @param {number} limit - Items per page
 * @param {number} total - Total number of items
 * @param {string} message - Response message
 * @returns {Response} Paginated response
 */
function createPaginatedResponse(data, page = 1, limit = 10, total = 0, message = 'Success') {
  const totalPages = Math.ceil(total / limit);
  const hasPrev = page > 1;
  const hasNext = page < totalPages;
  
  const pagination = {
    page,
    limit,
    total,
    totalPages,
    hasPrev,
    hasNext,
    prevPage: hasPrev ? page - 1 : null,
    nextPage: hasNext ? page + 1 : null
  };
  
  return createSuccessResponse(
    { data, pagination },
    message,
    200
  );
}

/**
 * Wraps API handler with try-catch error handling
 * @param {Function} handler - The API handler function
 * @returns {Function} Wrapped handler function
 */
function withErrorHandling(handler) {
  return async function(...args) {
    try {
      return await handler.apply(this, args);
    } catch (error) {
      const context = `${handler.name} operation`;
      return handleApiError(error, context);
    }
  };
}

/**
 * Parses query parameters with defaults and validation
 * @param {URL} url - The request URL
 * @param {Object} defaults - Default parameter values
 * @param {Object} validators - Parameter validation functions
 * @returns {Object} Parsed and validated parameters
 */
function parseQueryParams(url, defaults = {}, validators = {}) {
  const params = {};
  
  // Apply defaults
  Object.assign(params, defaults);
  
  // Parse URL search params
  for (const [key, defaultValue] of Object.entries(defaults)) {
    const value = url.searchParams.get(key);
    if (value !== null) {
      // Convert to appropriate type based on default value
      if (typeof defaultValue === 'number') {
        params[key] = parseInt(value) || defaultValue;
      } else if (typeof defaultValue === 'boolean') {
        params[key] = value === 'true';
      } else {
        params[key] = value;
      }
    }
  }
  
  // Apply validators
  for (const [key, validator] of Object.entries(validators)) {
    if (params[key] !== undefined) {
      const result = validator(params[key]);
      if (!result.valid) {
        throw new Error(result.error);
      }
    }
  }
  
  return params;
}

export {
  createResponse,
  createSuccessResponse,
  createErrorResponse,
  handleApiError,
  validateRequestBody,
  createValidationError,
  validateTaskId,
  createPaginatedResponse,
  withErrorHandling,
  parseQueryParams
};