import { imageFileError } from './listings.js';

// Each attempt is smaller than the last, stopping once the photo fits the budget for localStorage.
const ATTEMPTS = [[900, 0.72], [900, 0.55], [700, 0.55], [500, 0.5]];
const MAX_CHARS = 200_000;

function encode(image, maxEdge, quality) {
  const scale = Math.min(1, maxEdge / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext('2d');
  context.fillStyle = '#fff'; // Transparent PNG areas would otherwise turn black in a JPEG.
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', quality);
}

// Shrinks a chosen image to a JPEG data URL small enough to keep in localStorage.
export function compressImage(file) {
  return new Promise((resolve, reject) => {
    const problem = imageFileError(file);
    if (problem) {
      reject(new Error(problem));
      return;
    }
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      let result = '';
      for (const [maxEdge, quality] of ATTEMPTS) {
        result = encode(image, maxEdge, quality);
        if (result.length <= MAX_CHARS) break;
      }
      resolve(result);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`"${file.name}" could not be read as an image. It may be damaged.`));
    };
    image.src = url;
  });
}
