import { copy } from '../copy'
import type { CallSession, ContactChannel } from '../domain/types'

const timeFormatter = new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
const dateTimeFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})
const fullFormatter = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'medium' })

export function formatClock(iso: string): string {
  return timeFormatter.format(new Date(iso))
}

export function formatDateTime(iso: string): string {
  return dateTimeFormatter.format(new Date(iso))
}

export function formatFull(iso: string): string {
  return fullFormatter.format(new Date(iso))
}

export function durationSeconds(session: Pick<CallSession, 'startedAt' | 'endedAt'>, now = Date.now()): number {
  const start = Date.parse(session.startedAt)
  const end = session.endedAt ? Date.parse(session.endedAt) : now
  return Math.max(0, Math.round((end - start) / 1000))
}

export function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

/** Elapsed time since session start, mm:ss — used for transcript timestamps. */
export function formatOffset(startIso: string, atIso: string): string {
  return formatDuration(Math.max(0, Math.round((Date.parse(atIso) - Date.parse(startIso)) / 1000)))
}

export function formatChannel(channel: ContactChannel | null): string | null {
  return channel ? copy.channels[channel] : null
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`
}
