export function shouldRequestNotificationPermission(platformOS: string): boolean {
  return platformOS === 'android';
}
