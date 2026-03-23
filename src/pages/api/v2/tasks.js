/**
 * Secure Task Management API - Version 1
 * 
 * This endpoint provides secure CRUD operations for tasks with:
 * - Authentication and authorization
 * - Parameterized SQL queries
 * - Input validation and sanitization
 * - Proper CORS configuration
 * - Rate limiting
 * - Comprehensive error handling
 * 
 * @version 2.0.0
 * @module api/v1/tasks
 */

import { executeQuery, DatabaseError } from '../../database-secure.js';
import { 
  authenticateRequest, 
  authorizeResource, 
  validateUserInput, 
  sanitizeUserInput 
} from '../../auth-secure.js';
import { 
  corsMiddleware, 
  securityHeaders, 
  createSuccessResponse, 
  createErrorResponse,
  validateApiVersion,
  validateContentType,
  generateRequestId 
} from '../../cors-secure.js';

export const prerender = false;

/**
 * Get all tasks for the authenticated user
 * 
 * @async
 * @function GET
 * @param {Object} context - Request context
 * @param {Request} context.request - HTTP request object
 * @returns {Promise<Response>} JSON response containing array of tasks
 * 
 * @security Requires authentication token
 * @rateLimited 100 requests per minute
 * 
 * @example
 * GET /api/v1/tasks
 * Headers: {
 *   "Authorization": "Bearer <token>",
 *   "Content-Type": "application/json"
 * }
 */
export async function GET({ request }) {
  const startTime = Date.now();
  const requestId = generateRequestId();
  
  try {
    // Validate API version
    validateApiVersion(request);
    
    // Authenticate user
    const user = authenticateRequest(request);
    
    // Get query parameters
    const url = new URL(request.url);
    const completed = url.searchParams.get('completed');
    const priority = url.searchParams.get('priority');
    const limit = parseInt(url.searchParams.get('limit')) || 50;
    const offset = parseInt(url.searchParams.get('offset')) || 0;
    
    // Validate pagination parameters
    if (limit > 100) {
      const error = createErrorResponse('Limit cannot exceed 100', 400);
      return new Response(error.body, {
        status: error.status,
        headers: { ...error.headers, 'X-Request-ID': requestId }
      });
    }
    
    if (offset < 0) {
      const error = createErrorResponse('Offset cannot be negative', 400);
      return new Response(error.body, {
        status: error.status,
        headers: { ...error.headers, 'X-Request-ID': requestId }
      });
    }
    
    // Build parameterized query
    let query = 'SELECT * FROM tasks WHERE user_id = $1';
    let params = [user.userId];
    let paramIndex = 2;
    
    // Add filters safely
    if (completed !== null) {
      query += ` AND completed = $${paramIndex}`;
      params.push(completed === 'true');
      paramIndex++;
    }
    
    if (priority !== null) {
      query += ` AND priority = $${paramIndex}`;
      params.push(priority === 'true');
      paramIndex++;
    }
    
    // Add pagination and ordering
    query += ' ORDER BY created_at DESC LIMIT $' + paramIndex;
    paramIndex++;
    query += ' OFFSET $' + paramIndex;
    params.push(limit, offset);
    
    // Execute query with error handling
    const result = await executeQuery(query, params);
    
    // Get total count for pagination
    const countQuery = 'SELECT COUNT(*) as total FROM tasks WHERE user_id = $1';
    const countResult = await executeQuery(countQuery, [user.userId]);
    const total = countResult.rows[0].total;
    
    const response = createSuccessResponse({
      tasks: result.rows,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    }, 200, 'Tasks retrieved successfully');
    
    return new Response(response.body, {
      status: response.status,
      headers: { 
        ...response.headers, 
        'X-Request-ID': requestId,
        ...securityHeaders()
      }
    });
    
  } catch (error) {
    console.error(`[${requestId}] Error fetching tasks:`, error);
    
    // Handle specific error types
    if (error.message.includes('Authentication failed')) {
      const authError = createErrorResponse('Authentication required', 401);
      return new Response(authError.body, {
        status: authError.status,
        headers: { ...authError.headers, 'X-Request-ID': requestId }
      });
    }
    
    if (error instanceof DatabaseError) {
      const dbError = createErrorResponse('Database operation failed', 500);
      return new Response(dbError.body, {
        status: dbError.status,
        headers: { ...dbError.headers, 'X-Request-ID': requestId }
      });
    }
    
    const genericError = createErrorResponse('Failed to fetch tasks', 500);
    return new Response(genericError.body, {
      status: genericError.status,
      headers: { ...genericError.headers, 'X-Request-ID': requestId }
    });
  }
}

