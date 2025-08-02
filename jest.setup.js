import '@testing-library/jest-dom'
import { toHaveNoViolations } from 'jest-axe'

// Extend Jest matchers with jest-axe for accessibility testing
expect.extend(toHaveNoViolations)

// Mock required Next.js API functions for testing
Object.defineProperty(global, 'Request', {
  value: class MockRequest {
    constructor(url, options = {}) {
      this.url = url;
      this.method = options.method || 'GET';
      this.headers = new Map(Object.entries(options.headers || {}));
    }
    
    get(name) {
      return this.headers.get(name.toLowerCase()) || null;
    }
  },
  writable: false
});

Object.defineProperty(global, 'Response', {
  value: class MockResponse {
    constructor(body, options = {}) {
      this.body = body;
      this.status = options.status || 200;
      this.statusText = options.statusText || 'OK';
      this.headers = new Map(Object.entries(options.headers || {}));
    }
    
    json() {
      return Promise.resolve(JSON.parse(this.body));
    }
    
    text() {
      return Promise.resolve(this.body);
    }
  },
  writable: false
});

// Mock fetch
global.fetch = jest.fn();

// Mock IntersectionObserver for CountryFlag component
global.IntersectionObserver = class IntersectionObserver {
  constructor(callback) {
    this.callback = callback;
    // Immediately trigger the callback with a visible entry
    setTimeout(() => {
      callback([
        {
          isIntersecting: true,
          target: document.createElement('div'),
          boundingClientRect: {} ,
          intersectionRatio: 1,
          intersectionRect: {},
          rootBounds: {},
          time: Date.now()
        }
      ], this);
    }, 0);
  }
  
  observe = jest.fn();
  disconnect = jest.fn();
  unobserve = jest.fn();
};

// Mock window.matchMedia for responsive design testing
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(), // deprecated
      removeListener: jest.fn(), // deprecated
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
}

// Mock ResizeObserver for responsive components
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock window.navigator for offline detection
if (typeof window !== 'undefined' && window.navigator) {
  Object.defineProperty(window.navigator, 'onLine', {
    writable: true,
    value: true,
  });
}

// Mock localStorage for theme persistence
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn((key) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();
global.localStorage = localStorageMock;

// Mock AbortSignal.timeout for modern fetch API support
if (!AbortSignal.timeout) {
  AbortSignal.timeout = function(milliseconds) {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), milliseconds);
    return controller.signal;
  };
}