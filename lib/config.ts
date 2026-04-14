// ── App-wide shared constants ─────────────────────────────────────────────────
// Single source of truth for values used in multiple components / routes.

/** Reaction emojis shown in Feed, Reels, and Gallery */
export const REACTION_EMOJIS = ['♥', '😍', '🎉', '👶', '😂', '👏'] as const
export type ReactionEmoji = typeof REACTION_EMOJIS[number]

/** Baby event details (used in landing + admin fallbacks) */
export const EVENT_NAME  = 'Jose Augusto'
export const EVENT_DATE  = '25 de Abril · 2026'
export const EVENT_TIME  = 'Sabado, as 17 horas'
