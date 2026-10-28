// Runtime APIs that Angular uses but the oldest phones in .browserslistrc lack. esbuild lowers
// JavaScript syntax for those browsers, but it does not add missing functions. Without these the
// app stays blank on them. The `oldest-supported-browser` e2e project checks this list.

// Object.hasOwn: iOS 15.4+, Chrome 93+.
if (typeof Object.hasOwn !== 'function') {
  Object.defineProperty(Object, 'hasOwn', {
    value: (object: object, key: PropertyKey) => Object.prototype.hasOwnProperty.call(object, key),
    configurable: true,
    writable: true,
  });
}
