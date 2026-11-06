import { describe, expect, it } from 'vitest'
import { AVATAR_MAX_BYTES, CENTERED, checkAvatar, clampCrop, cropSquare, isAvatarData, panCrop } from './avatar'

const ok = { name: 'me.png', mime: 'image/png', size: 1000 }

describe('checkAvatar', () => {
  it('accepts a PNG or a JPG', () => {
    expect(checkAvatar(ok).ok).toBe(true)
    expect(checkAvatar({ name: 'me.JPG', mime: 'image/jpeg', size: 1000 }).ok).toBe(true)
    expect(checkAvatar({ name: 'me.jpeg', mime: 'image/jpeg', size: 1000 }).ok).toBe(true)
  })

  it('refuses other types, and a name that does not match the type', () => {
    for (const file of [
      { name: 'me.gif', mime: 'image/gif', size: 10 },
      { name: 'me.webp', mime: 'image/webp', size: 10 },
      { name: 'me.png', mime: 'image/jpeg', size: 10 },
      { name: 'me', mime: 'image/png', size: 10 },
    ]) {
      const result = checkAvatar(file)
      expect(!result.ok && result.error).toEqual({ code: 'VALIDATION', reason: 'AVATAR_TYPE_INVALID', field: 'avatar' })
    }
  })

  it('accepts exactly 2 MB and refuses more', () => {
    expect(checkAvatar({ ...ok, size: AVATAR_MAX_BYTES }).ok).toBe(true)
    const result = checkAvatar({ ...ok, size: AVATAR_MAX_BYTES + 1 })
    expect(!result.ok && result.error.reason).toBe('AVATAR_TOO_LARGE')
  })
})

describe('isAvatarData', () => {
  it('accepts a PNG or JPEG data URL and nothing else', () => {
    expect(isAvatarData('data:image/png;base64,iVBORw0KGgo=')).toBe(true)
    expect(isAvatarData('data:image/jpeg;base64,/9j/4AAQ')).toBe(true)
    expect(isAvatarData('data:image/gif;base64,R0lGOD')).toBe(false)
    expect(isAvatarData('https://example.com/me.png')).toBe(false)
    expect(isAvatarData('data:text/html;base64,PGgxPg==')).toBe(false)
  })
})

describe('cropSquare', () => {
  it('takes the biggest centred square at zoom 1', () => {
    expect(cropSquare(400, 200, CENTERED)).toEqual({ sx: 100, sy: 0, side: 200 })
    expect(cropSquare(200, 400, CENTERED)).toEqual({ sx: 0, sy: 100, side: 200 })
    expect(cropSquare(300, 300, CENTERED)).toEqual({ sx: 0, sy: 0, side: 300 })
  })

  it('zooms in on the middle', () => {
    expect(cropSquare(400, 200, { zoom: 2, x: 0, y: 0 })).toEqual({ sx: 150, sy: 50, side: 100 })
  })

  it('moves to the edges', () => {
    expect(cropSquare(400, 200, { zoom: 1, x: -1, y: 0 }).sx).toBe(0)
    expect(cropSquare(400, 200, { zoom: 1, x: 1, y: 0 }).sx).toBe(200)
  })

  it('never leaves the picture, even with silly numbers', () => {
    const { sx, sy, side } = cropSquare(400, 200, { zoom: 9, x: 5, y: -5 })
    expect(side).toBeCloseTo(200 / 3)
    expect(sx + side).toBeLessThanOrEqual(400.0001)
    expect(sy).toBeGreaterThanOrEqual(0)
  })
})

describe('clampCrop', () => {
  it('keeps zoom between 1 and 3 and the position between -1 and 1', () => {
    expect(clampCrop({ zoom: 0, x: 2, y: -2 })).toEqual({ zoom: 1, x: 1, y: -1 })
    expect(clampCrop({ zoom: 7, x: 0, y: 0 }).zoom).toBe(3)
  })
})

describe('panCrop', () => {
  it('moves the square the other way to the drag', () => {
    // a 400 x 200 picture shown 200 px wide: one preview pixel is one picture pixel
    const moved = panCrop(400, 200, CENTERED, -50, 0, 200)
    expect(moved.x).toBeCloseTo(0.5) // dragged left, the square moves right: sx 100 -> 150
    expect(cropSquare(400, 200, moved).sx).toBeCloseTo(150)
  })

  it('does not move across the side that has no room', () => {
    expect(panCrop(400, 200, CENTERED, 0, 80, 200).y).toBe(0)
  })

  it('stops at the edge of the picture', () => {
    expect(panCrop(400, 200, CENTERED, 5000, 0, 200).x).toBe(-1)
  })
})
