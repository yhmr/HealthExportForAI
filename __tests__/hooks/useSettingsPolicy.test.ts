import { describe, expect, it } from 'vitest';
import { shouldRequestNotificationPermission } from '../../src/hooks/useSettingsPolicy';

describe('useSettingsPolicy', () => {
  it('requires notification permission on Android', () => {
    expect(shouldRequestNotificationPermission('android')).toBe(true);
  });

  it('does not require notification permission on iOS', () => {
    expect(shouldRequestNotificationPermission('ios')).toBe(false);
  });
});
