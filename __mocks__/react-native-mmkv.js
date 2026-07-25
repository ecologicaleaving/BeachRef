/**
 * In-memory stand-in for `react-native-mmkv`.
 *
 * MMKV is a native module (JSI): it has no JS fallback and throws as soon as it
 * is constructed under jest. This mock keeps the same surface backed by a plain
 * `Map`, so services built on `MmkvStorage` are testable with real behaviour
 * (values written are readable back) instead of `jest.fn()` stubs.
 *
 * Wired globally through `moduleNameMapper` in `jest.config.js`.
 */
class MMKV {
  constructor(config = {}) {
    this.id = config.id || 'mmkv.default';
    this._store = new Map();
    this._listeners = new Set();
  }

  set(key, value) {
    this._store.set(key, value);
    this._listeners.forEach((listener) => listener(key));
  }

  getString(key) {
    const value = this._store.get(key);
    return typeof value === 'string' ? value : undefined;
  }

  getNumber(key) {
    const value = this._store.get(key);
    return typeof value === 'number' ? value : undefined;
  }

  getBoolean(key) {
    const value = this._store.get(key);
    return typeof value === 'boolean' ? value : undefined;
  }

  getBuffer(key) {
    const value = this._store.get(key);
    return value instanceof Uint8Array ? value : undefined;
  }

  contains(key) {
    return this._store.has(key);
  }

  delete(key) {
    this._store.delete(key);
    this._listeners.forEach((listener) => listener(key));
  }

  getAllKeys() {
    return Array.from(this._store.keys());
  }

  clearAll() {
    this._store.clear();
  }

  recrypt() {
    /* no-op: encryption is meaningless in-memory */
  }

  trim() {
    /* no-op */
  }

  get size() {
    return this._store.size;
  }

  addOnValueChangedListener(listener) {
    this._listeners.add(listener);
    return { remove: () => this._listeners.delete(listener) };
  }
}

const useMMKV = () => new MMKV();
const useMMKVString = () => [undefined, () => {}];
const useMMKVNumber = () => [undefined, () => {}];
const useMMKVBoolean = () => [undefined, () => {}];
const useMMKVObject = () => [undefined, () => {}];
const useMMKVBuffer = () => [undefined, () => {}];
const useMMKVListener = () => {};

module.exports = {
  MMKV,
  Mode: { SINGLE_PROCESS: 0, MULTI_PROCESS: 1 },
  useMMKV,
  useMMKVString,
  useMMKVNumber,
  useMMKVBoolean,
  useMMKVObject,
  useMMKVBuffer,
  useMMKVListener,
};
