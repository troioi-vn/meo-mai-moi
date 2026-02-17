interface VaccinationCalendarEventInput {
  petId: number
  petName: string
  vaccinationId: number
  vaccineName: string
  dueAt: string
  notes?: string | null
}

const pad2 = (value: number): string => String(value).padStart(2, '0')

const formatUtcDateTime = (date: Date): string => {
  const year = String(date.getUTCFullYear())
  const month = pad2(date.getUTCMonth() + 1)
  const day = pad2(date.getUTCDate())
  const hours = pad2(date.getUTCHours())
  const minutes = pad2(date.getUTCMinutes())
  const seconds = pad2(date.getUTCSeconds())

  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`
}

const formatUtcDateOnly = (date: Date): string => {
  const year = String(date.getUTCFullYear())
  const month = pad2(date.getUTCMonth() + 1)
  const day = pad2(date.getUTCDate())

  return `${year}${month}${day}`
}

const parseDateOnly = (value: string): Date | null => {
  const datePart = value.split('T')[0]
  if (!datePart) return null

  if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return null

  const [yearText, monthText, dayText] = datePart.split('-')
  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)

  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null
  if (month < 1 || month > 12 || day < 1 || day > 31) return null

  const date = new Date(Date.UTC(year, month - 1, day))
  if (Number.isNaN(date.getTime())) return null
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() + 1 !== month ||
    date.getUTCDate() !== day
  ) {
    return null
  }

  return date
}

const addUtcDays = (date: Date, days: number): Date => {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

const escapeIcsText = (value: string): string =>
  value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')

const normalizeFilePart = (value: string): string => {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')

  return normalized || 'item'
}

export const createVaccinationReminderFilename = (input: {
  petName: string
  vaccineName: string
  dueAt: string
}): string => {
  const pet = normalizeFilePart(input.petName)
  const vaccine = normalizeFilePart(input.vaccineName)
  const due = normalizeFilePart(input.dueAt.split('T')[0] ?? input.dueAt)

  return `vaccination-reminder-${pet}-${vaccine}-${due}.ics`
}

export const buildVaccinationReminderIcs = (input: VaccinationCalendarEventInput): string => {
  const dueDate = parseDateOnly(input.dueAt)
  if (!dueDate) {
    throw new Error('Invalid due date')
  }

  const endDate = addUtcDays(dueDate, 1)
  const dtStamp = formatUtcDateTime(new Date())
  const dtStart = formatUtcDateOnly(dueDate)
  const dtEnd = formatUtcDateOnly(endDate)
  const dueDateText = input.dueAt.split('T')[0] ?? input.dueAt
  const summary = `${input.petName}: ${input.vaccineName} vaccination due`

  const descriptionLines = [
    `Pet: ${input.petName}`,
    `Vaccine: ${input.vaccineName}`,
    `Due date: ${dueDateText}`,
  ]

  if (input.notes?.trim()) {
    descriptionLines.push(`Notes: ${input.notes.trim()}`)
  }

  const description = descriptionLines.join('\n')
  const uid = `pet-${String(input.petId)}-vaccination-${String(input.vaccinationId)}-${dtStart}@meo-mai-moi`

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Meo Mai Moi//Vaccination Reminder//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART;VALUE=DATE:${dtStart}`,
    `DTEND;VALUE=DATE:${dtEnd}`,
    `SUMMARY:${escapeIcsText(summary)}`,
    `DESCRIPTION:${escapeIcsText(description)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ]

  return `${lines.join('\r\n')}\r\n`
}

export const isLikelyMobileDevice = (): boolean => {
  if (typeof navigator === 'undefined') return false
  return /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent)
}

type PresentIcsResult = 'shared' | 'opened' | 'downloaded' | 'cancelled'

export const presentIcsFile = async (
  icsContent: string,
  filename: string,
  options?: { preferOpen?: boolean }
): Promise<PresentIcsResult> => {
  const preferOpen = Boolean(options?.preferOpen)

  if (
    preferOpen &&
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function' &&
    typeof File !== 'undefined'
  ) {
    try {
      const file = new File([icsContent], filename, { type: 'text/calendar;charset=utf-8' })
      const sharePayload: ShareData = { files: [file], title: filename }

      const canShareFiles =
        typeof navigator.canShare !== 'function' || navigator.canShare({ files: [file] })

      if (canShareFiles) {
        await navigator.share(sharePayload)
        return 'shared'
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return 'cancelled'
      }
    }
  }

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')

  try {
    a.href = url

    if (preferOpen) {
      a.target = '_blank'
      a.rel = 'noopener noreferrer'
      a.click()
      return 'opened'
    }

    a.download = filename
    a.click()
    return 'downloaded'
  } finally {
    setTimeout(() => {
      URL.revokeObjectURL(url)
    }, 1000)
  }
}
