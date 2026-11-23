import { describe, expect, it } from 'vitest'
import { formatBytes, formatDuration, initials, timeAgo } from './format'

describe('formatDuration', () => {
  it('formats minutes, hours and days', () => {
    expect(formatDuration(45)).toBe('45 min')
    expect(formatDuration(120)).toBe('2 h')
    expect(formatDuration(135)).toBe('2 h 15 min')
    expect(formatDuration(3000)).toBe('2 d 2 h')
  })
  it('handles missing values', () => {
    expect(formatDuration(null)).toBe('-')
  })
})

describe('timeAgo', () => {
  const now = new Date('2026-03-10T12:00:00Z').getTime()
  it('uses the largest sensible unit', () => {
    expect(timeAgo('2026-03-10T11:59:40Z', now)).toBe('just now')
    expect(timeAgo('2026-03-10T11:30:00Z', now)).toBe('30 min ago')
    expect(timeAgo('2026-03-10T07:00:00Z', now)).toBe('5 h ago')
    expect(timeAgo('2026-03-07T12:00:00Z', now)).toBe('3 d ago')
  })
})

describe('misc helpers', () => {
  it('formats bytes', () => {
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(2048)).toBe('2.0 KB')
  })
  it('builds initials', () => {
    expect(initials('Naledi Khumalo')).toBe('NK')
    expect(initials('  prince ')).toBe('P')
  })
})
