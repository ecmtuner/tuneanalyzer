import { LogRow, ParsedLog } from './parser';

export type FuelType = 'pump' | 'e30' | 'e40' | 'e45' | 'e85';
export type MotorType = 'stock' | 'built';

export interface CategoryScore {
  score: number;
  label: string;
  details: string[];
  warnings: string[];
}

export interface AnalysisResult {
  overall: number;
  grade: string;
  knock: CategoryScore;
  afr: CategoryScore;
  boost: CategoryScore;
  iat: CategoryScore;
  fuelPressure: CategoryScore | null; // null = not logged, skip from score
  verdict: {
    summary: string;
    good: string[];
    attention: string[];
    recommendation: string;
  };
  stats: {
    peakBoost: number;
    avgWotAfr: number;
    maxKnockCorrection: number;
    peakIat: number;
    rpmRange: [number, number];
    wotSamples: number;
    cylindersKnocking: number;
    cylinderCount: number;
  };
}

const AFR_TARGETS: Record<FuelType, { ideal: [number, number]; acceptable: [number, number] }> = {
  pump:  { ideal: [12.0, 12.8], acceptable: [11.5, 13.2] },
  e30:   { ideal: [11.8, 12.5], acceptable: [11.2, 13.0] },
  e40:   { ideal: [11.5, 12.3], acceptable: [11.0, 12.8] },
  e45:   { ideal: [11.3, 12.2], acceptable: [10.8, 12.5] },
  e85:   { ideal: [10.5, 11.5], acceptable: [10.0, 12.0] },
};

function isWOT(row: LogRow, hasRpmData: boolean): boolean {
  const atWOTPedal = row.accelPedal > 85 || row.throttleAngle > 85;
  const hasPedal = row.accelPedal > 0 || row.throttleAngle > 0;

  if (!hasPedal) {
    // No pedal column — infer from RPM + boost
    return row.rpm > 3000 && row.boostActual > 5;
  }

  if (hasRpmData) {
    // Full data: pedal + RPM
    return atWOTPedal && row.rpm > 2500;
  }

  // MHD-style: pedal available, no RPM — use pedal > 85% + boost > 3 psi
  // This ensures we're genuinely under boost load, not just tip-in
  return atWOTPedal && row.boostActual > 3;
}

function isValidAFR(val: number): boolean {
  if (val <= 0) return false;
  if (val > 20) return false;   // catches MHD 235.2 sentinel and BM3 19.11 no-signal
  if (val > 18.5) return false; // extra safety for BM3 19.11
  // Allow both lambda (0.6–1.3) and AFR (8–18) ranges
  if (val > 1.3 && val < 8) return false; // gap between lambda and AFR — invalid
  return true;
}

// Convert lambda ratio to AFR (stoich ~14.7 for gas, ~9.0 for E85)
// For mixed ethanol we use a blended stoich
function toAFR(val: number, fuel: FuelType): number {
  if (val > 2) return val; // already AFR
  // Lambda to AFR: multiply by stoich
  const stoich: Record<FuelType, number> = {
    pump: 14.7, e30: 13.5, e40: 13.0, e45: 12.7, e85: 9.8,
  };
  return val * stoich[fuel];
}

