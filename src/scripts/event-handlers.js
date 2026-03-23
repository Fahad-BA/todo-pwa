// Event Handlers - Form submissions and task actions with state management

// Debounced input handler
const setupDebouncedInput = () => {
  const taskInput = document.getElementById('taskInput');
  if (taskInput) {
    let timeout;
    taskInput.addEventListener('input', (e) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        // Update character counter
        const charCount = document.getElementById('charCount');
        if (charCount) {
          const length = e.target.value.length;
          charCount.textContent = `${length}/200`;
          charCount.className = length > 180 ? 
            'text-sm text-danger-500 font-medium' : 
            'text-sm text-gray-400';
        }
      }, 100); // 100ms debounce
    });
  }
  
  const editTaskInput = document.getElementById('editTaskInput');
  if (editTaskInput) {
    let timeout;
    editTaskInput.addEventListener('input', (e) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        // Update character counter
        const editCharCount = document.getElementById('editCharCount');
        if (editCharCount) {
          const length = e.target.value.length;
          editCharCount.textContent = `${length}/200`;
          editCharCount.className = length > 180 ? 
            'text-xs text-danger-500 font-medium' : 
            'text-xs text-gray-400';
        }
      }, 100); // 100ms debounce
    });
  }
};

// Event delegation for task actions
document.addEventListener('click', function(event) {
  // Check if the clicked element has a data-action attribute
  const action = event.target.closest('[data-action]');
  if (!action) return;
  
  // Prevent default behavior to avoid page refresh
  event.preventDefault();
  
  const taskId = action.getAttribute('data-task-id');
  const actionType = action.getAttribute('data-action');
  
  console.log('Action clicked:', actionType, 'Task ID:', taskId);
  
  // Show loading state
  const actionButton = action;
  const originalHTML = actionButton.innerHTML;
  
  if (actionType === 'delete') {
    actionButton.disabled = true;
    actionButton.innerHTML = '<svg class="w-4 h-4 animate-spin" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 002 14.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd"></path></svg>';
  }
  
  switch (actionType) {
    case 'toggle':
      if (window.taskManager) {
        window.taskManager.toggleTask(taskId).finally(() => {
          // Reset button state if needed
        });
      } else {
        console.error('taskManager not found');
      }
      break;
      
    case 'edit':
      if (window.taskManager) {
        window.taskManager.editTask(taskId);
      } else {
        console.error('taskManager not found');
      }
      break;
      
    case 'delete':
      if (window.taskManager) {
        window.taskManager.deleteTask(taskId).finally(() => {
          // Reset button state
          actionButton.disabled = false;
          actionButton.innerHTML = originalHTML;
        });
      } else {
        console.error('taskManager not found');
        actionButton.disabled = false;
        actionButton.innerHTML = originalHTML;
      }
      break;
  }
});

// Direct edit functionality (click on task text)
document.addEventListener('click', function(event) {
  const taskText = event.target.closest('.task-text[data-editable="true"]');
  if (!taskText) return;
  
  const taskId = taskText.getAttribute('data-task-id');
  if (!taskId) return;
  
  // Instead of inline editing, open the edit modal
  if (window.taskManager) {
    window.taskManager.editTask(taskId);
  }
});

// Event delegation for manual refresh button
document.addEventListener('click', function(event) {
  if (event.target.closest('#refreshButton')) {
    event.preventDefault();
    if (window.taskManager) {
      window.taskManager.manualRefresh();
    } else {
      console.error('taskManager not found');
    }
  }
});

