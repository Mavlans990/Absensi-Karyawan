const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const SIGNATURES_DIR = path.join(__dirname, '..', 'uploads', 'signatures');
const MAX_SIGNATURE_BYTES = 2 * 1024 * 1024; // 2 MB
const PNG_MAGIC_BYTES = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function ensureSignaturesDir() {
  if (!fs.existsSync(SIGNATURES_DIR)) {
    fs.mkdirSync(SIGNATURES_DIR, { recursive: true });
  }
}

/**
 * Validasi payload Data URL PNG tanda tangan dari kanvas dan simpan sebagai file .png
 */
function saveSignaturePng(signatureDataUrl, employeeId, compactDate, attendanceType) {
  ensureSignaturesDir();

  if (typeof signatureDataUrl !== 'string' || !signatureDataUrl.trim()) {
    const err = new Error('Tanda tangan wajib diisi.');
    err.statusCode = 400;
    throw err;
  }

  const prefix = 'data:image/png;base64,';
  if (!signatureDataUrl.startsWith(prefix)) {
    const err = new Error('Format gambar tanda tangan tidak valid. Gunakan format PNG.');
    err.statusCode = 400;
    throw err;
  }

  const base64Body = signatureDataUrl.slice(prefix.length).trim();
  if (!base64Body || !/^[A-Za-z0-9+/=\r\n]+$/.test(base64Body)) {
    const err = new Error('Data base64 tanda tangan rusak atau tidak valid.');
    err.statusCode = 400;
    throw err;
  }

  const buffer = Buffer.from(base64Body, 'base64');

  if (buffer.length < 64) {
    const err = new Error('Gambar tanda tangan kosong atau tidak valid.');
    err.statusCode = 400;
    throw err;
  }

  if (buffer.length > MAX_SIGNATURE_BYTES) {
    const err = new Error('Ukuran file tanda tangan melebihi batas maksimal 2 MB.');
    err.statusCode = 400;
    throw err;
  }

  // Validasi header magic bytes PNG
  if (buffer.subarray(0, 8).compare(PNG_MAGIC_BYTES) !== 0) {
    const err = new Error('Header file bukan gambar PNG yang valid.');
    err.statusCode = 400;
    throw err;
  }

  const safeEmpId = String(Number(employeeId) || 0);
  const safeDate = String(compactDate).replace(/[^0-9]/g, '');
  const safeType = attendanceType === 'PULANG' ? 'PULANG' : 'MASUK';
  const uniqueSuffix = `${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  const fileName = `sig_${safeEmpId}_${safeDate}_${safeType}_${uniqueSuffix}.png`;
  const fullPath = path.join(SIGNATURES_DIR, fileName);

  fs.writeFileSync(fullPath, buffer);
  return `/uploads/signatures/${fileName}`;
}

/**
 * Hapus file tanda tangan dari disk secara aman (mencegah path traversal)
 */
function deleteSignatureFile(relativePath) {
  if (!relativePath || typeof relativePath !== 'string') return;
  const baseName = path.basename(relativePath);
  if (!baseName.endsWith('.png')) return;
  const target = path.join(SIGNATURES_DIR, baseName);
  if (fs.existsSync(target)) {
    try {
      fs.unlinkSync(target);
    } catch (_) {
      // Abaikan kegagalan hapus file lama
    }
  }
}

/**
 * Generator PNG murni (tanpa dependensi native) untuk membuat sampel tanda tangan realistis saat seeding
 */
function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makePngChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcInput = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function generateDemoSignaturePng(fileName, seedVariant = 1) {
  ensureSignaturesDir();
  const fullPath = path.join(SIGNATURES_DIR, fileName);
  if (fs.existsSync(fullPath)) {
    return `/uploads/signatures/${fileName}`;
  }

  const width = 420;
  const height = 160;
  // RGBA putih bersih (#FFFFFF)
  const pixels = Buffer.alloc(width * height * 4, 255);

  const drawDot = (cx, cy, radius, r, g, b) => {
    const minX = Math.max(0, Math.floor(cx - radius - 1));
    const maxX = Math.min(width - 1, Math.ceil(cx + radius + 1));
    const minY = Math.max(0, Math.floor(cy - radius - 1));
    const maxY = Math.min(height - 1, Math.ceil(cy + radius + 1));
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const dist = Math.hypot(x - cx, y - cy);
        if (dist <= radius + 0.8) {
          const alpha = dist <= radius - 0.3 ? 1 : Math.max(0, 1 - (dist - (radius - 0.3)) / 1.1);
          const idx = (y * width + x) * 4;
          pixels[idx] = Math.round(pixels[idx] * (1 - alpha) + r * alpha);
          pixels[idx + 1] = Math.round(pixels[idx + 1] * (1 - alpha) + g * alpha);
          pixels[idx + 2] = Math.round(pixels[idx + 2] * (1 - alpha) + b * alpha);
          pixels[idx + 3] = 255;
        }
      }
    }
  };

  // Gambar kurva tanda tangan halus berdasarkan seedVariant
  const ink = seedVariant % 2 === 0 ? [29, 78, 216] : [15, 23, 42]; // #1D4ED8 atau #0F172A
  const steps = 650;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x =
      55 +
      t * 300 +
      Math.sin(t * Math.PI * (5 + seedVariant)) * (18 - t * 8) +
      Math.cos(t * Math.PI * (11 + seedVariant)) * 7;
    const y =
      84 -
      Math.sin(t * Math.PI * (3 + seedVariant * 0.7)) * (36 * (1 - t * 0.45)) +
      Math.sin(t * Math.PI * (9 + seedVariant)) * 12;
    const strokeRadius = 1.65 - t * 0.35;
    drawDot(x, y, strokeRadius, ink[0], ink[1], ink[2]);
  }

  // Garis bawah aksen tanda tangan
  for (let i = 0; i <= 240; i++) {
    const t = i / 240;
    const x = 75 + t * 265;
    const y = 118 - Math.sin(t * Math.PI) * 9 + t * 4;
    drawDot(x, y, 1.3, ink[0], ink[1], ink[2]);
  }

  // Susun raw scanlines PNG (filter byte 0 per baris)
  const stride = width * 4 + 1;
  const rawData = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    rawData[y * stride] = 0;
    pixels.copy(rawData, y * stride + 1, y * width * 4, (y + 1) * width * 4);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const idat = zlib.deflateSync(rawData);
  const pngBuffer = Buffer.concat([
    PNG_MAGIC_BYTES,
    makePngChunk('IHDR', ihdr),
    makePngChunk('IDAT', idat),
    makePngChunk('IEND', Buffer.alloc(0))
  ]);

  fs.writeFileSync(fullPath, pngBuffer);
  return `/uploads/signatures/${fileName}`;
}

module.exports = {
  SIGNATURES_DIR,
  ensureSignaturesDir,
  saveSignaturePng,
  deleteSignatureFile,
  generateDemoSignaturePng
};
