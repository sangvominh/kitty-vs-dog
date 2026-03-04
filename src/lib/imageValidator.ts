/**
 * Image validation utilities for custom sprite uploads.
 * Validates file type, size, and decodability before storage.
 */

const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'] as const;
const MAX_FILE_SIZE = 5_242_880; // 5MB

export type ImageErrorCode = 'INVALID_TYPE' | 'FILE_TOO_LARGE' | 'EMPTY_FILE';

export interface ValidationResult {
  valid: boolean;
  error?: string;
  errorCode?: ImageErrorCode;
}

export interface ImageDimensions {
  width: number;
  height: number;
}

/**
 * Synchronous validation of file metadata before upload.
 */
export function validateImageFile(file: File): ValidationResult {
  if (file.size === 0) {
    return { valid: false, error: 'File is empty', errorCode: 'EMPTY_FILE' };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum is 5MB.`,
      errorCode: 'FILE_TOO_LARGE',
    };
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type as (typeof ALLOWED_MIME_TYPES)[number])) {
    return {
      valid: false,
      error: `Invalid file type "${file.type}". Allowed: PNG, JPG, WebP, GIF.`,
      errorCode: 'INVALID_TYPE',
    };
  }

  return { valid: true };
}

/**
 * Async validation — actually load the image to verify it's a valid, decodable image.
 * Returns image dimensions on success.
 */
export function decodeImageDimensions(file: File): Promise<ImageDimensions> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      const dims: ImageDimensions = {
        width: img.naturalWidth,
        height: img.naturalHeight,
      };
      URL.revokeObjectURL(url);

      if (dims.width === 0 || dims.height === 0) {
        reject(new Error('Image has zero dimensions'));
        return;
      }

      resolve(dims);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to decode image — file may be corrupted'));
    };

    img.src = url;
  });
}
