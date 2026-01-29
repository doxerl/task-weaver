/**
 * Sanitizes a file name by replacing Turkish characters with Latin equivalents
 * and removing/replacing special characters that are not allowed in storage paths.
 * 
 * @param fileName - The original file name
 * @returns A sanitized file name safe for storage paths
 */
export function sanitizeFileName(fileName: string): string {
  const turkishMap: Record<string, string> = {
    'ç': 'c', 'Ç': 'C',
    'ğ': 'g', 'Ğ': 'G',
    'ı': 'i', 'İ': 'I',
    'ö': 'o', 'Ö': 'O',
    'ş': 's', 'Ş': 'S',
    'ü': 'u', 'Ü': 'U',
  };
  
  let sanitized = fileName;
  
  // Replace Turkish characters with Latin equivalents
  for (const [turkish, latin] of Object.entries(turkishMap)) {
    sanitized = sanitized.split(turkish).join(latin);
  }
  
  // Replace spaces with underscores and remove invalid characters
  return sanitized
    .replace(/\s+/g, '_')           // Spaces -> underscores
    .replace(/[^a-zA-Z0-9._-]/g, ''); // Remove invalid characters
}
