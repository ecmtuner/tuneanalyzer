// Flexible column name mapping for different logging platforms

export type Platform = 'bm3' | 'mhd' | 'mgflash' | 'ecutek' | 'generic';

export interface ColumnMap {
  time: string | null;
  accelPedal: string | null;
  rpm: string | null;
  gear: string | null;
  iat: string | null;
  coolantTemp: string | null;
  boostActual: string | null;
  boostTarget: string | null;
  boostDeviation: string | null;
  lambdaActBank1: string | null;
  lambdaActBank2: string | null;
  knockCyl: (string | null)[];
  knockDetected: string | null;
  flexEthanol: string | null;
  throttleAngle: string | null;
  ignTiming: string | null;
  hpfpTarget: string | null;
  hpfpActual: string | null;
  lpfpActual: string | null;
  oilTemp: string | null;
  maf: string | null;
}

// Candidate column names per platform
const COLUMN_CANDIDATES: Record<string, string[][]> = {
  time: [['Time']],
  accelPedal: [
    ['Accel. Pedal[%]', 'Accel. Pedal', 'Accel Ped. Pos. (%)', 'Accel Ped. Pos.',
     'Accelerator Pedal', 'Accel Pedal', 'Pedal', 'TPS', 'APP',
     'Throttle Position Sensor', 'Throttle Pedal', 'Pedal Position', 'Accel pedal pos.',
     'Accelerator pedal position', 'Accel. pedal pos.[%]'],
  ],
  rpm: [
    ['Engine speed[1/min]', 'Engine speed', 'RPM', 'Engine Speed', 'N_eng'],
  ],
  gear: [['Gear[-]', 'Gear', 'Current Gear']],
  iat: [
    ['IAT[F]', 'IAT (*F)', 'IAT', 'Intake Air Temp', 'Intake Air Temperature',
     'Charge air temp. (*F)', 'Charge air temp.', 'Air Temp', 'T_Ansaug'],
  ],
  coolantTemp: [
    ['Coolant Temp[F]', 'Coolant Temp', 'Coolant Temperature', 'Water Temp', 'T_Water'],
  ],
  boostActual: [
    ['Boost (Pre-Throttle)[psig]', 'Boost (Pre-Throttle)', 'MAP[psig]', 'MAP',
     'Boost (MAP)', '(BM3) Boost (MAP) Custom[psig]', 'Boost Pressure',
     'Boost (PSI)', 'Boost', 'Boost pressure (PSI)', 'Boost[PSI]'],
  ],
  boostTarget: [
    ['Boost pressure (Target)[psig]', 'Boost pressure (Target)', 'Boost Target', 'Target Boost',
     'Boost target (PSI)', 'Boost target'],
  ],
  boostDeviation: [
    ['Boost Pressure (Deviation)[psia]', 'Boost Pressure (Deviation)', 'Boost Deviation',
     'Boost deviation (PSI)', 'Boost deviation'],
  ],
  lambdaActBank1: [
    ['Lambda Act.[AFR]', 'Lambda Act. (Bank 1)[AFR]', 'Lambda Act. (Bank 1)[-]', 'Lambda Act. (Bank 1)',
     'Lambda Act.', 'Lambda 1 (AFR)', 'Lambda 1', 'AFR', 'Lambda', 'O2 Bank 1'],
  ],
  lambdaActBank2: [
    ['Lambda Act. (Bank 2)[AFR]', 'Lambda Act. (Bank 2)[-]', 'Lambda Act. (Bank 2)',
     'Lambda 2 (AFR)', 'Lambda 2', 'O2 Bank 2'],
  ],
  knockDetected: [
    ['Knock detected[0-n]', 'Knock detected', 'Knock Count', 'Knock Events'],
  ],
  flexEthanol: [
    ['(BM3) Flex Ethanol % (Main)[%]', 'Flex Ethanol %', 'Ethanol Content', 'Flex %'],
  ],
  throttleAngle: [
    ['Throttle Angle[%]', 'Throttle Angle', 'Throttle Position', 'Throttle',
     'Throttle pos.', 'Throttle pos.[%]', 'Throttle valve pos.', 'Throttle valve[%]',
     'Throttle Valve Pos.', 'Throttle opening', 'Throttle angle[%]'],
  ],
  ignTiming: [
    ['Ignition Timing 1[deg]', 'Ignition Timing 1', 'Ignition Timing', 'Ignition Cyl 1[deg]'],
  ],
  hpfpTarget: [['HPFP (Target)[psig]', 'HPFP Target', 'HP Fuel Pressure (Target)[bar]', 'HP Fuel Pressure Target', 'Fuel Pressure Target', 'Rail Pressure Target', 'Fuel Rail Pressure Target']],
  hpfpActual: [['HPFP Act.[psig]', 'HPFP Act.', 'HP Fuel Pressure (Actual)[bar]', 'HP Fuel Pressure Actual', 'Fuel Pressure Actual', 'Rail Pressure', 'Fuel Rail Pressure', 'Fuel pressure (Actual)[bar]', 'Fuel pressure (Filtered)[bar]', 'Fuel pressure[bar]']],
  lpfpActual: [['LPFP Act.[psi]', 'LPFP Actual', 'LP Fuel Pressure[bar]', 'Low Pressure Fuel', 'Fuel pressure (Low)[bar]', 'LP Fuel Pressure Actual']],
  oilTemp: [['Oil Temp[F]', 'Oil Temp', 'Oil Temperature']],
  maf: [['MAF[lb/min]', 'MAF', 'Mass Air Flow', 'Mass flow HFM[lb/min]']],
};

