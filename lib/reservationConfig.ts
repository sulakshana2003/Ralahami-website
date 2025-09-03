// src/lib/reservationConfig.ts
export const SLOT_MINUTES = 30
export const OPEN_HOUR = 11    // 11:00
export const CLOSE_HOUR = 22   // 22:00 (last bookable slot starts at 21:30)
export const MAX_PARTY_SIZE = 12
export const MIN_PARTY_SIZE = 1

// total seats per slot (across all tables). Adjust per your restaurant.
export const CAPACITY_PER_SLOT = 24

// Optional blackout dates (yyyy-mm-dd) if needed later.
export const BLACKOUT_DATES = new Set<string>([])
