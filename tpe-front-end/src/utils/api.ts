// API utility for handling API calls in production
export function getApiUrl(path: string): string {
  // Remove leading slash if present
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  
  // In production, use the full URL
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    return `${window.location.origin}/${cleanPath}`;
  }
  
  // In development, use relative URL
  return `/${cleanPath}`;
}
