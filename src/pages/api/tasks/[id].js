/**
 * Individual Task API - Consolidated and Clean
 * 
 * Provides CRUD operations for individual tasks with:
 * - Standardized response format
 * - Proper error handling
 * - Input validation
 * - Service layer integration
 * 
 * @module api/tasks/[id]
 */

import taskService from '../../services/taskService.js';
import {
  createSuccessResponse,
  createErrorResponse,
  handleApiError,
  validateTaskId,
  withErrorHandling
} from '../../utils/responseUtils.js';

export const prerender = false;

/**
 * Get a single task by ID
 * 
 * @async
 * @function GET
 * @param {Object} context - Request context
 * @param {Object} context.params - URL parameters
 * @param {string} context.params.id - Task ID
 * @param {Request} context.request - HTTP request object
 * @returns {Promise<Response>} JSON response containing task object
 */
const getTask = async ({ params, request }) => {
  try {
    // Validate task ID
    const validation = validateTaskId(params.id);
    if (!validation.valid) {
      return createErrorResponse(validation.error, 400);
    }

    const url = new URL(request.url);
    const userId = url.searchParams.get('userId') || 'default-user';

    const task = await taskService.getTaskById(parseInt(params.id), userId);
    
    return createSuccessResponse(
      task, 
      'Task retrieved successfully',
      200
    );
    
  } catch (error) {
    return handleApiError(error, 'GET /api/tasks/[id]');
  }
};

/**
 * Update a task
 * 
 * @async
 * @function PUT
 * @param {Object} context - Request context
 * @param {Object} context.params - URL parameters
 * @param {string} context.params.id - Task ID
 * @param {Request} context.request - HTTP request object
 * @returns {Promise<Response>} JSON response containing updated task
 */
const updateTask = async ({ params, request }) => {
  try {
    // Validate task ID
    const validation = validateTaskId(params.id);
    if (!validation.valid) {
      return createErrorResponse(validation.error, 400);
    }

    const updates = await request.json();
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId') || 'default-user';

    const updatedTask = await taskService.updateTask(
      parseInt(params.id), 
      updates, 
      userId
    );
    
    return createSuccessResponse(
      updatedTask, 
      'Task updated successfully',
      200
    );
    
  } catch (error) {
    return handleApiError(error, 'PUT /api/tasks/[id]');
  }
};

/**
 * Delete a task
 * 
 * @async
 * @function DELETE
 * @param {Object} context - Request context
 * @param {Object} context.params - URL parameters
 * @param {string} context.params.id - Task ID
 * @param {Request} context.request - HTTP request object
 * @returns {Promise<Response>} JSON response confirming deletion
 */
const deleteTask = async ({ params, request }) => {
  try {
    // Validate task ID
    const validation = validateTaskId(params.id);
    if (!validation.valid) {
      return createErrorResponse(validation.error, 400);
    }

    const url = new URL(request.url);
    const userId = url.searchParams.get('userId') || 'default-user';

    const deletedTask = await taskService.deleteTask(parseInt(params.id), userId);
    
    return createSuccessResponse(
      { 
        deletedTask,
        deletedAt: new Date().toISOString()
      }, 
      'Task deleted successfully',
      200
    );
    
  } catch (error) {
    return handleApiError(error, 'DELETE /api/tasks/[id]');
  }
};

/**
 * Handle OPTIONS requests for CORS
 * 
 * @async
 * @function OPTIONS
 * @returns {Promise<Response>} CORS headers response
 */
const handleOptions = async () => {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
};

// Export wrapped handlers
export const GET = withErrorHandling(getTask);
export const PUT = withErrorHandling(updateTask);
export const DELETE = withErrorHandling(deleteTask);
export const OPTIONS = withErrorHandling(handleOptions);