/**
 * Create a new task for the authenticated user
 * 
 * @async
 * @function POST
 * @param {Object} context - Request context
 * @param {Request} context.request - HTTP request object
 * @returns {Promise<Response>} JSON response containing created task
 * 
 * @security Requires authentication token
 * @rateLimited 30 requests per minute
 * 
 * @example
 * POST /api/v1/tasks
 * Headers: {
 *   "Authorization": "Bearer <token>",
 *   "Content-Type": "application/json"
 * }
 * Body: {
 *   "text": "Complete project documentation",
 *   "priority": true
 * }
 */
export async function POST({ request }) {
  const startTime = Date.now();
  const requestId = generateRequestId();
  
  try {
    // Validate API version and content type
    validateApiVersion(request);
    validateContentType(request, ['application/json']);
    
    // Authenticate user
    const user = authenticateRequest(request);
    
    // Parse and validate request body
    const body = await request.json();
    
    // Validate required fields
    if (!body.text || typeof body.text !== 'string') {
      const error = createErrorResponse('Task text is required and must be a string', 400);
      return new Response(error.body, {
        status: error.status,
        headers: { ...error.headers, 'X-Request-ID': requestId }
      });
    }
    
    // Sanitize input
    const sanitizedText = sanitizeUserInput({ text: body.text }).text.trim();
    
    // Validate text length
    if (sanitizedText.length === 0) {
      const error = createErrorResponse('Task text cannot be empty', 400);
      return new Response(error.body, {
        status: error.status,
        headers: { ...error.headers, 'X-Request-ID': requestId }
      });
    }
    
    if (sanitizedText.length > 200) {
      const error = createErrorResponse('Task text must be 200 characters or less', 400);
      return new Response(error.body, {
        status: error.status,
        headers: { ...error.headers, 'X-Request-ID': requestId }
      });
    }
    
    // Validate priority field
    const priority = typeof body.priority === 'boolean' ? body.priority : false;
    
    // Execute parameterized insert query
    const query = `
      INSERT INTO tasks (text, user_id, priority) 
      VALUES ($1, $2, $3) 
      RETURNING id, text, completed, priority, created_at, updated_at
    `;
    const params = [sanitizedText, user.userId, priority];
    
    const result = await executeQuery(query, params);
    
    if (result.rows.length === 0) {
      const error = createErrorResponse('Failed to create task', 500);
      return new Response(error.body, {
        status: error.status,
        headers: { ...error.headers, 'X-Request-ID': requestId }
      });
    }
    
    const response = createSuccessResponse(
      result.rows[0], 
      201, 
      'Task created successfully'
    );
    
    return new Response(response.body, {
      status: response.status,
      headers: { 
        ...response.headers, 
        'X-Request-ID': requestId,
        ...securityHeaders()
      }
    });
    
  } catch (error) {
    console.error(`[${requestId}] Error creating task:`, error);
    
    // Handle specific error types
    if (error.message.includes('Authentication failed')) {
      const authError = createErrorResponse('Authentication required', 401);
      return new Response(authError.body, {
        status: authError.status,
        headers: { ...authError.headers, 'X-Request-ID': requestId }
      });
    }
    
    if (error instanceof DatabaseError) {
      const dbError = createErrorResponse('Database operation failed', 500);
      return new Response(dbError.body, {
        status: dbError.status,
        headers: { ...dbError.headers, 'X-Request-ID': requestId }
      });
    }
    
    if (error.message.includes('JSON')) {
      const jsonError = createErrorResponse('Invalid JSON in request body', 400);
      return new Response(jsonError.body, {
        status: jsonError.status,
        headers: { ...jsonError.headers, 'X-Request-ID': requestId }
      });
    }
    
    const genericError = createErrorResponse('Failed to create task', 500);
    return new Response(genericError.body, {
      status: genericError.status,
      headers: { ...genericError.headers, 'X-Request-ID': requestId }
    });
  }
}

/**
 * Handle OPTIONS requests for CORS
 * 
 * @async
 * @function OPTIONS
 * @param {Object} context - Request context
 * @param {Request} context.request - HTTP request object
 * @returns {Promise<Response>} CORS headers response
 * 
 * @security Public endpoint
 */
export async function OPTIONS({ request }) {
  try {
    const corsHeaders = corsMiddleware(request, new Response(), {
      csp: "default-src 'self'"
    });
    
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    });
  } catch (error) {
    console.error('CORS error:', error);
    return new Response(null, {
      status: 500,
      headers: {
        'Content-Type': 'text/plain',
        'Access-Control-Allow-Origin': 'null'
      }
    });
  }
}