// Knock correction column candidates per cylinder (up to 8 for V8)
const KNOCK_CYL_CANDIDATES: string[][] = [
  // Cyl 1
  ['(RAM) Ignition Timing Corr. Cyl. 1[-]', '(RAM) Ignition Timing Corr. Cyl. 1[°]', '(RAM) Ignition Timing Corr. Cyl. 1',
   'Cyl1 Timing Cor (*)', 'Cyl1 Timing Cor', 'Ign. Corr. Cyl1', 'Ign. Corr. Cyl 1', 'Knock Cyl 1', 'Knock Correction 1'],
  // Cyl 2
  ['(RAM) Ignition Timing Corr. Cyl. 2[-]', '(RAM) Ignition Timing Corr. Cyl. 2[°]', '(RAM) Ignition Timing Corr. Cyl. 2',
   'Cyl2 Timing Cor (*)', 'Cyl2 Timing Cor', 'Ign. Corr. Cyl2', 'Ign. Corr. Cyl 2', 'Knock Cyl 2', 'Knock Correction 2'],
  // Cyl 3
  ['(RAM) Ignition Timing Corr. Cyl. 3[-]', '(RAM) Ignition Timing Corr. Cyl. 3[°]', '(RAM) Ignition Timing Corr. Cyl. 3',
   'Cyl3 Timing Cor (*)', 'Cyl3 Timing Cor', 'Ign. Corr. Cyl3', 'Ign. Corr. Cyl 3', 'Knock Cyl 3', 'Knock Correction 3'],
  // Cyl 4
  ['(RAM) Ignition Timing Corr. Cyl. 4[-]', '(RAM) Ignition Timing Corr. Cyl. 4[°]', '(RAM) Ignition Timing Corr. Cyl. 4',
   'Cyl4 Timing Cor (*)', 'Cyl4 Timing Cor', 'Ign. Corr. Cyl4', 'Ign. Corr. Cyl 4', 'Knock Cyl 4', 'Knock Correction 4'],
  // Cyl 5
  ['(RAM) Ignition Timing Corr. Cyl. 5[-]', '(RAM) Ignition Timing Corr. Cyl. 5[°]', '(RAM) Ignition Timing Corr. Cyl. 5',
   'Cyl5 Timing Cor (*)', 'Cyl5 Timing Cor', 'Ign. Corr. Cyl5', 'Ign. Corr. Cyl 5', 'Knock Cyl 5', 'Knock Correction 5'],
  // Cyl 6
  ['(RAM) Ignition Timing Corr. Cyl. 6[-]', '(RAM) Ignition Timing Corr. Cyl. 6[°]', '(RAM) Ignition Timing Corr. Cyl. 6',
   'Cyl6 Timing Cor (*)', 'Cyl6 Timing Cor', 'Ign. Corr. Cyl6', 'Ign. Corr. Cyl 6', 'Knock Cyl 6', 'Knock Correction 6'],
  // Cyl 7 (V8 only)
  ['Cyl7 Timing Cor (*)', 'Cyl7 Timing Cor', 'Ign. Corr. Cyl7', 'Knock Cyl 7', 'Knock Correction 7'],
  // Cyl 8 (V8 only)
  ['Cyl8 Timing Cor (*)', 'Cyl8 Timing Cor', 'Ign. Corr. Cyl8', 'Knock Cyl 8', 'Knock Correction 8'],
];

