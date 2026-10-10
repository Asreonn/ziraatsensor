import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const outDir = join(rootDir, 'docs', 'tubitak-2209a');
const figDir = join(outDir, 'figures');
const previewDir = join(outDir, 'previews');
const reportPageDir = join(outDir, 'final-report-pages');

mkdirSync(figDir, { recursive: true });
mkdirSync(previewDir, { recursive: true });
mkdirSync(reportPageDir, { recursive: true });

// Muted academic palette: desaturated layer colours for category coding,
// pale tints for headers. Calm/printable — not the vivid saturated version.
const c = {
  ink: '#1F2937',     // titles / near-black
  text: '#374151',    // body text
  muted: '#6B7280',   // captions
  paper: '#FFFFFF',
  line: '#475569',    // neutral connectors and borders
  grid: '#CBD5E1',    // table / grid rules
  soft: '#F3F4F6',    // neutral header fill
  blue: '#45688F',    // edge / hardware
  blueSoft: '#EEF2F8',
  green: '#3F7459',   // data / cloud
  greenSoft: '#ECF4EF',
  amber: '#9B7330',   // output / web
  amberSoft: '#F8F2E6',
  red: '#9C5050',     // alarm / power
  redSoft: '#F8EDED',
  violet: '#5E5391',
  violetSoft: '#F0EEF8',
};

