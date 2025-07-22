import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock;

// Mock sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.sessionStorage = sessionStorageMock;

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

// Mock fetch
global.fetch = vi.fn();

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => 'mock-url');

// Mock URL.revokeObjectURL
global.URL.revokeObjectURL = vi.fn();

// Mock FileReader
global.FileReader = vi.fn().mockImplementation(() => ({
  readAsText: vi.fn(),
  readAsDataURL: vi.fn(),
  result: '',
  onload: null,
  onerror: null,
}));

// Mock WebSocket
global.WebSocket = vi.fn().mockImplementation(() => ({
  send: vi.fn(),
  close: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  readyState: 1,
}));

// Mock Notification API
global.Notification = vi.fn().mockImplementation(() => ({
  close: vi.fn(),
}));

// Mock requestAnimationFrame
global.requestAnimationFrame = vi.fn(cb => setTimeout(cb, 0));

// Mock cancelAnimationFrame
global.cancelAnimationFrame = vi.fn();

// Mock performance.now
global.performance = {
  ...global.performance,
  now: vi.fn(() => Date.now()),
};

// Mock crypto.randomUUID
global.crypto = {
  ...global.crypto,
  randomUUID: vi.fn(() => 'mock-uuid'),
};

// Setup cleanup after each test
afterEach(() => {
  vi.clearAllMocks();
  localStorageMock.clear();
  sessionStorageMock.clear();
});
