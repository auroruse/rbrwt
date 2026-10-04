// A franchise logo in 3D for the Alert maker, built from the flat PNG the way the NFL's logos are sculpted:
// brighter shapes stand proud of darker ones and of the background, every edge is cut as a flat chamfer lit
// from the top left, and the logo has a short dark side under it. Worked out once per logo at a fixed size;
// the result is drawn at any size.

export type Sculpted = {
  face: HTMLCanvasElement; // the lit logo
  side: HTMLCanvasElement; // the logo darkened, stacked behind the face for its thickness and its shadow
  box: { x: number; y: number; w: number; h: number }; // where the drawing sits in the square, 0 to 1
};

const unit = (x: number, y: number, z: number) => {
  const m = Math.hypot(x, y, z);
  return [x / m, y / m, z / m] as const;
};

// A box blur along rows then columns. Across a hard edge it leaves a straight ramp, so a lit ramp reads as a
// flat chamfer rather than a rounded pillow.
function boxBlur(src: Float32Array, n: number, r: number): Float32Array {
  const tmp = new Float32Array(n * n);
  const out = new Float32Array(n * n);
  const w = 2 * r + 1;
  for (let y = 0; y < n; y++) {
    const row = y * n;
    let sum = 0;
    for (let k = -r; k <= r; k++) sum += src[row + Math.min(n - 1, Math.max(0, k))];
    for (let x = 0; x < n; x++) {
      tmp[row + x] = sum / w;
      sum += src[row + Math.min(n - 1, x + r + 1)] - src[row + Math.max(0, x - r)];
    }
  }
  for (let x = 0; x < n; x++) {
    let sum = 0;
    for (let k = -r; k <= r; k++) sum += tmp[Math.min(n - 1, Math.max(0, k)) * n + x];
    for (let y = 0; y < n; y++) {
      out[y * n + x] = sum / w;
      sum += tmp[Math.min(n - 1, y + r + 1) * n + x] - tmp[Math.max(0, y - r) * n + x];
    }
  }
  return out;
}

export function sculpt(img: HTMLImageElement, n = 640): Sculpted {
  const face = document.createElement('canvas');
  face.width = face.height = n;
  const fx = face.getContext('2d', { willReadFrequently: true })!;
  fx.drawImage(img, 0, 0, n, n);
  const lit = fx.getImageData(0, 0, n, n);
  const d = lit.data;

  // Height: nothing outside the logo, and inside it the brighter the colour the higher it stands.
  const h = new Float32Array(n * n);
  let x0 = n, y0 = n, x1 = 0, y1 = 0;
  for (let i = 0; i < n * n; i++) {
    const a = d[i * 4 + 3] / 255;
    const lum = (0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2]) / 255;
    h[i] = a * (0.5 + 0.5 * lum);
    if (a > 0.1) {
      const x = i % n, y = (i - x) / n;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  const hb = boxBlur(h, n, Math.max(2, Math.round(n * 0.008)));

  // Light from the top left: a face turned towards it brightens and catches a highlight, one turned away
  // darkens, and a flat face keeps its own colour.
  const L = unit(-0.5, -0.7, 0.75);
  const half = unit(L[0], L[1], L[2] + 1);
  const shine = 18;
  const flat = Math.pow(half[2], shine);
  const steep = n * 0.05;
  for (let y = 1; y < n - 1; y++) {
    for (let x = 1; x < n - 1; x++) {
      const i = y * n + x;
      if (!d[i * 4 + 3]) continue;
      const gx = (hb[i + 1] - hb[i - 1]) * steep;
      const gy = (hb[i + n] - hb[i - n]) * steep;
      const m = Math.hypot(gx, gy, 1);
      const nx = -gx / m, ny = -gy / m, nz = 1 / m;
      const diff = Math.max(0, nx * L[0] + ny * L[1] + nz * L[2]) / L[2];
      const spec = Math.max(0, Math.pow(Math.max(0, nx * half[0] + ny * half[1] + nz * half[2]), shine) - flat) * 45;
      const shade = Math.min(1.55, Math.max(0.42, diff)) * (1.07 - (0.14 * y) / n);
      d[i * 4] = d[i * 4] * shade + spec;
      d[i * 4 + 1] = d[i * 4 + 1] * shade + spec;
      d[i * 4 + 2] = d[i * 4 + 2] * shade + spec;
    }
  }
  fx.putImageData(lit, 0, 0);

  const side = document.createElement('canvas');
  side.width = side.height = n;
  const sx = side.getContext('2d', { willReadFrequently: true })!;
  sx.drawImage(img, 0, 0, n, n);
  const dark = sx.getImageData(0, 0, n, n);
  for (let i = 0; i < dark.data.length; i += 4) {
    dark.data[i] *= 0.3;
    dark.data[i + 1] *= 0.3;
    dark.data[i + 2] *= 0.3;
  }
  sx.putImageData(dark, 0, 0);

  return { face, side, box: { x: x0 / n, y: y0 / n, w: (x1 - x0 + 1) / n, h: (y1 - y0 + 1) / n } };
}