function scoreKnock(wotRows: LogRow[], cylinderCount: number, motor: MotorType): CategoryScore {
  let score = 100;
  const details: string[] = [];
  const warnings: string[] = [];
  const cylsWithKnock = new Set<number>();
  let maxCorrection = 0;
  let severeEvents = 0;

  // Built motors use relaxed thresholds — forged internals handle more correction
  // Stock:  mild=-1.5, moderate=-3.0, severe=-5.0, critical beyond
  // Built:  mild=-2.5, moderate=-5.0, severe=-8.0, critical beyond
  const thresholds = motor === 'built'
    ? { mild: -2.5, moderate: -5.0, severe: -8.0 }
    : { mild: -1.5, moderate: -3.0, severe: -5.0 };

  const penalties = motor === 'built'
    ? { mild: 2, moderate: 6, severe: 14, critical: 22 }
    : { mild: 3, moderate: 8, severe: 18, critical: 28 };

  // Track worst correction per cylinder
  const worstPerCyl: number[] = Array(cylinderCount).fill(0);

  for (const row of wotRows) {
    const activeCyls = row.knockCyl.slice(0, cylinderCount);
    for (let i = 0; i < activeCyls.length; i++) {
      const corr = activeCyls[i];
      if (corr < worstPerCyl[i]) worstPerCyl[i] = corr;
      if (corr < -0.5) cylsWithKnock.add(i);
      if (corr < maxCorrection) maxCorrection = corr;
    }
  }

  let totalPenalty = 0;
  const simultaneousMultiplier = cylsWithKnock.size >= 2 ? 1.5 : 1.0;

  for (let i = 0; i < cylinderCount; i++) {
    const worst = worstPerCyl[i];
    if (worst >= -0.5) continue;

    let penalty = 0;
    if (worst > thresholds.mild)          penalty = penalties.mild;
    else if (worst > thresholds.moderate) penalty = penalties.moderate;
    else if (worst > thresholds.severe)   { penalty = penalties.severe;   severeEvents++; }
    else                                  { penalty = penalties.critical;  severeEvents++; }

    totalPenalty += penalty * simultaneousMultiplier;
  }

  // Spread penalty: spec says 5+ cyls for stock, 6+ for built → widespread knock
  const spreadThreshold = motor === 'built' ? 6 : 5;
  if (cylsWithKnock.size >= spreadThreshold) {
    totalPenalty += 12;
    warnings.push(`Knock detected on ${cylsWithKnock.size} cylinders — widespread`);
  }

  score = Math.max(0, Math.round(100 - totalPenalty));

  if (maxCorrection === 0) {
    details.push('No knock corrections detected ✓');
  } else {
    details.push(`Max correction: ${maxCorrection.toFixed(1)}°`);
    details.push(`Cylinders affected: ${cylsWithKnock.size}`);
    if (motor === 'built') details.push('Scored with built motor tolerances');
    if (severeEvents > 0) warnings.push(`${severeEvents} severe knock events`);
    if (cylsWithKnock.size === 1) details.push(`Only cyl ${[...cylsWithKnock][0] + 1} affected — likely hardware issue`);
  }

  return { score, label: 'Knock', details, warnings };
}

function scoreAFR(wotRows: LogRow[], fuel: FuelType): CategoryScore {
  const targets = AFR_TARGETS[fuel];
  const details: string[] = [];
  const warnings: string[] = [];

  const afrValues = wotRows
    .map(r => r.lambdaBank1)
    .filter(isValidAFR)
    .map(v => toAFR(v, fuel));

  if (afrValues.length === 0) {
    return { score: 50, label: 'AFR', details: ['No valid AFR readings found'], warnings: ['Could not score AFR — check column mapping'] };
  }

  const avg = afrValues.reduce((a, b) => a + b, 0) / afrValues.length;
  const min = Math.min(...afrValues);
  const max = Math.max(...afrValues);

  let totalScore = 0;
  let leanCount = 0;

  for (const afr of afrValues) {
    const [idealLow, idealHigh] = targets.ideal;
    const [accLow, accHigh] = targets.acceptable;

    if (afr >= idealLow && afr <= idealHigh) {
      totalScore += 100;
    } else if (afr >= accLow && afr <= accHigh) {
      totalScore += 75;
    } else if (afr > accHigh) {
      // Lean
      const overLean = afr - accHigh;
      totalScore += Math.max(0, 75 - overLean * 20);
      if (overLean > 0.3) leanCount++;
    } else {
      // Rich (less concerning)
      totalScore += Math.max(50, 75 - (accLow - afr) * 5);
    }
  }

  const score = Math.round(totalScore / afrValues.length);

  details.push(`Avg WOT AFR: ${avg.toFixed(2)}`);
  details.push(`Range: ${min.toFixed(2)} – ${max.toFixed(2)}`);
  details.push(`Target for ${fuel.toUpperCase()}: ${targets.ideal[0]}–${targets.ideal[1]}`);

  if (leanCount > 3) warnings.push(`Running lean ${leanCount} samples — add fuel`);
  if (avg > targets.acceptable[1]) warnings.push('AFR too lean for fuel type — tuner needs to richen WOT map');
  if (avg < targets.acceptable[0]) details.push('Running rich — safe but may leave power on table');

  return { score: Math.max(0, score), label: 'AFR / Fueling', details, warnings };
}

