/* ═════════════════ CONFIGURACIÓN GLOBAL ═════════════════ */
const CONFIG = {
  splashDuration: 1500,
  menuToggleId: 'menu-toggle',
  navbarId: 'navbar',
  splashId: 'splash',
  yearElementId: 'year',
  revealSelector: '.reveal',
  carouselSelector: '.carrusel-track',
};

/* ═════════════════ UTILIDADES ═════════════════ */
const Utils = {
  delay: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  
  clamp: (value, min, max) => Math.min(Math.max(value, min), max),
  
  normalize: (value, range) => {
    while (value <= -range) value += range;
    while (value > 0) value -= range;
    return value;
  }
};

/* ═════════════════ MÓDULO: SPLASH SCREEN ═════════════════ */
const Splash = {
  init() {
    window.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => {
        const splash = document.getElementById(CONFIG.splashId);
        if (splash) {
          splash.style.opacity = '0';
          setTimeout(() => splash.remove(), 600);
        }
      }, CONFIG.splashDuration);
    });
  }
};

/* ═════════════════ MÓDULO: NAVEGACIÓN ═════════════════ */
const Navigation = {
  init() {
    this.toggle = document.getElementById(CONFIG.menuToggleId);
    this.nav = document.getElementById(CONFIG.navbarId);
    
    if (!this.toggle || !this.nav) return;

    this.toggle.addEventListener('click', () => this.handleToggle());
    document.querySelectorAll(`${CONFIG.navbarId} a`).forEach(link => {
      link.addEventListener('click', () => this.closeMenu());
    });
    
    this.setupSmoothScroll();
  },

  handleToggle() {
    const isOpen = this.nav.classList.toggle('open');
    this.toggle.setAttribute('aria-label', isOpen ? 'Cerrar menú' : 'Abrir menú');
    this.toggle.setAttribute('aria-expanded', isOpen.toString());
  },

  closeMenu() {
    this.nav.classList.remove('open');
    this.toggle.setAttribute('aria-label', 'Abrir menú');
    this.toggle.setAttribute('aria-expanded', 'false');
  },

  setupSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const target = document.querySelector(link.getAttribute('href'));
        if (target) {
          target.scrollIntoView({ behavior: 'smooth' });
        }
      });
    });
  }
};

/* ═════════════════ MÓDULO: CARRUSEL ═════════════════ */
const Carousel = {
  state: {
    position: 0,
    isDragging: false,
    isInertia: false,
    velocity: 0,
    animationId: null,
    autoSpeed: 0.8,
    decay: 0.90,
    minInertia: 0.5,
    maxInertiaFrames: 40,
  },

  init() {
    this.track = document.querySelector(CONFIG.carouselSelector);
    if (!this.track) return;

    this.wrapper = this.track.parentElement;
    this.items = this.track.querySelectorAll('.carrusel-item');
    
    if (this.items.length === 0) return;

    this.setupMeasurements();
    this.setupEventListeners();
    this.startAuto();
  },

  setupMeasurements() {
    const first = this.items[0];
    const second = this.items[1];
    
    if (!first || !second) return;

    const rect1 = first.getBoundingClientRect();
    const rect2 = second.getBoundingClientRect();
    
    this.itemWidth = rect1.width;
    this.gap = rect2.left - rect1.right;
    this.setWidth = (this.itemWidth + this.gap) * (this.items.length / 2);

    window.addEventListener('resize', () => this.setupMeasurements());
  },

  setupEventListeners() {
    // Touch
    this.track.addEventListener('touchstart', (e) => {
      this.onStart(e.touches[0].clientX);
    }, { passive: true });

    this.track.addEventListener('touchmove', (e) => {
      this.onMove(e.touches[0].clientX);
    }, { passive: true });

    this.track.addEventListener('touchend', () => this.onEnd());
    this.track.addEventListener('touchcancel', () => this.onEnd());

    // Mouse
    this.track.addEventListener('mousedown', (e) => {
      e.preventDefault();
      this.onStart(e.clientX);
    });

    window.addEventListener('mousemove', (e) => {
      this.onMove(e.clientX);
    });

    window.addEventListener('mouseup', () => this.onEnd());

    // Prevent image drag
    this.track.querySelectorAll('img').forEach(img => {
      img.addEventListener('dragstart', (e) => e.preventDefault());
    });
  },

  onStart(clientX) {
    this.state.isDragging = true;
    this.state.isInertia = false;
    this.startX = clientX;
    this.startPos = this.state.position;
    this.lastX = clientX;
    this.lastTime = Date.now();
    this.state.velocity = 0;
    this.track.classList.add('dragging');
    this.stopAuto();
  },

  onMove(clientX) {
    if (!this.state.isDragging) return;

    const now = Date.now();
    const dt = now - this.lastTime;
    
    if (dt > 0) {
      this.state.velocity = (clientX - this.lastX) / dt;
    }

    this.lastX = clientX;
    this.lastTime = now;
    
    const delta = clientX - this.startX;
    this.state.position = this.startPos + delta;
    
    this.normalizePosition();
    this.setTransform();
  },

  onEnd() {
    if (!this.state.isDragging) return;

    this.state.isDragging = false;
    this.track.classList.remove('dragging');

    this.applyInertia();
  },

  applyInertia() {
    let inertia = this.state.velocity * 16;
    let frames = 0;
    this.state.isInertia = true;

    const loop = () => {
      if (this.state.isDragging) {
        this.state.isInertia = false;
        return;
      }

      if (frames < this.state.maxInertiaFrames && Math.abs(inertia) > this.state.minInertia) {
        this.state.position += inertia;
        inertia *= this.state.decay;
        frames++;
        
        this.normalizePosition();
        this.setTransform();
        
        requestAnimationFrame(loop);
      } else {
        this.state.isInertia = false;
        this.startAuto();
      }
    };

    loop();
  },

  normalizePosition() {
    this.state.position = Utils.normalize(this.state.position, this.setWidth);
  },

  setTransform() {
    this.track.style.transform = `translateX(${this.state.position}px)`;
  },

  startAuto() {
    this.stopAuto();
    this.state.animationId = requestAnimationFrame(() => this.autoLoop());
  },

  autoLoop() {
    if (this.state.isDragging || this.state.isInertia) {
      this.state.animationId = requestAnimationFrame(() => this.autoLoop());
      return;
    }

    this.state.position -= this.state.autoSpeed;
    this.normalizePosition();
    this.setTransform();
    
    this.state.animationId = requestAnimationFrame(() => this.autoLoop());
  },

  stopAuto() {
    if (this.state.animationId) {
      cancelAnimationFrame(this.state.animationId);
      this.state.animationId = null;
    }
  }
};

/* ═════════════════ MÓDULO: SCROLL REVEAL ═════════════════ */
const ScrollReveal = {
  init() {
    const elements = document.querySelectorAll(CONFIG.revealSelector);
    if (elements.length === 0) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        requestAnimationFrame(() => {
          entry.target.classList.toggle('visible', entry.isIntersecting);
        });
      });
    }, {
      threshold: 0.01,
      rootMargin: '20px 0px 20px 0px'
    });

    elements.forEach(el => observer.observe(el));
  }
};

/* ═════════════════ MÓDULO: FOOTER ═════════════════ */
const Footer = {
  init() {
    const yearElement = document.getElementById(CONFIG.yearElementId);
    if (yearElement) {
      yearElement.textContent = new Date().getFullYear();
    }
  }
};

/* ═════════════════ INICIALIZACIÓN ═════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  Splash.init();
  Navigation.init();
  Carousel.init();
  ScrollReveal.init();
  Footer.init();
});
