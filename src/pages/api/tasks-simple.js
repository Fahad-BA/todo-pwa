// Simple API endpoint without complex imports
const sqlite3 = require('sqlite3');
const path = require('path');

export async function GET({ request }) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId') || 'default-user';
    
    // Simple database query
    const dbPath = path.join(process.cwd(), 'data', 'todo_app.sqlite');
    const db = new sqlite3.Database(dbPath);
    
    return new Promise((resolve, reject) => {
      db.all('SELECT * FROM tasks WHERE user_id = ? ORDER BY created_at DESC', [userId], (err, rows) => {
        db.close();
        
        if (err) {
          reject(err);
          return;
        }
        
        resolve(new Response(JSON.stringify({
          success: true,
          data: rows,
          message: 'Tasks retrieved successfully'
        }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json'
          }
        }));
      });
    });
    
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return new Response(JSON.stringify({
      success: false,
      data: null,
      message: error.message || 'Failed to fetch tasks'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}

export async function POST({ request }) {
  try {
    const body = await request.json();
    const { text, userId = 'default-user', priority = false } = body;
    
    if (!text || text.trim() === '') {
      return new Response(JSON.stringify({
        success: false,
        data: null,
        message: 'Task text is required'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    
    const dbPath = path.join(process.cwd(), 'data', 'todo_app.sqlite');
    const db = new sqlite3.Database(dbPath);
    
    return new Promise((resolve, reject) => {
      const stmt = db.prepare('INSERT INTO tasks (text, user_id, priority) VALUES (?, ?, ?) RETURNING *');
      stmt.run([text.trim(), userId, priority], function(err) {
        if (err) {
          db.close();
          reject(err);
          return;
        }
        
        // Get the inserted task
        db.get('SELECT * FROM tasks WHERE id = ?', [this.lastID], (err, row) => {
          db.close();
          
          if (err) {
            reject(err);
            return;
          }
          
          resolve(new Response(JSON.stringify({
            success: true,
            data: row,
            message: 'Task created successfully'
          }), {
            status: 201,
            headers: {
              'Content-Type': 'application/json'
            }
          }));
        });
      });
    });
    
  } catch (error) {
    console.error('Error creating task:', error);
    return new Response(JSON.stringify({
      success: false,
      data: null,
      message: error.message || 'Failed to create task'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}