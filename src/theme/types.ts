export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceHighlight: string;
  surfaceVariant: string;
  primary: string;
  primaryLight: string; // Faded or lighter version for backgrounds
  text: string;
  textSecondary: string;
  textTertiary: string;
  border: string;
  error: string;
  info: string;
  debugButton: string;
  destructiveButton: string;

  // Specific UI elements
  headerBackground: string;
  cardBackground: string;
  switchTrackFalse: string;
  switchTrackTrue: string;
}
