import { describe, expect, it } from 'vitest';
import {
  IOS_BACKGROUND_FETCH_INTERVAL_MINUTES,
  resolveBackgroundFetchIntervalMinutes
} from '../../../src/services/background/intervalPolicy';

describe('intervalPolicy', () => {
  it('uses fixed minimum interval on iOS', () => {
    expect(resolveBackgroundFetchIntervalMinutes('ios', 1440)).toBe(
      IOS_BACKGROUND_FETCH_INTERVAL_MINUTES
    );
  });

  it('keeps requested interval on Android', () => {
    expect(resolveBackgroundFetchIntervalMinutes('android', 1440)).toBe(1440);
  });

  it('keeps requested interval on unknown platforms', () => {
    expect(resolveBackgroundFetchIntervalMinutes('web', 720)).toBe(720);
  });
});