function scoreBoost(wotRows: LogRow[], motor: MotorType): CategoryScore {
  const details: string[] = [];
  const warnings: string[] = [];

  // Determine the real boost target:
  // 1. If log has a deviation column, use it directly (most accurate)
  // 2. If log target field looks plausible (within 5 psi of peak actual), use it
  // 3. Otherwise infer target from the 90th-percentile actual boost — this handles
  //    tuned maps where BM3's "target" field reflects base map, not actual tuned target
  const fullBoostRows = wotRows.filter(r => r.boostActual > 10);
  const peakActual = fullBoostRows.length > 0 ? Math.max(...fullBoostRows.map(r => r.boostActual)) : 0;
  const logTarget = fullBoostRows.length > 0 ? Math.max(...fullBoostRows.map(r => r.boostTarget)) : 0;

  // If log target is within 5 psi of peak actual, trust it; otherwise use 90th percentile actual
  const sorted = [...fullBoostRows.map(r => r.boostActual)].sort((a, b) => a - b);
  const p90 = sorted[Math.floor(sorted.length * 0.90)] ?? peakActual;
  const inferredTarget = Math.abs(peakActual - logTarget) <= 5 ? logTarget : p90;

  const hasDeviationCol = wotRows.some(r => r.boostDeviation !== 0);

  const deviations = fullBoostRows
    .map(r => {
      if (hasDeviationCol) return Math.abs(r.boostDeviation);
      return Math.abs(r.boostActual - inferredTarget);
    })
    .filter((v): v is number => v >= 0 && v < 20);

  if (deviations.length === 0) {
    return { score: 70, label: 'Boost', details: ['Boost deviation data unavailable'], warnings: [] };
  }

  const avg = deviations.reduce((a, b) => a + b, 0) / deviations.length;
  const max = Math.max(...deviations);

  // Built motors often run higher boost and looser wastegate maps — slightly relaxed thresholds
  let score = 100;
  if (avg > (motor === 'built' ? 2 : 1)) score -= 15;
  if (avg > (motor === 'built' ? 4 : 3)) score -= 20;
  if (avg > (motor === 'built' ? 6 : 5)) score -= 20;
  if (max > (motor === 'built' ? 7 : 5)) { score -= 10; warnings.push(`Max boost deviation: ${max.toFixed(1)} psi`); }

  // Check for consistent overboost
  const overboostThreshold = motor === 'built' ? 4 : 3;
  const overboostCount = wotRows.filter(r => r.boostDeviation > overboostThreshold).length;
  if (overboostCount > wotRows.length * 0.2) {
    score -= 10;
    warnings.push('Consistent overboost detected');
  }

  const boostValues = wotRows.map(r => r.boostActual).filter(v => v > 5);
  const peakBoost = boostValues.length > 0 ? Math.max(...boostValues) : 0;

  details.push(`Peak boost: ${peakBoost.toFixed(1)} psi`);
  details.push(`Avg deviation from target: ${avg.toFixed(2)} psi`);
  if (avg <= 1) details.push('Boost control: excellent ✓');
  else if (avg <= 3) details.push('Boost control: good');
  else details.push('Boost control: needs tuning');

  return { score: Math.max(0, Math.round(score)), label: 'Boost Control', details, warnings };
}

