export const SMALL_FILE_MAX_BYTES = 64 * 1024;
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

export function formatFileSize(bytes?: number): string {
  if (bytes === undefined) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
