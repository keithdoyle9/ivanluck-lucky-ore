import fs from "fs";
import path from "path";
import zlib from "zlib";

function makeCrcTable() {
  const table = new Uint32Array(256);

  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }

  return table;
}

const crcTable = makeCrcTable();

function crc32(buffer) {
  let crc = 0xffffffff;

  for (const value of buffer) {
    crc = crcTable[(crc ^ value) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type, "ascii");
  const lengthBuffer = Buffer.alloc(4);
  const crcBuffer = Buffer.alloc(4);
  const chunk = Buffer.concat([typeBuffer, data]);

  lengthBuffer.writeUInt32BE(data.length, 0);
  crcBuffer.writeUInt32BE(crc32(chunk), 0);

  return Buffer.concat([lengthBuffer, chunk, crcBuffer]);
}

function encodePng(width, height, pixelFn) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = width * 4 + 1;
  const raw = Buffer.alloc(stride * height);

  for (let y = 0; y < height; y += 1) {
    raw[y * stride] = 0;
    for (let x = 0; x < width; x += 1) {
      const [r, g, b, a] = pixelFn(x, y, width, height);
      const offset = y * stride + 1 + x * 4;

      raw[offset] = r;
      raw[offset + 1] = g;
      raw[offset + 2] = b;
      raw[offset + 3] = a;
    }
  }

  const idat = zlib.deflateSync(raw);

  return Buffer.concat([
    signature,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", idat),
    pngChunk("IEND", Buffer.alloc(0))
  ]);
}

function color(hex) {
  return [
    (hex >> 16) & 0xff,
    (hex >> 8) & 0xff,
    hex & 0xff,
    0xff
  ];
}

function luckyOrePixel(x, y, width, height) {
  const darkStone = color(0x2f3138);
  const midStone = color(0x454955);
  const gold = color(0xd3aa28);
  const brightGold = color(0xf5de76);
  const white = color(0xf5f2d0);
  const shadow = color(0x1f2127);

  const border = x === 0 || y === 0 || x === width - 1 || y === height - 1;
  if (border) {
    return shadow;
  }

  const checker = (x + y) % 3 === 0;
  let pixel = checker ? midStone : darkStone;

  const veinSpots = new Set([
    "3,2", "4,2", "5,2",
    "10,2", "11,2",
    "2,4", "3,4", "11,4", "12,4",
    "6,5", "7,5", "8,5",
    "4,7", "5,7", "10,7", "11,7",
    "2,9", "3,9", "12,9",
    "6,10", "7,10", "8,10",
    "4,12", "5,12", "11,12",
    "9,13", "10,13"
  ]);
  const sparkleSpots = new Set([
    "7,3", "8,3",
    "6,6", "9,6",
    "7,7", "8,7",
    "7,8", "8,8",
    "6,11", "9,11"
  ]);
  const brightSpots = new Set([
    "4,3", "10,3",
    "3,5", "12,5",
    "5,10", "10,10",
    "8,13"
  ]);

  const key = `${x},${y}`;
  if (veinSpots.has(key)) {
    pixel = gold;
  }
  if (brightSpots.has(key)) {
    pixel = brightGold;
  }
  if (sparkleSpots.has(key)) {
    pixel = white;
  }

  return pixel;
}

function scaledLuckyOrePixel(x, y, width, height) {
  const sourceX = Math.floor((x / width) * 16);
  const sourceY = Math.floor((y / height) * 16);
  return luckyOrePixel(Math.min(sourceX, 15), Math.min(sourceY, 15), 16, 16);
}

function writePng(targetPath, width, height, pixelFn) {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, encodePng(width, height, pixelFn));
}

export async function generateTextures() {
  const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");

  writePng(
    path.join(repoRoot, "resource_packs/ivanluck/textures/blocks/lucky_ore.png"),
    16,
    16,
    luckyOrePixel
  );
  writePng(
    path.join(repoRoot, "behavior_packs/ivanluck/pack_icon.png"),
    64,
    64,
    scaledLuckyOrePixel
  );
  writePng(
    path.join(repoRoot, "resource_packs/ivanluck/pack_icon.png"),
    64,
    64,
    scaledLuckyOrePixel
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await generateTextures();
}