function scoreIAT(wotRows: LogRow[]): CategoryScore {
  const details: string[] = [];
  const warnings: string[] = [];

  const iatValues = wotRows.map(r => r.iat).filter(v => v > 0 && v < 250);
  if (iatValues.length === 0) {
    return { score: 70, label: 'IAT / Temps', details: ['IAT data unavailable'], warnings: [] };
  }

  const avg = iatValues.reduce((a, b) => a + b, 0) / iatValues.length;
  const peak = Math.max(...iatValues);
  const first = iatValues[0];
  const last = iatValues[iatValues.length - 1];
  const rise = last - first;

  // Stepped score per spec: 100/85/70/50/30 thresholds
  let score =
    avg < 85  ? 100 :
    avg < 95  ? 85  :
    avg < 105 ? 70  :
    avg < 115 ? 50  : 30;

  // Heat soak penalty: IAT rose more than 10°F during the pull
  if (rise > 10) {
    score -= 10;
    warnings.push(`IAT rose ${rise.toFixed(0)}°F during pull — heat soak detected`);
  }

  details.push(`Avg WOT IAT: ${avg.toFixed(0)}°F`);
  details.push(`Peak IAT: ${peak.toFixed(0)}°F`);
  if (avg < 85) details.push('IAT excellent — good conditions ✓');
  else if (avg < 95) details.push('IAT acceptable');
  else warnings.push('High IAT — let car cool before next pull');

  return { score: Math.max(0, Math.round(score)), label: 'IAT / Temps', details, warnings };
}

