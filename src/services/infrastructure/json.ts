/**
 * JSON文字列を安全にパースする。
 * 形式不正時は例外を投げず null を返す。
 */
export function safeJsonParse<T>(json: string): T | null {
  try {
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}
