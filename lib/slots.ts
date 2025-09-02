import { addMinutes, format, setHours, setMinutes } from 'date-fns'
import { SLOT_MINUTES, OPEN_HOUR, CLOSE_HOUR } from '@/lib/reservationConfig'

export function generateSlotsForDate(dateStr: string) {
  // dateStr: yyyy-mm-dd in local timezone
  const [y, m, d] = dateStr.split('-').map(Number)
  let t = new Date(y, (m - 1), d, OPEN_HOUR, 0, 0, 0)
  const end = new Date(y, (m - 1), d, CLOSE_HOUR, 0, 0, 0)

  const out: string[] = []
  while (t < end) {
    out.push(format(t, 'HH:mm'))
    t = addMinutes(t, SLOT_MINUTES)
  }
  return out
}

// Round time string to slot
export function normalizeSlot(time: string) {
  const [hh, mm] = time.split(':').map(Number)
  const m = Math.floor(mm / SLOT_MINUTES) * SLOT_MINUTES
  const dt = setMinutes(setHours(new Date(2000, 0, 1), hh), m)
  return format(dt, 'HH:mm')
}
