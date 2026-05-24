/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Applies adjustments: Brightness, Black Point/Shadows, White Point/Highlights, Saturation, Warmth, Tint, Contrast
export function applyImageFilters(
  srcData: ImageData,
  destData: ImageData,
  brightness: number,      // -100 to 100
  shadows: number,         // -50 to 50
  highlights: number,      // -50 to 50
  saturation: number,      // 0.0 to 3.0
  warmth: number,          // -50 to 50
  tint: number,            // -50 to 50
  contrast: number         // 0.5 to 2.0
) {
  const src = srcData.data;
  const dest = destData.data;
  const len = src.length;

  // Initialize Gamma Look-up Table (LUT) for Shadows & Highlights
  const lut = new Uint8Array(256);
  const gamma = 1.0 - (shadows / 100.0) + (highlights / 100.0);
  const clampedGamma = Math.max(0.1, Math.min(gamma, 3.0));
  const invGamma = 1.0 / clampedGamma;
  for (let i = 0; i < 256; i++) {
    lut[i] = Math.min(255, Math.max(0, Math.round(Math.pow(i / 255.0, invGamma) * 255)));
  }

  for (let i = 0; i < len; i += 4) {
    let r = src[i];
    let g = src[i + 1];
    let b = src[i + 2];
    const a = src[i + 3];

    // 1. Contrast Adjustment (around midtone 128)
    r = (r - 128) * contrast + 128;
    g = (g - 128) * contrast + 128;
    b = (b - 128) * contrast + 128;

    // 2. Brightness Adjustment
    r += brightness;
    g += brightness;
    b += brightness;

    // Clamp after Contrast & Brightness
    r = Math.max(0, Math.min(255, r));
    g = Math.max(0, Math.min(255, g));
    b = Math.max(0, Math.min(255, b));

    // 3. Shadows & Highlights LUT
    r = lut[Math.round(r)];
    g = lut[Math.round(g)];
    b = lut[Math.round(b)];

    // 4. Luma Saturation
    // standard Rec. 601 luma coefficients
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    r = gray + (r - gray) * saturation;
    g = gray + (g - gray) * saturation;
    b = gray + (b - gray) * saturation;

    // 5. Warmth & Tint Adjustments
    r += warmth;
    b -= warmth;
    g += tint;

    // Final Clamping
    dest[i] = Math.max(0, Math.min(255, Math.round(r)));
    dest[i + 1] = Math.max(0, Math.min(255, Math.round(g)));
    dest[i + 2] = Math.max(0, Math.min(255, Math.round(b)));
    dest[i + 3] = a; // keep alpha integrity
  }
}
