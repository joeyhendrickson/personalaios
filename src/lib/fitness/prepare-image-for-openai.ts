import 'server-only'

import sharp from 'sharp'
import { toFile } from 'openai'
import type { Uploadable } from 'openai/uploads'

const MAX_EDGE_PX = 2048

/**
 * Normalize any supported body photo into an 8-bit sRGB PNG for OpenAI images.edit.
 * Fixes CMYK JPEGs, HEIC/WEBP from phones, EXIF orientation, and mismatched MIME types.
 */
export async function prepareImageForOpenAiEdit(input: Buffer): Promise<Buffer> {
  return sharp(input, { failOn: 'none' })
    .rotate()
    .resize({
      width: MAX_EDGE_PX,
      height: MAX_EDGE_PX,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .toColorspace('srgb')
    .png({ compressionLevel: 6, force: true })
    .toBuffer()
}

export async function toOpenAiImageFile(
  input: Buffer,
  filename = 'reference.png'
): Promise<Uploadable> {
  const png = await prepareImageForOpenAiEdit(input)
  return toFile(png, filename, { type: 'image/png' })
}
