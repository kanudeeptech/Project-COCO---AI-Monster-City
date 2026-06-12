/** Iso projection constants & helpers. Ground diamonds are TILE_W × TILE_H. */
export const TILE_W = 100;
export const TILE_H = 50;

/** grid (c,r) → screen position of the tile's diamond CENTER */
export function isoX(c: number, r: number): number {
  return ((c - r) * TILE_W) / 2;
}
export function isoY(c: number, r: number): number {
  return ((c + r) * TILE_H) / 2;
}
/** depth-sort key */
export function isoDepth(c: number, r: number): number {
  return c + r;
}
