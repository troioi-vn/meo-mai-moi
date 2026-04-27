import { describe, expect, it } from 'vite-plus/test'
import {
  buildVaccinationReminderIcs,
  createVaccinationReminderFilename,
  isLikelyMobileDevice,
} from './vaccinationCalendar'

describe('vaccinationCalendar', () => {
  it('builds valid all-day vaccination ICS content', () => {
    const ics = buildVaccinationReminderIcs({
      petId: 7,
      petName: 'Milo',
      vaccinationId: 11,
      vaccineName: 'Rabies',
      dueAt: '2026-03-15',
      notes: 'Bring booklet',
    })

    expect(ics).toContain('BEGIN:VCALENDAR')
    expect(ics).toContain('BEGIN:VEVENT')
    expect(ics).toContain('UID:pet-7-vaccination-11-20260315@meo-mai-moi')
    expect(ics).toMatch(/DTSTAMP:\d{8}T\d{6}Z/)
    expect(ics).toContain('DTSTART;VALUE=DATE:20260315')
    expect(ics).toContain('DTEND;VALUE=DATE:20260316')
    expect(ics).toContain('SUMMARY:Milo: Rabies vaccination due')
    expect(ics).toContain(
      'DESCRIPTION:Pet: Milo\\nVaccine: Rabies\\nDue date: 2026-03-15\\nNotes: Bring booklet'
    )
    expect(ics).toContain('END:VEVENT')
    expect(ics).toContain('END:VCALENDAR')
  })

  it('throws when due date is invalid', () => {
    expect(() => {
      buildVaccinationReminderIcs({
        petId: 7,
        petName: 'Milo',
        vaccinationId: 11,
        vaccineName: 'Rabies',
        dueAt: 'invalid-date',
      })
    }).toThrow('Invalid due date')
  })

  it('throws when due date is impossible on calendar', () => {
    expect(() => {
      buildVaccinationReminderIcs({
        petId: 7,
        petName: 'Milo',
        vaccinationId: 11,
        vaccineName: 'Rabies',
        dueAt: '2026-02-31',
      })
    }).toThrow('Invalid due date')
  })

  it('creates normalized filename', () => {
    const filename = createVaccinationReminderFilename({
      petName: 'Milo the Cat',
      vaccineName: 'Rabies #1',
      dueAt: '2026-03-15',
    })

    expect(filename).toBe('vaccination-reminder-milo-the-cat-rabies-1-2026-03-15.ics')
  })

  it('returns false for mobile detection when navigator is unavailable', () => {
    expect(isLikelyMobileDevice()).toBeTypeOf('boolean')
  })
})
