export const value = iter => iter.next().value;

export function* skip(iter, count) {
  let result;
  for (let idx = 0; idx < count; idx++) {
    result = iter.next();
    if (result.done) {
      break;
    }
  }
  while (!result.done) {
    yield result.value;
    result = iter.next();
  }
}

export function* take(iter, count) {
  for (let idx = 0; idx < count; idx++) {
    const result = iter.next();
    if (result.done) {
      break;
    }
    yield result.value;
  }
}

export function* filter(iterable, predicate) {
  for (const value of iterable) {
    if (predicate(value)) {
      yield value;
    }
  }
}

export function* map(iter, transform) {
  for (const item of iter) {
    yield transform(item);
  }
}

export function* range(min, max) {
  for (let i = min; i <= max; i++) {
    yield i;
  }
}

export function forEach(iterable, callback) {
  for (const value of iterable) {
    callback(value);
  }
}

export function* concat(iterables) {
  for (const iterable of iterables) {
    yield* iterable;
  }
}

export function* limitIterations(iterable, maxIterations) {
  let iterations = 0;
  for (const value of iterable) {
    console.log("ITERATION", iterations);
    if (++iterations >= maxIterations) {
      throw new TooManyIterationsError(iterations);
    }
    yield value;
  }
}

export class TooManyIterationsError extends Error {
  constructor(count) {
    super(`too many iterations; count = ${count}`);
  }
}