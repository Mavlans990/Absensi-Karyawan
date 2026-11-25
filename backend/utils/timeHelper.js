/**
 * Utilitas waktu otoritatif server (Zona Waktu: Asia/Jakarta / WIB / UTC+7)
 */

const JAKARTA_TZ = 'Asia/Jakarta';
const MASUK_ON_TIME_LIMIT = '08:00:00';
const PULANG_OPEN_TIME = '15:00:00';

const partsFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: JAKARTA_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23'
});

const humanDateFormatter = new Intl.DateTimeFormat('id-ID', {
  timeZone: JAKARTA_TZ,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric'
});

function extractParts(dateObj) {
  const parts = partsFormatter.formatToParts(dateObj);
  const map = {};
  for (const p of parts) {
    if (p.type !== 'literal') {
      map[p.type] = p.value;
    }
  }
  const date = `${map.year}-${map.month}-${map.day}`;
  const time = `${map.hour}:${map.minute}:${map.second}`;
  const compactDate = `${map.year}${map.month}${map.day}`;
  return {
    date,
    time,
    dateTime: `${date} ${time}`,
    compactDate,
    formattedDate: humanDateFormatter.format(dateObj),
    timestampMs: dateObj.getTime(),
    timezone: JAKARTA_TZ
  };
}

function getJakartaNow() {
  return extractParts(new Date());
}

function getRelativeJakartaDate(daysOffset = 0) {
  const d = new Date(Date.now() + daysOffset * 24 * 60 * 60 * 1000);
  return extractParts(d).date;
}

function evaluateMasukStatus(serverTimeStr) {
  return serverTimeStr <= MASUK_ON_TIME_LIMIT ? 'Hadir' : 'Terlambat';
}

function isPulangOpen(serverTimeStr) {
  return serverTimeStr >= PULANG_OPEN_TIME;
}

function isValidDateString(dateStr) {
  return typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
}

module.exports = {
  JAKARTA_TZ,
  MASUK_ON_TIME_LIMIT,
  PULANG_OPEN_TIME,
  getJakartaNow,
  getRelativeJakartaDate,
  evaluateMasukStatus,
  isPulangOpen,
  isValidDateString
};