function scoreFuelPressure(wotRows: LogRow[]): CategoryScore | null {
  const details: string[] = [];
  const warnings: string[] = [];

  // Check if any fuel pressure data was actually logged
  const hpfpValues = wotRows.map(r => r.hpfpActual).filter(v => v > 0);
  const lpfpValues = wotRows.map(r => r.lpfpActual).filter(v => v > 0);
  const hpfpTargets = wotRows.map(r => r.hpfpTarget).filter(v => v > 0);

  // No fuel pressure data at all — skip
  if (hpfpValues.length === 0 && lpfpValues.length === 0) return null;

  let score = 100;

  // --- HPFP Analysis ---
  if (hpfpValues.length > 0) {
    const peakHpfp = Math.max(...hpfpValues);
    const minHpfp = Math.min(...hpfpValues);
    const avgHpfp = hpfpValues.reduce((a, b) => a + b, 0) / hpfpValues.length;

    // Detect if values are in bar (typical range 50–200 bar) or psi (750–3000 psi)
    // Normalize to bar for analysis
    const isBar = avgHpfp < 250;
    const toBar = (v: number) => isBar ? v : v / 14.504;
    const unit = isBar ? 'bar' : 'psi';

    const avgBar = toBar(avgHpfp);
    const minBar = toBar(minHpfp);
    const peakBar = toBar(peakHpfp);

    details.push(`HPFP avg: ${avgHpfp.toFixed(0)} ${unit}`);
    details.push(`HPFP range: ${minHpfp.toFixed(0)}–${peakHpfp.toFixed(0)} ${unit}`);

    // Score based on target deviation if target available
    if (hpfpTargets.length > 0) {
      const avgTarget = hpfpTargets.reduce((a, b) => a + b, 0) / hpfpTargets.length;
      const avgDeviation = Math.abs(avgHpfp - avgTarget);
      const deviationPct = (avgDeviation / avgTarget) * 100;

      if (deviationPct > 15) {
        score -= 25;
        warnings.push(`HPFP avg ${deviationPct.toFixed(0)}% below target — pump struggling under load`);
      } else if (deviationPct > 8) {
        score -= 12;
        warnings.push(`HPFP deviation ${deviationPct.toFixed(0)}% from target — monitor closely`);
      } else {
        details.push('HPFP on target ✓');
      }
    }

    // Drop detection: if pressure drops significantly during pull
    const firstThird = hpfpValues.slice(0, Math.floor(hpfpValues.length / 3));
    const lastThird = hpfpValues.slice(Math.floor(hpfpValues.length * 2 / 3));
    if (firstThird.length > 0 && lastThird.length > 0) {
      const avgFirst = firstThird.reduce((a, b) => a + b, 0) / firstThird.length;
      const avgLast = lastThird.reduce((a, b) => a + b, 0) / lastThird.length;
      const dropPct = ((avgFirst - avgLast) / avgFirst) * 100;
      if (dropPct > 20) {
        score -= 20;
        warnings.push(`HPFP drops ${dropPct.toFixed(0)}% through pull — fuel delivery issue at high RPM`);
      } else if (dropPct > 10) {
        score -= 8;
        details.push(`HPFP slight drop ${dropPct.toFixed(0)}% through pull`);
      }
    }

    // Absolute minimums: below ~80 bar HPFP is critically low for most DI engines
    if (minBar < 60 && isBar) {
      score -= 20;
      warnings.push(`HPFP drops to ${minBar.toFixed(0)} bar — critically low, check LPFP and HPFP`);
    } else if (minBar < 80 && isBar) {
      score -= 10;
      warnings.push(`HPFP dips to ${minBar.toFixed(0)} bar — marginal under load`);
    }
  }

  // --- LPFP Analysis ---
  if (lpfpValues.length > 0) {
    const avgLpfp = lpfpValues.reduce((a, b) => a + b, 0) / lpfpValues.length;
    const minLpfp = Math.min(...lpfpValues);
    const isBar = avgLpfp < 20;
    const unit = isBar ? 'bar' : 'psi';

    details.push(`LPFP avg: ${avgLpfp.toFixed(1)} ${unit}`);

    // LPFP below 4 bar (58 psi) is marginal for most setups, below 3 bar is bad
    const minBar = isBar ? minLpfp : minLpfp / 14.504;
    if (minBar < 3.0) {
      score -= 25;
      warnings.push(`LPFP drops to ${minLpfp.toFixed(1)} ${unit} — starving HPFP, upgrade low pressure pump`);
    } else if (minBar < 4.0) {
      score -= 12;
      warnings.push(`LPFP low at ${minLpfp.toFixed(1)} ${unit} — monitor, may need upgraded LPFP`);
    } else {
      details.push('LPFP adequate ✓');
    }
  }

  return {
    score: Math.max(0, Math.round(score)),
    label: 'Fuel Pressure',
    details,
    warnings,
  };
}

