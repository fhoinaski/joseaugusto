/**
 * @deprecated All Cloudinary SDK calls have been removed.
 * Types are now in lib/db.ts. This file is kept only to avoid breaking
 * any remaining imports that haven't been updated yet.
 */

// Re-export from the canonical location so existing imports still compile
export type { MediaItem, CapsuleItem } from './db'
export { DEFAULT_PARENTS_MSG as DEFAULT_MSG } from './db'
