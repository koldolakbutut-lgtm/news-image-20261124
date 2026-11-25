// main.ts — "World News in One Image" for Tuesday 24 November 2026.
// Draws a newspaper front page summing up the day's world news:
// COP31 collapses in Antalya, Ukraine sinks a Russian warship off Libya,
// Russia tests NATO Article 5, the US-Iran blockade standoff, Gaza strikes,
// plus Nvidia, DRC and Zaporizhzhia in the footer ticker.
// Node 22, standard library only. Fully deterministic: fixed palette,
// no clock, no randomness — two runs write byte-identical files.
// Usage: MAKEFUN_OUTPUT_DIR=out node main.ts   (writes out/entry.png)
import { writeFileSync, mkdirSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { createHash } from "node:crypto";

const W = 1024;
const H = 1024;

// ---------- palette ----------
const PAPER: RGB = [246, 241, 227];
const INK: RGB = [22, 22, 22];
const RED: RGB = [163, 29, 29];
const BLUE: RGB = [31, 78, 121];
const OCEAN: RGB = [43, 108, 176];
const DEEPSEA: RGB = [23, 74, 117];
const LAND: RGB = [61, 139, 64];
const CLOUD: RGB = [154, 165, 173];
const SKY: RGB = [207, 227, 238];
const WHITE: RGB = [255, 255, 255];
const SMOKE: RGB = [120, 120, 120];
const ORANGE: RGB = [214, 110, 30];
const STEEL: RGB = [70, 78, 86];

type RGB = [number, number, number];

// ---------- PNG encoder (pure stdlib) ----------
const CRC_TABLE: number[] = (() => {
  const table: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table.push(c >>> 0);
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function encodePNG(width: number, height: number, rgb: Uint8Array): Buffer {
  const raw = Buffer.alloc(height * (1 + width * 3));
  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 3)] = 0; // filter: none
    raw.set(rgb.subarray(y * width * 3, (y + 1) * width * 3), y * (1 + width * 3) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------- canvas ----------
class Canvas {
  data = new Uint8Array(W * H * 3);

  constructor() {
    this.fill(PAPER);
  }

  set(x: number, y: number, c: RGB): void {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = (y * W + x) * 3;
    this.data[i] = c[0];
    this.data[i + 1] = c[1];
    this.data[i + 2] = c[2];
  }

  fill(c: RGB): void {
    for (let i = 0; i < W * H; i++) {
      this.data[i * 3] = c[0];
      this.data[i * 3 + 1] = c[1];
      this.data[i * 3 + 2] = c[2];
    }
  }

  rect(x: number, y: number, w: number, h: number, c: RGB): void {
    for (let yy = Math.max(0, y); yy < Math.min(H, y + h); yy++) {
      for (let xx = Math.max(0, x); xx < Math.min(W, x + w); xx++) this.set(xx, yy, c);
    }
  }

  hline(x0: number, x1: number, y: number, c: RGB): void {
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) this.set(x, y, c);
  }

  vline(x: number, y0: number, y1: number, c: RGB): void {
    for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) this.set(x, y, c);
  }

  line(x0: number, y0: number, x1: number, y1: number, c: RGB): void {
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    let x = x0;
    let y = y0;
    for (;;) {
      this.set(x, y, c);
      if (x === x1 && y === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y += sy;
      }
    }
  }

  thickLine(x0: number, y0: number, x1: number, y1: number, w: number, c: RGB): void {
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    const r = Math.floor(w / 2);
    for (let i = 0; i <= steps; i++) {
      const x = Math.round(x0 + ((x1 - x0) * i) / steps);
      const y = Math.round(y0 + ((y1 - y0) * i) / steps);
      this.rect(x - r, y - r, w, w, c);
    }
  }

  dashedLine(x0: number, y0: number, x1: number, y1: number, c: RGB): void {
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (let i = 0; i <= steps; i++) {
      if (Math.floor(i / 8) % 2 === 0) {
        const x = Math.round(x0 + ((x1 - x0) * i) / steps);
        const y = Math.round(y0 + ((y1 - y0) * i) / steps);
        this.set(x, y, c);
      }
    }
  }

  circle(cx: number, cy: number, r: number, c: RGB): void {
    for (let y = -r; y <= r; y++) {
      const half = Math.floor(Math.sqrt(r * r - y * y));
      for (let x = -half; x <= half; x++) this.set(cx + x, cy + y, c);
    }
  }

  ring(cx: number, cy: number, r: number, w: number, c: RGB): void {
    for (let a = 0; a < 360; a++) {
      const rad = (a * Math.PI) / 180;
      for (let t = 0; t < w; t++) {
        this.set(Math.round(cx + (r - t) * Math.cos(rad)), Math.round(cy + (r - t) * Math.sin(rad)), c);
      }
    }
  }

  ellipse(cx: number, cy: number, rx: number, ry: number, c: RGB): void {
    for (let y = -ry; y <= ry; y++) {
      const half = Math.floor((rx * Math.sqrt(ry * ry - y * y)) / ry);
      for (let x = -half; x <= half; x++) this.set(cx + x, cy + y, c);
    }
  }

  poly(points: [number, number][], c: RGB): void {
    // scanline fill for a simple polygon
    let minY = H;
    let maxY = 0;
    for (const [, y] of points) {
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
    for (let y = minY; y <= maxY; y++) {
      const xs: number[] = [];
      for (let i = 0; i < points.length; i++) {
        const [x0, y0] = points[i];
        const [x1, y1] = points[(i + 1) % points.length];
        if ((y0 <= y && y1 > y) || (y1 <= y && y0 > y)) {
          xs.push(Math.round(x0 + ((y - y0) * (x1 - x0)) / (y1 - y0)));
        }
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) this.hline(xs[k], xs[k + 1], y, c);
    }
  }

  text(str: string, x: number, y: number, scale: number, c: RGB): void {
    let cx = x;
    for (const ch of str) {
      const glyph = FONT[ch] ?? FONT["?"];
      for (let row = 0; row < 7; row++) {
        const bits = glyph[row];
        for (let col = 0; col < 5; col++) {
          if ((bits >> (4 - col)) & 1) {
            this.rect(cx + col * scale, y + row * scale, scale, scale, c);
          }
        }
      }
      cx += 6 * scale;
    }
  }

  textWidth(str: string, scale: number): number {
    return str.length * 6 * scale - scale;
  }

  textCenter(str: string, y: number, scale: number, c: RGB): void {
    this.text(str, Math.round((W - this.textWidth(str, scale)) / 2), y, scale, c);
  }
}

// ---------- 5x7 bitmap font (7 rows, 5 bits each) ----------
const FONT: Record<string, number[]> = {
  A: [0b01110, 0b10001, 0b10001, 0b11111, 0b10001, 0b10001, 0b10001],
  B: [0b11110, 0b10001, 0b10001, 0b11110, 0b10001, 0b10001, 0b11110],
  C: [0b01110, 0b10001, 0b10000, 0b10000, 0b10000, 0b10001, 0b01110],
  D: [0b11110, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b11110],
  E: [0b11111, 0b10000, 0b10000, 0b11110, 0b10000, 0b10000, 0b11111],
  F: [0b11111, 0b10000, 0b10000, 0b11110, 0b10000, 0b10000, 0b10000],
  G: [0b01110, 0b10001, 0b10000, 0b10111, 0b10001, 0b10001, 0b01111],
  H: [0b10001, 0b10001, 0b10001, 0b11111, 0b10001, 0b10001, 0b10001],
  I: [0b01110, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b01110],
  J: [0b00111, 0b00010, 0b00010, 0b00010, 0b00010, 0b10010, 0b01100],
  K: [0b10001, 0b10010, 0b10100, 0b11000, 0b10100, 0b10010, 0b10001],
  L: [0b10000, 0b10000, 0b10000, 0b10000, 0b10000, 0b10000, 0b11111],
  M: [0b10001, 0b11011, 0b10101, 0b10101, 0b10001, 0b10001, 0b10001],
  N: [0b10001, 0b11001, 0b10101, 0b10011, 0b10001, 0b10001, 0b10001],
  O: [0b01110, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01110],
  P: [0b11110, 0b10001, 0b10001, 0b11110, 0b10000, 0b10000, 0b10000],
  Q: [0b01110, 0b10001, 0b10001, 0b10001, 0b10101, 0b10010, 0b01101],
  R: [0b11110, 0b10001, 0b10001, 0b11110, 0b10100, 0b10010, 0b10001],
  S: [0b01111, 0b10000, 0b10000, 0b01110, 0b00001, 0b00001, 0b11110],
  T: [0b11111, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100],
  U: [0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01110],
  V: [0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01010, 0b00100],
  W: [0b10001, 0b10001, 0b10001, 0b10101, 0b10101, 0b11011, 0b10001],
  X: [0b10001, 0b10001, 0b01010, 0b00100, 0b01010, 0b10001, 0b10001],
  Y: [0b10001, 0b10001, 0b01010, 0b00100, 0b00100, 0b00100, 0b00100],
  Z: [0b11111, 0b00001, 0b00010, 0b00100, 0b01000, 0b10000, 0b11111],
  "0": [0b01110, 0b10001, 0b10011, 0b10101, 0b11001, 0b10001, 0b01110],
  "1": [0b00100, 0b01100, 0b00100, 0b00100, 0b00100, 0b00100, 0b01110],
  "2": [0b01110, 0b10001, 0b00001, 0b00110, 0b01000, 0b10000, 0b11111],
  "3": [0b11111, 0b00010, 0b00100, 0b00010, 0b00001, 0b10001, 0b01110],
  "4": [0b00010, 0b00110, 0b01010, 0b10010, 0b11111, 0b00010, 0b00010],
  "5": [0b11111, 0b10000, 0b11110, 0b00001, 0b00001, 0b10001, 0b01110],
  "6": [0b00110, 0b01000, 0b10000, 0b11110, 0b10001, 0b10001, 0b01110],
  "7": [0b11111, 0b00001, 0b00010, 0b00100, 0b01000, 0b01000, 0b01000],
  "8": [0b01110, 0b10001, 0b10001, 0b01110, 0b10001, 0b10001, 0b01110],
  "9": [0b01110, 0b10001, 0b10001, 0b01111, 0b00001, 0b00010, 0b01100],
  " ": [0, 0, 0, 0, 0, 0, 0],
  "-": [0, 0, 0, 0b01110, 0, 0, 0],
  ":": [0, 0b00100, 0, 0, 0, 0b00100, 0],
  ".": [0, 0, 0, 0, 0, 0b01100, 0b01100],
  ",": [0, 0, 0, 0, 0b01100, 0b00100, 0b01000],
  "'": [0b00100, 0b00100, 0b01000, 0, 0, 0, 0],
  "/": [0b00001, 0b00010, 0b00010, 0b00100, 0b01000, 0b01000, 0b10000],
  "&": [0b01100, 0b10010, 0b10100, 0b01000, 0b10101, 0b10010, 0b01101],
  "!": [0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0, 0b00100],
  "(": [0b00010, 0b00100, 0b01000, 0b01000, 0b01000, 0b00100, 0b00010],
  ")": [0b01000, 0b00100, 0b00010, 0b00010, 0b00010, 0b00100, 0b01000],
  "?": [0b01110, 0b10001, 0b00001, 0b00110, 0b00100, 0, 0b00100],
};

// ---------- pictograms ----------
function drawJet(cv: Canvas, x: number, y: number, s: number, c: RGB): void {
  // small fighter jet pointing right, s = scale
  cv.poly(
    [
      [x, y],
      [x + 26 * s, y + 5 * s],
      [x, y + 10 * s],
    ],
    c,
  );
  cv.poly(
    [
      [x + 8 * s, y + 2 * s],
      [x + 14 * s, y - 6 * s],
      [x + 18 * s, y + 2 * s],
    ],
    c,
  );
  cv.poly(
    [
      [x + 10 * s, y + 8 * s],
      [x + 16 * s, y + 16 * s],
      [x + 20 * s, y + 8 * s],
    ],
    c,
  );
}

function drawShip(cv: Canvas, x: number, y: number, s: number, tilt: number, c: RGB): void {
  // a warship hull, tilted by `tilt` pixels at the bow (sinking)
  const bow: [number, number] = [x + 90 * s, y - tilt];
  const stern: [number, number] = [x, y + tilt];
  cv.poly(
    [
      stern,
      [x + 12 * s, y + 16 * s + tilt],
      [x + 78 * s, y + 16 * s - tilt],
      bow,
    ],
    c,
  );
  cv.rect(x + 30 * s, y - 14 * s - tilt, 8 * s, 14 * s, c); // bridge
  cv.line(x + 34 * s, y - 14 * s - tilt, x + 34 * s, y - 26 * s - tilt, c); // mast
  cv.rect(x + 52 * s, y - 10 * s - tilt, 6 * s, 10 * s, SMOKE); // funnel
}

function drawTanker(cv: Canvas, x: number, y: number, s: number, c: RGB): void {
  cv.rect(x, y, 120 * s, 20 * s, c); // hull
  cv.rect(x + 92 * s, y - 16 * s, 20 * s, 16 * s, c); // bridge
  cv.rect(x + 20 * s, y - 10 * s, 8 * s, 10 * s, SMOKE);
  cv.rect(x + 40 * s, y - 10 * s, 8 * s, 10 * s, SMOKE);
  cv.hline(x - 14 * s, x + 134 * s, y + 24 * s, WHITE);
  cv.hline(x - 6 * s, x + 126 * s, y + 28 * s, WHITE);
}

function drawFlame(cv: Canvas, x: number, y: number, s: number): void {
  cv.poly(
    [
      [x, y + 22 * s],
      [x + 7 * s, y + 6 * s],
      [x + 12 * s, y + 14 * s],
      [x + 18 * s, y],
      [x + 22 * s, y + 22 * s],
    ],
    ORANGE,
  );
  cv.poly(
    [
      [x + 6 * s, y + 22 * s],
      [x + 11 * s, y + 12 * s],
      [x + 16 * s, y + 22 * s],
    ],
    RED,
  );
}

// ---------- story box ----------
function storyBox(
  cv: Canvas,
  x: number,
  y: number,
  w: number,
  h: number,
  kicker: string,
  lines: string[],
  pic: (cv: Canvas, px: number, py: number) => void,
): void {
  cv.rect(x, y, w, 4, RED);
  cv.rect(x, y, 4, h, INK);
  cv.rect(x + w - 4, y, 4, h, INK);
  cv.rect(x, y + h - 4, w, 4, INK);
  cv.text(kicker, x + 18, y + 16, 3, RED);
  let ly = y + 52;
  for (const ln of lines) {
    cv.text(ln, x + 18, ly, 3, INK);
    ly += 30;
  }
  pic(cv, x + w - 108, y + h - 62);
}

// ---------- the front page ----------
function draw(): Canvas {
  const cv = new Canvas();

  // masthead
  cv.rect(0, 0, W, 8, RED);
  cv.textCenter("THE WORLD IN ONE IMAGE", 26, 3, INK);
  cv.textCenter("TUESDAY, 24 NOVEMBER 2026", 58, 5, INK);
  cv.rect(0, 106, W, 6, RED);

  // headline
  cv.textCenter("COP31 COLLAPSES", 128, 6, INK);
  cv.textCenter("ANTALYA TALKS FAIL AS 90 NATIONS", 182, 3, INK);
  cv.textCenter("REJECT DRAFT WITH NO FOSSIL FUELS", 208, 3, INK);

  // sky
  cv.rect(0, 240, W, 320, SKY);
  // storm clouds over the globe
  cv.ellipse(400, 268, 52, 16, CLOUD);
  cv.ellipse(500, 250, 60, 18, CLOUD);
  cv.ellipse(606, 268, 52, 16, CLOUD);
  cv.ellipse(452, 282, 48, 14, SMOKE);
  cv.ellipse(556, 282, 48, 14, SMOKE);
  // jets testing the alliance, top right
  drawJet(cv, 800, 292, 1, INK);
  drawJet(cv, 862, 322, 1, INK);
  cv.dashedLine(640, 300, 796, 296, SMOKE);
  cv.dashedLine(700, 330, 858, 326, SMOKE);

  // the globe: a cracking planet
  cv.circle(512, 420, 140, OCEAN);
  cv.ellipse(468, 372, 42, 22, LAND);
  cv.ellipse(552, 442, 52, 28, LAND);
  cv.ellipse(480, 502, 34, 18, LAND);
  cv.ellipse(512, 300, 30, 10, WHITE);
  cv.thickLine(448, 318, 492, 372, 5, INK);
  cv.thickLine(492, 372, 462, 428, 5, INK);
  cv.thickLine(462, 428, 516, 482, 5, INK);
  cv.thickLine(516, 482, 486, 536, 5, INK);
  cv.ring(512, 420, 140, 4, INK);

  // sea: the war reaches the Mediterranean
  cv.rect(0, 560, W, 80, DEEPSEA);
  cv.hline(60, 300, 584, WHITE);
  cv.hline(120, 260, 604, WHITE);
  cv.hline(700, 960, 584, WHITE);
  cv.hline(760, 900, 606, WHITE);
  drawTanker(cv, 130, 592, 1, STEEL);
  drawShip(cv, 700, 596, 1, 10, INK);
  cv.circle(742, 556, 10, SMOKE);
  cv.circle(762, 540, 13, SMOKE);
  cv.circle(786, 522, 16, CLOUD);

  // story grid
  const bx = 27;
  const bw = 470;
  const bh = 140;
  storyBox(cv, bx, 660, bw, bh, "LIBYA", ["UKRAINE SINKS", "RUSSIAN WARSHIP"], (c, px, py) => {
    drawShip(c, px, py + 8, 1, 8, INK);
  });
  storyBox(cv, bx + bw + 20, 660, bw, bh, "NATO", ["RUSSIA TESTS", "ARTICLE 5"], (c, px, py) => {
    drawJet(c, px, py + 6, 1, INK);
    drawJet(c, px + 12, py + 26, 1, STEEL);
  });
  storyBox(cv, bx, 820, bw, bh, "IRAN", ["US BLOCKADE", "STANDOFF IN GULF"], (c, px, py) => {
    drawTanker(c, px - 16, py + 6, 1, STEEL);
  });
  storyBox(cv, bx + bw + 20, 820, bw, bh, "GAZA", ["STRIKES KILL", "HAMAS SECURITY", "CHIEF"], (c, px, py) => {
    cv.rect(px + 8, py + 10, 34, 30, STEEL);
    cv.rect(px + 16, py + 18, 6, 6, WHITE);
    cv.rect(px + 28, py + 18, 6, 6, WHITE);
    cv.rect(px + 16, py + 30, 6, 6, WHITE);
    drawFlame(c, px + 12, py - 12, 1);
  });

  // footer ticker
  cv.rect(0, 962, W, 4, INK);
  cv.textCenter("ALSO: NVIDIA: HUANG BACK AS CEO - DRC FIGHTING TRAPS EBOLA TEAMS", 974, 2, INK);
  cv.textCenter("ZAPORIZHZHIA: 2 DEAD, 40 HURT IN APARTMENT STRIKE", 996, 2, INK);
  cv.rect(0, 1016, W, 8, RED);

  return cv;
}

function main(): void {
  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "out";
  mkdirSync(outDir, { recursive: true });
  const cv = draw();
  const png = encodePNG(W, H, cv.data);
  const path = `${outDir}/entry.png`;
  writeFileSync(path, png);
  const sha = createHash("sha256").update(png).digest("hex");
  console.log(`wrote ${path} (${png.length} bytes, sha256 ${sha})`);
}

main();
