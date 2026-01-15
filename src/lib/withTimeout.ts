/**
 * Wraps a promise with a timeout. If the promise doesn't resolve/reject
 * within the specified time, it rejects with a timeout error.
 * 
 * Note: This doesn't actually cancel the underlying promise, just prevents
 * waiting indefinitely for it.
 */
export function withTimeout<T>(
  promiseFactory: () => Promise<T>,
  timeoutMs: number,
  label: string = 'Operation'
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    promiseFactory()
      .then((result) => {
        clearTimeout(timeoutId);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}

/**
 * Default timeout for auth/bootstrap operations (15 seconds)
 */
export const BOOTSTRAP_TIMEOUT_MS = 15000;
