/**
 * Google Drive API クエリ文字列のエスケープ処理
 * ファイル名やフォルダ名に含まれる単一引用符(')をエスケープする
 */
export function escapeDriveQuery(value: string): string {
  return value.replace(/'/g, "\\'");
}
