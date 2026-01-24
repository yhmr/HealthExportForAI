import { ThemeColors } from './types';

export const darkColors: ThemeColors = {
  background: '#0f0f1a',
  surface: '#1a1a2e',
  surfaceHighlight: '#161622',
  surfaceVariant: '#2e2e3e',
  primary: '#6366f1',
  primaryLight: '#6366f120', // Opacity 20%
  text: '#ffffff',
  textSecondary: '#9ca3af',
  textTertiary: '#6b7280',
  border: '#3e3e4e',
  error: '#f87171',
  info: '#60a5fa',
  debugButton: '#2e2e3e',
  destructiveButton: '#451a1a',

  // Specifics matching existing logic
  headerBackground: '#1a1a2e',
  cardBackground: '#161622',
  switchTrackFalse: '#3e3e4e',
  switchTrackTrue: '#6366f180'
};

export const lightColors: ThemeColors = {
  background: '#f3f4f6', // Gray 100
  surface: '#ffffff',
  surfaceHighlight: '#f9fafb', // Gray 50
  surfaceVariant: '#e5e7eb', // Gray 200
  primary: '#4f46e5', // Indigo 600
  primaryLight: '#4f46e520',
  text: '#111827', // Gray 900
  textSecondary: '#4b5563', // Gray 600
  textTertiary: '#6b7280', // Gray 500
  border: '#d1d5db', // Gray 300
  error: '#ef4444', // Red 500
  info: '#3b82f6', // Blue 500
  debugButton: '#e5e7eb',
  destructiveButton: '#fee2e2', // Red 100

  headerBackground: '#ffffff',
  cardBackground: '#ffffff',
  switchTrackFalse: '#d1d5db',
  switchTrackTrue: '#4f46e580'
};
