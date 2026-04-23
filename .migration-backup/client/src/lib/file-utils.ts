export function toProxyUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  
  const match = url.match(/r2\.dev\/(.+)$/);
  if (match) {
    return `/api/files/${match[1]}`;
  }
  
  return url;
}
