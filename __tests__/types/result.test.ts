import { describe, expect, it } from 'vitest';
import { err, ok } from '../../src/types/result';

describe('Result Type Tests', () => {
  describe('Ok', () => {
    it('should create an Ok instance', () => {
      const result = ok(10);
      expect(result.isOk()).toBe(true);
      expect(result.isErr()).toBe(false);
    });

    it('should unwrap the value', () => {
      const result = ok(10);
      expect(result.unwrap()).toBe(10);
    });

    it('should map the value', () => {
      const result = ok(10);
      const mapped = result.map((v) => v * 2);
      expect(mapped.unwrap()).toBe(20);
    });

    it('should not mapErr', () => {
      const result = ok<number, string>(10);
      const mapped = result.mapErr((e) => 'error: ' + e);
      expect(mapped.unwrap()).toBe(10);
    });

    it('should chain with andThen', () => {
      const result = ok(10);
      const chained = result.andThen((v) => ok(v * 2));
      expect(chained.unwrap()).toBe(20);
    });

    it('should match ok case', () => {
      const result = ok(10);
      const value = result.match({
        ok: (v) => v * 2,
        err: () => 0
      });
      expect(value).toBe(20);
    });

    it('should return value with unwrapOr', () => {
      const result = ok(10);
      expect(result.unwrapOr(5)).toBe(10);
    });

    it('should throw on unwrapErr', () => {
      const result = ok(10);
      expect(() => result.unwrapErr()).toThrow('Called unwrapErr on Ok');
    });
  });

  describe('Err', () => {
    it('should create an Err instance', () => {
      const result = err('error');
      expect(result.isOk()).toBe(false);
      expect(result.isErr()).toBe(true);
    });

    it('should throw when unwrapped', () => {
      const result = err('error');
      expect(() => result.unwrap()).toThrow('error');
    });

    it('should not map', () => {
      const result = err<number, string>('error');
      const mapped = result.map((v) => v * 2);
      expect(mapped.isErr()).toBe(true);
      mapped.match({
        ok: () => expect.fail('Should be Err'),
        err: (e) => expect(e).toBe('error')
      });
    });

    it('should mapErr', () => {
      const result = err<number, string>('error');
      const mapped = result.mapErr((e) => 'Fatal: ' + e);
      mapped.match({
        ok: () => expect.fail('Should be Err'),
        err: (e) => expect(e).toBe('Fatal: error')
      });
    });

    it('should not chain with andThen', () => {
      const result = err<number, string>('error');
      const chained = result.andThen((v) => ok(v * 2));
      expect(chained.isErr()).toBe(true);
    });

    it('should match err case', () => {
      const result = err('error');
      const value = result.match({
        ok: () => 0,
        err: (e) => e.length
      });
      expect(value).toBe(5);
    });

    it('should return default value with unwrapOr', () => {
      const result = err<number, string>('error');
      expect(result.unwrapOr(5)).toBe(5);
    });
  });
});
