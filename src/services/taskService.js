/**
 * Task Service Layer
 * Contains all business logic for task operations
 * Provides a clean API for task management
 * 
 * @module services/taskService
 */

import databaseService from './database.js';

class TaskService {
  constructor() {
    this.cache = new Map();
    this.CACHE_TTL = 2 * 60 * 1000; // 2 minutes
  }

  /**
   * Get cache key for user tasks
   */
  getCacheKey(userId) {
    return `tasks-${userId}`;
  }

  /**
   * Set cached tasks with TTL
   */
  setCache(userId, tasks) {
    const key = this.getCacheKey(userId);
    this.cache.set(key, {
      data: tasks,
      timestamp: Date.now()
    });
  }

  /**
   * Get cached tasks if not expired
   */
  getCache(userId) {
    const key = this.getCacheKey(userId);
    const cached = this.cache.get(key);
    
    if (!cached) return null;
    
    const isExpired = Date.now() - cached.timestamp > this.CACHE_TTL;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  /**
   * Clear cache for a user
   */
  clearCache(userId) {
    const key = this.getCacheKey(userId);
    this.cache.delete(key);
  }

  /**
   * Get all tasks for a user with optional filters
   */
  async getTasks(userId = 'default-user', filters = {}) {
    try {
      // Check cache first
      const cached = this.getCache(userId);
      if (cached && !filters.forceRefresh) {
        return cached;
      }

      let query = 'SELECT * FROM tasks WHERE user_id = $1';
      const params = [userId];

      // Add filters
      if (filters.completed !== undefined) {
        query += ' AND completed = $2';
        params.push(filters.completed);
      }

      if (filters.priority !== undefined) {
        const paramIndex = params.length + 1;
        query += ` AND priority = $${paramIndex}`;
        params.push(filters.priority);
      }

      // Add ordering
      query += ' ORDER BY created_at DESC';

      const result = await databaseService.query(query, params);
      const tasks = result.rows;

      // Update cache
      this.setCache(userId, tasks);

      return tasks;
    } catch (error) {
      console.error('❌ Error getting tasks:', error);
      throw new Error('Failed to fetch tasks');
    }
  }

  /**
   * Get a single task by ID
   */
  async getTaskById(id, userId = 'default-user') {
    try {
      if (!id || isNaN(parseInt(id))) {
        throw new Error('Invalid task ID');
      }

      const query = 'SELECT * FROM tasks WHERE id = $1 AND user_id = $2';
      const result = await databaseService.query(query, [id, userId]);

      if (result.rows.length === 0) {
        throw new Error('Task not found');
      }

      return result.rows[0];
    } catch (error) {
      console.error('❌ Error getting task:', error);
      throw error;
    }
  }

  /**
   * Create a new task
   */
  async createTask(taskData) {
    try {
      const { text, userId = 'default-user', priority = false } = taskData;

      // Validate required fields
      if (!text || text.trim() === '') {
        throw new Error('Task text is required');
      }

      // Validate text length
      if (text.length > 200) {
        throw new Error('Task text must be 200 characters or less');
      }

      const trimmedText = text.trim();

      const query = `
        INSERT INTO tasks (text, user_id, priority) 
        VALUES ($1, $2, $3) 
        RETURNING *
      `;
      const params = [trimmedText, userId, priority];

      const result = await databaseService.query(query, params);
      const newTask = result.rows[0];

      // Clear cache
      this.clearCache(userId);

      return newTask;
    } catch (error) {
      console.error('❌ Error creating task:', error);
      throw error;
    }
  }

  /**
   * Update a task
   */
  async updateTask(id, updates, userId = 'default-user') {
    try {
      if (!id || isNaN(parseInt(id))) {
        throw new Error('Invalid task ID');
      }

      // Check if task exists
      const existingTask = await this.getTaskById(id, userId);

      // Validate updates
      const allowedUpdates = ['text', 'completed', 'priority'];
      const validUpdates = {};
      
      for (const [key, value] of Object.entries(updates)) {
        if (!allowedUpdates.includes(key)) {
          continue; // Skip invalid fields
        }

        // Validate text length if provided
        if (key === 'text' && value && value.length > 200) {
          throw new Error('Task text must be 200 characters or less');
        }

        // Validate boolean fields
        if ((key === 'completed' || key === 'priority') && typeof value !== 'boolean') {
          throw new Error(`${key} must be a boolean`);
        }

        validUpdates[key] = value;
      }

      if (Object.keys(validUpdates).length === 0) {
        throw new Error('No valid fields to update');
      }

      // Build dynamic update query
      const updateFields = [];
      const params = [];
      let paramIndex = 1;

      for (const [key, value] of Object.entries(validUpdates)) {
        if (key === 'text') {
          updateFields.push(`text = $${paramIndex}`);
          params.push(value.trim());
        } else {
          updateFields.push(`${key} = $${paramIndex}`);
          params.push(value);
        }
        paramIndex++;
      }

      // Always update timestamp
      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

      const query = `
        UPDATE tasks 
        SET ${updateFields.join(', ')} 
        WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1} 
        RETURNING *
      `;
      params.push(id, userId);

      const result = await databaseService.query(query, params);
      
      if (result.rows.length === 0) {
        throw new Error('Task not found');
      }

      const updatedTask = result.rows[0];

      // Clear cache
      this.clearCache(userId);

      return updatedTask;
    } catch (error) {
      console.error('❌ Error updating task:', error);
      throw error;
    }
  }

  /**
   * Delete a task
   */
  async deleteTask(id, userId = 'default-user') {
    try {
      if (!id || isNaN(parseInt(id))) {
        throw new Error('Invalid task ID');
      }

      // Check if task exists
      const existingTask = await this.getTaskById(id, userId);

      const query = 'DELETE FROM tasks WHERE id = $1 AND user_id = $2 RETURNING *';
      const result = await databaseService.query(query, [id, userId]);

      if (result.rows.length === 0) {
        throw new Error('Task not found');
      }

      const deletedTask = result.rows[0];

      // Clear cache
      this.clearCache(userId);

      return deletedTask;
    } catch (error) {
      console.error('❌ Error deleting task:', error);
      throw error;
    }
  }

  /**
   * Toggle task completion
   */
  async toggleTask(id, userId = 'default-user') {
    try {
      const task = await this.getTaskById(id, userId);
      const updates = { completed: !task.completed };
      
      return await this.updateTask(id, updates, userId);
    } catch (error) {
      console.error('❌ Error toggling task:', error);
      throw error;
    }
  }

  /**
   * Get task statistics for a user
   */
  async getTaskStats(userId = 'default-user') {
    try {
      const queries = [
        {
          query: 'SELECT COUNT(*) as total FROM tasks WHERE user_id = $1',
          params: [userId]
        },
        {
          query: 'SELECT COUNT(*) as completed FROM tasks WHERE user_id = $1 AND completed = true',
          params: [userId]
        },
        {
          query: 'SELECT COUNT(*) as priority FROM tasks WHERE user_id = $1 AND priority = true AND completed = false',
          params: [userId]
        },
        {
          query: 'SELECT COUNT(*) as overdue FROM tasks WHERE user_id = $1 AND completed = false AND created_at < $2',
          params: [userId, new Date(Date.now() - 24 * 60 * 60 * 1000)] // Tasks older than 24 hours
        }
      ];

      const results = await databaseService.transaction(queries);
      
      return {
        total: parseInt(results[0].rows[0].total),
        completed: parseInt(results[1].rows[0].completed),
        priority: parseInt(results[2].rows[0].priority),
        overdue: parseInt(results[3].rows[0].overdue),
        pending: parseInt(results[0].rows[0].total) - parseInt(results[1].rows[0].completed)
      };
    } catch (error) {
      console.error('❌ Error getting task stats:', error);
      throw new Error('Failed to get task statistics');
    }
  }

  /**
   * Search tasks by text
   */
  async searchTasks(userId = 'default-user', searchTerm) {
    try {
      if (!searchTerm || searchTerm.trim() === '') {
        return await this.getTasks(userId);
      }

      const query = `
        SELECT * FROM tasks 
        WHERE user_id = $1 AND text ILIKE $2 
        ORDER BY created_at DESC
      `;
      const params = [userId, `%${searchTerm.trim()}%`];

      const result = await databaseService.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('❌ Error searching tasks:', error);
      throw new Error('Failed to search tasks');
    }
  }
}

// Create singleton instance
const taskService = new TaskService();

export default taskService;
export { taskService };