import { err, ok, type Result } from '~/kernel/result'
import { domainError, type DomainError } from '~/kernel/domain-error'

// PR-03: a PNG or JPG up to 2 MB, cropped to a square in the browser
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024
// The saved photo is this many pixels wide and high
export const AVATAR_SIZE = 256
export const ZOOM_MIN = 1
export const ZOOM_MAX = 3

// The extension and the MIME type must agree
const ALLOWED: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg' }

export interface AvatarCandidate {
  name: string
  mime: string
  size: number // bytes
}

const extensionOf = (name: string): string => {
  const dot = name.lastIndexOf('.')
  return dot < 0 ? '' : name.slice(dot + 1).toLowerCase()
}

// The reason codes are shown as errors.<reason>
export function checkAvatar(file: AvatarCandidate): Result<void, DomainError> {
  if (ALLOWED[extensionOf(file.name)] !== file.mime) return err(domainError('VALIDATION', 'AVATAR_TYPE_INVALID', 'avatar'))
  if (file.size > AVATAR_MAX_BYTES) return err(domainError('VALIDATION', 'AVATAR_TOO_LARGE', 'avatar'))
  return ok(undefined)
}

// What is saved: a small image as a data URL
const DATA_URL = /^data:image\/(png|jpeg);base64,[A-Za-z0-9+/]+=*$/
export const isAvatarData = (value: string): boolean => value.length <= AVATAR_MAX_BYTES && DATA_URL.test(value)

// Where the square sits on the picture. x and y go from -1 (far left, top) to 1 (far right, bottom).
// 0 is the middle. Zoom 1 shows as much of the picture as a square can, 3 shows a third of that.
export interface Crop {
  zoom: number
  x: number
  y: number
}

export const CENTERED: Crop = { zoom: 1, x: 0, y: 0 }

const clamp = (value: number, low: number, high: number): number => Math.min(high, Math.max(low, value))

export function clampCrop(crop: Crop): Crop {
  return { zoom: clamp(crop.zoom, ZOOM_MIN, ZOOM_MAX), x: clamp(crop.x, -1, 1), y: clamp(crop.y, -1, 1) }
}

// The square to cut out of a picture of width x height, in picture pixels
export function cropSquare(width: number, height: number, crop: Crop): { sx: number; sy: number; side: number } {
  const { zoom, x, y } = clampCrop(crop)
  const side = Math.min(width, height) / zoom
  return {
    side,
    sx: ((width - side) / 2) * (1 + x),
    sy: ((height - side) / 2) * (1 + y),
  }
}

// Dragging the picture by dx, dy pixels on a preview that is `previewPx` wide moves the square the other way
export function panCrop(width: number, height: number, crop: Crop, dx: number, dy: number, previewPx: number): Crop {
  const { side } = cropSquare(width, height, crop)
  const scale = previewPx / side // preview pixels for one picture pixel
  const freeX = (width - side) / 2
  const freeY = (height - side) / 2
  return clampCrop({
    zoom: crop.zoom,
    x: freeX > 0 ? crop.x - dx / scale / freeX : crop.x,
    y: freeY > 0 ? crop.y - dy / scale / freeY : crop.y,
  })
}
