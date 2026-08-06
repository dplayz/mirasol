class StackRouter {
  constructor(initialScreenId) {
    // The stack array holds the IDs of the active screen history
    this.stack = [initialScreenId];
    this.currentScreen = initialScreenId;
    this.handleHashChange = this.handleHashChange.bind(this);
    this.updateBackButtons();
    
    // Listen for hash changes (browser back/forward)
    window.addEventListener('hashchange', this.handleHashChange);
    
    // Check if there's a hash on page load
    this.restoreFromHash();
  }

  destroy() {
    window.removeEventListener('hashchange', this.handleHashChange);
  }

  // Restore screen from URL hash
  restoreFromHash() {
    const hash = window.location.hash.replace('#', '');
    if (hash && document.getElementById(hash)) {
      // Clear the stack and navigate to the hashed screen
      this.stack = [this.stack[0]];
      if (hash !== this.stack[0]) {
        this.push(hash);
      }
    }
    // Ensure back button visibility is correct
    this.updateBackButtons();
  }

  // Handle hash changes from browser navigation
  handleHashChange() {
    const hash = window.location.hash.replace('#', '');
    if (hash) {
      // If hash matches current screen, do nothing
      if (hash === this.currentScreen) return;
      
      // If hash matches something in stack, pop until we reach it
      if (this.stack.includes(hash)) {
        while (this.currentScreen !== hash) {
          this.pop();
        }
      } else {
        // Otherwise push the new screen
        this.push(hash);
      }
    } else {
      // Empty hash means go back to root
      while (this.stack.length > 1) {
        this.pop();
      }
    }
  }

  // Push a new screen onto the stack
  push(screenId) {
    const nextScreen = document.getElementById(screenId);
    if (!nextScreen) return console.error(`Screen ${screenId} does not exist.`);

    // Remove active class from the current screen
    document.getElementById(this.currentScreen).classList.remove('active');

    // Add new screen to the stack and make it active
    this.stack.push(screenId);
    this.currentScreen = screenId;
    nextScreen.classList.add('active');
    
    // Update URL hash
    window.location.hash = screenId;
    
    this.updateBackButtons();
  }

  // Pop the top screen off the stack to go back
  pop() {
    if (this.stack.length <= 1) {
      console.warn("You are at the root screen. Cannot pop further.");
      return; 
    }

    // Remove active class from the current top screen
    document.getElementById(this.currentScreen).classList.remove('active');

    // Remove it from our array tracking
    this.stack.pop();

    // Get the previous screen ID
    const previousScreenId = this.stack[this.stack.length - 1];
    
    // Make the previous screen active
    document.getElementById(previousScreenId).classList.add('active');
    this.currentScreen = previousScreenId;
    
    // Update URL hash
    if (previousScreenId === this.stack[0]) {
      // If back to root, clear the hash
      window.location.hash = '';
    } else {
      window.location.hash = previousScreenId;
    }
    
    this.updateBackButtons();
  }

  // Update back button visibility based on stack depth
  updateBackButtons() {
    const allBackBtns = document.querySelectorAll('.screen-back-btn');
    allBackBtns.forEach(btn => {
      // Show back button only if stack has more than 1 item
      btn.style.display = this.stack.length > 1 ? 'inline-block' : 'none';
    });
  }
}

// Initialize router when screens are present
function initializeStackRouter() {
  const screensContainer = document.querySelector('.screens-container');
  if (screensContainer) {
    const initialScreenId = screensContainer.dataset.initialScreen;
    const activeScreen = screensContainer.querySelector('.screen.active');
    const initialScreen = activeScreen || (initialScreenId ? document.getElementById(initialScreenId) : null) || screensContainer.querySelector('.screen');
    if (initialScreen && initialScreen.id) {
      if (window.router && typeof window.router.destroy === 'function') {
        window.router.destroy();
      }
      window.router = new StackRouter(initialScreen.id);
    }
  }
}

document.addEventListener('DOMContentLoaded', initializeStackRouter);
document.addEventListener('turbo:load', initializeStackRouter);
document.addEventListener('turbo:before-cache', () => {
  if (window.router && typeof window.router.destroy === 'function') {
    window.router.destroy();
  }
});
