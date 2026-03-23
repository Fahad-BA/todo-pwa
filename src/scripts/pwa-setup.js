// PWA Setup - Service Worker and Install Prompt functionality

// Enhanced Service Worker registration with update handling
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('ServiceWorker registration successful with scope: ', registration.scope);
        
        // Check for updates
        registration.addEventListener('updatefound', () => {
          const installingWorker = registration.installing;
          installingWorker.addEventListener('statechange', () => {
            if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New version available
              if (window.showToast) {
                window.showToast('New version available! Refresh to update.', 'info');
              }
            }
          });
        });
      })
      .catch(error => {
        console.log('ServiceWorker registration failed: ', error);
      });
  });

  // Handle service worker updates
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });
}

// Enhanced PWA install prompt
let deferredPrompt;
const installButton = document.createElement('button');
installButton.id = 'installButton';
installButton.className = 'fixed bottom-4 right-4 bg-gradient-to-r from-primary-500 to-accent-500 text-white px-6 py-3 rounded-xl shadow-glow hover:shadow-xl transform hover:scale-105 transition-all duration-200 z-50 flex items-center space-x-2';
installButton.innerHTML = `
  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
  </svg>
  <span>Install App</span>
`;
installButton.style.display = 'none';

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  
  // Show install button
  document.body.appendChild(installButton);
  installButton.style.display = 'flex';
  
  installButton.addEventListener('click', () => {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt');
        if (window.showToast) {
          window.showToast('App installed successfully!', 'success');
        }
      } else {
        console.log('User dismissed the install prompt');
      }
      deferredPrompt = null;
      installButton.style.display = 'none';
    });
  });
});

window.addEventListener('appinstalled', () => {
  console.log('PWA was installed');
  installButton.style.display = 'none';
  if (window.showToast) {
    window.showToast('Thank you for installing TaskFlow!', 'success');
  }
});

// Dark mode handling
const html = document.documentElement;
const savedTheme = localStorage.getItem('theme');
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

// Apply saved theme or system preference
const applyTheme = () => {
  if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
    html.classList.add('dark');
  } else {
    html.classList.remove('dark');
  }
};

applyTheme();

// Dark mode toggle
const themeToggle = document.getElementById('themeToggle');
if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    html.classList.toggle('dark');
    const isDark = html.classList.contains('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    
    // Add rotation animation
    themeToggle.classList.add('animate-bounce-gentle');
    setTimeout(() => {
      themeToggle.classList.remove('animate-bounce-gentle');
    }, 600);
    
    // Show theme change toast
    if (window.showToast) {
      window.showToast(`Switched to ${isDark ? 'dark' : 'light'} mode`, 'success');
    }
  });
}

// Add keyboard shortcuts
document.addEventListener('keydown', (e) => {
  // Ctrl/Cmd + K to focus search
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    const taskInput = document.getElementById('taskInput');
    if (taskInput) {
      taskInput.focus();
      taskInput.select();
    }
  }
  
  // Ctrl/Cmd + N to add new task
  if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
    e.preventDefault();
    const taskInput = document.getElementById('taskInput');
    if (taskInput) {
      taskInput.focus();
      taskInput.select();
    }
  }
  
  // Escape to clear focus
  if (e.key === 'Escape') {
    if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
      document.activeElement.blur();
    }
  }
});

// Add smooth scroll behavior
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  });
});

// Add page visibility handling
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    // Page is visible, refresh tasks if needed
    if (window.loadTasks && !window.isUserInteracting) {
      const lastLoad = localStorage.getItem('lastTaskLoad');
      const now = Date.now();
      
      // Refresh if more than 5 minutes since last load
      if (!lastLoad || now - parseInt(lastLoad) > 300000) {
        window.loadTasks();
        localStorage.setItem('lastTaskLoad', now.toString());
      }
    }
  }
});

// Initialize analytics tracking (placeholder)
console.log('TaskFlow PWA initialized successfully');