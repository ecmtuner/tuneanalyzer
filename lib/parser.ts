import { detectColumns, ColumnMap } from './columns';

export interface LogRow {
  time: number;
  accelPedal: number;
  rpm: number;
  gear: number;
  iat: number;
  coolantTemp: number;
  boostActual: number;
  boostTarget: number;
  boostDeviation: number;
  lambdaBank1: number;
  lambdaBank2: number;
  knockCyl: number[]; // per cylinder corrections
  knockDetected: number;
  flexEthanol: number;
  throttleAngle: number;
  ignTiming: number;
  oilTemp: number;
  hpfpActual: number;
  hpfpTarget: number;
  lpfpActual: number;
}

export interface ParsedLog {
  rows: LogRow[];
  headers: string[];
  columnMap: ColumnMap;
  cylinderCount: number;
  detectedEthanol: number | null; // from flex sensor if available
}

function parseNum(val: string | undefined): number {
  if (!val || val.trim() === '') return 0;
  const n = parseFloat(val.trim());
  return isNaN(n) ? 0 : n;
}

export function parseCSV(raw: string): ParsedLog {
  // Normalize line endings (Windows \r\n, Mac \r, Unix \n)
  const normalized = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Filter out comment/metadata lines (MHD uses # prefix, some tools use ; or //)
  const lines = normalized.split('\n').filter(l => {
    const t = l.trim();
    return t.length > 0 && !t.startsWith('#') && !t.startsWith(';') && !t.startsWith('//');
  });

  // Find header line — first line that looks like a header (has Time or RPM or Engine speed)
  let headerIdx = 0;
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const lower = lines[i].toLowerCase();
    if (lower.includes('time') || lower.includes('rpm') || lower.includes('engine speed') || lower.includes('boost')) {
      headerIdx = i;
      break;
    }
  }

  const headers = lines[headerIdx].split(',').map(h => h.trim().replace(/"/g, ''));
  const columnMap = detectColumns(headers);

  // Count detected knock cylinders
  const cylinderCount = columnMap.knockCyl.filter(c => c !== null).length || 4;

  // Parse data rows
  const rows: LogRow[] = [];
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const cols = line.split(',');
    const get = (colName: string | null) => {
      if (!colName) return '0';
      const idx = headers.indexOf(colName);
      return idx >= 0 ? (cols[idx] || '0') : '0';
    };

    const knockCylValues: number[] = [];
    for (let c = 0; c < 8; c++) {
      knockCylValues.push(parseNum(get(columnMap.knockCyl[c] || null)));
    }

    rows.push({
      time: parseNum(get(columnMap.time)),
      accelPedal: parseNum(get(columnMap.accelPedal)),
      rpm: parseNum(get(columnMap.rpm)),
      gear: parseNum(get(columnMap.gear)),
      iat: parseNum(get(columnMap.iat)),
      coolantTemp: parseNum(get(columnMap.coolantTemp)),
      boostActual: parseNum(get(columnMap.boostActual)),
      boostTarget: parseNum(get(columnMap.boostTarget)),
      boostDeviation: parseNum(get(columnMap.boostDeviation)),
      lambdaBank1: parseNum(get(columnMap.lambdaActBank1)),
      lambdaBank2: parseNum(get(columnMap.lambdaActBank2)),
      knockCyl: knockCylValues,
      knockDetected: parseNum(get(columnMap.knockDetected)),
      flexEthanol: parseNum(get(columnMap.flexEthanol)),
      throttleAngle: parseNum(get(columnMap.throttleAngle)),
      ignTiming: parseNum(get(columnMap.ignTiming)),
      oilTemp: parseNum(get(columnMap.oilTemp)),
      hpfpActual: parseNum(get(columnMap.hpfpActual)),
      hpfpTarget: parseNum(get(columnMap.hpfpTarget)),
      lpfpActual: parseNum(get(columnMap.lpfpActual)),
    });
  }

  // Detect ethanol from flex sensor (average non-zero readings)
  const ethanolReadings = rows.map(r => r.flexEthanol).filter(v => v > 0 && v <= 100);
  const detectedEthanol = ethanolReadings.length > 0
    ? Math.round(ethanolReadings.reduce((a, b) => a + b, 0) / ethanolReadings.length)
    : null;

  return { rows, headers, columnMap, cylinderCount, detectedEthanol };
}
