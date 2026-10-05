class StackRouter {
  constructor(initialScreenId) {
    this.stack = [initialScreenId];
    this.currentScreen = initialScreenId;
    this.isTransitioning = false;
    this.currentTransitionCleanup = null;

    this.defaultAnimation = {
      enterForward: 'animate__subtleSlideInRight',
      exitForward: 'animate__subtleSlideOutLeft',
      enterBackward: 'animate__subtleSlideInLeft',
      exitBackward: 'animate__subtleSlideOutRight',
      duration: '250ms'
    };

    this.handleHashChange = this.handleHashChange.bind(this);
    this.updateBackButtons();

    // Listen for hash changes (browser back/forward)
    window.addEventListener('hashchange', this.handleHashChange);

    // Check if there's a hash on page load
    this.restoreFromHash();
  }

  destroy() {
    window.removeEventListener('hashchange', this.handleHashChange);
    if (this.currentTransitionCleanup) {
      this.currentTransitionCleanup();
      this.currentTransitionCleanup = null;
    }
  }

  // Normalize animation class names (e.g. 'fadeIn' -> 'animate__fadeIn')
  normalizeAnimationClass(className) {
    if (!className || typeof className !== 'string') return '';
    className = className.trim();
    if (!className) return '';
    if (className.startsWith('animate__')) return className;
    return `animate__${className}`;
  }

  // Parse duration string or number into milliseconds
  parseDurationMs(duration) {
    if (typeof duration === 'number') return duration;
    if (typeof duration === 'string') {
      const trimmed = duration.trim().toLowerCase();
      if (trimmed.endsWith('ms')) return parseFloat(trimmed);
      if (trimmed.endsWith('s')) return parseFloat(trimmed) * 1000;
      const num = parseFloat(trimmed);
      if (!isNaN(num)) return num;
    }
    return 250;
  }

  // Resolve animation settings from options, screen datasets, container dataset, and page dataset
  getAnimationConfig(fromScreen, toScreen, direction, options = {}) {
    const container = document.querySelector('.screens-container');
    const pageMain = document.getElementById('infopage');

    const getAttr = (el, attr) => el ? (el.dataset[attr] || '') : '';

    const isForward = direction === 'forward';

    // Enter animation
    const optEnter = isForward ? (options.enter || options.enterForward) : (options.enterBack || options.enterBackward || options.enter);
    const toEnter = isForward
      ? (getAttr(toScreen, 'animEnter') || getAttr(toScreen, 'animEnterForward'))
      : (getAttr(toScreen, 'animEnterBack') || getAttr(toScreen, 'animEnterBackward') || getAttr(toScreen, 'animEnter'));
    const containerEnter = isForward
      ? (getAttr(container, 'animEnter') || getAttr(container, 'animEnterForward'))
      : (getAttr(container, 'animEnterBack') || getAttr(container, 'animEnterBackward') || getAttr(container, 'animEnter'));
    const pageEnter = isForward
      ? (getAttr(pageMain, 'animEnter') || getAttr(pageMain, 'animEnterForward'))
      : (getAttr(pageMain, 'animEnterBack') || getAttr(pageMain, 'animEnterBackward') || getAttr(pageMain, 'animEnter'));
    const defaultEnter = isForward ? this.defaultAnimation.enterForward : this.defaultAnimation.enterBackward;

    // Exit animation
    const optExit = isForward ? (options.exit || options.exitForward) : (options.exitBack || options.exitBackward || options.exit);
    const fromExit = isForward
      ? (getAttr(fromScreen, 'animExit') || getAttr(fromScreen, 'animExitForward'))
      : (getAttr(fromScreen, 'animExitBack') || getAttr(fromScreen, 'animExitBackward') || getAttr(fromScreen, 'animExit'));
    const containerExit = isForward
      ? (getAttr(container, 'animExit') || getAttr(container, 'animExitForward'))
      : (getAttr(container, 'animExitBack') || getAttr(container, 'animExitBackward') || getAttr(container, 'animExit'));
    const pageExit = isForward
      ? (getAttr(pageMain, 'animExit') || getAttr(pageMain, 'animExitForward'))
      : (getAttr(pageMain, 'animExitBack') || getAttr(pageMain, 'animExitBackward') || getAttr(pageMain, 'animExit'));
    const defaultExit = isForward ? this.defaultAnimation.exitForward : this.defaultAnimation.exitBackward;

    // Duration
    const duration = options.duration
      || getAttr(toScreen, 'animDuration')
      || getAttr(container, 'animDuration')
      || getAttr(pageMain, 'animDuration')
      || this.defaultAnimation.duration;

    const enterClass = this.normalizeAnimationClass(optEnter || toEnter || containerEnter || pageEnter || defaultEnter);
    const exitClass = this.normalizeAnimationClass(optExit || fromExit || containerExit || pageExit || defaultExit);

    return {
      enterClass,
      exitClass,
      duration: duration.toString().includes('ms') || duration.toString().includes('s') ? duration : `${duration}ms`,
      durationMs: this.parseDurationMs(duration)
    };
  }

  // Restore screen from URL hash without transition animation
  restoreFromHash() {
    const hash = window.location.hash.replace('#', '');
    if (hash && document.getElementById(hash)) {
      this.stack = [this.stack[0]];
      if (hash !== this.stack[0]) {
        this.push(hash, { animate: false });
      }
    }
    this.updateBackButtons();
  }

  // Handle hash changes from browser navigation
  handleHashChange() {
    const hash = window.location.hash.replace('#', '');
    if (hash) {
      if (hash === this.currentScreen) return;

      if (this.stack.includes(hash)) {
        this.popTo(hash);
      } else {
        this.push(hash);
      }
    } else {
      // Empty hash means go back to root
      if (this.stack.length > 1) {
        this.popTo(this.stack[0]);
      }
    }
  }

  // Perform animated transition between screens
  transition(fromScreenId, toScreenId, direction = 'forward', options = {}) {
    const fromScreen = document.getElementById(fromScreenId);
    const toScreen = document.getElementById(toScreenId);
    const container = document.querySelector('.screens-container');

    if (!toScreen) {
      console.error(`Target screen ${toScreenId} does not exist.`);
      return Promise.resolve();
    }

    // Clean up any ongoing transition immediately
    if (this.currentTransitionCleanup) {
      this.currentTransitionCleanup();
      this.currentTransitionCleanup = null;
    }

    // Direct instant switch if animations are disabled or same screen
    const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (options.animate === false || !fromScreen || fromScreen === toScreen || prefersReducedMotion) {
      if (fromScreen && fromScreen !== toScreen) {
        fromScreen.classList.remove('active', 'screen-animating-out');
      }
      toScreen.classList.add('active');
      toScreen.classList.remove('screen-animating-in');
      this.currentScreen = toScreenId;
      this.updateBackButtons();
      return Promise.resolve();
    }

    const animConfig = this.getAnimationConfig(fromScreen, toScreen, direction, options);
    const { enterClass, exitClass, duration, durationMs } = animConfig;

    this.isTransitioning = true;

    // Smooth container height
    if (container) {
      const fromHeight = fromScreen.offsetHeight;
      container.style.minHeight = `${fromHeight}px`;
    }

    // Prepare elements for animation
    fromScreen.classList.add('screen-animating-out', 'animate__animated', exitClass);
    fromScreen.style.setProperty('--animate-duration', duration);

    toScreen.classList.add('screen-animating-in', 'animate__animated', enterClass);
    toScreen.style.setProperty('--animate-duration', duration);

    // Next frame: animate container height to target screen height
    requestAnimationFrame(() => {
      if (container) {
        const toHeight = toScreen.offsetHeight;
        container.style.minHeight = `${toHeight}px`;
      }
    });

    return new Promise(resolve => {
      let isDone = false;

      const cleanup = () => {
        if (isDone) return;
        isDone = true;

        clearTimeout(timeoutId);
        fromScreen.removeEventListener('animationend', onEnd);
        toScreen.removeEventListener('animationend', onEnd);

        // Reset classes and styles on fromScreen
        fromScreen.classList.remove('active', 'screen-animating-out', 'animate__animated', exitClass);
        fromScreen.style.removeProperty('--animate-duration');

        // Finalize toScreen
        toScreen.classList.add('active');
        toScreen.classList.remove('screen-animating-in', 'animate__animated', enterClass);
        toScreen.style.removeProperty('--animate-duration');

        if (container) {
          container.style.minHeight = '';
        }

        this.currentScreen = toScreenId;
        this.isTransitioning = false;
        this.currentTransitionCleanup = null;
        this.updateBackButtons();
        resolve();
      };

      this.currentTransitionCleanup = cleanup;

      const onEnd = (e) => {
        if (e.target === toScreen || e.target === fromScreen) {
          cleanup();
        }
      };

      fromScreen.addEventListener('animationend', onEnd);
      toScreen.addEventListener('animationend', onEnd);

      // Timeout fallback to ensure cleanup always occurs
      const timeoutId = setTimeout(cleanup, durationMs + 80);
    });
  }

  // Push a new screen onto the stack
  push(screenId, options = {}) {
    const nextScreen = document.getElementById(screenId);
    if (!nextScreen) return console.error(`Screen ${screenId} does not exist.`);

    const fromScreenId = this.currentScreen;
    this.stack.push(screenId);

    // Update URL hash
    window.location.hash = screenId;

    this.transition(fromScreenId, screenId, 'forward', options);
  }

  // Pop the top screen off the stack to go back
  pop(options = {}) {
    if (this.stack.length <= 1) {
      console.warn("You are at the root screen. Cannot pop further.");
      return;
    }

    const fromScreenId = this.stack.pop();
    const previousScreenId = this.stack[this.stack.length - 1];

    // Update URL hash
    if (previousScreenId === this.stack[0]) {
      window.location.hash = '';
    } else {
      window.location.hash = previousScreenId;
    }

    this.transition(fromScreenId, previousScreenId, 'backward', options);
  }

  // Pop back to a specific screen in the stack
  popTo(targetScreenId, options = {}) {
    const targetIndex = this.stack.indexOf(targetScreenId);
    if (targetIndex === -1) {
      return this.push(targetScreenId, options);
    }
    if (targetScreenId === this.currentScreen) return;

    const fromScreenId = this.currentScreen;
    // Trim stack down to target screen
    this.stack = this.stack.slice(0, targetIndex + 1);

    if (targetScreenId === this.stack[0]) {
      window.location.hash = '';
    } else {
      window.location.hash = targetScreenId;
    }

    this.transition(fromScreenId, targetScreenId, 'backward', options);
  }

  // Update back button visibility based on stack depth
  updateBackButtons() {
    const allBackBtns = document.querySelectorAll('.screen-back-btn');
    allBackBtns.forEach(btn => {
      btn.style.display = this.stack.length > 1 ? 'inline-block' : 'none';
    });
  }
}

// Initialize router when screens are present
function initializeStackRouter() {
  const screensContainer = document.querySelector('.screens-container');
  if (screensContainer) {
    const firstScreen = screensContainer.querySelector('.screen');
    if (firstScreen && firstScreen.id) {
      if (window.router && typeof window.router.destroy === 'function') {
        window.router.destroy();
      }
      window.router = new StackRouter(firstScreen.id);
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