function findColumn(headers: string[], candidates: string[]): string | null {
  for (const candidate of candidates) {
    const exact = headers.find(h => h === candidate);
    if (exact) return exact;
  }
  for (const candidate of candidates) {
    const ci = headers.find(
      h => h.toLowerCase().includes(candidate.toLowerCase().replace(/[\[\]()]/g, '').trim())
    );
    if (ci) return ci;
  }
  return null;
}

export function detectColumns(headers: string[]): ColumnMap {
  const map: ColumnMap = {
    time: findColumn(headers, COLUMN_CANDIDATES.time[0]),
    accelPedal: findColumn(headers, COLUMN_CANDIDATES.accelPedal[0]),
    rpm: findColumn(headers, COLUMN_CANDIDATES.rpm[0]),
    gear: findColumn(headers, COLUMN_CANDIDATES.gear[0]),
    iat: findColumn(headers, COLUMN_CANDIDATES.iat[0]),
    coolantTemp: findColumn(headers, COLUMN_CANDIDATES.coolantTemp[0]),
    boostActual: findColumn(headers, COLUMN_CANDIDATES.boostActual[0]),
    boostTarget: findColumn(headers, COLUMN_CANDIDATES.boostTarget[0]),
    boostDeviation: findColumn(headers, COLUMN_CANDIDATES.boostDeviation[0]),
    lambdaActBank1: findColumn(headers, COLUMN_CANDIDATES.lambdaActBank1[0]),
    lambdaActBank2: findColumn(headers, COLUMN_CANDIDATES.lambdaActBank2[0]),
    knockCyl: [],
    knockDetected: findColumn(headers, COLUMN_CANDIDATES.knockDetected[0]),
    flexEthanol: findColumn(headers, COLUMN_CANDIDATES.flexEthanol[0]),
    throttleAngle: findColumn(headers, COLUMN_CANDIDATES.throttleAngle[0]),
    ignTiming: findColumn(headers, COLUMN_CANDIDATES.ignTiming[0]),
    hpfpTarget: findColumn(headers, COLUMN_CANDIDATES.hpfpTarget[0]),
    hpfpActual: findColumn(headers, COLUMN_CANDIDATES.hpfpActual[0]),
    lpfpActual: findColumn(headers, COLUMN_CANDIDATES.lpfpActual[0]),
    oilTemp: findColumn(headers, COLUMN_CANDIDATES.oilTemp[0]),
    maf: findColumn(headers, COLUMN_CANDIDATES.maf[0]),
  };

  // Detect knock columns — up to 6 cylinders
  for (let i = 0; i < 6; i++) {
    const candidates = KNOCK_CYL_CANDIDATES[i] || [];
    const found = findColumn(headers, candidates);
    map.knockCyl.push(found);
  }

  return map;
}

export function detectCylinderCount(map: ColumnMap): number {
  const found = map.knockCyl.filter(c => c !== null).length;
  return found > 0 ? found : 4; // default 4
}

export function detectEngineFromCylinders(cylCount: number): string {
  if (cylCount >= 6) return 'V8/I6 (S63/S58/B58)';
  if (cylCount === 4) return 'I4/I6 (S58/B58/N55/N54)';
  return 'Unknown';
}
