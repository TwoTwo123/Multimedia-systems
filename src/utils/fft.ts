/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// 1D Cooley-Tukey Radix-2 FFT
function bitReverse(n: number, bits: number): number {
  let reversed = 0;
  for (let i = 0; i < bits; i++) {
    if ((n & (1 << i)) !== 0) {
      reversed |= (1 << (bits - 1 - i));
    }
  }
  return reversed;
}

export function fft1D(re: Float32Array, im: Float32Array, inverse: boolean) {
  const n = re.length;
  const bits = Math.round(Math.log2(n));

  // Bit-reversal permutation
  for (let i = 0; i < n; i++) {
    const rev = bitReverse(i, bits);
    if (i < rev) {
      const tempRe = re[i];
      re[i] = re[rev];
      re[rev] = tempRe;

      const tempIm = im[i];
      im[i] = im[rev];
      im[rev] = tempIm;
    }
  }

  // Cooley-Tukey decimation-in-time
  for (let len = 2; len <= n; len <<= 1) {
    const angle = (2 * Math.PI / len) * (inverse ? 1 : -1);
    const wlenRe = Math.cos(angle);
    const wlenIm = Math.sin(angle);

    for (let i = 0; i < n; i += len) {
      let wRe = 1.0;
      let wIm = 0.0;
      const halfLen = len >> 1;
      for (let j = 0; j < halfLen; j++) {
        const uRe = re[i + j];
        const uIm = im[i + j];

        const vRe = re[i + j + halfLen];
        const vIm = im[i + j + halfLen];

        // Complex multiplication: t = v * w
        const tRe = vRe * wRe - vIm * wIm;
        const tIm = vRe * wIm + vIm * wRe;

        re[i + j] = uRe + tRe;
        im[i + j] = uIm + tIm;
        re[i + j + halfLen] = uRe - tRe;
        im[i + j + halfLen] = uIm - tIm;

        // w = w * wlen
        const nextWRe = wRe * wlenRe - wIm * wlenIm;
        wIm = wRe * wlenIm + wIm * wlenRe;
        wRe = nextWRe;
      }
    }
  }

  if (inverse) {
    for (let i = 0; i < n; i++) {
      re[i] /= n;
      im[i] /= n;
    }
  }
}

// 2D Cooley-Tukey Radix-2 FFT
export function fft2D(re: Float32Array, im: Float32Array, N: number, inverse: boolean) {
  // 1. Process rows
  const rowRe = new Float32Array(N);
  const rowIm = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      rowRe[j] = re[i * N + j];
      rowIm[j] = im[i * N + j];
    }
    fft1D(rowRe, rowIm, inverse);
    for (let j = 0; j < N; j++) {
      re[i * N + j] = rowRe[j];
      im[i * N + j] = rowIm[j];
    }
  }

  // 2. Process columns
  const colRe = new Float32Array(N);
  const colIm = new Float32Array(N);
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      colRe[i] = re[i * N + j];
      colIm[i] = im[i * N + j];
    }
    fft1D(colRe, colIm, inverse);
    for (let i = 0; i < N; i++) {
      re[i * N + j] = colRe[i];
      im[i * N + j] = colIm[i];
    }
  }
}

// Quadrant shifting: moves DC component to the center (fftshift / ifftshift)
export function fftShift(re: Float32Array, im: Float32Array, N: number) {
  const half = Math.floor(N / 2);
  const outRe = new Float32Array(N * N);
  const outIm = new Float32Array(N * N);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const nx = (x + half) % N;
      const ny = (y + half) % N;
      outRe[ny * N + nx] = re[y * N + x];
      outIm[ny * N + nx] = im[y * N + x];
    }
  }
  return { re: outRe, im: outIm };
}

// Generates magnitude spectrum from real/imag components
// with logarithmic scaling standard for Fourier visualization
export function getMagnitudeSpectrum(
  re: Float32Array,
  im: Float32Array,
  N: number,
  logConstant: number = 20
): Float32Array {
  const spectrum = new Float32Array(N * N);
  for (let i = 0; i < N * N; i++) {
    const magnitude = Math.sqrt(re[i] * re[i] + im[i] * im[i]);
    // 20 * log(1 + Math.abs(F(u,v)))
    spectrum[i] = logConstant * Math.log(1 + magnitude);
  }
  return spectrum;
}
