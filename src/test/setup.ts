import '@testing-library/jest-dom';

const noop = () => {};
const storage: Record<string, string> = {};
Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: (key: string) => storage[key] ?? null,
    setItem: (key: string, value: string) => {
      storage[key] = value;
    },
    removeItem: (key: string) => {
      delete storage[key];
    },
    clear: () => {
      for (const key of Object.keys(storage)) delete storage[key];
    },
    length: 0,
    key: noop,
  },
  writable: true,
});

class ResizeObserverMock {
  observe = noop;
  unobserve = noop;
  disconnect = noop;
}
globalThis.ResizeObserver = ResizeObserverMock;
