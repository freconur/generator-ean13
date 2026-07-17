import '@testing-library/jest-dom';

// Polyfill window.alert for JSDOM in Jest
if (typeof window !== 'undefined') {
  window.alert = jest.fn();
}
