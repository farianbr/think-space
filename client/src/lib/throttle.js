export function throttle(fn, wait = 100) {
  let last = 0;
  let timeout = null;
  let lastArgs = null;

  return function (...args) {
    const now = Date.now();
    const remaining = wait - (now - last);
    lastArgs = args;
    if (remaining <= 0) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      last = now;
      fn.apply(this, args);
    } else if (!timeout) {
      timeout = setTimeout(() => {
        timeout = null;
        last = Date.now();
        fn.apply(this, lastArgs);
      }, remaining);
    }
  };
}
