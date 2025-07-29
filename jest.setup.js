import '@testing-library/jest-dom'

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