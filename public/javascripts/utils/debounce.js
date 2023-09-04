export default (cb, delay) => {
  let timeout;
  return (...args) => {
    if (timeout) { clearTimeout(timeout) };
    timeout = setTimeout(() => cb.apply(null, args), delay);
  }
}