function esc(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function wrap(value, max = 34) {
  const words = String(value).split(/\s+/);
  const lines = [];
  let line = '';
  for (const word of words) {
    if (!line) line = word;
    else if ((line + ' ' + word).length <= max) line += ` ${word}`;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function text(x, y, value, opts = {}) {
  const size = opts.size ?? 16;
  const weight = opts.weight ?? 500;
  const color = opts.color ?? c.text;
  const anchor = opts.anchor ?? 'start';
  const lineHeight = opts.lineHeight ?? Math.round(size * 1.28);
  const family = opts.mono ? 'mono' : 'text';
  const source = Array.isArray(value) ? value : [value];
  const lines = opts.max ? source.flatMap(line => wrap(line, opts.max)) : source;
  return `<text class="${family}" x="${x}" y="${y}" text-anchor="${anchor}" font-size="${size}" font-weight="${weight}" fill="${color}">${
    lines.map((line, i) => `<tspan x="${x}" dy="${i === 0 ? 0 : lineHeight}">${esc(line)}</tspan>`).join('')
  }</text>`;
}

function shell(id, width, height, title, body, desc = title) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="${id}-title ${id}-desc">
  <title id="${id}-title">${esc(title)}</title>
  <desc id="${id}-desc">${esc(desc)}</desc>
  <defs>
    <style>
      .text { font-family: "DejaVu Sans", "Liberation Sans", Arial, sans-serif; letter-spacing: 0; }
      .mono { font-family: "DejaVu Sans Mono", "Liberation Mono", monospace; letter-spacing: 0; }
    </style>
  </defs>
  <rect width="${width}" height="${height}" fill="${c.paper}"/>
  ${body}
</svg>`;
}

function panel(x, y, w, h, title, rows = [], opts = {}) {
  const stroke = opts.stroke ?? c.line;
  const fill = opts.fill ?? c.paper;
  const headFill = opts.headFill ?? c.soft;
  const titleColor = opts.titleColor ?? c.ink;
  const rowSize = opts.rowSize ?? 14;
  const titleSize = opts.titleSize ?? 15.5;
  const headH = opts.headH ?? 40;
  const rx = opts.rx ?? 4;
  const bodyY = y + headH + 28;
  return `
    <g>
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="${opts.strokeWidth ?? 1.2}"/>
      <rect x="${x}" y="${y}" width="${w}" height="${headH}" rx="${rx}" fill="${headFill}"/>
      <rect x="${x}" y="${y + headH - rx}" width="${w}" height="${rx}" fill="${headFill}"/>
      <line x1="${x}" y1="${y + headH}" x2="${x + w}" y2="${y + headH}" stroke="${c.grid}" stroke-width="1"/>
      ${text(x + 16, y + 25, title, { size: titleSize, weight: 700, color: titleColor, mono: opts.monoTitle })}
      ${rows.map((row, i) => text(x + 16, bodyY + i * (rowSize + 8), row, {
        size: rowSize,
        weight: 500,
        color: opts.rowColor ?? c.text,
        mono: opts.monoRows,
        max: opts.rowMax ?? Math.floor((w - 32) / 8),
      })).join('')}
    </g>`;
}

function badge(x, y, label, opts = {}) {
  const color = opts.color ?? c.line;
  const fill = opts.fill ?? c.paper;
  const lines = wrap(label, opts.max ?? 22);
  const width = opts.width ?? Math.max(42, Math.min(220, Math.max(...lines.map(line => line.length)) * 7 + 16));
  const height = opts.height ?? (18 + (lines.length - 1) * 14);
  return `
    <g>
      <rect x="${x - width / 2}" y="${y - height / 2}" width="${width}" height="${height}" rx="3" fill="${fill}" stroke="${color}" stroke-width="1"/>
      ${text(x, y - (lines.length - 1) * 7 + 4, lines, { size: opts.size ?? 11, weight: 750, color, anchor: 'middle', lineHeight: 14 })}
    </g>`;
}

// Inline polygon arrowhead so heads survive PDF/Word/LibreOffice rendering
// (SVG marker-end is silently dropped by many document renderers).
function arrowHead(x, y, ux, uy, color, L = 11, W = 5.5) {
  const bx = x - L * ux;
  const by = y - L * uy;
  const px = -uy;
  const py = ux;
  const ax = (bx + W * px).toFixed(2);
  const ay = (by + W * py).toFixed(2);
  const cx = (bx - W * px).toFixed(2);
  const cy = (by - W * py).toFixed(2);
  return `<polygon points="${x},${y} ${ax},${ay} ${cx},${cy}" fill="${color}"/>`;
}

function line(x1, y1, x2, y2, opts = {}) {
  const color = opts.color ?? c.line;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const head = opts.noHead ? '' : arrowHead(x2, y2, ux, uy, color);
  const ex = opts.noHead ? x2 : x2 - 11 * ux;
  const ey = opts.noHead ? y2 : y2 - 11 * uy;
  const label = opts.label ? badge((x1 + x2) / 2, (y1 + y2) / 2, opts.label, { color, fill: c.paper, max: opts.labelMax, width: opts.labelWidth }) : '';
  const dash = opts.dash ? ` stroke-dasharray="${opts.dash}"` : '';
  return `<line x1="${x1}" y1="${y1}" x2="${ex.toFixed(2)}" y2="${ey.toFixed(2)}" stroke="${color}" stroke-width="${opts.width ?? 1.5}"${dash}/>${head}${label}`;
}

function elbow(points, opts = {}) {
  const color = opts.color ?? c.line;
  const pts = points.map(p => [p[0], p[1]]);
  const n = pts.length;
  const tip = pts[n - 1];
  const prev = pts[n - 2];
  const dx = tip[0] - prev[0];
  const dy = tip[1] - prev[1];
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  if (!opts.noHead) pts[n - 1] = [+(tip[0] - 11 * ux).toFixed(2), +(tip[1] - 11 * uy).toFixed(2)];
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]} ${p[1]}`).join(' ');
  const head = opts.noHead ? '' : arrowHead(tip[0], tip[1], ux, uy, color);
  const labelPoint = opts.labelAt ?? points[Math.floor(points.length / 2)];
  const label = opts.label ? badge(labelPoint[0], labelPoint[1], opts.label, { color, fill: c.paper, max: opts.labelMax, width: opts.labelWidth }) : '';
  const dash = opts.dash ? ` stroke-dasharray="${opts.dash}"` : '';
  return `<path d="${d}" fill="none" stroke="${color}" stroke-width="${opts.width ?? 1.5}"${dash}/>${head}${label}`;
}

function diamond(cx, cy, w, h, label, opts = {}) {
  const stroke = opts.stroke ?? c.line;
  const points = `${cx},${cy - h / 2} ${cx + w / 2},${cy} ${cx},${cy + h / 2} ${cx - w / 2},${cy}`;
  return `
    <g>
      <polygon points="${points}" fill="${opts.fill ?? c.paper}" stroke="${stroke}" stroke-width="1.3"/>
      ${text(cx, cy + 5, label, { size: opts.size ?? 14, weight: 700, color: opts.color ?? stroke, anchor: 'middle', max: opts.max ?? 18 })}
    </g>`;
}

function table(x, y, widths, rowH, rows, opts = {}) {
  const total = widths.reduce((sum, width) => sum + width, 0);
  let out = `<g><rect x="${x}" y="${y}" width="${total}" height="${rowH * rows.length}" rx="4" fill="${c.paper}" stroke="${c.line}" stroke-width="1.2"/>`;
  let cy = y;
  rows.forEach((row, r) => {
    out += `<rect x="${x}" y="${cy}" width="${total}" height="${rowH}" fill="${r === 0 ? (opts.headerFill ?? c.soft) : c.paper}"/>`;
    let cx = x;
    row.forEach((cell, i) => {
      out += `<line x1="${cx}" y1="${cy}" x2="${cx}" y2="${cy + rowH}" stroke="${c.grid}" stroke-width="1"/>`;
      out += text(cx + 10, cy + 23, cell, {
        size: r === 0 ? 13 : 12,
        weight: r === 0 ? 800 : 500,
        color: r === 0 ? c.ink : c.text,
        max: Math.max(8, Math.floor((widths[i] - 20) / 7.5)),
        lineHeight: 15,
        mono: opts.mono && r > 0,
      });
      cx += widths[i];
    });
    out += `<line x1="${x}" y1="${cy}" x2="${x + total}" y2="${cy}" stroke="${c.grid}" stroke-width="1"/>`;
    cy += rowH;
  });
  return `${out}</g>`;
}

function figure01() {
  const body = `
    <rect x="40" y="80" width="1560" height="480" rx="10" fill="${c.soft}" stroke="${c.grid}"/>
    <line x1="665" y1="100" x2="665" y2="500" stroke="${c.grid}" stroke-width="1" stroke-dasharray="2 6"/>
    <line x1="1285" y1="100" x2="1285" y2="500" stroke="${c.grid}" stroke-width="1" stroke-dasharray="2 6"/>
    ${text(355, 128, 'SAHA KATMANI', { size: 14, weight: 800, color: c.muted, anchor: 'middle' })}
    ${text(975, 128, 'VERİ KATMANI', { size: 14, weight: 800, color: c.muted, anchor: 'middle' })}
    ${text(1440, 128, 'UYGULAMA KATMANI', { size: 14, weight: 800, color: c.muted, anchor: 'middle' })}
    ${panel(80, 180, 240, 210, 'Sensör grubu', ['pH', 'EC / TDS', 'DO', 'LDR', 'DS18B20 + DHT22'], { headFill: c.soft })}
    ${panel(390, 180, 240, 210, 'ESP8266 kenar düğüm', ['ADS1115 okuma', 'eşik ön kontrolü', 'yerel alarm çıkışı', 'EEPROM ayar önbelleği'], { stroke: c.blue, headFill: c.blueSoft, titleColor: c.blue })}
    ${panel(700, 180, 240, 210, 'Supabase API', ['PostgREST uç noktaları', 'Auth oturumu', 'RLS yetkilendirme'], { stroke: c.green, headFill: c.greenSoft, titleColor: c.green })}
    ${panel(1010, 180, 240, 210, 'PostgreSQL', ['sensor_readings', 'pool_system_status', 'pools', 'sensor_event_logs'], { stroke: c.green, headFill: c.greenSoft, titleColor: c.green, monoRows: true, rowSize: 13 })}
    ${panel(1320, 180, 240, 210, 'Web panel', ['grafikler', 'durum', 'ayarlar'], { stroke: c.amber, headFill: c.amberSoft, titleColor: c.amber })}
    ${line(322, 285, 390, 285)}
    <rect x="334" y="261" width="44" height="16" fill="${c.soft}"/>${text(356, 273, 'ölçüm', { size: 12, weight: 700, color: c.line, anchor: 'middle' })}
    ${line(632, 285, 700, 285, { color: c.green })}
    <rect x="615" y="261" width="102" height="16" fill="${c.soft}"/>${text(666, 273, 'REST / HTTPS', { size: 12, weight: 700, color: c.green, anchor: 'middle' })}
    ${line(942, 285, 1010, 285, { color: c.green })}
    <rect x="960" y="261" width="32" height="16" fill="${c.soft}"/>${text(976, 273, 'SQL', { size: 12, weight: 700, color: c.green, anchor: 'middle' })}
    ${line(1252, 285, 1320, 285, { color: c.amber })}
    <rect x="1261" y="261" width="50" height="16" fill="${c.soft}"/>${text(1286, 273, 'okuma', { size: 12, weight: 700, color: c.amber, anchor: 'middle' })}
    ${elbow([[820, 390], [820, 470], [510, 470], [510, 392]], { color: c.green, dash: '6 5', label: 'periyodik yapılandırma', labelAt: [665, 470], labelWidth: 178 })}
    ${elbow([[1440, 390], [1440, 470], [1130, 470], [1130, 392]], { color: c.amber, dash: '6 5', label: 'eşik / alarm ayarı', labelAt: [1285, 470], labelWidth: 138 })}
    ${line(80, 525, 116, 525, { noHead: true })}
    ${text(124, 529, 'veri akışı', { size: 12, weight: 500, color: c.line })}
    <line x1="240" y1="525" x2="276" y2="525" stroke="${c.muted}" stroke-width="1.8" stroke-dasharray="6 5"/>
    ${text(284, 529, 'yapılandırma geri beslemesi', { size: 12, weight: 500, color: c.line })}
  `;
  return shell('fig01', 1640, 620, 'Genel sistem mimarisi', body);
}

function figure02() {
  const pin = (y, t) => text(840, y, t, { size: 13, color: c.text, mono: true });
  const body = `
    <rect x="30" y="40" width="1560" height="780" rx="6" fill="${c.paper}" stroke="${c.grid}"/>
    ${text(187, 100, 'ANALOG PROBLAR', { size: 12.5, weight: 700, color: c.muted, anchor: 'middle' })}
    ${text(540, 100, 'ADC', { size: 12.5, weight: 700, color: c.muted, anchor: 'middle' })}
    ${text(965, 100, 'MİKRODENETLEYİCİ (ESP8266)', { size: 12.5, weight: 700, color: c.muted, anchor: 'middle' })}
    ${text(1420, 100, 'SAYISAL ÇEVRE BİRİMLERİ', { size: 12.5, weight: 700, color: c.muted, anchor: 'middle' })}
    ${panel(70, 150, 235, 88, 'pH probu', ['ADS1115 · A0'], { stroke: c.blue, headFill: c.blueSoft, titleColor: c.blue, headH: 36, monoRows: true, rowSize: 13 })}
    ${panel(70, 275, 235, 88, 'TDS / EC probu', ['ADS1115 · A1'], { stroke: c.blue, headFill: c.blueSoft, titleColor: c.blue, headH: 36, monoRows: true, rowSize: 13 })}
    ${panel(70, 400, 235, 88, 'DO probu', ['ADS1115 · A2'], { stroke: c.blue, headFill: c.blueSoft, titleColor: c.blue, headH: 36, monoRows: true, rowSize: 13 })}
    ${panel(70, 525, 235, 88, 'LDR', ['ADS1115 · A3'], { stroke: c.blue, headFill: c.blueSoft, titleColor: c.blue, headH: 36, monoRows: true, rowSize: 13 })}
    <g>
      <rect x="415" y="150" width="250" height="475" rx="4" fill="${c.paper}" stroke="${c.blue}" stroke-width="1.3"/>
      <rect x="415" y="150" width="250" height="40" rx="4" fill="${c.blueSoft}"/>
      <rect x="415" y="186" width="250" height="4" fill="${c.blueSoft}"/>
      <line x1="415" y1="190" x2="665" y2="190" stroke="${c.grid}" stroke-width="1"/>
      ${text(540, 176, 'ADS1115 ADC', { size: 15, weight: 700, color: c.blue, anchor: 'middle' })}
      <circle cx="415" cy="194" r="3.5" fill="${c.blue}"/>${text(436, 199, 'A0 → pH', { size: 13, color: c.text, mono: true })}
      <circle cx="415" cy="319" r="3.5" fill="${c.blue}"/>${text(436, 324, 'A1 → TDS / EC', { size: 13, color: c.text, mono: true })}
      <circle cx="415" cy="444" r="3.5" fill="${c.blue}"/>${text(436, 449, 'A2 → DO', { size: 13, color: c.text, mono: true })}
      <circle cx="415" cy="569" r="3.5" fill="${c.blue}"/>${text(436, 574, 'A3 → LDR', { size: 13, color: c.text, mono: true })}
      <line x1="431" y1="600" x2="649" y2="600" stroke="${c.grid}" stroke-width="1"/>
      ${text(540, 619, 'I2C → ESP8266', { size: 12.5, weight: 700, color: c.blue, anchor: 'middle', mono: true })}
      <circle cx="665" cy="388" r="3.5" fill="${c.blue}"/>
    </g>
    <g>
      <rect x="815" y="200" width="300" height="400" rx="4" fill="${c.paper}" stroke="${c.line}" stroke-width="1.3"/>
      <rect x="815" y="200" width="300" height="44" rx="4" fill="${c.soft}"/>
      <rect x="815" y="240" width="300" height="4" fill="${c.soft}"/>
      <line x1="815" y1="244" x2="1115" y2="244" stroke="${c.grid}" stroke-width="1"/>
      ${text(965, 228, 'ESP8266 NodeMCU', { size: 15, weight: 700, color: c.ink, anchor: 'middle' })}
      <circle cx="815" cy="388" r="3.5" fill="${c.line}"/>
      ${pin(286, 'D1 → I2C SCL')}
      ${pin(316, 'D2 → I2C SDA')}
      ${pin(346, 'D5 → DS18B20')}
      ${pin(376, 'D6 → DHT22')}
      ${pin(406, 'D0 → Buzzer')}
      ${pin(436, 'D7 → Yeşil LED')}
      ${pin(466, 'D8 → Kırmızı LED')}
      <circle cx="1115" cy="256" r="3.5" fill="${c.line}"/>
      <circle cx="1115" cy="368" r="3.5" fill="${c.line}"/>
      <circle cx="1115" cy="480" r="3.5" fill="${c.line}"/>
      <circle cx="1115" cy="592" r="3.5" fill="${c.line}"/>
    </g>
    ${panel(1295, 210, 250, 92, 'DS18B20', ['D5 · su sıcaklığı'], { stroke: c.green, headFill: c.greenSoft, titleColor: c.green, headH: 36, monoRows: true, rowSize: 13 })}
    ${panel(1295, 322, 250, 92, 'DHT22', ['D6 · sıcaklık + nem'], { stroke: c.green, headFill: c.greenSoft, titleColor: c.green, headH: 36, monoRows: true, rowSize: 13 })}
    ${panel(1295, 434, 250, 92, 'Buzzer', ['D0 · alarm sesi'], { stroke: c.amber, headFill: c.amberSoft, titleColor: c.amber, headH: 36, monoRows: true, rowSize: 13 })}
    ${panel(1295, 546, 250, 92, 'Durum LED', ['D7 yeşil · D8 kırmızı'], { stroke: c.amber, headFill: c.amberSoft, titleColor: c.amber, headH: 36, monoRows: true, rowSize: 13 })}
    ${panel(560, 720, 560, 92, 'Güç ve referans hattı', ['5 V / 3 A adaptör · ESP8266 VIN · tüm bileşenlerde ortak GND'], { stroke: c.red, headFill: c.redSoft, titleColor: c.red, titleSize: 15, rowSize: 13.5 })}
    ${line(305, 194, 415, 194, { color: c.blue })}
    ${line(305, 319, 415, 319, { color: c.blue })}
    ${line(305, 444, 415, 444, { color: c.blue })}
    ${line(305, 569, 415, 569, { color: c.blue })}
    ${line(665, 388, 815, 388, { color: c.blue })}
    <rect x="703" y="366" width="74" height="16" fill="${c.paper}"/>${text(740, 378, 'I2C bus', { size: 11, weight: 700, color: c.blue, anchor: 'middle' })}
    ${line(1295, 256, 1115, 256, { color: c.green })}
    <rect x="1188" y="234" width="24" height="16" fill="${c.paper}"/>${text(1200, 246, 'D5', { size: 11, weight: 700, color: c.green, anchor: 'middle' })}
    ${line(1295, 368, 1115, 368, { color: c.green })}
    <rect x="1188" y="346" width="24" height="16" fill="${c.paper}"/>${text(1200, 358, 'D6', { size: 11, weight: 700, color: c.green, anchor: 'middle' })}
    ${line(1115, 480, 1295, 480, { color: c.amber })}
    <rect x="1188" y="458" width="24" height="16" fill="${c.paper}"/>${text(1200, 470, 'D0', { size: 11, weight: 700, color: c.amber, anchor: 'middle' })}
    ${line(1115, 592, 1295, 592, { color: c.amber })}
    <rect x="1182" y="570" width="36" height="16" fill="${c.paper}"/>${text(1200, 582, 'D7/D8', { size: 11, weight: 700, color: c.amber, anchor: 'middle' })}
    ${line(965, 720, 965, 600, { color: c.red, label: 'VIN / GND' })}
    ${line(70, 792, 104, 792, { color: c.line })}
    ${text(114, 796, 'ok yönü = sinyal / veri akışı (sensör → MCU → çıkış)', { size: 11, weight: 500, color: c.muted })}
  `;
  return shell('fig02', 1620, 860, 'Donanım bağlantı ve pin eşleştirmesi', body);
}

function figure03() {
  const rows = [
    ['Adım', 'Kaynak', 'Hedef', 'İşlem', 'Kalıcı kayıt'],
    ['1', 'ESP8266', 'sensor_readings', 'ölçüm paketi ekleme', 'pool_id, sensor_id, value, recorded_at'],
    ['2', 'ESP8266', 'pool_system_status', 'cihaz sağlığı güncelleme', 'rssi, voltage, diagnostics, last_sync'],
    ['3', 'ESP8266', 'pools', 'güncel yapılandırma okuma', 'sensor_thresholds, alarm_settings'],
    ['4', 'Web panel', 'Supabase Auth', 'kimlik doğrulama', 'auth.users.id'],
    ['5', 'Web panel', 'claim_pool()', 'cihazı kullanıcıya bağlama', 'pools.user_id'],
    ['6', 'Web panel', 'readings + status', 'grafik ve kart verisi okuma', 'son ölçümler + durum'],
    ['7', 'Web panel', 'pools', 'eşik/alarm ayarı kaydetme', 'JSONB yapılandırma'],
    ['8', 'Web panel', 'sensor_event_logs', 'alarm olayı listeleme', 'event_type, severity, alarm_key'],
  ];
  const body = table(55, 65, [90, 170, 210, 330, 500], 58, rows, { headerFill: c.soft });
  return shell('fig03', 1380, 624, 'Veri akışı ve işlem protokolü', body);
}

function erdTable(x, y, w, title, rows, opts = {}) {
  const headH = 42;
  const rowH = 28;
  const h = headH + rows.length * rowH;
  let out = `
    <g>
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="${c.paper}" stroke="${opts.stroke ?? c.line}" stroke-width="1.2"/>
      <rect x="${x}" y="${y}" width="${w}" height="${headH}" rx="4" fill="${opts.headFill ?? c.soft}"/>
      <rect x="${x}" y="${y + headH - 4}" width="${w}" height="4" fill="${opts.headFill ?? c.soft}"/>
      <line x1="${x}" y1="${y + headH}" x2="${x + w}" y2="${y + headH}" stroke="${c.grid}" stroke-width="1"/>
      ${text(x + 14, y + 27, title, { size: 14.5, weight: 700, color: opts.stroke ?? c.ink, mono: true })}`;
  rows.forEach((row, i) => {
    const cy = y + headH + i * rowH;
    const isFk = row.kind?.includes('FK');
    const isPk = row.kind?.includes('PK');
    out += `<line x1="${x}" y1="${cy}" x2="${x + w}" y2="${cy}" stroke="${c.grid}" stroke-width="1"/>`;
    out += text(x + 12, cy + 19, row.name, { size: 12.5, weight: isPk ? 800 : 500, color: c.text, mono: true });
    if (row.kind) {
      const bx = x + w - 46;
      const color = isPk ? c.ink : c.blue;
      out += `<rect x="${bx}" y="${cy + 6}" width="34" height="16" rx="3" fill="${isFk ? c.blueSoft : c.soft}" stroke="${color}" stroke-width="1"/>`;
      out += text(bx + 17, cy + 18, row.kind, { size: 9, weight: 800, color, anchor: 'middle' });
    }
  });
  return `${out}</g>`;
}

function relationBadge(x, y, label, color = c.line) {
  return `<g><circle cx="${x}" cy="${y}" r="15" fill="${c.paper}" stroke="${color}" stroke-width="1.5"/>${text(x, y + 5, label, { size: 11, weight: 800, color, anchor: 'middle' })}</g>`;
}

function figure04() {
  const body = `
    ${erdTable(60, 80, 330, 'auth.users', [
      { name: 'id uuid', kind: 'PK' },
      { name: 'email text', kind: '' },
      { name: 'created_at timestamptz', kind: '' },
    ])}
    ${erdTable(60, 330, 330, 'user_preferences', [
      { name: 'user_id uuid', kind: 'PK/FK' },
      { name: 'use_mock_data boolean', kind: '' },
      { name: 'refresh_interval_ms int', kind: '' },
      { name: 'dev_mode boolean', kind: '' },
      { name: 'created_at timestamptz', kind: '' },
      { name: 'updated_at timestamptz', kind: '' },
    ], { stroke: c.green, headFill: c.greenSoft })}
    ${erdTable(500, 220, 390, 'pools', [
      { name: 'id uuid', kind: 'PK' },
      { name: 'user_id uuid nullable', kind: 'FK' },
      { name: 'name text', kind: '' },
      { name: 'location text', kind: '' },
      { name: 'sort_order int', kind: '' },
      { name: 'sensor_offsets jsonb', kind: '' },
      { name: 'sensor_thresholds jsonb', kind: '' },
      { name: 'alarm_settings jsonb', kind: '' },
      { name: 'created_at timestamptz', kind: '' },
    ], { stroke: c.blue, headFill: c.blueSoft })}
    ${erdTable(1110, 60, 385, 'pool_system_status', [
      { name: 'pool_id uuid', kind: 'PK/FK' },
      { name: 'uptime_seconds int', kind: '' },
      { name: 'rssi int', kind: '' },
      { name: 'voltage numeric(4,2)', kind: '' },
      { name: 'last_sync timestamptz', kind: '' },
      { name: 'sensor_connections jsonb', kind: '' },
      { name: 'diagnostics jsonb', kind: '' },
      { name: 'updated_at timestamptz', kind: '' },
    ], { stroke: c.amber, headFill: c.amberSoft })}
    ${erdTable(1110, 360, 385, 'sensor_readings', [
      { name: 'id bigint', kind: 'PK' },
      { name: 'pool_id uuid', kind: 'FK' },
      { name: 'sensor_id text', kind: '' },
      { name: 'value numeric(10,2)', kind: '' },
      { name: 'recorded_at timestamptz', kind: '' },
    ], { stroke: c.green, headFill: c.greenSoft })}
    ${erdTable(1110, 610, 385, 'sensor_event_logs', [
      { name: 'id bigint', kind: 'PK' },
      { name: 'pool_id uuid', kind: 'FK' },
      { name: 'event_type text', kind: '' },
      { name: 'sensor_id text nullable', kind: '' },
      { name: 'alarm_key text', kind: '' },
      { name: 'severity text', kind: '' },
      { name: 'value numeric(10,2)', kind: '' },
      { name: 'threshold_min numeric', kind: '' },
      { name: 'threshold_max numeric', kind: '' },
      { name: 'message text', kind: '' },
      { name: 'metadata jsonb', kind: '' },
      { name: 'created_at timestamptz', kind: '' },
    ], { stroke: c.red, headFill: c.redSoft })}
    ${elbow([[60, 136], [34, 136], [34, 386], [60, 386]], { label: 'R1', labelWidth: 36, labelAt: [34, 260] })}
    ${elbow([[390, 136], [450, 136], [450, 304], [500, 304]], { label: 'R2', labelWidth: 36, labelAt: [450, 220] })}
    ${elbow([[890, 276], [972, 276], [972, 116], [1110, 116]], { color: c.amber, marker: 'arrowAmber', label: 'R3', labelWidth: 36, labelAt: [972, 190] })}
    ${elbow([[890, 276], [1002, 276], [1002, 444], [1110, 444]], { color: c.green, marker: 'arrowGreen', label: 'R4', labelWidth: 36, labelAt: [1002, 360] })}
    ${elbow([[890, 276], [1032, 276], [1032, 694], [1110, 694]], { color: c.red, marker: 'arrowRed', label: 'R5', labelWidth: 36, labelAt: [1032, 520] })}
    ${table(60, 635, [68, 320, 320, 120], 40, [
      ['No', 'Kaynak sütun', 'Hedef sütun', 'Kard.'],
      ['R1', 'auth.users.id', 'user_preferences.user_id', '1:1'],
      ['R2', 'auth.users.id', 'pools.user_id', '1:N'],
      ['R3', 'pools.id', 'pool_system_status.pool_id', '1:1'],
      ['R4', 'pools.id', 'sensor_readings.pool_id', '1:N'],
      ['R5', 'pools.id', 'sensor_event_logs.pool_id', '1:N'],
    ], { headerFill: c.soft, mono: true })}
  `;
  return shell('fig04', 1580, 1010, 'Tam veritabanı ilişki diyagramı', body);
}

function figure05() {
  const body = `
    ${panel(70, 80, 310, 82, 'Başlatma', ['GPIO, seri haberleşme, EEPROM'], { stroke: c.blue, headFill: c.blueSoft, titleColor: c.blue })}
    ${panel(70, 225, 310, 82, 'Arayüz doğrulama', ['I2C, ADS1115, DS18B20, DHT22'], { stroke: c.blue, headFill: c.blueSoft, titleColor: c.blue })}
    ${diamond(225, 420, 250, 112, 'Ağ erişimi doğrulandı mı?', { stroke: c.blue, fill: c.blueSoft, color: c.blue, max: 14 })}
    ${panel(500, 210, 315, 100, 'Bulut ayarlarını al', ['pools.alarm_settings', 'sensor_thresholds'], { stroke: c.green, headFill: c.greenSoft, titleColor: c.green, monoRows: true })}
    ${panel(500, 430, 315, 100, 'Önbellek ayarını kullan', ['EEPROM son geçerli eşikler'], { stroke: c.amber, headFill: c.amberSoft, titleColor: c.amber })}
    ${panel(860, 320, 315, 100, 'Ölçüm ve dönüşüm', ['ADS1115 + dijital sensörler', 'fiziksel birim hesabı'], { stroke: c.green, headFill: c.greenSoft, titleColor: c.green })}
    ${diamond(1340, 370, 260, 120, 'Eşik sınırı aşıldı mı?', { stroke: c.red, fill: c.redSoft, color: c.red, max: 14 })}
    ${panel(1200, 95, 300, 100, 'Normal kayıt', ['sensor_readings', 'pool_system_status'], { stroke: c.green, headFill: c.greenSoft, titleColor: c.green, monoRows: true })}
    ${panel(1200, 545, 300, 100, 'Alarm çıktısı', ['buzzer/LED', 'sensor_event_logs'], { stroke: c.red, headFill: c.redSoft, titleColor: c.red, monoRows: true })}
    ${line(225, 162, 225, 225, { color: c.blue, marker: 'arrowBlue' })}
    ${line(225, 307, 225, 364, { color: c.blue, marker: 'arrowBlue' })}
    ${elbow([[350, 420], [420, 420], [420, 260], [500, 260]], { color: c.green, label: 'evet', labelWidth: 48, labelAt: [385, 420] })}
    ${elbow([[225, 476], [420, 476], [420, 480], [500, 480]], { color: c.amber, label: 'hayır', labelWidth: 48, labelAt: [320, 476] })}
    ${elbow([[815, 260], [840, 260], [840, 370], [860, 370]], { color: c.green, marker: 'arrowGreen' })}
    ${elbow([[815, 480], [840, 480], [840, 370], [860, 370]], { color: c.amber, marker: 'arrowAmber' })}
    ${line(1175, 370, 1210, 370, { color: c.green, marker: 'arrowGreen' })}
    ${line(1340, 310, 1340, 195, { color: c.green, marker: 'arrowGreen', label: 'hayır', labelWidth: 48 })}
    ${line(1340, 430, 1340, 545, { color: c.red, marker: 'arrowRed', label: 'evet', labelWidth: 48 })}
  `;
  return shell('fig05', 1580, 720, 'Firmware karar akışı', body);
}

function figure06() {
  const body = `
    ${panel(70, 95, 260, 95, 'Ölçüm', ['value + recorded_at'], { headFill: c.soft })}
    ${panel(430, 95, 280, 95, 'Geçerlilik', ['bağlantı ve okuma bütünlüğü'], { stroke: c.blue, headFill: c.blueSoft, titleColor: c.blue })}
    ${diamond(900, 143, 250, 110, 'Eşik aralığı?', { stroke: c.red, fill: c.redSoft, color: c.red })}
    ${panel(1160, 55, 260, 90, 'Normal', ['panel kartı sağlıklı'], { stroke: c.green, headFill: c.greenSoft, titleColor: c.green })}
    ${panel(1160, 190, 260, 90, 'Uyarı / kritik', ['alarm_key oluşturulur'], { stroke: c.red, headFill: c.redSoft, titleColor: c.red })}
    ${panel(1160, 325, 260, 90, 'Olay kaydı', ['sensor_event_logs'], { stroke: c.amber, headFill: c.amberSoft, titleColor: c.amber, monoRows: true })}
    ${panel(430, 350, 420, 95, 'Susturma kuralı', ['mutedAlarmKey yalnızca aktif alarm anahtarını kapsar'], { headFill: c.soft })}
    ${line(330, 143, 430, 143)}
    ${line(710, 143, 775, 143, { color: c.red })}
    ${elbow([[1025, 143], [1090, 143], [1090, 100], [1160, 100]], { color: c.green, label: 'içinde', labelAt: [1090, 122] })}
    ${elbow([[900, 198], [900, 235], [1160, 235]], { color: c.red, label: 'dışında', labelAt: [1030, 235] })}
    ${line(1290, 280, 1290, 325, { color: c.amber, label: 'kayıt' })}
    ${elbow([[1160, 260], [1000, 260], [1000, 320], [640, 320], [640, 350]], { color: c.red, label: 'alarm anahtarı', labelAt: [820, 320], labelWidth: 92 })}
  `;
  return shell('fig06', 1490, 590, 'Alarm karar modeli', body);
}

function figure07() {
  const body = `
    <line x1="120" y1="260" x2="1240" y2="260" stroke="${c.line}" stroke-width="1.4"/>
    <circle cx="220" cy="260" r="11" fill="${c.greenSoft}" stroke="${c.green}" stroke-width="1.6" />
    <circle cx="590" cy="260" r="11" fill="${c.amberSoft}" stroke="${c.amber}" stroke-width="1.6" />
    <circle cx="980" cy="260" r="11" fill="${c.redSoft}" stroke="${c.red}" stroke-width="1.6" />
    ${panel(115, 95, 250, 110, 'Canlı', ['son kayıt beklenen çevrim içinde'], { stroke: c.green, headFill: c.greenSoft, titleColor: c.green })}
    ${panel(485, 95, 250, 110, 'Veri bekleniyor', ['yaklaşık iki çevrim gecikme'], { stroke: c.amber, headFill: c.amberSoft, titleColor: c.amber })}
    ${panel(875, 95, 250, 110, 'Veri yok', ['yaklaşık üç çevrim ve üzeri'], { stroke: c.red, headFill: c.redSoft, titleColor: c.red })}
    ${badge(405, 260, '2 çevrim', { color: c.amber, fill: c.paper })}
    ${badge(785, 260, '3 çevrim', { color: c.red, fill: c.paper })}
    ${line(220, 430, 220, 274, { color: c.green, marker: 'arrowGreen' })}
    ${text(220, 446, 'yeni kayıt', { size: 11, weight: 750, color: c.green, anchor: 'middle' })}
    ${line(590, 430, 590, 274, { color: c.green, marker: 'arrowGreen' })}
    ${text(590, 446, 'yeni kayıt', { size: 11, weight: 750, color: c.green, anchor: 'middle' })}
    ${panel(380, 500, 620, 110, 'Çevrim temeli', ['readingIntervalMs ve gözlenen son sensör zaman damgası birlikte değerlendirilir'], { headFill: c.soft })}
  `;
  return shell('fig07', 1360, 700, 'Veri güncelliği durum modeli', body);
}

function figure08() {
  const body = `
    ${panel(70, 120, 250, 98, 'Kullanıcı oturumu', ['auth.uid()'], { headFill: c.soft, monoRows: true })}
    ${panel(430, 120, 250, 98, 'Çalışma alanı', ['user_preferences'], { stroke: c.green, headFill: c.greenSoft, titleColor: c.green, monoRows: true })}
    ${panel(790, 120, 250, 98, 'Cihaz kimliği', ['target_pool_id'], { stroke: c.blue, headFill: c.blueSoft, titleColor: c.blue, monoRows: true })}
    ${panel(1150, 120, 280, 98, 'Sahiplenilmiş havuz', ['pools.user_id = auth.uid()'], { stroke: c.amber, headFill: c.amberSoft, titleColor: c.amber, monoRows: true })}
    ${panel(610, 360, 380, 95, 'Sahipsiz başlangıç', ['pools.user_id NULL olabilir; claim_pool() sonrası kullanıcı hesabına bağlanır'], { headFill: c.soft })}
    ${line(320, 169, 430, 169)}
    ${line(680, 169, 790, 169, { color: c.blue, marker: 'arrowBlue' })}
    ${line(1040, 169, 1150, 169, { color: c.amber, marker: 'arrowAmber' })}
    ${elbow([[915, 218], [915, 300], [800, 300], [800, 360]], { color: c.blue, marker: 'arrowBlue', label: 'claim_pool()' })}
  `;
  return shell('fig08', 1500, 560, 'Cihaz sahiplenme akışı', body);
}

function figure09() {
  const body = `
    ${panel(75, 95, 305, 115, 'AuthProvider', ['oturum izleme', 'giriş/kayıt'], { headFill: c.soft })}
    ${panel(525, 95, 330, 115, 'DataProvider', ['havuz yükleme', 'canlı/mock veri', 'eşik ve alarm güncelleme'], { stroke: c.blue, headFill: c.blueSoft, titleColor: c.blue })}
    ${panel(1000, 95, 305, 115, 'Sayfalar', ['Overview', 'Settings', 'SystemStatus'], { stroke: c.amber, headFill: c.amberSoft, titleColor: c.amber })}
    ${panel(310, 380, 330, 125, 'Gösterge bileşenleri', ['SensorCard', 'SparklineChart', 'AnomalyFeed'], { headFill: c.soft })}
    ${panel(790, 380, 330, 125, 'İşlem bileşenleri', ['SensorDetailModal', 'PoolExportPanel', 'SensorCalibrationDialog'], { headFill: c.soft })}
    ${line(380, 152, 525, 152)}
    ${line(855, 152, 1000, 152, { color: c.amber, marker: 'arrowAmber' })}
    ${elbow([[690, 210], [690, 300], [475, 300], [475, 380]], { color: c.blue, marker: 'arrowBlue' })}
    ${elbow([[690, 210], [690, 300], [955, 300], [955, 380]], { color: c.blue, marker: 'arrowBlue' })}
  `;
  return shell('fig09', 1380, 600, 'Web panel modül mimarisi', body);
}

function figure10() {
  const body = `
    ${panel(80, 120, 280, 105, 'İstemci', ['anon key', 'auth session'], { headFill: c.soft })}
    ${panel(500, 120, 280, 105, 'RLS ilkesi', ['pools.user_id = auth.uid()'], { stroke: c.green, headFill: c.greenSoft, titleColor: c.green, monoRows: true })}
    ${panel(920, 60, 300, 130, 'Okuma kapsamı', ['pools', 'sensor_readings', 'pool_system_status'], { stroke: c.green, headFill: c.greenSoft, titleColor: c.green, monoRows: true })}
    ${panel(920, 250, 300, 130, 'Yazma kapsamı', ['thresholds', 'alarm_settings', 'sensor_event_logs'], { stroke: c.amber, headFill: c.amberSoft, titleColor: c.amber, monoRows: true })}
    ${panel(500, 430, 430, 112, 'Yönetici sınırı', ['servis rolü istemciye verilmez; kayıt işlemleri edge function ile sınırlandırılır'], { headFill: c.soft })}
    ${line(360, 172, 500, 172, { label: 'kimlik' })}
    ${elbow([[780, 155], [850, 155], [850, 110], [920, 110]], { color: c.green, label: 'SELECT' })}
    ${elbow([[780, 190], [850, 190], [850, 300], [920, 300]], { color: c.amber, label: 'UPDATE/INSERT' })}
  `;
  return shell('fig10', 1300, 610, 'Yetkilendirme ve veri erişim modeli', body);
}

function figure11() {
  const rows = [
    ['Doğrulama alanı', 'Kanıt', 'Beklenen çıktı'],
    ['Donanım bağlantısı', 'ADS/I2C/GPIO durumu', 'sensör bağlantı sürekliliği'],
    ['Ölçüm aktarımı', 'sensor_readings satırları', 'zaman damgalı değerler'],
    ['Cihaz sağlığı', 'pool_system_status', 'RSSI, gerilim, son senkron'],
    ['Alarm davranışı', 'sensor_event_logs', 'event_type, severity, alarm_key'],
    ['Panel kullanımı', 'grafik, kart, dışa aktarım', 'okunabilir kullanıcı çıktısı'],
  ];
  return shell('fig11', 1280, 596, 'Doğrulama matrisi', table(70, 70, [260, 360, 500], 72, rows, { headerFill: c.soft }));
}

function figure12() {
  const rows = [
    ['Parametre', 'Sensör / kaynak', 'Birim', 'Veri kimliği'],
    ['pH', 'pH probu -> ADS1115 A0', '-', 'ph'],
    ['EC', 'TDS/EC probu -> ADS1115 A1', 'mS/cm', 'ec'],
    ['TDS', 'TDS/EC probu -> ADS1115 A1', 'ppm', 'tds'],
    ['Çözünmüş oksijen', 'DO probu -> ADS1115 A2', 'mg/L', 'do'],
    ['Işık', 'LDR -> ADS1115 A3', '%', 'ldr'],
    ['Su sıcaklığı', 'DS18B20 -> D5', '°C', 'waterTemp'],
    ['Hava sıcaklığı', 'DHT22 -> D6', '°C', 'airTemp'],
    ['Nem', 'DHT22 -> D6', '%', 'humidity'],
  ];
  return shell('fig12', 1340, 706, 'Ölçüm parametreleri', table(70, 65, [255, 410, 160, 245], 64, rows, { headerFill: c.soft }));
}

const figures = [
  ['sekil-01-genel-sistem-mimarisi.svg', 'Genel sistem mimarisi', 'Saha ölçüm katmanı, ESP8266 kenar düğümü, Supabase veri katmanı ve web paneli arasındaki ölçüm/yapılandırma akışı.', figure01()],
  ['sekil-02-donanim-baglanti-pin-eslestirmesi.svg', 'Donanım bağlantı ve pin eşleştirmesi', 'Analog ve dijital sensörlerin ADS1115 ve ESP8266 pinleriyle açık bağlantı şeması.', figure02()],
  ['sekil-03-veri-akisi-islem-protokolu.svg', 'Veri akışı ve işlem protokolü', 'ESP8266, Supabase ve web paneli arasında gerçekleşen temel okuma/yazma işlemleri.', figure03()],
  ['sekil-04-tam-veritabani-iliski-diyagrami.svg', 'Tam veritabanı ilişki diyagramı', 'Tablolar arasındaki PK/FK ilişkileri ve kaynak-hedef sütun eşleşmeleri.', figure04()],
  ['sekil-05-firmware-karar-akisi.svg', 'Firmware karar akışı', 'ESP8266 yazılımında ağ, yapılandırma, ölçüm, eşik ve alarm kararlarının çalışma sırası.', figure05()],
  ['sekil-06-alarm-karar-modeli.svg', 'Alarm karar modeli', 'Ölçüm geçerliliği, eşik karşılaştırma, susturma ve olay günlüğü ilişkisi.', figure06()],
  ['sekil-07-veri-guncelligi-durum-modeli.svg', 'Veri güncelliği durum modeli', 'Canlı, bekleniyor ve veri yok durumlarının cihaz çevrimine göre ayrılması.', figure07()],
  ['sekil-08-cihaz-sahiplenme-akisi.svg', 'Cihaz sahiplenme akışı', 'Kullanıcı oturumu, çalışma alanı ve claim_pool() ile cihazın kullanıcı hesabına bağlanması.', figure08()],
  ['sekil-09-web-panel-modul-mimarisi.svg', 'Web panel modül mimarisi', 'React panelde oturum, veri sağlayıcı, sayfalar ve bileşenler arasındaki bağımlılıklar.', figure09()],
  ['sekil-10-yetkilendirme-veri-erisim-modeli.svg', 'Yetkilendirme ve veri erişim modeli', 'Auth oturumu, RLS politikası ve istemci/yönetici sınırlarının veri erişimine etkisi.', figure10()],
  ['sekil-11-dogrulama-matrisi.svg', 'Doğrulama matrisi', 'Donanım, veri aktarımı, cihaz sağlığı, alarm ve panel çıktılarının doğrulama kanıtları.', figure11()],
  ['sekil-12-olcum-parametreleri.svg', 'Ölçüm parametreleri', 'Sensörler, birimler ve veritabanında kullanılan sensör kimlikleri.', figure12()],
];

const databaseSummaryRows = [
  ['Tablo', 'Amaç', 'Ana alanlar'],
  ['user_preferences', 'Panel tercihleri', 'user_id, use_mock_data, refresh_interval_ms, dev_mode'],
  ['pools', 'Havuz/cihaz kaydı ve ayarlar', 'id, user_id, name, sensor_thresholds, alarm_settings'],
  ['pool_system_status', 'Cihaz sağlık durumu', 'pool_id, uptime_seconds, rssi, voltage, sensor_connections, diagnostics'],
  ['sensor_readings', 'Zaman serisi ölçümler', 'pool_id, sensor_id, value, recorded_at'],
  ['sensor_event_logs', 'Alarm ve olay geçmişi', 'pool_id, event_type, sensor_id, alarm_key, severity, created_at'],
];

const relationRows = [
  ['No', 'Kaynak sütun', 'Hedef sütun', 'Kardinalite'],
  ['R1', 'auth.users.id', 'user_preferences.user_id', '1:1'],
  ['R2', 'auth.users.id', 'pools.user_id', '1:N'],
  ['R3', 'pools.id', 'pool_system_status.pool_id', '1:1'],
  ['R4', 'pools.id', 'sensor_readings.pool_id', '1:N'],
  ['R5', 'pools.id', 'sensor_event_logs.pool_id', '1:N'],
];

function mdTable(rows) {
  const [head, ...body] = rows;
  return `| ${head.join(' | ')} |\n| ${head.map(() => '---').join(' | ')} |\n${body.map(row => `| ${row.join(' | ')} |`).join('\n')}`;
}

function readmeMd() {
  return `# AICO TÜBİTAK 2209-A Akademik Figür Paketi

Bu paket, AICO alg havuzu izleme projesi için makale/rapor kullanımına uygun, açıklaması altyazıda verilen ve görsel içinde gereksiz metin taşımayan figürlerden oluşur.

## Tasarım Kararları

- Görsellerde büyük "Şekil" başlığı, uzun açıklama kutusu veya rapor paragrafı bulunmaz.
- Akış yönleri oklarla, ilişki ayrıntıları ise kısa etiketler ve tablo içi eşleşmelerle verilir.
- Veritabanı figüründe her FK ilişkisi \`kaynak tablo.sütun -> hedef tablo.sütun\` biçiminde gösterilmiştir.
- Renkler yalnızca katman/işlev ayrımı için kullanılmıştır; ana taşıyıcı çizgi ve tablo yapısı sade tutulmuştur.

## Figür Listesi

${mdTable([
    ['No', 'Dosya', 'Başlık', 'Rapor altyazısı'],
    ...figures.map((fig, i) => [`Şekil ${i + 1}`, `figures/${fig[0]}`, fig[1], fig[2]]),
  ])}

## Veritabanı FK Eşleşmeleri

${mdTable(relationRows)}

## Ana Çıktılar

- \`aico-2209a-diyagram-paketi.pdf\`: 12 figürlük A4 yatay PDF.
- \`aico-2209a-final-raporu.pdf\`: figürleri kullanan 2209-A final rapor taslak PDF.
- \`aico-2209a-final-raporu.md\`: düzenlenebilir rapor metni.
- \`veritabani-tablo-sozlugu.md\`: tablo ve ilişki sözlüğü.
`;
}

function reportFiguresMd() {
  return `# AICO 2209-A Rapor Figürleri

${figures.map((fig, i) => `## Şekil ${i + 1}. ${fig[1]}\n\nDosya: \`figures/${fig[0]}\`\n\nAltyazı: ${fig[2]}\n`).join('\n')}
`;
}

function dbMd() {
  return `# AICO 2209-A Veritabanı Tabloları

## Tablo Özeti

${mdTable(databaseSummaryRows)}

## FK İlişki Özeti

${mdTable(relationRows)}

## Sensör Kimlikleri

${mdTable([
    ['Sensör', 'Kimlik', 'Birim', 'Kaynak'],
    ['pH', 'ph', '-', 'ADS1115 A0'],
    ['EC', 'ec', 'mS/cm', 'ADS1115 A1'],
    ['TDS', 'tds', 'ppm', 'ADS1115 A1'],
    ['Çözünmüş oksijen', 'do', 'mg/L', 'ADS1115 A2'],
    ['Işık', 'ldr', '%', 'ADS1115 A3'],
    ['Su sıcaklığı', 'waterTemp', '°C', 'DS18B20 D5'],
    ['Hava sıcaklığı', 'airTemp', '°C', 'DHT22 D6'],
    ['Nem', 'humidity', '%', 'DHT22 D6'],
  ])}
`;
}

function finalReportMd() {
  return `# AICO Alg Havuzu Kontrol Sistemi 2209-A Final Rapor Taslağı

## Özet

Bu çalışmada alg havuzlarında su kalitesi ve çevresel koşulların izlenmesi için ESP8266 tabanlı, Supabase/PostgreSQL destekli ve web paneliyle yönetilebilen bir izleme sistemi geliştirilmiştir. Sistem pH, EC/TDS, çözünmüş oksijen, ışık, su sıcaklığı, hava sıcaklığı ve nem parametrelerini izlemek üzere tasarlanmıştır.

## Amaç

Projenin amacı, alg havuzundaki kritik çevresel değişkenleri düzenli ölçen, ölçüm verisini merkezi veritabanında saklayan, kullanıcıya canlı panel sunan ve eşik ihlallerinde alarm/olay kaydı üreten bir prototip oluşturmaktır.

## Yöntem

Sistem; saha ölçüm katmanı, ESP8266 kenar düğümü, Supabase veri katmanı ve React tabanlı web panelinden oluşur. Analog sensörler ADS1115 üzerinden, dijital sensörler ise ESP8266 GPIO pinleri üzerinden okunur. Ölçümler sensor_readings tablosuna, cihaz durumu pool_system_status tablosuna, eşik ve alarm yapılandırmaları pools tablosundaki JSONB alanlara kaydedilir.

## Veritabanı Tasarımı

Veritabanı modeli kullanıcı, havuz/cihaz, ölçüm, cihaz durumu ve olay günlüklerini ayrı tablolarla temsil eder. Temel ilişkiler auth.users.id alanından user_preferences.user_id ve pools.user_id alanlarına; pools.id alanından pool_system_status.pool_id, sensor_readings.pool_id ve sensor_event_logs.pool_id alanlarına kurulmuştur.

## Sonuç

Proje çıktısı, ölçüm toplama, veri kaydı, kullanıcıya bağlı cihaz yönetimi, alarm eşik yönetimi ve raporlanabilir veri üretimi için bütünleşik bir prototip sunar. Final raporda kişisel/proje kimlik bilgileri, gerçek deney koşulları, kalibrasyon yöntemi ve sayısal ölçüm sonuçları ayrıca tamamlanmalıdır.
`;
}

function figurePackHtml() {
  return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>AICO Figür Paketi</title>
  <style>@page{size:A4 landscape;margin:12mm}body{margin:0;font-family:Arial,sans-serif;color:#111}.page{page-break-after:always;padding:8mm}img{width:100%;height:150mm;object-fit:contain;border:1px solid #cbd5e1}.caption{font-size:12px;line-height:1.4;color:#334155}</style></head><body>
  ${figures.map((fig, i) => `<section class="page"><img src="figures/${esc(fig[0])}" alt="${esc(fig[1])}"><p class="caption"><strong>Şekil ${i + 1}.</strong> ${esc(fig[1])}. ${esc(fig[2])}</p></section>`).join('')}
  </body></html>`;
}

const reportPages = [
  { title: 'AICO Alg Havuzu Kontrol Sistemi', paragraphs: ['TÜBİTAK 2209-A final rapor taslağı.', 'Bu dosya figürleri ve raporda yazılması gereken ana teknik içeriği bir arada sunar.'] },
  { title: 'Özet ve Amaç', paragraphs: ['Alg havuzlarında su kalitesi ve çevresel koşulların düzenli izlenmesi üretim kararlılığı için önemlidir.', 'Bu proje, ESP8266 tabanlı ölçüm, Supabase veri kaydı, web paneli ve alarm yönetimini bir prototipte birleştirir.'] },
  { title: 'Sistem ve Donanım', figures: [0, 1] },
  { title: 'Veri Akışı', figure: 2 },
  { title: 'Veritabanı Tasarımı', figure: 3, landscape: true },
  { title: 'Gömülü Yazılım', figure: 4 },
  { title: 'Alarm ve Veri Güncelliği', figures: [5, 6] },
  { title: 'Kullanıcı, Panel ve Yetki', figures: [7, 8, 9] },
  { title: 'Doğrulama ve Parametreler', figures: [10, 11] },
  { title: 'Sonuç', paragraphs: ['Geliştirilen mimari sensör ölçümü, veri saklama, canlı panel, alarm olay kaydı ve kullanıcıya bağlı cihaz yönetimini destekler.', 'Final rapora gerçek deney koşulları, kalibrasyon yöntemi, ölçüm sonuçları, hata/kararlılık analizi ve sınırlılıklar eklenmelidir.'] },
];

function svgData(svg) {
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

function reportPageSvg(page, index) {
  const landscape = page.landscape === true;
  const w = landscape ? 1754 : 1240;
  const h = landscape ? 1240 : 1754;
  let body = '';
  body += text(landscape ? 70 : 95, landscape ? 95 : 120, page.title, { size: 30, weight: 800, color: c.ink, max: landscape ? 60 : 44, lineHeight: 38 });
  let y = landscape ? 160 : 190;
  if (page.paragraphs) {
    for (const paragraph of page.paragraphs) {
      body += text(95, y, paragraph, { size: 20, color: c.text, max: 82, lineHeight: 30 });
      y += wrap(paragraph, 82).length * 30 + 24;
    }
  }
  const addFig = (figIndex, x, fy, fw, fh) => {
    const fig = figures[figIndex];
    body += `<image href="${svgData(fig[3])}" x="${x}" y="${fy}" width="${fw}" height="${fh}" preserveAspectRatio="xMidYMid meet"/>`;
    body += text(x, fy + fh + 32, `Şekil ${figIndex + 1}. ${fig[1]}. ${fig[2]}`, { size: 13, color: c.text, max: Math.floor(fw / 8.4), lineHeight: 19 });
  };
  if (typeof page.figure === 'number') {
    if (landscape) addFig(page.figure, 70, 150, 1614, 870);
    else addFig(page.figure, 95, 230, 1050, 920);
  }
  if (page.figures) {
    const layout = page.figures.length === 3
      ? [[80, 245, 520, 370], [640, 245, 520, 370], [250, 835, 740, 485]]
      : [[95, 230, 1050, 575], [95, 950, 1050, 575]];
    page.figures.forEach((figIndex, i) => addFig(figIndex, ...layout[i]));
  }
  const footerY = h - 134;
  const footerTextY = h - 94;
  body += `<line x1="${landscape ? 70 : 95}" y1="${footerY}" x2="${w - (landscape ? 70 : 95)}" y2="${footerY}" stroke="${c.grid}"/>`;
  body += text(landscape ? 70 : 95, footerTextY, 'AICO 2209-A Final Rapor Taslağı', { size: 13, color: c.muted });
  body += text(w - (landscape ? 70 : 95), footerTextY, String(index + 1), { size: 13, color: c.muted, anchor: 'end' });
  return shell(`report-page-${index + 1}`, w, h, page.title, body);
}

for (const [file, , , svg] of figures) writeFileSync(join(figDir, file), svg, 'utf8');
reportPages.forEach((page, i) => writeFileSync(join(reportPageDir, `sayfa-${String(i + 1).padStart(2, '0')}.svg`), reportPageSvg(page, i), 'utf8'));
writeFileSync(join(outDir, 'README.md'), readmeMd(), 'utf8');
writeFileSync(join(outDir, 'aico-2209a-rapor-figurleri.md'), reportFiguresMd(), 'utf8');
writeFileSync(join(outDir, 'veritabani-tablo-sozlugu.md'), dbMd(), 'utf8');
writeFileSync(join(outDir, 'aico-2209a-final-raporu.md'), finalReportMd(), 'utf8');
writeFileSync(join(outDir, 'aico-2209a-diyagram-paketi.html'), figurePackHtml(), 'utf8');

console.log(`AICO 2209-A profesyonel akademik figür paketi üretildi: ${outDir}`);
