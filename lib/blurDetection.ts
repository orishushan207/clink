// Client-side blur detection using Laplacian variance on a canvas.
// Sharp images have high edge variance; blurry images have low variance.

const scoreCache = new Map<string, number>();

/**
 * Returns a "sharpness score" for the given image URL.
 * Higher = sharper. Values below BLUR_THRESHOLD are considered blurry.
 */
export async function getBlurScore(imageUrl: string): Promise<number> {
  if (scoreCache.has(imageUrl)) return scoreCache.get(imageUrl)!;

  try {
    // Fetch as blob first — avoids canvas CORS taint (SecurityError)
    const response = await fetch(imageUrl);
    if (!response.ok) { scoreCache.set(imageUrl, 999); return 999; }
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);

    const score = await computeLaplacianVariance(blobUrl);
    URL.revokeObjectURL(blobUrl);

    scoreCache.set(imageUrl, score);
    return score;
  } catch {
    scoreCache.set(imageUrl, 999);
    return 999;
  }
}

function computeLaplacianVariance(blobUrl: string): Promise<number> {
  return new Promise((resolve) => {
    const img = new window.Image();

    img.onload = () => {
      try {
        const SIZE = 150;
        const canvas = document.createElement("canvas");
        canvas.width = SIZE;
        canvas.height = SIZE;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) { resolve(999); return; }

        ctx.drawImage(img, 0, 0, SIZE, SIZE);
        const { data } = ctx.getImageData(0, 0, SIZE, SIZE);

        // Convert to grayscale
        const gray = new Float32Array(SIZE * SIZE);
        for (let i = 0; i < SIZE * SIZE; i++) {
          gray[i] =
            0.299 * data[i * 4] +
            0.587 * data[i * 4 + 1] +
            0.114 * data[i * 4 + 2];
        }

        // Laplacian kernel [0,1,0 / 1,-4,1 / 0,1,0]
        let sum = 0, sumSq = 0, n = 0;
        for (let y = 1; y < SIZE - 1; y++) {
          for (let x = 1; x < SIZE - 1; x++) {
            const v =
              gray[(y - 1) * SIZE + x] +
              gray[(y + 1) * SIZE + x] +
              gray[y * SIZE + x - 1] +
              gray[y * SIZE + x + 1] -
              4 * gray[y * SIZE + x];
            sum += v;
            sumSq += v * v;
            n++;
          }
        }

        const mean = sum / n;
        const variance = sumSq / n - mean * mean;
        resolve(variance);
      } catch {
        resolve(999);
      }
    };

    img.onerror = () => resolve(999);
    img.src = blobUrl;
  });
}

/** Images with a score below this are considered blurry (normal sensitivity) */
export const BLUR_THRESHOLD = 180;
