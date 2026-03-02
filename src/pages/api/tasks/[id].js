import { pool } from '../../../database.js';

export const prerender = false;

// Get a single task by ID
export async function GET({ params, request }) {
  try {
    const result = await pool.query('SELECT * FROM tasks WHERE id = $1', [params.id]);
    
    if (result.rows.length === 0) {
      return new Response(JSON.stringify({ error: 'Task not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    return new Response(JSON.stringify(result.rows[0]), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Error fetching task:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch task' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Update a task
export async function PUT({ params, request }) {
  try {
    const { text, completed } = await request.json();
    
    if (text === undefined && completed === undefined) {
      return new Response(JSON.stringify({ error: 'No fields to update' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    const result = await pool.query(
      'UPDATE tasks SET text = COALESCE($1, text), completed = COALESCE($2, completed), updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
      [text, completed, params.id]
    );
    
    if (result.rows.length === 0) {
      return new Response(JSON.stringify({ error: 'Task not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    return new Response(JSON.stringify(result.rows[0]), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Error updating task:', error);
    return new Response(JSON.stringify({ error: 'Failed to update task' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Delete a task
export async function DELETE({ params, request }) {
  try {
    const result = await pool.query('DELETE FROM tasks WHERE id = $1 RETURNING *', [params.id]);
    
    if (result.rows.length === 0) {
      return new Response(JSON.stringify({ error: 'Task not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    return new Response(JSON.stringify({ message: 'Task deleted successfully' }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Error deleting task:', error);
    return new Response(JSON.stringify({ error: 'Failed to delete task' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Handle OPTIONS requests for CORS
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}