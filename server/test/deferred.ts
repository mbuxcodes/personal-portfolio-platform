/** A promise that the test resolves by hand, so tests wait for events instead of time. */
export interface Deferred<T = void> {
  promise: Promise<T>;
  resolve: (value: T) => void;
}

export function createDeferred<T = void>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
