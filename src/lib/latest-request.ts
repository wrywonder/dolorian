/** Prevent a slow response from replacing newer state, including after leaving a screen. */
export function createLatestRequest() {
  let revision = 0;
  return {
    begin() {
      const current = ++revision;
      return () => current === revision;
    },
    invalidate() { revision += 1; },
  };
}
