export const IOS_BACKGROUND_FETCH_INTERVAL_MINUTES = 15;

/**
 * バックグラウンドフェッチ間隔の実効値を決定する。
 * iOSはOS主導で実行タイミングが決まるため、アプリ側は固定の最小値で登録する。
 */
export function resolveBackgroundFetchIntervalMinutes(
  platformOS: string,
  requestedIntervalMinutes: number
): number {
  return platformOS === 'ios' ? IOS_BACKGROUND_FETCH_INTERVAL_MINUTES : requestedIntervalMinutes;
}