// Event delegation for form submissions
document.addEventListener('submit', function(event) {
  // Handle edit task form
  if (event.target.id === 'editTaskForm') {
    event.preventDefault();
    
    const editTaskInput = document.getElementById('editTaskInput');
    const editPriority = document.getElementById('editPriority');
    const submitButton = event.target.querySelector('button[type="submit"]');
    const newText = editTaskInput.value.trim();
    
    if (!newText) {
      console.log('No text provided');
      return;
    }

    // Get current edit task ID from state
    const { currentEditTaskId } = window.taskManager ? 
      window.taskManager.store.getState() : 
      { currentEditTaskId: null };
    
    if (!currentEditTaskId) {
      console.log('No current edit task ID');
      return;
    }

    console.log('Editing task:', currentEditTaskId, 'New text:', newText);
    
    // Show loading state
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.innerHTML = '<svg class="w-4 h-4 animate-spin" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 002 14.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd"></path></svg> Saving...';
    }
    
    const updateData = {
      text: newText
    };
    
    // Add priority if checkbox exists
    if (editPriority) {
      updateData.priority = editPriority.checked;
    }
    
    fetch(`/api/tasks/${currentEditTaskId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to update task');
      }
      return response.json();
    })
    .then(() => {
      if (window.taskManager) {
        window.taskManager.closeEditModal();
        return window.taskManager.loadTasks(true);
      }
    })
    .then(() => {
      if (window.showToast) {
        window.showToast('Task updated successfully!', 'success');
      }
    })
    .catch(error => {
      console.error('Error updating task:', error);
      if (window.showToast) {
        window.showToast('Failed to update task: ' + error.message, 'error');
      }
    })
    .finally(() => {
      // Reset button state
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg><span>Save Changes</span>';
      }
    });
  }
  
  // Handle add task form
  if (event.target.id === 'addTaskForm') {
    event.preventDefault();
    
    const taskInput = document.getElementById('taskInput');
    const priorityTask = document.getElementById('priorityTask');
    const dueDate = document.getElementById('dueDate');
    const submitButton = event.target.querySelector('button[type="submit"]');
    const text = taskInput.value.trim();
    
    if (!text) {
      if (window.showToast) {
        window.showToast('Please enter a task description', 'error');
      }
      return;
    }
    
    // Validate text length
    if (text.length > 200) {
      if (window.showToast) {
        window.showToast('Task text must be 200 characters or less', 'error');
      }
      return;
    }
    
    console.log('Adding new task:', text);
    
    // Show loading state
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.innerHTML = '<svg class="w-4 h-4 animate-spin" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 002 14.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd"></path></svg> Adding...';
    }
    
    const taskData = {
      text: text,
      userId: 'default-user'
    };
    
    // Add priority if checked
    if (priorityTask && priorityTask.checked) {
      taskData.priority = true;
    }
    
    // Add due date if provided
    if (dueDate && dueDate.value) {
      taskData.due_date = dueDate.value;
    }
    
    fetch('/api/tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(taskData),
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to create task');
      }
      
      // Clear form
      taskInput.value = '';
      if (dueDate) dueDate.value = '';
      if (priorityTask) priorityTask.checked = false;
      
      // Update char counter
      const charCount = document.getElementById('charCount');
      if (charCount) charCount.textContent = '0/200';
      
      // Force refresh regardless of user interaction state
      if (window.taskManager) {
        return window.taskManager.loadTasks(true);
      }
    })
    .then(() => {
      if (window.showToast) {
        window.showToast('Task added successfully!', 'success');
      }
    })
    .catch(error => {
      console.error('Error adding task:', error);
      if (window.showToast) {
        window.showToast('Failed to add task: ' + error.message, 'error');
      }
    })
    .finally(() => {
      // Reset button state
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.innerHTML = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg><span>Add Task</span>';
      }
      
      // Focus back on task input
      taskInput.focus();
    });
  }
});

// Initialize debounced inputs when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  setupDebouncedInput();
});

// User interaction tracking for performance optimization
let userInteractionTimeout;
document.addEventListener('mousemove', () => {
  if (window.taskManager) {
    window.taskManager.isUserInteracting = true;
    clearTimeout(userInteractionTimeout);
    userInteractionTimeout = setTimeout(() => {
      if (window.taskManager) {
        window.taskManager.isUserInteracting = false;
      }
    }, 2000); // 2 seconds of no mouse movement = not interacting
  }
});

document.addEventListener('keypress', () => {
  if (window.taskManager) {
    window.taskManager.isUserInteracting = true;
    clearTimeout(userInteractionTimeout);
    userInteractionTimeout = setTimeout(() => {
      if (window.taskManager) {
        window.taskManager.isUserInteracting = false;
      }
    }, 2000); // 2 seconds of no keyboard input = not interacting
  }
});