export function analyzeLog(parsed: ParsedLog, fuel: FuelType, motor: MotorType = 'stock'): AnalysisResult {
  const hasRpmData = parsed.rows.some(r => r.rpm > 0);
  const wotRows = parsed.rows.filter(r => isWOT(r, hasRpmData));

  const knock = scoreKnock(wotRows, parsed.cylinderCount, motor);
  const afr = scoreAFR(wotRows, fuel);
  const boost = scoreBoost(wotRows, motor);
  const iat = scoreIAT(wotRows);
  const fuelPressure = scoreFuelPressure(wotRows);

  // Weighted overall — fuel pressure is bonus category when logged (5% weight, redistributed from others)
  const overall = fuelPressure
    ? Math.round(
        knock.score * 0.37 +
        afr.score   * 0.23 +
        boost.score * 0.19 +
        iat.score   * 0.14 +
        fuelPressure.score * 0.07
      )
    : Math.round(
        knock.score * 0.40 +
        afr.score   * 0.25 +
        boost.score * 0.20 +
        iat.score   * 0.15
      );

  const grade =
    overall >= 90 ? 'A' :
    overall >= 80 ? 'B' :
    overall >= 70 ? 'C' :
    overall >= 60 ? 'D' : 'F';

  // Stats
  const wotBoosts = wotRows.map(r => r.boostActual).filter(v => v > 0);
  const wotAfrs = wotRows.map(r => r.lambdaBank1).filter(isValidAFR).map(v => toAFR(v, fuel));
  const allKnock = wotRows.flatMap(r => r.knockCyl.slice(0, parsed.cylinderCount));
  const maxKnock = allKnock.length > 0 ? Math.min(...allKnock) : 0;
  const cylsKnocking = new Set(
    wotRows.flatMap((r, _) =>
      r.knockCyl.slice(0, parsed.cylinderCount)
        .map((v, i) => v < -0.5 ? i : -1)
        .filter(i => i >= 0)
    )
  ).size;

  const rpms = wotRows.map(r => r.rpm).filter(v => v > 0);

  const stats = {
    peakBoost: wotBoosts.length > 0 ? Math.max(...wotBoosts) : 0,
    avgWotAfr: wotAfrs.length > 0 ? wotAfrs.reduce((a, b) => a + b, 0) / wotAfrs.length : 0,
    maxKnockCorrection: maxKnock,
    peakIat: wotRows.length > 0 ? Math.max(...wotRows.map(r => r.iat)) : 0,
    rpmRange: [rpms.length > 0 ? Math.min(...rpms) : 0, rpms.length > 0 ? Math.max(...rpms) : 0] as [number, number],
    wotSamples: wotRows.length,
    cylindersKnocking: cylsKnocking,
    cylinderCount: parsed.cylinderCount,
  };

  // Build verdict
  const good: string[] = [];
  const attention: string[] = [];

  if (knock.score >= 85) good.push('Knock control is clean — minimal corrections');
  else if (knock.score >= 70) attention.push('Some knock corrections detected — check plugs and review tune');
  else attention.push('Significant knock — do not continue pulling until resolved');

  if (afr.score >= 85) good.push(`AFR is dialed in for ${fuel.toUpperCase()} — proper fueling ✓`);
  else attention.push(`AFR needs attention for ${fuel.toUpperCase()} — tune may need fueling adjustment`);

  if (boost.score >= 85) good.push('Boost control is stable and on target');
  else attention.push('Boost control shows deviation — wastegate may need tuning');

  if (iat.score >= 85) good.push('IAT is low — good conditions for this pull');
  else if (iat.score < 70) attention.push('High IAT — let engine cool between pulls');

  [...knock.warnings, ...afr.warnings, ...boost.warnings, ...iat.warnings].forEach(w => {
    if (!attention.includes(w)) attention.push(w);
  });

  const summary =
    overall >= 85 ? `This is a clean, well-tuned pull. The car is safe to drive.` :
    overall >= 70 ? `Tune is mostly good but has areas needing attention before more aggressive pulls.` :
    overall >= 55 ? `This log shows real issues — the tune needs work before continued hard driving.` :
    `This log has serious problems. Stop hard pulling and get the tune reviewed immediately.`;

  const recommendation =
    overall >= 85 ? 'Safe to continue. Monitor logs periodically after tune changes.' :
    overall >= 70 ? 'Address the flagged items above — check plugs, verify ethanol content, and share logs with tuner.' :
    'Stop hard pulling. Share these logs with your tuner for a revision before next session.';

  // Fuel pressure verdict
  if (fuelPressure) {
    if (fuelPressure.score >= 90) good.push('Fuel pressure stable throughout pull ✓');
    else if (fuelPressure.score >= 70) attention.push('Fuel pressure showing some deviation — monitor on next pull');
    else attention.push('Fuel pressure issues detected — address before more hard pulls');
    [...fuelPressure.warnings].forEach(w => { if (!attention.includes(w)) attention.push(w); });
  }

  return {
    overall,
    grade,
    knock,
    afr,
    boost,
    iat,
    fuelPressure,
    verdict: { summary, good, attention, recommendation },
    stats,
  };
}
