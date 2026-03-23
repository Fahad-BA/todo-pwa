/**
 * Simplified Task Manager - Frontend Integration Layer
 * Handles UI operations and state management integration
 * Business logic is now delegated to the service layer
 * 
 * @module scripts/taskManager
 */

import { useTaskStore, useTaskActions } from '../stores/task-store.js';

class TaskManager {
  constructor() {
    this.refreshInterval = null;
    this.isUserInteracting = false;
    this.apiBase = '/api/tasks';
  }

  /**
   * Load tasks from API and update state
   */
  async loadTasks(forceRefresh = false) {
    const { setLoading, setError } = useTaskStore.getState();
    
    setLoading(true);
    
    try {
      const url = new URL(`${this.apiBase}?userId=default-user`);
      if (forceRefresh) {
        url.searchParams.set('forceRefresh', 'true');
      }
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch tasks');
      }
      
      const data = await response.json();
      const tasks = data.success ? data.data : [];
      
      // Update state
      const { setTasks } = useTaskStore.getState();
      setTasks(tasks);
      
      // Update UI components
      this.updateUIComponents();
      
      return tasks;
      
    } catch (error) {
      console.error('Error loading tasks:', error);
      setError(error.message);
      this.showErrorMessage('Failed to load tasks');
      return [];
    } finally {
      setLoading(false);
    }
  }

  /**
   * Create a new task
   */
  async createTask(text, priority = false) {
    try {
      const response = await fetch(this.apiBase, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text.trim(),
          userId: 'default-user',
          priority
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create task');
      }
      
      const data = await response.json();
      const newTask = data.success ? data.data : null;
      
      if (newTask) {
        const { addTask } = useTaskActions();
        addTask(newTask);
        
        this.showToast('Task created successfully', 'success');
        this.updateUIComponents();
      }
      
      return newTask;
    } catch (error) {
      console.error('Error creating task:', error);
      this.showToast('Failed to create task', 'error');
      return null;
    }
  }

  /**
   * Toggle task completion
   */
  async toggleTask(taskId) {
    try {
      const response = await fetch(`${this.apiBase}/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ completed: 'toggle' }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update task');
      }
      
      const data = await response.json();
      const updatedTask = data.success ? data.data : null;
      
      if (updatedTask) {
        const { updateTask } = useTaskActions();
        updateTask(taskId, { completed: updatedTask.completed });
        
        this.showToast(
          updatedTask.completed ? 'Task completed!' : 'Task marked as incomplete',
          'success'
        );
        this.updateUIComponents();
      }
      
    } catch (error) {
      console.error('Error toggling task:', error);
      this.showToast('Failed to update task', 'error');
    }
  }

  /**
   * Update a task
   */
  async updateTask(taskId, updates) {
    try {
      const response = await fetch(`${this.apiBase}/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update task');
      }
      
      const data = await response.json();
      const updatedTask = data.success ? data.data : null;
      
      if (updatedTask) {
        const { updateTask } = useTaskActions();
        updateTask(taskId, updatedTask);
        
        this.showToast('Task updated successfully', 'success');
        this.updateUIComponents();
      }
      
      return updatedTask;
    } catch (error) {
      console.error('Error updating task:', error);
      this.showToast('Failed to update task', 'error');
      return null;
    }
  }

  /**
   * Delete a task
   */
  async deleteTask(taskId) {
    if (!confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
      return;
    }
    
    try {
      const response = await fetch(`${this.apiBase}/${taskId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete task');
      }
      
      const data = await response.json();
      const deletedTask = data.success ? data.data.deletedTask : null;
      
      if (deletedTask) {
        const { deleteTask } = useTaskActions();
        deleteTask(taskId);
        
        this.showToast('Task deleted successfully', 'success');
        this.updateUIComponents();
      }
      
    } catch (error) {
      console.error('Error deleting task:', error);
      this.showToast('Failed to delete task', 'error');
    }
  }

  /**
   * Auto-refresh tasks every 30 seconds
   */
  startAutoRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
    
    this.refreshInterval = setInterval(() => {
      if (!this.isUserInteracting) {
        this.loadTasks();
      }
    }, 30000);
  }

  /**
   * Stop auto-refresh
   */
  stopAutoRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  /**
   * Manual refresh with loading state
   */
  async manualRefresh() {
    const refreshBtn = document.getElementById('refreshButton');
    if (refreshBtn) {
      refreshBtn.disabled = true;
      refreshBtn.innerHTML = this.getLoadingSpinner();
    }
    
    await this.loadTasks(true);
    
    if (refreshBtn) {
      setTimeout(() => {
        refreshBtn.disabled = false;
        refreshBtn.innerHTML = this.getRefreshIcon();
      }, 1000);
    }
  }

  /**
   * Render tasks in the UI
   */
  renderTasks() {
    const { tasks, loading } = useTaskStore.getState();
    const tasksContainer = document.getElementById('tasksContainer');
    
    if (!tasksContainer) return;
    
    if (loading) {
      tasksContainer.innerHTML = this.getLoadingHTML();
      return;
    }
    
    if (!tasks || tasks.length === 0) {
      tasksContainer.innerHTML = this.getEmptyStateHTML();
      return;
    }

    const incompleteTasks = tasks.filter(task => !task.completed);
    const completedTasks = tasks.filter(task => task.completed);
    const priorityTasks = incompleteTasks.filter(task => task.priority);
    const regularTasks = incompleteTasks.filter(task => !task.priority);

    let html = '';

    // Priority tasks section
    if (priorityTasks.length > 0) {
      html += this.getTaskSectionHTML('High Priority', priorityTasks, 'priority');
    }

    // Regular tasks section
    if (regularTasks.length > 0) {
      html += this.getTaskSectionHTML('Active Tasks', regularTasks, 'active');
    }

    // Completed tasks section
    if (completedTasks.length > 0) {
      html += this.getTaskSectionHTML('Completed', completedTasks, 'completed');
    }

    tasksContainer.innerHTML = html;
  }

  /**
   * Get loading spinner HTML
   */
  getLoadingSpinner() {
    return '<svg class="w-5 h-5 animate-spin" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 002 14.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd"></path></svg>';
  }

  /**
   * Get refresh icon HTML
   */
  getRefreshIcon() {
    return '<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 002 14.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd"></path></svg>';
  }

  /**
   * Get loading HTML
   */
  getLoadingHTML() {
    return `
      <div class="card p-8 text-center animate-fade-in">
        <div class="loading-pulse">
          <svg class="w-12 h-12 mx-auto text-primary-500 mb-4 animate-spin-slow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
          </svg>
        </div>
        <p class="text-lg font-medium text-gray-600 dark:text-gray-400">Loading your tasks...</p>
        <p class="text-sm text-gray-400 dark:text-gray-500 mt-1">Just a moment please</p>
      </div>
    `;
  }

  /**
   * Get error message HTML
   */
  getErrorMessageHTML(message = 'Failed to load tasks') {
    return `
      <div class="card p-8 text-center">
        <svg class="w-16 h-16 mx-auto text-danger-500 mb-4" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
        </svg>
        <h3 class="text-lg font-semibold text-gray-800 dark:text-white mb-2">Error Loading Tasks</h3>
        <p class="text-gray-600 dark:text-gray-400 mb-4">${message}</p>
        <button onclick="window.taskManager.loadTasks(true)" class="btn-primary">Retry</button>
      </div>
    `;
  }

  /**
   * Get empty state HTML
   */
  getEmptyStateHTML() {
    return `
      <div class="card p-8 text-center">
        <div class="empty-state-icon">
          <svg class="w-24 h-24" fill="currentColor" viewBox="0 0 24 24">
            <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
            <path fill-rule="evenodd" d="M4 5a2 2 0 012-2 1 1 0 000 2H6a2 2 0 00-2 2v6a2 2 0 002 2h2a1 1 0 100 2H6a4 4 0 01-4-4V5a4 4 0 014-4h5a2 2 0 012 2v6a2 2 0 01-2 2h-1a1 1 0 110-2h1V5H6v6h1a1 1 0 110 2H6a4 4 0 01-4-4V5z" clip-rule="evenodd"/>
            <path d="M11 11a1 1 0 100 2h3a1 1 0 100-2h-3z"/>
            <path fill-rule="evenodd" d="M11 15a1 1 0 011-1h3a1 1 0 110 2h-3a1 1 0 01-1-1zm1-5a1 1 0 100-2h3a1 1 0 110 2h-3z" clip-rule="evenodd"/>
          </svg>
        </div>
        <h3 class="empty-state-title">No tasks yet!</h3>
        <p class="empty-state-description">Start by adding a new task using the form above</p>
        <button onclick="document.getElementById('taskInput').focus()" class="mt-4 btn-primary">
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
          </svg>
          Add Your First Task
        </button>
      </div>
    `;
  }

  /**
   * Get task section HTML
   */
  getTaskSectionHTML(title, tasks, type) {
    const iconColors = {
      priority: 'warning',
      active: 'primary',
      completed: 'success'
    };

    const color = iconColors[type] || 'primary';

    return `
      <div class="animate-slide-up">
        <div class="flex items-center mb-4">
          <div class="flex items-center space-x-2">
            <div class="w-2 h-2 bg-${color}-500 rounded-full ${type === 'priority' ? 'animate-pulse' : ''}"></div>
            <h2 class="text-xl font-bold text-gray-800 dark:text-white">${title}</h2>
            <span class="px-2 py-1 bg-${color}-100 dark:bg-${color}-900/30 text-${color}-700 dark:text-${color}-300 text-xs font-medium rounded-full">${tasks.length}</span>
          </div>
        </div>
        <div class="space-y-3">
          ${tasks.map(task => this.createTaskHTML(task)).join('')}
        </div>
      </div>
    `;
  }

  /**
   * Create task HTML element
   */
  createTaskHTML(task) {
    if (!task || typeof task.id === 'undefined') {
      console.error('Invalid task object:', task);
      return '';
    }
    
    const taskId = String(task.id);
    const date = new Date(task.completed ? (task.updated_at || task.created_at) : task.created_at);
    const formattedDate = date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Riyadh'
    });

    const isPriority = task.priority;
    const isCompleted = task.completed;

    // Card styling based on task state
    const cardClass = isPriority && !isCompleted ? 
      'card card-glow border-warning-200 dark:border-warning-800' : 
      isCompleted ? 
      'card opacity-75' : 
      'card';

    return `
      <div class="${cardClass} group animate-scale-in hover-lift">
        <div class="p-4">
          <div class="flex items-start space-x-3">
            <!-- Checkbox -->
            <button 
              data-task-id="${taskId}" 
              data-action="toggle"
              class="task-checkbox flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-200 active:scale-95 ${
                isCompleted 
                  ? 'bg-success-500 border-success-500 text-white' 
                  : 'border-gray-300 dark:border-gray-600 hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20'
              }"
              aria-label="${isCompleted ? 'Unmark complete' : 'Mark complete'}"
              style="touch-action: manipulation"
            >
              ${isCompleted ? 
                '<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>' 
                : ''
              }
            </button>
            
            <!-- Task Content -->
            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <p class="task-text text-base font-medium ${
                    isCompleted 
                      ? 'line-through text-gray-500 dark:text-gray-400' 
                      : 'text-gray-800 dark:text-white'
                  }" data-task-id="${taskId}" data-editable="true">
                    ${task.text}
                  </p>
                  <div class="flex items-center space-x-3 mt-2">
                    <p class="text-xs text-gray-400 dark:text-gray-500 flex items-center">
                      <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"></path></svg>
                      ${formattedDate}
                    </p>
                    ${isPriority ? 
                      '<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-warning-100 dark:bg-warning-900/30 text-warning-700 dark:text-warning-300"><svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg>Priority</span>' 
                      : ''
                    }
                  </div>
                </div>
                
                <!-- Action Buttons -->
                <div class="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <button 
                    data-task-id="${taskId}" 
                    data-action="edit"
                    class="p-2 rounded-lg text-gray-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                    title="Edit task"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                    </svg>
                  </button>
                  <button 
                    data-task-id="${taskId}" 
                    data-action="delete"
                    class="p-2 rounded-lg text-gray-400 hover:text-danger-500 hover:bg-danger-50 dark:hover:bg-danger-900/20 transition-colors"
                    title="Delete task"
                  >
                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Update UI components (stats, progress, etc.)
   */
  updateUIComponents() {
    this.renderTasks();
    
    // Update connection status
    if (window.showConnectionStatus) {
      window.showConnectionStatus();
    }
    
    // Update stats
    if (window.updateStats) {
      window.updateStats();
    }
    
    // Update progress
    if (window.updateProgress) {
      window.updateProgress();
    }
  }

  /**
   * Show toast notification
   */
  showToast(message, type = 'info') {
    if (window.showToast) {
      window.showToast(message, type);
    }
  }

  /**
   * Show error message in UI
   */
  showErrorMessage(message) {
    const tasksContainer = document.getElementById('tasksContainer');
    if (tasksContainer) {
      tasksContainer.innerHTML = `
        <div class="card p-8 text-center">
          <svg class="w-16 h-16 mx-auto text-danger-500 mb-4" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg>
          <h3 class="text-lg font-semibold text-gray-800 dark:text-white mb-2">Error Loading Tasks</h3>
          <p class="text-gray-600 dark:text-gray-400 mb-4">${message}</p>
          <button onclick="taskManager.loadTasks(true)" class="btn-primary">Retry</button>
        </div>
      `;
    }
  }

  /**
   * Edit task (delegate to existing modal functionality)
   */
  editTask(taskId) {
    const { tasks, setCurrentEditTaskId } = useTaskStore.getState();
    const task = tasks.find(t => t.id === taskId);
    
    if (!task) {
      console.error('Task not found:', taskId);
      return;
    }

    setCurrentEditTaskId(taskId);
    const editTaskInput = document.getElementById('editTaskInput');
    const editModal = document.getElementById('editModal');
    const editPriority = document.getElementById('editPriority');
    
    if (editTaskInput && editModal) {
      editTaskInput.value = task.text;
      if (editPriority) editPriority.checked = task.priority || false;
      editModal.classList.remove('hidden');
      
      // Focus and select text
      editTaskInput.focus();
      editTaskInput.select();
      
      // Update char counter
      const editCharCount = document.getElementById('editCharCount');
      if (editCharCount) {
        editCharCount.textContent = `${task.text.length}/200`;
      }
    }
  }

  /**
   * Close edit modal
   */
  closeEditModal() {
    const { setCurrentEditTaskId } = useTaskActions();
    const editModal = document.getElementById('editModal');
    if (editModal) {
      editModal.classList.add('hidden');
    }
    setCurrentEditTaskId(null);
  }
}

// Create and export singleton instance
const taskManager = new TaskManager();

// Make globally accessible for existing event handlers
window.taskManager = taskManager;

// Expose methods globally for backward compatibility
window.loadTasks = () => taskManager.loadTasks();
window.toggleTask = (taskId) => taskManager.toggleTask(taskId);
window.deleteTask = (taskId) => taskManager.deleteTask(taskId);
window.editTask = (taskId) => taskManager.editTask(taskId);
window.closeEditModal = () => taskManager.closeEditModal();
window.manualRefresh = () => taskManager.manualRefresh();

export default taskManager;