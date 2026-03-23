// Simple task store replacement
let tasks = [];
let loading = false;
let error = null;

export const useTaskStore = {
  getState: () => ({ tasks, loading, error })
};

export const useTaskActions = {
  addTask: (task) => {
    tasks.push(task);
  },
  updateTask: (id, updates) => {
    const index = tasks.findIndex(t => t.id === id);
    if (index !== -1) {
      tasks[index] = { ...tasks[index], ...updates };
    }
  },
  deleteTask: (id) => {
    tasks = tasks.filter(t => t.id !== id);
  },
  setTasks: (newTasks) => {
    tasks = newTasks;
  },
  setLoading: (isLoading) => {
    loading = isLoading;
  },
  setError: (errorMessage) => {
    error = errorMessage;
  },
  setCurrentEditTaskId: (id) => {
    // Simple implementation
    console.log('Set edit task ID:', id);
  }
};