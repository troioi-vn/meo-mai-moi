export const MEDIA_LIMITS = {
  avatar: { maxBytes: 2 * 1024 * 1024 },
  petPhoto: { maxBytes: 10 * 1024 * 1024 },
  helperPhoto: { maxBytes: 10 * 1024 * 1024, maxFiles: 5 },
  medicalPhoto: { maxBytes: 10 * 1024 * 1024 },
  vaccinationPhoto: { maxBytes: 10 * 1024 * 1024 },
  chatImage: { maxBytes: 5 * 1024 * 1024 },
} as const

export const ACCEPTED_IMAGE_MIME = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
] as const

type ValidationErrorKey =
  | 'media:validation.notImage'
  | 'media:validation.tooLarge'
  | 'media:validation.tooMany'

export type ValidationResult =
  | { ok: true }
  | { ok: false; errorKey: ValidationErrorKey; params?: Record<string, number> }

export const bytesToMegabytes = (bytes: number) => Math.round(bytes / 1024 / 1024)

export const isAcceptedImageFile = (file: File) =>
  ACCEPTED_IMAGE_MIME.includes(file.type as (typeof ACCEPTED_IMAGE_MIME)[number])

export function validateImageFile(file: File, opts: { maxBytes: number }): ValidationResult {
  if (!isAcceptedImageFile(file)) {
    return { ok: false, errorKey: 'media:validation.notImage' }
  }

  if (file.size > opts.maxBytes) {
    return {
      ok: false,
      errorKey: 'media:validation.tooLarge',
      params: { size: bytesToMegabytes(opts.maxBytes) },
    }
  }

  return { ok: true }
}

export function validateImageFiles(
  files: File[],
  opts: { maxBytes: number; maxFiles?: number }
): ValidationResult {
  if (opts.maxFiles !== undefined && files.length > opts.maxFiles) {
    return { ok: false, errorKey: 'media:validation.tooMany', params: { count: opts.maxFiles } }
  }

  for (const file of files) {
    const result = validateImageFile(file, opts)
    if (!result.ok) return result
  }

  return { ok: true }
}
