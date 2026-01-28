/**
 * Result型定義
 * 成功(Ok)または失敗(Err)を表す直和型
 */
export type Result<T, E> = Ok<T, E> | Err<T, E>;

/**
 * 成功を表すクラス
 */
export class Ok<T, E> {
  constructor(readonly value: T) {}

  isOk(): this is Ok<T, E> {
    return true;
  }

  isErr(): this is Err<T, E> {
    return false;
  }

  unwrap(): T {
    return this.value;
  }

  unwrapErr(): E {
    throw new Error('Called unwrapErr on Ok');
  }

  unwrapOr(_defaultValue: T): T {
    return this.value;
  }

  map<U>(fn: (value: T) => U): Result<U, E> {
    return new Ok(fn(this.value));
  }

  mapErr<F>(_fn: (error: E) => F): Result<T, F> {
    return new Ok(this.value);
  }

  andThen<U>(fn: (value: T) => Result<U, E>): Result<U, E> {
    return fn(this.value);
  }

  match<U>(obj: { ok: (value: T) => U; err: (error: E) => U }): U {
    return obj.ok(this.value);
  }
}

/**
 * 失敗を表すクラス
 */
export class Err<T, E> {
  constructor(readonly error: E) {}

  isOk(): this is Ok<T, E> {
    return false;
  }

  isErr(): this is Err<T, E> {
    return true;
  }

  unwrap(): T {
    throw this.error;
  }

  unwrapErr(): E {
    return this.error;
  }

  unwrapOr(defaultValue: T): T {
    return defaultValue;
  }

  map<U>(_fn: (value: T) => U): Result<U, E> {
    return new Err(this.error);
  }

  mapErr<F>(fn: (error: E) => F): Result<T, F> {
    return new Err(fn(this.error));
  }

  andThen<U>(_fn: (value: T) => Result<U, E>): Result<U, E> {
    return new Err(this.error);
  }

  match<U>(obj: { ok: (value: T) => U; err: (error: E) => U }): U {
    return obj.err(this.error);
  }
}

/**
 * 成功Resultを生成するヘルパー関数
 */
export const ok = <T, E = never>(value: T): Result<T, E> => new Ok(value);

/**
 * 失敗Resultを生成するヘルパー関数
 */
export const err = <T = never, E = unknown>(error: E): Result<T, E> => new Err(error);
