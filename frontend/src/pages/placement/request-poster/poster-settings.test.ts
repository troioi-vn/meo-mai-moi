import { describe, expect, it } from 'vite-plus/test'
import { dragFocus, positiveId, posterSettings, writePosterSettings } from './poster-settings'

describe('poster URL settings', () => {
  it('bounds untrusted URL values', () => {
    expect(
      posterSettings(
        new URLSearchParams('photo=9007199254740992&focus=-4,110&lang=no&paper=huge&tabs=yes'),
        'ru'
      )
    ).toEqual({ photo: null, focus: [0, 100], lang: 'en', paper: 'a4', tabs: false })
    expect(positiveId('0')).toBeNull()
    expect(positiveId('27abc')).toBeNull()
    expect(posterSettings(new URLSearchParams('focus=NaN,2'), 'vi').focus).toEqual([50, 50])
  })
  it('round-trips all settings while retaining unrelated parameters', () => {
    const settings = {
      photo: 38,
      focus: [23, 74] as [number, number],
      lang: 'uk' as const,
      paper: 'letter' as const,
      tabs: true,
    }
    const params = writePosterSettings(new URLSearchParams('other=keep'), settings)
    expect(posterSettings(params, 'ru')).toEqual(settings)
    expect(params.get('other')).toBe('keep')
  })
  it('uses image overflow for dragging and leaves an axis with no crop unchanged', () => {
    expect(dragFocus([50, 50], [0, 25], [300, 200], [300, 400])).toEqual([50, 37.5])
    expect(dragFocus([50, 50], [90, 0], [300, 200], [300, 400])).toEqual([50, 50])
    expect(dragFocus([50, 50], [0, 2000], [300, 200], [300, 400])).toEqual([50, 0])
  })
})
