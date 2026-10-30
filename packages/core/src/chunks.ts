/**
 * Figma limits one plugin-data entry (namespace + key + value) to 100 kB, so
 * large values are stored as numbered chunks. Size is counted in UTF-16
 * characters; 24 000 stays under the limit even if every character takes
 * 4 bytes.
 */
export const CHUNK_SIZE = 24_000;

export function splitChunks(value: string, size = CHUNK_SIZE): string[] {
  if (value.length === 0) return [''];
  const chunks: string[] = [];
  for (let i = 0; i < value.length; i += size) {
    chunks.push(value.slice(i, i + size));
  }
  return chunks;
}
