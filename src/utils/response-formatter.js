/**
 * Utility functions for standardized API response formatting
 * @module response-formatter
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
 * @returns {Response} Success Response object
 */
function createSuccessResponse(data = null, message = 'Success', status = 200) {
  return createResponse(data, message, status);
}

/**
 * Creates an error response
 * @param {string} message - Error message
 * @param {number} status - HTTP status code
 * @param {Object} data - Additional error data
 * @returns {Response} Error Response object
 */
function createErrorResponse(message = 'Internal Server Error', status = 500, data = null) {
  return createResponse(data, message, status);
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

export {
  createResponse,
  createSuccessResponse,
  createErrorResponse,
  handleApiError,
  validateRequestBody,
  createValidationError
};