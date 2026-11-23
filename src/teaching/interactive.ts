/*
 * Interactive teaching engine hydrated inside TeachingView.astro:
 *  1) 15 animated SVG cycle/process simulators (`[data-cycle-sim]`)
 *  2) 23 dynamic parametric exercises (`[data-dyn-ex]`) with "Gerar novos números" + live KaTeX steps
 * Colors strictly track the site's Balmer / Pernambuco Ice White palette.
 */
import katex from 'katex';

/* ---------- site palette ---------- */
const COL = {
  navy: '#0b2d6b',
  blue: '#1d4fa3',
  coral: '#ff7a59',
  coralSoft: '#ffd2c6',
  ice: '#dbe7f6',
  iceDeep: '#b7cdec',
  paper: '#f8fafd',
  muted: '#4d5b7c',
  green: '#17703c',
  red: '#b42323',
  amber: '#a34f00',
};

const RU = 8.31446; // kJ/(kmol·K)
const RUB = 0.0831446; // bar·m³/(kmol·K)

const fmt = (x: number, dec = 2): string => {
  const thr = 0.5 * 10 ** -dec;
  const v = Math.abs(x) < thr ? 0 : x;
  return v.toFixed(dec).replace('.', ',').replace('-', '−');
};

const tnum = (x: number, dec = 2): string => {
  const thr = 0.5 * 10 ** -dec;
  const v = Math.abs(x) < thr ? 0 : x;
  return v.toFixed(dec).replace('.', '{,}');
};

const texDisplay = (tex: string) => katex.renderToString(tex, { displayMode: true, throwOnError: false });
const texInline = (tex: string) => katex.renderToString(tex, { throwOnError: false });

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));

function samplePolyline(pts: [number, number][], phase: number): [number, number] {
  if (!pts.length) return [0, 0];
  if (pts.length === 1) return pts[0];
  const lens: number[] = [];
  let tot = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const d = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
    lens.push(d);
    tot += d;
  }
  if (tot <= 1e-6) return pts[0];
  let target = (((phase % 1) + 1) % 1) * tot;
  for (let i = 0; i < lens.length; i++) {
    if (target <= lens[i] || i === lens.length - 1) {
      const f = lens[i] > 0 ? target / lens[i] : 0;
      return [lerp(pts[i][0], pts[i + 1][0], f), lerp(pts[i][1], pts[i + 1][1], f)];
    }
    target -= lens[i];
  }
  return pts[pts.length - 1];
}

const mkDefs = (p: string) =>
  `<defs>
    <marker id="${p}n" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${COL.navy}"/></marker>
    <marker id="${p}c" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${COL.coral}"/></marker>
    <marker id="${p}m" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${COL.muted}"/></marker>
  </defs>`;

/* ============================================================================
 *  VERIFIED TEXTBOOK PROPERTY TABLES (Moran & Shapiro 8th ed. SI)
 * ========================================================================== */

interface SteamSat {
  pBar: number;
  T: number;
  vf: number; // m³/kg
  vg: number;
  uf: number;
  ug: number;
  hf: number;
  hfg: number;
  hg: number;
  sf: number;
  sg: number;
}

const STEAM_SAT: SteamSat[] = [
  { pBar: 0.08, T: 41.51, vf: 0.0010084, vg: 18.103, uf: 173.87, ug: 2432.2, hf: 173.88, hfg: 2403.1, hg: 2577.0, sf: 0.5926, sg: 8.2287 },
  { pBar: 0.1, T: 45.81, vf: 0.0010102, vg: 14.674, uf: 191.82, ug: 2437.9, hf: 191.83, hfg: 2392.8, hg: 2584.7, sf: 0.6493, sg: 8.1502 },
  { pBar: 0.2, T: 60.06, vf: 0.0010172, vg: 7.649, uf: 251.38, ug: 2456.7, hf: 251.40, hfg: 2358.3, hg: 2609.7, sf: 0.8320, sg: 7.9085 },
  { pBar: 0.5, T: 81.33, vf: 0.0010300, vg: 3.240, uf: 340.44, ug: 2483.9, hf: 340.49, hfg: 2305.4, hg: 2645.9, sf: 1.0910, sg: 7.5939 },
  { pBar: 1.0, T: 99.63, vf: 0.0010432, vg: 1.694, uf: 417.36, ug: 2506.1, hf: 417.46, hfg: 2258.0, hg: 2675.5, sf: 1.3026, sg: 7.3594 },
  { pBar: 2.0, T: 120.2, vf: 0.0010605, vg: 0.8857, uf: 504.49, ug: 2529.5, hf: 504.70, hfg: 2201.9, hg: 2706.7, sf: 1.5301, sg: 7.1271 },
  { pBar: 5.0, T: 151.9, vf: 0.0010926, vg: 0.3749, uf: 639.68, ug: 2561.2, hf: 640.23, hfg: 2108.5, hg: 2748.7, sf: 1.8607, sg: 6.8212 },
  { pBar: 10.0, T: 179.9, vf: 0.0011273, vg: 0.1944, uf: 761.68, ug: 2583.6, hf: 762.81, hfg: 2015.3, hg: 2778.1, sf: 2.1387, sg: 6.5863 },
  { pBar: 20.0, T: 212.4, vf: 0.0011767, vg: 0.09963, uf: 906.44, ug: 2600.3, hf: 908.79, hfg: 1890.7, hg: 2799.5, sf: 2.4474, sg: 6.3409 },
  { pBar: 40.0, T: 250.4, vf: 0.0012522, vg: 0.04978, uf: 1082.3, ug: 2602.3, hf: 1087.3, hfg: 1714.1, hg: 2801.4, sf: 2.7964, sg: 6.0701 },
];

interface SteamSup { pBar: number; T: number; v: number; u: number; h: number; s: number }
const STEAM_SUP: SteamSup[] = [
  { pBar: 20, T: 360, v: 0.1411, u: 2877.0, h: 3159.3, s: 6.9917 },
  { pBar: 20, T: 400, v: 0.1512, u: 2945.2, h: 3247.6, s: 7.1271 },
  { pBar: 20, T: 440, v: 0.1611, u: 3013.4, h: 3335.5, s: 7.2540 },
  { pBar: 30, T: 360, v: 0.0923, u: 2861.7, h: 3138.7, s: 6.7801 },
  { pBar: 30, T: 400, v: 0.0994, u: 2932.8, h: 3230.9, s: 6.9212 },
  { pBar: 30, T: 440, v: 0.1062, u: 3002.9, h: 3321.5, s: 7.0520 },
  { pBar: 40, T: 400, v: 0.07341, u: 2919.9, h: 3213.6, s: 6.7690 },
  { pBar: 40, T: 440, v: 0.07872, u: 2992.2, h: 3307.1, s: 6.9041 },
  { pBar: 40, T: 500, v: 0.08643, u: 3099.5, h: 3445.3, s: 7.0901 },
  { pBar: 60, T: 440, v: 0.05122, u: 2970.0, h: 3277.3, s: 6.6853 },
  { pBar: 60, T: 500, v: 0.05665, u: 3082.2, h: 3422.2, s: 6.8803 },
  { pBar: 80, T: 480, v: 0.04034, u: 3025.7, h: 3348.4, s: 6.6586 },
  { pBar: 80, T: 520, v: 0.04313, u: 3102.7, h: 3447.7, s: 6.7871 },
  { pBar: 100, T: 520, v: 0.03394, u: 3085.6, h: 3425.1, s: 6.6622 },
  { pBar: 100, T: 560, v: 0.03619, u: 3164.1, h: 3526.0, s: 6.7864 },
];

interface R134aSat { pBar: number; T: number; hf: number; hg: number; sf: number; sg: number }
const R134A_SAT: R134aSat[] = [
  { pBar: 1.4, T: -18.80, hf: 25.77, hg: 236.04, sf: 0.1055, sg: 0.9322 },
  { pBar: 1.8, T: -12.73, hf: 33.45, hg: 239.71, sf: 0.1352, sg: 0.9273 },
  { pBar: 2.0, T: -10.09, hf: 36.84, hg: 241.30, sf: 0.1481, sg: 0.9253 },
  { pBar: 2.4, T: -5.37, hf: 42.95, hg: 244.09, sf: 0.1710, sg: 0.9222 },
  { pBar: 8.0, T: 31.33, hf: 93.42, hg: 264.15, sf: 0.3459, sg: 0.9066 },
  { pBar: 9.0, T: 35.53, hf: 99.56, hg: 266.18, sf: 0.3656, sg: 0.9054 },
  { pBar: 10.0, T: 39.39, hf: 105.29, hg: 267.97, sf: 0.3838, sg: 0.9043 },
  { pBar: 12.0, T: 46.32, hf: 115.76, hg: 270.99, sf: 0.4164, sg: 0.9023 },
];

// Table A-12 superheated R-134a points [T, h, s] per pressure (bar)
const R134A_SUP: Record<number, [number, number, number][]> = {
  8.0: [[31.33, 264.15, 0.9066], [40, 273.66, 0.9374], [50, 284.39, 0.9711], [60, 294.98, 1.0034]],
  9.0: [[35.53, 266.18, 0.9054], [40, 271.25, 0.9217], [50, 282.34, 0.9566], [60, 293.21, 0.9897]],
  10.0: [[39.39, 267.97, 0.9043], [40, 268.68, 0.9066], [50, 280.19, 0.9428], [60, 291.36, 0.9768]],
  12.0: [[46.32, 270.99, 0.9023], [50, 275.52, 0.9164], [60, 287.44, 0.9527], [70, 298.96, 0.9868]],
};

function interpR134aSupAtS(pBar: number, sTarget: number): { h: number; T: number } {
  const rows = R134A_SUP[pBar] || R134A_SUP[10.0];
  for (let i = 0; i < rows.length - 1; i++) {
    const [T1, h1, s1] = rows[i];
    const [T2, h2, s2] = rows[i + 1];
    if (sTarget >= s1 && sTarget <= s2) {
      const f = (sTarget - s1) / (s2 - s1);
      return { h: lerp(h1, h2, f), T: lerp(T1, T2, f) };
    }
  }
  const last = rows[rows.length - 1];
  const prev = rows[rows.length - 2];
  const f = (sTarget - prev[2]) / (last[2] - prev[2]);
  return { h: lerp(prev[1], last[1], f), T: lerp(prev[0], last[0], f) };
}

// Table A-23 Ideal gas molar enthalpies (kJ/kmol) at selected T(K)
const A23_TEMPS = [298, 400, 600, 800, 1000, 1200, 1400, 1600, 1800, 2000, 2200, 2400, 2600, 2800, 3000];
const A23_H: Record<'CO2' | 'H2O' | 'O2' | 'N2', number[]> = {
  CO2: [9364, 13372, 22280, 32179, 42769, 53848, 65271, 76944, 88806, 100804, 112939, 125152, 137449, 149808, 162226],
  H2O: [9904, 13356, 20402, 27896, 35882, 44380, 53351, 62748, 72513, 82593, 92940, 103508, 114273, 125198, 136264],
  O2: [8682, 11711, 17929, 24523, 31389, 38447, 45648, 52961, 60371, 67881, 75484, 83174, 90956, 98826, 106780],
  N2: [8669, 11640, 17563, 23714, 30129, 36777, 43605, 50571, 57651, 64810, 72040, 79320, 86650, 94014, 101407],
};
const HF0 = { CO2: -393520, H2Og: -241820, H2Ol: -285830, CH4: -74850, C3H8: -103850, C8H18l: -249910, C2H5OHl: -277690, H2: 0 };

function hBarGas(sp: 'CO2' | 'H2O' | 'O2' | 'N2', T: number): number {
  const arr = A23_H[sp];
  if (T <= A23_TEMPS[0]) return arr[0];
  for (let i = 0; i < A23_TEMPS.length - 1; i++) {
    if (T <= A23_TEMPS[i + 1]) {
      const f = (T - A23_TEMPS[i]) / (A23_TEMPS[i + 1] - A23_TEMPS[i]);
      return lerp(arr[i], arr[i + 1], f);
    }
  }
  const n = A23_TEMPS.length;
  const slope = (arr[n - 1] - arr[n - 2]) / (A23_TEMPS[n - 1] - A23_TEMPS[n - 2]);
  return arr[n - 1] + slope * (T - A23_TEMPS[n - 1]);
}

// Psychrometrics helpers (P = 101.325 kPa standard)
function pSatWaterKpa(T_c: number): number {
  const T = T_c + 273.15;
  // Buck / Antoine high-accuracy fit across 0..60 °C (within <0.2% of Moran Table A-2)
  return 0.61078 * Math.exp((17.27 * T_c) / (T_c + 237.3)) * (T > 273.15 ? 1 : 0.998);
}

/* ============================================================================
 *  PART 1 · 15 ANIMATED INTERACTIVE CYCLE & PROCESS SIMULATORS
 * ========================================================================== */

interface SimParam {
  key: string;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  initial: number;
}
interface SimKpi { label: string; value: string; accent?: boolean }
interface SimRender {
  svg: string;
  kpis: SimKpi[];
  insight: string;
  trace?: (phase: number) => { x: number; y: number; tag?: string } | null;
}
interface SimSpec {
  id: string;
  defaultTitle: string;
  subtitle: string;
  modes?: { id: string; label: string }[];
  params: SimParam[];
  render: (s: Record<string, number>, mode: string) => SimRender;
}

const GAS_PROPS: Record<string, { name: string; M: number; Tc: number; pc: number }> = {
  ch4: { name: 'CH₄ (Metano)', M: 16.04, Tc: 191, pc: 46.4 },
  co2: { name: 'CO₂', M: 44.01, Tc: 304, pc: 73.9 },
  n2: { name: 'N₂', M: 28.01, Tc: 126, pc: 33.9 },
};

const FUELS: Record<string, { label: string; c: number; h: number; o: number; M: number; hf0: number; pcs: number; pci: number }> = {
  ch4: { label: 'CH₄ (Gás natural)', c: 1, h: 4, o: 0, M: 16.04, hf0: -74850, pcs: 55510, pci: 49910 },
  c3h8: { label: 'C₃H₈ (Propano/GLP)', c: 3, h: 8, o: 0, M: 44.09, hf0: -103850, pcs: 50350, pci: 46360 },
  c8h18: { label: 'C₈H₁₈(l) (Octano)', c: 8, h: 18, o: 0, M: 114.22, hf0: -249910, pcs: 47900, pci: 44430 },
  h2: { label: 'H₂ (Hidrogênio)', c: 0, h: 2, o: 0, M: 2.016, hf0: 0, pcs: 141780, pci: 119950 },
};

const SIM_SPECS: SimSpec[] = [
  /* 1. pvt-gas-real */
  {
    id: 'pvt-gas-real',
    defaultTitle: `Equações de Estado: Gás Ideal, van der Waals e Redlich–Kwong`,
    subtitle: `Compare desvios da idealidade via fator de compressibilidade ${texInline(String.raw`Z = \frac{P\bar v}{\bar R T}`)}.`,
    modes: [
      { id: 'ch4', label: 'CH₄' },
      { id: 'co2', label: 'CO₂' },
      { id: 'n2', label: 'N₂' },
    ],
    params: [
      { key: 'T', label: 'Temperatura', unit: 'K', min: 180, max: 600, step: 5, initial: 298 },
      { key: 'vbar', label: `Volume molar ${texInline(String.raw`\bar v`)}`, unit: 'm³/kmol', min: 0.08, max: 0.50, step: 0.01, initial: 0.12 },
    ],
    render: (s, mode) => {
      const g = GAS_PROPS[mode] || GAS_PROPS.ch4;
      const { T, vbar } = s;
      const aVdw = (27 / 64) * ((RUB * g.Tc) ** 2 / g.pc);
      const bVdw = (RUB * g.Tc) / (8 * g.pc);
      const aRk = 0.42748 * ((RUB ** 2 * g.Tc ** 2.5) / g.pc);
      const bRk = 0.08664 * ((RUB * g.Tc) / g.pc);
      const Pideal = (RUB * T) / vbar;
      const Pvdw = (RUB * T) / (vbar - bVdw) - aVdw / (vbar * vbar);
      const Prk = (RUB * T) / (vbar - bRk) - aRk / (vbar * (vbar + bRk) * Math.sqrt(T));
      const Zrk = (Prk * vbar) / (RUB * T);
      const TR = T / g.Tc;
      const pR = Prk / g.pc;

      const x0 = 58, x1 = 414, y0 = 184, y1 = 24;
      const X = (v: number) => x0 + ((v - 0.07) / (0.52 - 0.07)) * (x1 - x0);
      const pMax = Math.max(250, Pideal * 1.15);
      const Y = (p: number) => clamp(y0 - (p / pMax) * (y0 - y1), y1 - 6, y0);
      const curve = (fn: (v: number) => number) => {
        const pts: string[] = [];
        for (let v = 0.08; v <= 0.501; v += 0.015) pts.push(`${X(v).toFixed(1)},${Y(fn(v)).toFixed(1)}`);
        return pts.join(' ');
      };
      const ptsId = curve((v) => (RUB * T) / v);
      const ptsRk = curve((v) => (RUB * T) / (v - bRk) - aRk / (v * (v + bRk) * Math.sqrt(T)));
      const ptsVdw = curve((v) => (RUB * T) / (v - bVdw) - aVdw / (v * v));
      const cx = X(vbar), cyRk = Y(Prk), cyId = Y(Pideal);

      return {
        svg: `<svg viewBox="0 0 440 222" role="img" aria-label="Isotermas P-v̄ comparando gás ideal, van der Waals e Redlich-Kwong">
          ${mkDefs('s1')}
          <line x1="${x0}" y1="${y0}" x2="${x1 + 12}" y2="${y0}" stroke="${COL.navy}" stroke-width="2" marker-end="url(#s1n)"/>
          <line x1="${x0}" y1="${y0}" x2="${x0}" y2="${y1 - 8}" stroke="${COL.navy}" stroke-width="2" marker-end="url(#s1n)"/>
          <text x="${x1 - 2}" y="${y0 + 17}" text-anchor="end" font-size="11" fill="${COL.navy}" font-style="italic">v̄ (m³/kmol)</text>
          <text x="10" y="${y1 + 4}" font-size="11" fill="${COL.navy}" font-style="italic">P (bar)</text>
          <polyline points="${ptsId}" fill="none" stroke="${COL.muted}" stroke-width="2" stroke-dasharray="6 4"/>
          <polyline points="${ptsVdw}" fill="none" stroke="${COL.blue}" stroke-width="2.2"/>
          <polyline points="${ptsRk}" fill="none" stroke="${COL.coral}" stroke-width="3"/>
          <line x1="${cx}" y1="${y0}" x2="${cx}" y2="${Math.min(cyRk, cyId)}" stroke="${COL.iceDeep}" stroke-width="1.5" stroke-dasharray="4 3"/>
          <circle cx="${cx}" cy="${cyId}" r="4.5" fill="${COL.muted}"/>
          <circle cx="${cx}" cy="${cyRk}" r="5.5" fill="${COL.coral}" stroke="#fff" stroke-width="2"/>
          <rect x="262" y="18" width="160" height="58" rx="8" fill="#fff" stroke="${COL.iceDeep}"/>
          <text x="272" y="34" font-size="11" fill="${COL.muted}">— — Gás ideal</text>
          <text x="272" y="50" font-size="11" fill="${COL.blue}">━━ van der Waals</text>
          <text x="272" y="66" font-size="11" font-weight="700" fill="${COL.coral}">━━ Redlich–Kwong</text>
          <text x="64" y="210" font-size="11" fill="${COL.muted}">${g.name}: T<tspan dy="2" font-size="8.5">R</tspan><tspan dy="-2"> = ${fmt(TR, 2)} · p</tspan><tspan dy="2" font-size="8.5">R</tspan><tspan dy="-2"> = ${fmt(pR, 2)}</tspan></text>
        </svg>`,
        kpis: [
          { label: texInline(String.raw`P_{\text{ideal}}`), value: `${fmt(Pideal, 1)} bar` },
          { label: texInline(String.raw`P_{\text{vdW}}`), value: `${fmt(Pvdw, 1)} bar` },
          { label: texInline(String.raw`P_{\text{RK}}`), value: `${fmt(Prk, 1)} bar`, accent: true },
          { label: texInline(String.raw`Z_{\text{RK}}`), value: fmt(Zrk, 3) },
        ],
        insight: Math.abs(Zrk - 1) < 0.05
          ? `Com ${texInline(`T_R = ${tnum(TR, 2)}`)} e ${texInline(`p_R = ${tnum(pR, 2)}`)}, temos ${texInline(`Z \\approx ${tnum(Zrk, 2)}`)}: o modelo de gás ideal apresenta erro inferior a 5%.`
          : Zrk < 1
            ? `${texInline(`Z = ${tnum(Zrk, 3)} < 1`)}: as forças atrativas reduzem a pressão de impacto na parede (desvio ideal de ${texInline(`+${tnum(((Pideal - Prk) / Prk) * 100, 1)}\\%`)}).`
            : `${texInline(`Z = ${tnum(Zrk, 3)} > 1`)}: o volume próprio das moléculas (covolume repulsivo) eleva a pressão acima do modelo ideal.`,
        trace: (phase) => ({ x: cx, y: lerp(cyId, cyRk, 0.5 - 0.5 * Math.cos(phase * Math.PI * 2)), tag: 'ΔP' }),
      };
    },
  },

  /* 2. first-law-closed */
  {
    id: 'first-law-closed',
    defaultTitle: 'I Lei em Sistema Fechado: Pistão + Trabalho Politrópico P Vⁿ = C',
    subtitle: 'Observe a área ∫ P dV no diagrama P–V enquanto o pistão se desloca.',
    params: [
      { key: 'n', label: 'Expoente politrópico n', unit: '', min: 0, max: 1.6, step: 0.1, initial: 1.3 },
      { key: 'ratio', label: 'Razão volumétrica V₂/V₁', unit: '', min: 0.3, max: 2.5, step: 0.1, initial: 1.8 },
      { key: 'p1', label: 'Pressão inicial P₁', unit: 'kPa', min: 100, max: 600, step: 25, initial: 200 },
    ],
    render: (s) => {
      const { n, ratio, p1 } = s;
      const V1 = 0.2;
      const V2 = V1 * ratio;
      const P2 = p1 * ratio ** -n;
      const kAir = 1.4;
      const W = Math.abs(n - 1) < 1e-4 ? p1 * V1 * Math.log(ratio) : (p1 * V1 - P2 * V2) / (n - 1);
      const dU = (p1 * V1 / (kAir - 1)) * (ratio ** (1 - n) - 1);
      const Q = dU + W;

      const x0 = 56, x1 = 270, y0 = 185, y1 = 26;
      const X = (v: number) => x0 + ((v - 0.04) / (0.54 - 0.04)) * (x1 - x0);
      const pMax = Math.max(700, p1 * 1.1, P2 * 1.1);
      const Y = (p: number) => clamp(y0 - (p / pMax) * (y0 - y1), y1, y0);
      const pathPts: [number, number][] = [];
      const stepsN = 20;
      for (let i = 0; i <= stepsN; i++) {
        const v = lerp(V1, V2, i / stepsN);
        const p = p1 * (v / V1) ** -n;
        pathPts.push([X(v), Y(p)]);
      }
      const polyLine = pathPts.map((pt) => `${pt[0].toFixed(1)},${pt[1].toFixed(1)}`).join(' ');
      const areaPath = `M ${X(V1).toFixed(1)},${y0} L ${pathPts.map((pt) => `${pt[0].toFixed(1)},${pt[1].toFixed(1)}`).join(' L ')} L ${X(V2).toFixed(1)},${y0} Z`;

      return {
        svg: `<svg viewBox="0 0 440 220" role="img" aria-label="Diagrama P-V e cilindro-pistão sincronizados">
          ${mkDefs('s2')}
          <!-- P-V plot -->
          <polygon points="${X(V1).toFixed(1)},${y0} ${polyLine} ${X(V2).toFixed(1)},${y0}" fill="${COL.coralSoft}" opacity="0.65"/>
          <path d="${areaPath}" fill="${COL.coralSoft}" opacity="0.35"/>
          <line x1="${x0}" y1="${y0}" x2="${x1 + 10}" y2="${y0}" stroke="${COL.navy}" stroke-width="2" marker-end="url(#s2n)"/>
          <line x1="${x0}" y1="${y0}" x2="${x0}" y2="${y1 - 8}" stroke="${COL.navy}" stroke-width="2" marker-end="url(#s2n)"/>
          <polyline points="${polyLine}" fill="none" stroke="${COL.coral}" stroke-width="3.2"/>
          <circle cx="${X(V1)}" cy="${Y(p1)}" r="5" fill="${COL.navy}"/><text x="${X(V1) - 14}" y="${Y(p1) - 6}" font-size="11" font-weight="700" fill="${COL.navy}">1</text>
          <circle cx="${X(V2)}" cy="${Y(P2)}" r="5" fill="${COL.coral}"/><text x="${X(V2) + 7}" y="${Y(P2) - 4}" font-size="11" font-weight="700" fill="${COL.coral}">2</text>
          <text x="${x1}" y="${y0 + 18}" font-size="11" fill="${COL.navy}" font-style="italic">V</text>
          <text x="20" y="${y1 + 4}" font-size="11" fill="${COL.navy}" font-style="italic">P</text>
          <!-- Piston visual -->
          <g transform="translate(298,42)">
            <rect x="0" y="0" width="124" height="126" rx="8" fill="${COL.paper}" stroke="${COL.navy}" stroke-width="2.5"/>
            <rect x="4" y="${122 - clamp(42 * ratio, 18, 96)}" width="116" height="${clamp(42 * ratio, 18, 96)}" fill="${COL.ice}"/>
            <rect x="3" y="${110 - clamp(42 * ratio, 18, 96)}" width="118" height="12" fill="${COL.navy}"/>
            <line x1="62" y1="${110 - clamp(42 * ratio, 18, 96)}" x2="62" y2="-12" stroke="${COL.navy}" stroke-width="5"/>
            <text x="62" y="146" font-size="11" text-anchor="middle" font-weight="700" fill="${COL.navy}">${ratio >= 1 ? 'Expansão (W > 0)' : 'Compressão (W < 0)'}</text>
            <text x="62" y="162" font-size="10.5" text-anchor="middle" fill="${COL.muted}">V₁ = 0,20 → V₂ = ${fmt(V2, 2)} m³</text>
          </g>
        </svg>`,
        kpis: [
          { label: 'Pressão final P₂', value: `${fmt(P2, 1)} kPa` },
          { label: 'Trabalho W₁₂', value: `${fmt(W, 2)} kJ`, accent: true },
          { label: 'Variação ΔU (ar)', value: `${fmt(dU, 2)} kJ` },
          { label: 'Calor Q₁₂', value: `${fmt(Q, 2)} kJ` },
        ],
        insight: Math.abs(n - kAir) < 0.05
          ? 'Com n ≈ k = 1,4 (ar), Q₁₂ ≈ 0: o trabalho de expansão vem integralmente da energia interna (processo adiabático reversível).'
          : n === 0
            ? 'Processo isobárico (n = 0): W = P(V₂ − V₁) e Q = ΔH.'
            : `Para n = ${fmt(n, 1)}, o sinal de Q (${Q >= 0 ? 'entra' : 'sai'}) fecha o balanço ΔU = Q − W.`,
        trace: (phase) => {
          const [x, y] = samplePolyline(pathPts, phase);
          return { x, y, tag: '1→2' };
        },
      };
    },
  },

  /* 3. control-volume-steady */
  {
    id: 'control-volume-steady',
    defaultTitle: 'Volume de Controle em Regime Permanente (Dispositivos)',
    subtitle: 'Selecione o equipamento e teste como h, V e Q̇/Ẇ se equilibram na 1ª Lei.',
    modes: [
      { id: 'turbina', label: 'Turbina' },
      { id: 'compressor', label: 'Compressor' },
      { id: 'bocal', label: 'Bocal' },
      { id: 'valvula', label: 'Válvula' },
      { id: 'eletrolisador', label: 'Eletrolisador' },
    ],
    params: [
      { key: 'mdot', label: 'Vazão mássica ṁ (ou taxa H₂)', unit: 'kg/s', min: 0.5, max: 12, step: 0.5, initial: 5.0 },
      { key: 'dh', label: 'Salto Δh (ou U célula ×100)', unit: 'kJ/kg', min: 50, max: 900, step: 25, initial: 500 },
      { key: 'qloss', label: 'Perda térmica Q̇_sai', unit: 'kW', min: 0, max: 200, step: 10, initial: 20 },
    ],
    render: (s, mode) => {
      const { mdot, dh, qloss } = s;
      let W = 0, extraLabel = 'Potência útil Ẇ', extraVal = '', msg = '', iconPath = '';
      if (mode === 'turbina') {
        W = mdot * dh - qloss;
        extraVal = `${fmt(W, 1)} kW`;
        msg = 'Turbina entrega trabalho reduzindo entalpia; perda térmica diminui diretamente Ẇ.';
        iconPath = `<path d="M130 70 L280 44 L280 166 L130 140 Z" fill="${COL.ice}" stroke="${COL.navy}" stroke-width="3"/>`;
      } else if (mode === 'compressor') {
        W = -(mdot * (dh * 0.4) + qloss);
        extraLabel = 'Potência consumida |Ẇ|';
        extraVal = `${fmt(Math.abs(W), 1)} kW`;
        msg = 'Compressor exige trabalho no eixo (Ẇ < 0) para elevar pressão e entalpia do gás.';
        iconPath = `<path d="M130 44 L280 70 L280 140 L130 166 Z" fill="${COL.ice}" stroke="${COL.navy}" stroke-width="3"/>`;
      } else if (mode === 'bocal') {
        const V2 = Math.sqrt(40 * 40 + 2000 * (dh * 0.2));
        extraLabel = 'Velocidade de saída V₂';
        extraVal = `${fmt(V2, 1)} m/s`;
        msg = 'No bocal (Ẇ = 0), queda de entalpia converte-se em energia cinética: V₂ = √(V₁² + 2Δh).';
        iconPath = `<path d="M130 56 L280 86 L280 124 L130 154 Z" fill="${COL.coralSoft}" stroke="${COL.coral}" stroke-width="3"/>`;
      } else if (mode === 'valvula') {
        extraLabel = 'Entalpia de saída';
        extraVal = 'h₂ = h₁ (Δh = 0)';
        msg = 'Válvula de estrangulamento: Ẇ = 0, Q̇ ≈ 0, Δec ≈ 0 ⇒ processo isentálpico (h₁ = h₂).';
        iconPath = `<path d="M150 66 L260 144 M150 144 L260 66 M150 66 H260 M150 144 H260" stroke="${COL.navy}" stroke-width="3" fill="none"/>`;
      } else {
        const U = clamp(1.25 + (dh / 900) * 0.95, 1.25, 2.2);
        const Wel = -(2 * 96485 * U) / 1000;
        const Qmol = Wel + 285.8;
        extraLabel = `U = ${fmt(U, 2)} V · Q térmico`;
        extraVal = `${fmt(Qmol, 1)} kJ/mol H₂`;
        msg = Math.abs(U - 1.48) < 0.04
          ? 'Tensão termoneutra (1,48 V): Q ≈ 0.'
          : U > 1.48
            ? `Acima de 1,48 V: célula exotérmica (rejeita ${fmt(Math.abs(Qmol), 1)} kJ/mol).`
            : `Abaixo de 1,48 V: célula endotérmica (absorve ${fmt(Qmol, 1)} kJ/mol).`;
        iconPath = `<rect x="135" y="54" width="140" height="102" rx="12" fill="${COL.paper}" stroke="${COL.navy}" stroke-width="3"/><rect x="155" y="70" width="14" height="70" fill="${COL.coral}"/><rect x="241" y="70" width="14" height="70" fill="${COL.navy}"/>`;
      }
      const streamPts: [number, number][] = [[40, 105], [385, 105]];
      return {
        svg: `<svg viewBox="0 0 440 210" role="img" aria-label="Esquema do volume de controle selecionado">
          ${mkDefs('s3')}
          <rect x="108" y="32" width="194" height="146" rx="14" fill="none" stroke="${COL.coral}" stroke-width="2" stroke-dasharray="7 5"/>
          <line x1="32" y1="105" x2="128" y2="105" stroke="${COL.navy}" stroke-width="4" marker-end="url(#s3n)"/>
          <line x1="282" y1="105" x2="395" y2="105" stroke="${COL.navy}" stroke-width="4" marker-end="url(#s3n)"/>
          ${iconPath}
          <text x="205" y="22" font-size="11.5" font-weight="700" text-anchor="middle" fill="${COL.navy}">Fronteira do Volume de Controle (${mode.toUpperCase()})</text>
          <text x="36" y="88" font-size="11" fill="${COL.navy}">Entrada (h₁, V₁)</text>
          <text x="315" y="88" font-size="11" fill="${COL.navy}">Saída (h₂, V₂)</text>
          <text x="205" y="198" font-size="11" text-anchor="middle" fill="${COL.muted}">0 = Q̇_vc − Ẇ_vc + ṁ[(h₁ − h₂) + (V₁² − V₂²)/2]</text>
        </svg>`,
        kpis: [
          { label: extraLabel, value: extraVal, accent: true },
          { label: 'Vazão ṁ', value: `${fmt(mdot, 1)} kg/s` },
          { label: 'Perda Q̇_sai', value: `${fmt(qloss, 0)} kW` },
        ],
        insight: msg,
        trace: (phase) => {
          const [x, y] = samplePolyline(streamPts, phase);
          return { x, y, tag: 'ṁ' };
        },
      };
    },
  },

  /* 4. pv-dome-quality */
  {
    id: 'pv-dome-quality',
    defaultTitle: 'Substância Pura: Cúpula de Saturação & Regra da Alavanca',
    subtitle: 'Varie pressão e título mássico x e veja o estado se mover dentro da cúpula da água.',
    params: [
      { key: 'idx', label: 'Pressão (índice Tab. A-3)', unit: 'bar', min: 1, max: 9, step: 1, initial: 4 },
      { key: 'x', label: 'Título mássico x', unit: '', min: 0, max: 1, step: 0.05, initial: 0.45 },
    ],
    render: (s) => {
      const sat = STEAM_SAT[clamp(Math.round(s.idx), 0, STEAM_SAT.length - 1)];
      const x = s.x;
      const v = sat.vf + x * (sat.vg - sat.vf);
      const h = sat.hf + x * sat.hfg;
      const u = sat.uf + x * (sat.ug - sat.uf);
      const sVal = sat.sf + x * (sat.sg - sat.sf);
      const vFrac = (x * sat.vg) / v;

      // Schematic T-s dome coordinates
      const yT = 186 - ((sat.T - 40) / (374 - 40)) * 140;
      const sF_px = 110 + (sat.sf / 4.43) * 105;
      const sG_px = 385 - ((8.3 - sat.sg) / (8.3 - 4.43)) * 170;
      const sX_px = lerp(sF_px, sG_px, x);

      return {
        svg: `<svg viewBox="0 0 440 220" role="img" aria-label="Diagrama T-s com ponto de estado dentro da cúpula de saturação">
          ${mkDefs('s4')}
          <path d="M88,190 C112,115 162,46 215,46 C268,46 340,115 398,190 Z" fill="${COL.ice}" stroke="${COL.navy}" stroke-width="2.5"/>
          <line x1="50" y1="194" x2="420" y2="194" stroke="${COL.navy}" stroke-width="2" marker-end="url(#s4n)"/>
          <line x1="50" y1="194" x2="50" y2="20" stroke="${COL.navy}" stroke-width="2" marker-end="url(#s4n)"/>
          <line x1="${sF_px}" y1="${yT}" x2="${sG_px}" y2="${yT}" stroke="${COL.navy}" stroke-width="2.5"/>
          <circle cx="${sF_px}" cy="${yT}" r="4.5" fill="${COL.navy}"/><text x="${sF_px - 14}" y="${yT + 4}" font-size="11" font-weight="700" fill="${COL.navy}">f</text>
          <circle cx="${sG_px}" cy="${yT}" r="4.5" fill="${COL.navy}"/><text x="${sG_px + 8}" y="${yT + 4}" font-size="11" font-weight="700" fill="${COL.navy}">g</text>
          <circle cx="${sX_px}" cy="${yT}" r="6.5" fill="${COL.coral}" stroke="#fff" stroke-width="2"/>
          <text x="${sX_px}" y="${yT - 10}" font-size="11" font-weight="700" text-anchor="middle" fill="${COL.coral}">x = ${fmt(x, 2)}</text>
          <text x="398" y="212" font-size="11" fill="${COL.navy}" font-style="italic">s</text>
          <text x="26" y="30" font-size="11" fill="${COL.navy}" font-style="italic">T</text>
          <text x="215" y="34" font-size="10.5" text-anchor="middle" fill="${COL.muted}">P = ${fmt(sat.pBar, 2)} bar · T_sat = ${fmt(sat.T, 1)} °C</text>
        </svg>`,
        kpis: [
          { label: 'Entalpia h', value: `${fmt(h, 1)} kJ/kg`, accent: true },
          { label: 'Energia interna u', value: `${fmt(u, 1)} kJ/kg` },
          { label: 'Vol. específico v', value: `${fmt(v, 4)} m³/kg` },
          { label: 'Fração em volume (vapor)', value: `${fmt(vFrac * 100, 1)} %` },
        ],
        insight: `Embora apenas ${fmt(x * 100, 0)}% da massa seja vapor, ela ocupa ${fmt(vFrac * 100, 1)}% do volume porque v_g ≫ v_f.`,
      };
    },
  },

  /* 5. carnot-engine */
  {
    id: 'carnot-engine',
    defaultTitle: 'Ciclo de Carnot Reversível (Motor / Refrigerador / Bomba de Calor)',
    subtitle: 'Compare η_Carnot com o limite de potência máxima de Curzon–Ahlborn no plano T–s.',
    modes: [
      { id: 'motor', label: 'Motor Térmico' },
      { id: 'refrig', label: 'Refrigerador' },
      { id: 'bc', label: 'Bomba de Calor' },
    ],
    params: [
      { key: 'TH', label: 'Reservatório quente T_H', unit: 'K', min: 350, max: 1200, step: 25, initial: 750 },
      { key: 'TL', label: 'Reservatório frio T_L', unit: 'K', min: 230, max: 340, step: 5, initial: 300 },
      { key: 'Q', label: 'Calor base (Q_H ou Q_L)', unit: 'kJ', min: 50, max: 300, step: 10, initial: 100 },
    ],
    render: (s, mode) => {
      const { TH, TL, Q } = s;
      const eta = 1 - TL / TH;
      const etaCA = 1 - Math.sqrt(TL / TH);
      const copR = TL / (TH - TL);
      const copBC = TH / (TH - TL);
      const W = mode === 'motor' ? eta * Q : mode === 'refrig' ? Q / copR : Q / copBC;

      const yH = clamp(180 - ((TH - 200) / 1050) * 145, 25, 130);
      const yL = clamp(180 - ((TL - 200) / 1050) * 145, yH + 22, 180);
      const rectPts: [number, number][] = mode === 'motor'
        ? [[120, yH], [340, yH], [340, yL], [120, yL], [120, yH]]
        : [[120, yH], [120, yL], [340, yL], [340, yH], [120, yH]];

      const kpis: SimKpi[] = mode === 'motor'
        ? [
            { label: 'η_Carnot', value: `${fmt(eta * 100, 1)} %`, accent: true },
            { label: 'Curzon–Ahlborn', value: `${fmt(etaCA * 100, 1)} %` },
            { label: 'Trabalho W_rev', value: `${fmt(W, 1)} kJ` },
            { label: 'Calor rejeitado Q_L', value: `${fmt(Q - W, 1)} kJ` },
          ]
        : [
            { label: mode === 'refrig' ? 'COP_R,máx' : 'COP_BC,máx', value: fmt(mode === 'refrig' ? copR : copBC, 2), accent: true },
            { label: 'Trabalho mínimo W', value: `${fmt(W, 1)} kJ` },
            { label: 'Razão T_H / T_L', value: fmt(TH / TL, 2) },
          ];

      return {
        svg: `<svg viewBox="0 0 440 210" role="img" aria-label="Ciclo de Carnot retangular no diagrama T-s">
          ${mkDefs('s5')}
          <line x1="56" y1="188" x2="410" y2="188" stroke="${COL.navy}" stroke-width="2" marker-end="url(#s5n)"/>
          <line x1="56" y1="188" x2="56" y2="18" stroke="${COL.navy}" stroke-width="2" marker-end="url(#s5n)"/>
          <rect x="120" y="${yL}" width="220" height="${188 - yL}" fill="${COL.iceDeep}" opacity="0.55"/>
          <rect x="120" y="${yH}" width="220" height="${yL - yH}" fill="${COL.coralSoft}" stroke="${COL.navy}" stroke-width="2.5"/>
          <text x="230" y="${(yH + yL) / 2 + 5}" font-size="13" font-weight="700" text-anchor="middle" fill="${COL.coral}">W = ${fmt(W, 1)} kJ</text>
          <text x="16" y="${yH + 4}" font-size="11" fill="${COL.coral}" font-weight="700">T_H=${TH}</text>
          <text x="16" y="${yL + 4}" font-size="11" fill="${COL.navy}" font-weight="700">T_L=${TL}</text>
          <text x="396" y="204" font-size="11" fill="${COL.navy}" font-style="italic">s</text>
          <text x="38" y="24" font-size="11" fill="${COL.navy}" font-style="italic">T</text>
          <text x="230" y="204" font-size="10.5" text-anchor="middle" fill="${COL.muted}">Sentido ${mode === 'motor' ? 'horário (produz trabalho)' : 'anti-horário (bombeia calor)'}</text>
        </svg>`,
        kpis,
        insight: mode === 'motor'
          ? `Qualquer máquina real operando entre ${TH} K e ${TL} K tem η < ${fmt(eta * 100, 1)}% (na prática, perto de Curzon–Ahlborn: ${fmt(etaCA * 100, 1)}%).`
          : `Note a identidade exata: COP_BC − COP_R = ${fmt(copBC, 2)} − ${fmt(copR, 2)} = 1,00.`,
        trace: (phase) => {
          const [x, y] = samplePolyline(rectPts, phase);
          return { x, y };
        },
      };
    },
  },

  /* 6. entropy-exergy */
  {
    id: 'entropy-exergy',
    defaultTitle: 'Geração de Entropia & Teorema de Gouy–Stodola (I = T₀ S_ger)',
    subtitle: 'Veja como ΔT finito num trocador ou ineficiência num componente destrói trabalho útil.',
    modes: [
      { id: 'trocador', label: 'Transferência de Calor' },
      { id: 'turbina', label: 'Turbina Real (η_s)' },
    ],
    params: [
      { key: 'T0', label: 'Ambiente T₀', unit: 'K', min: 273, max: 315, step: 2, initial: 298 },
      { key: 'hot', label: 'Fonte T_H (ou T₁ °C)', unit: 'K', min: 350, max: 900, step: 25, initial: 600 },
      { key: 'eff', label: 'η_s turbina (ou Q̇ trocador)', unit: '', min: 50, max: 100, step: 2, initial: 84 },
    ],
    render: (s, mode) => {
      const { T0, hot, eff } = s;
      const cold = 350;
      let Sger = 0, I = 0, Wu = 0, Wrev = 0;
      if (mode === 'trocador') {
        const Q = eff * 2; // 100..200 kW
        const Tc = Math.min(cold, hot - 20);
        Sger = Q * (1 / Tc - 1 / hot);
        I = T0 * Sger;
        Wrev = Q * (1 - T0 / hot);
        Wu = Math.max(0, Wrev - I);
      } else {
        const eta = eff / 100;
        const dh_s = 800 * (1 - Math.pow(0.1 / 3, 0.2));
        const dh = eta * dh_s;
        Sger = (dh_s - dh) / T0;
        I = T0 * Sger;
        Wrev = dh_s;
        Wu = dh;
      }
      const wBar = 320;
      const fU = clamp(Wu / Math.max(Wrev, 1), 0, 1);
      const wU = fU * wBar;
      const wI = (1 - fU) * wBar;

      return {
        svg: `<svg viewBox="0 0 440 200" role="img" aria-label="Decomposição da energia disponível em trabalho útil e irreversibilidade T0 Sger">
          <text x="60" y="34" font-size="12" font-weight="700" fill="${COL.navy}">Energia Disponível / Reversível: W_rev = ${fmt(Wrev, 1)} kW (ou kJ/kg)</text>
          <rect x="60" y="46" width="${wBar}" height="34" rx="6" fill="${COL.ice}" stroke="${COL.navy}" stroke-width="2"/>
          <text x="220" y="68" font-size="12" font-weight="700" text-anchor="middle" fill="${COL.navy}">Potencial máximo pela 2ª Lei</text>
          <rect x="60" y="102" width="${wU.toFixed(1)}" height="40" rx="4" fill="${COL.navy}"/>
          <rect x="${(60 + wU).toFixed(1)}" y="102" width="${wI.toFixed(1)}" height="40" rx="4" fill="${COL.coral}"/>
          <text x="${(60 + wU / 2).toFixed(1)}" y="126" font-size="11.5" font-weight="700" text-anchor="middle" fill="#fff">${wU > 65 ? `Útil ${fmt(fU * 100, 0)}%` : ''}</text>
          <text x="${(60 + wU + wI / 2).toFixed(1)}" y="126" font-size="11.5" font-weight="700" text-anchor="middle" fill="#fff">${wI > 65 ? `I = ${fmt(I, 1)}` : ''}</text>
          <text x="60" y="170" font-size="11" fill="${COL.muted}">Teorema de Gouy–Stodola: İ = T₀ · Ṡ_ger = ${T0} × ${fmt(Sger, 3)} = ${fmt(I, 1)}</text>
        </svg>`,
        kpis: [
          { label: 'Entropia gerada S_ger', value: `${fmt(Sger, 3)} kW/K` },
          { label: 'Irreversibilidade I = T₀ S_ger', value: `${fmt(I, 1)} kW`, accent: true },
          { label: 'Eficiência de 2ª Lei η_II', value: `${fmt(fU * 100, 1)} %` },
        ],
        insight: 'Reduzir S_ger preserva diretamente capacidade de realizar trabalho útil no ambiente a T₀.',
      };
    },
  },

  /* 7. ideal-gas-mixture */
  {
    id: 'ideal-gas-mixture',
    defaultTitle: 'Misturas de Gases Ideais: Dalton (Pressões) & Amagat (Volumes)',
    subtitle: 'Ajuste a composição molar N₂ + O₂ + CO₂ e acompanhe M_m, R_m, c_p,m e entropia de mistura.',
    params: [
      { key: 'yN2', label: 'Fração molar y_N₂', unit: '%', min: 10, max: 85, step: 5, initial: 70 },
      { key: 'yO2', label: 'Fração molar y_O₂', unit: '%', min: 5, max: 50, step: 5, initial: 20 },
      { key: 'P', label: 'Pressão total P', unit: 'kPa', min: 100, max: 800, step: 50, initial: 200 },
    ],
    render: (s) => {
      const n2 = s.yN2 / 100;
      const o2 = Math.min(s.yO2 / 100, 0.95 - n2);
      const co2 = Math.max(0.05, 1 - n2 - o2);
      const sumY = n2 + o2 + co2;
      const y1 = n2 / sumY, y2 = o2 / sumY, y3 = co2 / sumY;
      const Mm = y1 * 28.01 + y2 * 32.0 + y3 * 44.01;
      const Rm = RU / Mm;
      const cpM = (y1 * 28.01 * 1.039 + y2 * 32.0 * 0.918 + y3 * 44.01 * 0.846) / Mm;
      const dSmix = -RU * (y1 * Math.log(y1) + y2 * Math.log(y2) + y3 * Math.log(y3));

      const W = 340;
      const w1 = y1 * W, w2 = y2 * W, w3 = y3 * W;
      return {
        svg: `<svg viewBox="0 0 440 190" role="img" aria-label="Barras de frações molares, pressões parciais de Dalton e frações mássicas">
          <text x="50" y="34" font-size="12" font-weight="700" fill="${COL.navy}">Composição Molar (y_i = P_i / P = V_i / V) · P = ${s.P} kPa</text>
          <rect x="50" y="48" width="${w1.toFixed(1)}" height="42" fill="${COL.navy}"/>
          <rect x="${(50 + w1).toFixed(1)}" y="48" width="${w2.toFixed(1)}" height="42" fill="${COL.blue}"/>
          <rect x="${(50 + w1 + w2).toFixed(1)}" y="48" width="${w3.toFixed(1)}" height="42" fill="${COL.coral}"/>
          <text x="${(50 + w1 / 2).toFixed(1)}" y="73" font-size="11.5" font-weight="700" text-anchor="middle" fill="#fff">N₂ ${fmt(y1 * 100, 0)}%</text>
          <text x="${(50 + w1 + w2 / 2).toFixed(1)}" y="73" font-size="11" font-weight="700" text-anchor="middle" fill="#fff">${w2 > 42 ? `O₂ ${fmt(y2 * 100, 0)}%` : ''}</text>
          <text x="${(50 + w1 + w2 + w3 / 2).toFixed(1)}" y="73" font-size="11" font-weight="700" text-anchor="middle" fill="#fff">${w3 > 42 ? `CO₂ ${fmt(y3 * 100, 0)}%` : ''}</text>
          <text x="50" y="122" font-size="11.5" fill="${COL.navy}">Pressões parciais: P_N₂ = ${fmt(y1 * s.P, 1)} kPa · P_O₂ = ${fmt(y2 * s.P, 1)} kPa · P_CO₂ = ${fmt(y3 * s.P, 1)} kPa</text>
          <text x="50" y="146" font-size="11.5" fill="${COL.coral}" font-weight="700">Δs̄_mistura = −R̄ Σ y_i ln(y_i) = ${fmt(dSmix, 2)} kJ/(kmol·K) &gt; 0</text>
          <text x="50" y="170" font-size="10.5" fill="${COL.muted}">Misturar gases diferentes a T e P constantes é um processo intrinsecamente irreversível.</text>
        </svg>`,
        kpis: [
          { label: 'Massa molar M_m', value: `${fmt(Mm, 2)} kg/kmol`, accent: true },
          { label: 'Constante R_m', value: `${fmt(Rm, 4)} kJ/(kg·K)` },
          { label: 'c_p,m (a 300 K)', value: `${fmt(cpM, 3)} kJ/(kg·K)` },
          { label: 'Δs̄_mistura', value: `${fmt(dSmix, 2)} kJ/(kmol·K)` },
        ],
        insight: `As frações molares y_i coincidem com as frações de pressão parcial (Dalton) e de volume parcial (Amagat), mas não com as mássicas mf_i.`,
      };
    },
  },

  /* 8. combustion-flame */
  {
    id: 'combustion-flame',
    defaultTitle: 'Combustão, Poder Calorífico & Temperatura Adiabática de Chama',
    subtitle: 'Escolha o combustível e o excesso de ar para ver estequiometria, PCS/PCI e T_ad via Tabela A-23.',
    modes: [
      { id: 'ch4', label: 'CH₄' },
      { id: 'c3h8', label: 'C₃H₈' },
      { id: 'c8h18', label: 'C₈H₁₈(l)' },
      { id: 'h2', label: 'H₂' },
    ],
    params: [
      { key: 'exc', label: 'Excesso de ar', unit: '%', min: 0, max: 200, step: 10, initial: 20 },
      { key: 'TR', label: 'Temp. ar/combustível T_R', unit: 'K', min: 298, max: 800, step: 25, initial: 298 },
    ],
    render: (s, mode) => {
      const f = FUELS[mode] || FUELS.ch4;
      const lam = 1 + s.exc / 100;
      const aTh = f.c + f.h / 4 - f.o / 2;
      const aAct = lam * aTh;
      const nCO2 = f.c;
      const nH2O = f.h / 2;
      const nO2 = (lam - 1) * aTh;
      const nN2 = 3.76 * aAct;
      const AF = (4.76 * aAct * 28.97) / f.M;

      // HR at TR (reactants: fuel at 298 + air preheat delta from 298 to TR)
      const hAirR = 4.76 * aAct * (0.21 * (hBarGas('O2', s.TR) - hBarGas('O2', 298)) + 0.79 * (hBarGas('N2', s.TR) - hBarGas('N2', 298)));
      const HR = f.hf0 + hAirR;

      const HP = (T: number) =>
        nCO2 * (HF0.CO2 + (hBarGas('CO2', T) - 9364)) +
        nH2O * (HF0.H2Og + (hBarGas('H2O', T) - 9904)) +
        nO2 * (hBarGas('O2', T) - 8682) +
        nN2 * (hBarGas('N2', T) - 8669);

      // Solve HP(Tad) = HR by bisection
      const solveTad = (excFrac: number) => {
        const l = 1 + excFrac;
        const aA = l * aTh;
        const nO = (l - 1) * aTh;
        const nN = 3.76 * aA;
        const hR = f.hf0 + 4.76 * aA * (0.21 * (hBarGas('O2', s.TR) - 8682) + 0.79 * (hBarGas('N2', s.TR) - 8669));
        let lo = 400, hi = 3200;
        for (let k = 0; k < 28; k++) {
          const mid = 0.5 * (lo + hi);
          const hp =
            nCO2 * (HF0.CO2 + hBarGas('CO2', mid) - 9364) +
            nH2O * (HF0.H2Og + hBarGas('H2O', mid) - 9904) +
            nO * (hBarGas('O2', mid) - 8682) +
            nN * (hBarGas('N2', mid) - 8669);
          if (hp < hR) lo = mid; else hi = mid;
        }
        return 0.5 * (lo + hi);
      };

      const Tad = solveTad(s.exc / 100);
      const pts: string[] = [];
      const x0 = 60, x1 = 400, y0 = 185, y1 = 28;
      const X = (e: number) => x0 + (e / 200) * (x1 - x0);
      const Y = (T: number) => clamp(y0 - ((T - 800) / (2800 - 800)) * (y0 - y1), y1, y0);
      for (let e = 0; e <= 200; e += 20) pts.push(`${X(e).toFixed(1)},${Y(solveTad(e / 100)).toFixed(1)}`);
      const cx = X(s.exc), cy = Y(Tad);

      return {
        svg: `<svg viewBox="0 0 440 212" role="img" aria-label="Curva da temperatura adiabática de chama em função do excesso de ar">
          ${mkDefs('s8')}
          <line x1="${x0}" y1="${y0}" x2="${x1 + 12}" y2="${y0}" stroke="${COL.navy}" stroke-width="2" marker-end="url(#s8n)"/>
          <line x1="${x0}" y1="${y0}" x2="${x0}" y2="${y1 - 8}" stroke="${COL.navy}" stroke-width="2" marker-end="url(#s8n)"/>
          <polyline points="${pts.join(' ')}" fill="none" stroke="${COL.coral}" stroke-width="3.2"/>
          <line x1="${cx}" y1="${y0}" x2="${cx}" y2="${cy}" stroke="${COL.iceDeep}" stroke-dasharray="4 3"/>
          <circle cx="${cx}" cy="${cy}" r="6" fill="${COL.coral}" stroke="#fff" stroke-width="2"/>
          <text x="${cx + 8}" y="${cy - 8}" font-size="11.5" font-weight="700" fill="${COL.navy}">T_ad = ${fmt(Tad, 0)} K</text>
          <text x="${x1 - 55}" y="${y0 + 18}" font-size="11" fill="${COL.navy}">Excesso de ar (%)</text>
          <text x="12" y="${y1 + 6}" font-size="11" fill="${COL.navy}">T_ad (K)</text>
          <text x="72" y="20" font-size="10.5" fill="${COL.muted}">Produtos: ${nCO2 ? `${nCO2} CO₂ + ` : ''}${nH2O} H₂O + ${fmt(nO2, 2)} O₂ + ${fmt(nN2, 2)} N₂</text>
        </svg>`,
        kpis: [
          { label: 'Temp. Adiabática T_ad', value: `${fmt(Tad, 0)} K (${fmt(Tad - 273.15, 0)} °C)`, accent: true },
          { label: 'Razão Ar–Combustível AF', value: `${fmt(AF, 2)} kg/kg` },
          { label: 'PCS / PCI', value: `${fmt(f.pcs / 1000, 2)} / ${fmt(f.pci / 1000, 2)} MJ/kg` },
        ],
        insight: `A diluição pelo excesso de ar (${s.exc}%) reduz T_ad de ${fmt(solveTad(0), 0)} K para ${fmt(Tad, 0)} K porque N₂ e O₂ excedente absorvem energia sem reagir.`,
        trace: (phase) => ({ x: cx, y: lerp(y0, cy, 0.5 - 0.5 * Math.cos(phase * Math.PI * 2)) }),
      };
    },
  },

  /* 9. psychrometrics */
  {
    id: 'psychrometrics',
    defaultTitle: 'Carta Psicrométrica Interativa: Processos de Ar Úmido (1 atm)',
    subtitle: 'Simule aquecimento sensível, resfriamento com desumidificação e resfriamento evaporativo.',
    modes: [
      { id: 'resf-desum', label: 'Resfriar + Desumid.' },
      { id: 'aquec', label: 'Aquecimento Sensível' },
      { id: 'evap', label: 'Resf. Evaporativo' },
    ],
    params: [
      { key: 'T1', label: 'Temp. bulbo seco T₁', unit: '°C', min: 15, max: 42, step: 1, initial: 32 },
      { key: 'phi1', label: 'Umidade relativa φ₁', unit: '%', min: 20, max: 90, step: 5, initial: 60 },
      { key: 'T2', label: 'Temp. saída T₂', unit: '°C', min: 8, max: 45, step: 1, initial: 14 },
    ],
    render: (s, mode) => {
      const P = 101.325;
      const pv1 = (s.phi1 / 100) * pSatWaterKpa(s.T1);
      const w1 = 0.622 * (pv1 / (P - pv1)); // kg/kg ar seco
      const h1 = 1.005 * s.T1 + w1 * (2501 + 1.86 * s.T1);
      // Dew point approximation
      let Tpo = s.T1;
      for (let t = -10; t <= s.T1; t += 0.25) { if (pSatWaterKpa(t) >= pv1) { Tpo = t; break; } }

      let T2 = s.T2, w2 = w1, phi2 = 0, labelProc = '';
      if (mode === 'aquec') {
        T2 = Math.max(s.T1 + 2, s.T2);
        w2 = w1;
        phi2 = clamp((pv1 / pSatWaterKpa(T2)) * 100, 1, 100);
        labelProc = 'ω = const. (φ cai ao aquecer)';
      } else if (mode === 'resf-desum') {
        T2 = Math.min(s.T1 - 1, s.T2);
        const ps2 = pSatWaterKpa(T2);
        if (T2 < Tpo) { w2 = 0.622 * (ps2 / (P - ps2)); phi2 = 100; labelProc = `Condensação abaixo de T_po = ${fmt(Tpo, 1)} °C`; }
        else { w2 = w1; phi2 = (pv1 / ps2) * 100; labelProc = 'Sem condensação (T₂ > T_po)'; }
      } else {
        // evaporative cooling approx constant wet bulb h = const
        T2 = clamp(s.T2, Tpo, s.T1 - 1);
        w2 = clamp((h1 - 1.005 * T2) / (2501 + 1.86 * T2), w1, 0.622 * (pSatWaterKpa(T2) / (P - pSatWaterKpa(T2))));
        const pv2 = (w2 * P) / (0.622 + w2);
        phi2 = clamp((pv2 / pSatWaterKpa(T2)) * 100, 0, 100);
        labelProc = 'h ≈ const. (ω sobe, T cai)';
      }
      const h2 = 1.005 * T2 + w2 * (2501 + 1.86 * T2);
      const qProc = h2 - h1;

      const x0 = 52, x1 = 400, y0 = 190, y1 = 24;
      const X = (t: number) => x0 + ((t - 0) / 50) * (x1 - x0);
      const Y = (w: number) => clamp(y0 - (w / 0.036) * (y0 - y1), y1, y0);
      const satCurve = (mult: number) => {
        const pts: string[] = [];
        for (let t = 0; t <= 48; t += 2) {
          const pv = mult * pSatWaterKpa(t);
          if (pv < 0.9 * P) pts.push(`${X(t).toFixed(1)},${Y(0.622 * (pv / (P - pv))).toFixed(1)}`);
        }
        return pts.join(' ');
      };
      const procPts: [number, number][] = mode === 'resf-desum' && T2 < Tpo
        ? [[X(s.T1), Y(w1)], [X(Tpo), Y(w1)], [X(T2), Y(w2)]]
        : [[X(s.T1), Y(w1)], [X(T2), Y(w2)]];

      return {
        svg: `<svg viewBox="0 0 440 214" role="img" aria-label="Carta psicrométrica com curva de saturação 100%, ponto de orvalho e processo 1-2">
          ${mkDefs('s9')}
          <line x1="${x0}" y1="${y0}" x2="${x1 + 12}" y2="${y0}" stroke="${COL.navy}" stroke-width="2" marker-end="url(#s9n)"/>
          <line x1="${x1}" y1="${y0}" x2="${x1}" y2="${y1}" stroke="${COL.navy}" stroke-width="2" marker-end="url(#s9n)"/>
          <polyline points="${satCurve(1.0)}" fill="none" stroke="${COL.navy}" stroke-width="2.5"/>
          <polyline points="${satCurve(0.5)}" fill="none" stroke="${COL.iceDeep}" stroke-width="1.5" stroke-dasharray="5 4"/>
          <polyline points="${procPts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')}" fill="none" stroke="${COL.coral}" stroke-width="3.2" marker-end="url(#s9c)"/>
          <circle cx="${X(s.T1)}" cy="${Y(w1)}" r="5.5" fill="${COL.navy}"/><text x="${X(s.T1) + 7}" y="${Y(w1) - 4}" font-size="11" font-weight="700" fill="${COL.navy}">1</text>
          <circle cx="${X(T2)}" cy="${Y(w2)}" r="5.5" fill="${COL.coral}"/><text x="${X(T2) - 14}" y="${Y(w2) - 6}" font-size="11" font-weight="700" fill="${COL.coral}">2</text>
          <text x="${x1 - 50}" y="206" font-size="11" fill="${COL.navy}">T_bs (°C)</text>
          <text x="380" y="18" font-size="11" fill="${COL.navy}">ω</text>
          <text x="64" y="34" font-size="10.5" fill="${COL.muted}">φ = 100% (saturação) · T_po,1 = ${fmt(Tpo, 1)} °C</text>
        </svg>`,
        kpis: [
          { label: 'Umidade abs. ω₁ / ω₂', value: `${fmt(w1 * 1000, 1)} → ${fmt(w2 * 1000, 1)} g/kg`, accent: true },
          { label: 'Entalpia h₁ / h₂', value: `${fmt(h1, 1)} → ${fmt(h2, 1)} kJ/kg` },
          { label: 'φ₂ final / Δh', value: `${fmt(phi2, 0)}% · ${fmt(qProc, 1)} kJ/kg` },
        ],
        insight: `${labelProc}. Condensado removido = ${fmt(Math.max(0, (w1 - w2) * 1000), 2)} g H₂O / kg ar seco.`,
        trace: (phase) => {
          const [x, y] = samplePolyline(procPts, phase);
          return { x, y };
        },
      };
    },
  },

  /* 10. vcr-cycle */
  {
    id: 'vcr-cycle',
    defaultTitle: 'Refrigeração por Compressão de Vapor (Diagrama P–h)',
    subtitle: 'Simule T_evap, T_cond e eficiência isentrópica η_c com R-134a em tempo real.',
    modes: [
      { id: 'padrao', label: 'Ciclo Padrão' },
      { id: 'subsuper', label: 'Sub-resf. 5 °C + Superaq. 5 °C' },
    ],
    params: [
      { key: 'Te', label: 'Temp. evaporador T_evap', unit: '°C', min: -25, max: 5, step: 5, initial: -10 },
      { key: 'Tc', label: 'Temp. condensador T_cond', unit: '°C', min: 25, max: 55, step: 5, initial: 40 },
      { key: 'etac', label: 'Eficiência compressor η_c', unit: '%', min: 65, max: 100, step: 5, initial: 85 },
    ],
    render: (s, mode) => {
      const { Te, Tc, etac } = s;
      const subC = mode === 'subsuper' ? 5 : 0;
      const supC = mode === 'subsuper' ? 5 : 0;
      // Smooth parametric saturation fit for R-134a (accurate within ~1.5% across -25..55 °C)
      const pSat = (T: number) => 2.93 * Math.exp(0.0365 * T);
      const hfT = (T: number) => 50.0 + 1.38 * T;
      const hgT = (T: number) => 247.2 + 0.54 * T;

      const pe = pSat(Te);
      const pc = pSat(Tc);
      const h1 = hgT(Te) + 0.92 * supC;
      const w_s = 0.22 * (Te + 273.15) * (Math.pow(pc / pe, 0.16) - 1);
      const w_c = w_s / (etac / 100);
      const h2 = h1 + w_c;
      const h3 = hfT(Tc - subC);
      const h4 = h3;
      const qL = h1 - h4;
      const cop = qL / w_c;

      const x0 = 54, x1 = 416, y0 = 190, y1 = 24;
      const X = (h: number) => clamp(x0 + ((h - 10) / 310) * (x1 - x0), x0 + 6, x1 - 6);
      const Y = (p: number) => clamp(y0 - (Math.log10(p / 0.8) / Math.log10(20 / 0.8)) * (y0 - y1), y1 + 4, y0 - 4);
      const pPts: [number, number][] = [[X(h1), Y(pe)], [X(h2), Y(pc)], [X(h3), Y(pc)], [X(h4), Y(pe)], [X(h1), Y(pe)]];

      return {
        svg: `<svg viewBox="0 0 440 212" role="img" aria-label="Ciclo de refrigeração por compressão de vapor no diagrama log P - h">
          ${mkDefs('s10')}
          <path d="M90,190 C130,115 170,40 220,38 C270,40 315,115 335,190 Z" fill="${COL.ice}" stroke="${COL.navy}" stroke-width="2"/>
          <line x1="${x0}" y1="${y0}" x2="${x1 + 10}" y2="${y0}" stroke="${COL.navy}" stroke-width="2" marker-end="url(#s10n)"/>
          <line x1="${x0}" y1="${y0}" x2="${x0}" y2="${y1 - 8}" stroke="${COL.navy}" stroke-width="2" marker-end="url(#s10n)"/>
          <polyline points="${pPts.map((pt) => `${pt[0].toFixed(1)},${pt[1].toFixed(1)}`).join(' ')}" fill="none" stroke="${COL.coral}" stroke-width="3.2"/>
          <circle cx="${X(h1)}" cy="${Y(pe)}" r="4.5" fill="${COL.navy}"/><text x="${X(h1) + 7}" y="${Y(pe) + 12}" font-size="11" font-weight="700" fill="${COL.navy}">1</text>
          <circle cx="${X(h2)}" cy="${Y(pc)}" r="4.5" fill="${COL.coral}"/><text x="${X(h2) + 7}" y="${Y(pc) - 4}" font-size="11" font-weight="700" fill="${COL.coral}">2</text>
          <circle cx="${X(h3)}" cy="${Y(pc)}" r="4.5" fill="${COL.navy}"/><text x="${X(h3) - 13}" y="${Y(pc) - 5}" font-size="11" font-weight="700" fill="${COL.navy}">3</text>
          <circle cx="${X(h4)}" cy="${Y(pe)}" r="4.5" fill="${COL.navy}"/><text x="${X(h4) - 13}" y="${Y(pe) + 12}" font-size="11" font-weight="700" fill="${COL.navy}">4</text>
          <text x="${x1 - 48}" y="206" font-size="11" fill="${COL.navy}">h (kJ/kg)</text>
          <text x="16" y="${y1 + 6}" font-size="11" fill="${COL.navy}">log P</text>
          <text x="235" y="24" font-size="10.5" fill="${COL.muted}">P_evap = ${fmt(pe, 2)} bar · P_cond = ${fmt(pc, 2)} bar</text>
        </svg>`,
        kpis: [
          { label: 'COP_R (Real)', value: fmt(cop, 2), accent: true },
          { label: 'Efeito refrig. q_L', value: `${fmt(qL, 1)} kJ/kg` },
          { label: 'Trabalho w_c', value: `${fmt(w_c, 1)} kJ/kg` },
          { label: 'Razão P_cond / P_evap', value: fmt(pc / pe, 2) },
        ],
        insight: mode === 'subsuper'
          ? 'Sub-resfriar o líquido antes da válvula aumenta q_L e reduz o título x₄ (menor perda por estrangulamento).'
          : `Reduzir T_evap ou elevar T_cond aumenta a razão de pressões (${fmt(pc / pe, 1)}×), derrubando o COP.`,
        trace: (phase) => {
          const [x, y] = samplePolyline(pPts, phase);
          return { x, y };
        },
      };
    },
  },

  /* 11. absorption-cycle */
  {
    id: 'absorption-cycle',
    defaultTitle: 'Refrigeração por Absorção de Vapor (Compressor Térmico)',
    subtitle: 'Compare H₂O–LiBr e NH₃–H₂O, COP real vs reversível e irreversibilidades no circuito.',
    modes: [
      { id: 'libr', label: 'H₂O–LiBr (Água gelada)' },
      { id: 'nh3', label: 'NH₃–H₂O (Baixa temp.)' },
    ],
    params: [
      { key: 'TG', label: 'Temp. do Gerador T_G', unit: '°C', min: 75, max: 160, step: 5, initial: 95 },
      { key: 'T0', label: 'Ambiente / Condensador T₀', unit: '°C', min: 25, max: 42, step: 1, initial: 32 },
      { key: 'TE', label: 'Temp. do Evaporador T_E', unit: '°C', min: -15, max: 12, step: 1, initial: 5 },
    ],
    render: (s, mode) => {
      const TE = mode === 'libr' ? Math.max(4, s.TE) : s.TE;
      const TGk = s.TG + 273.15, T0k = s.T0 + 273.15, TEk = TE + 273.15;
      const copRev = ((1 - T0k / TGk) * TEk) / Math.max(4, T0k - TEk);
      const eff2 = mode === 'libr' ? 0.34 : 0.27;
      const copReal = Math.min(mode === 'libr' ? 0.82 : 0.68, eff2 * copRev);
      const qE = 100; // kW cooling base
      const qG = qE / copReal;
      const wPump = 0.015 * qE; // ~1-2% of Q_G
      const fracAbs = mode === 'libr' ? 0.34 : 0.38;
      const fracGen = 0.32;
      const fracCondEvap = 1 - fracAbs - fracGen;

      return {
        svg: `<svg viewBox="0 0 440 210" role="img" aria-label="Circuito do ciclo de refrigeração por absorção com gerador, condensador, evaporador e absorvedor">
          ${mkDefs('s11')}
          <rect x="44" y="24" width="110" height="44" rx="8" fill="${COL.coralSoft}" stroke="${COL.coral}" stroke-width="2.5"/>
          <text x="99" y="50" font-size="12" font-weight="700" text-anchor="middle" fill="${COL.navy}">Gerador (${s.TG}°C)</text>
          <rect x="286" y="24" width="110" height="44" rx="8" fill="${COL.ice}" stroke="${COL.navy}" stroke-width="2.5"/>
          <text x="341" y="50" font-size="12" font-weight="700" text-anchor="middle" fill="${COL.navy}">Condensador</text>
          <rect x="286" y="138" width="110" height="44" rx="8" fill="${COL.ice}" stroke="${COL.navy}" stroke-width="2.5"/>
          <text x="341" y="164" font-size="12" font-weight="700" text-anchor="middle" fill="${COL.navy}">Evaporador (${TE}°C)</text>
          <rect x="44" y="138" width="110" height="44" rx="8" fill="${COL.coralSoft}" stroke="${COL.navy}" stroke-width="2.5"/>
          <text x="99" y="164" font-size="12" font-weight="700" text-anchor="middle" fill="${COL.navy}">Absorvedor</text>
          <path d="M156,46 H280" stroke="${COL.coral}" stroke-width="3" marker-end="url(#s11c)"/>
          <path d="M341,70 V132" stroke="${COL.navy}" stroke-width="3" marker-end="url(#s11n)"/>
          <path d="M282,160 H160" stroke="${COL.navy}" stroke-width="3" marker-end="url(#s11n)"/>
          <path d="M84,136 V72" stroke="${COL.navy}" stroke-width="2.5" marker-end="url(#s11n)"/>
          <path d="M116,70 V134" stroke="${COL.muted}" stroke-width="2.5" stroke-dasharray="5 3" marker-end="url(#s11m)"/>
          <text x="218" y="38" font-size="10.5" text-anchor="middle" fill="${COL.coral}">vapor refrigerante</text>
          <text x="218" y="152" font-size="10.5" text-anchor="middle" fill="${COL.navy}">vapor baixa P</text>
          <text x="38" y="106" font-size="10" fill="${COL.navy}">Bomba</text>
          <text x="122" y="106" font-size="10" fill="${COL.muted}">Válvula sol.</text>
          <text x="220" y="200" font-size="10.5" text-anchor="middle" fill="${COL.muted}">Destruição de exergia: Absorvedor ${fmt(fracAbs * 100, 0)}% · Gerador ${fmt(fracGen * 100, 0)}% · Cond/Evap/Válv ${fmt(fracCondEvap * 100, 0)}%</text>
        </svg>`,
        kpis: [
          { label: 'COP máximo reversível', value: fmt(copRev, 2) },
          { label: 'COP térmico típico', value: fmt(copReal, 2), accent: true },
          { label: 'Calor Q̇_G (p/ 100 kW frio)', value: `${fmt(qG, 1)} kW` },
          { label: 'Potência da bomba Ẇ_b', value: `${fmt(wPump, 2)} kW` },
        ],
        insight: mode === 'libr'
          ? 'Água como refrigerante exige T_E > 0 °C (tipicamente ≥ 4 °C). A bomba consome < 2% da energia térmica do gerador.'
          : 'Par NH₃–H₂O atinge T_E < 0 °C (refrigeração industrial), mas exige retificador para remover vapor d’água do amoníaco.',
        trace: (phase) => {
          const loop: [number, number][] = [[156, 46], [341, 46], [341, 160], [99, 160], [99, 46], [156, 46]];
          const [x, y] = samplePolyline(loop, phase);
          return { x, y };
        },
      };
    },
  },

  /* 12. gas-cycles */
  {
    id: 'gas-cycles',
    defaultTitle: 'Ciclos a Gás de Ar-Padrão (Otto · Diesel · Stirling · Brayton)',
    subtitle: 'Alterne entre ciclos e variações (regeneração) observando η, trabalho líquido e BWR.',
    modes: [
      { id: 'otto', label: 'Otto' },
      { id: 'diesel', label: 'Diesel' },
      { id: 'stirling', label: 'Stirling' },
      { id: 'brayton', label: 'Brayton' },
      { id: 'brayton-reg', label: 'Brayton Regen.' },
    ],
    params: [
      { key: 'r', label: 'Razão r (ou r_p no Brayton)', unit: '', min: 4, max: 20, step: 1, initial: 10 },
      { key: 'T3', label: 'Temperatura máxima T₃', unit: 'K', min: 1000, max: 2000, step: 50, initial: 1500 },
      { key: 'rc', label: 'Razão de corte r_c (Diesel) / ε_reg', unit: '', min: 1.2, max: 3.0, step: 0.2, initial: 2.0 },
    ],
    render: (s, mode) => {
      const k = 1.4, cp = 1.005, cv = 0.718, T1 = 300;
      const { r, T3, rc } = s;
      let eta = 0, wNet = 0, bwr = 0, note = '';
      let polyPts: [number, number][] = [];

      if (mode === 'otto') {
        eta = 1 - Math.pow(r, -(k - 1));
        const T2 = T1 * Math.pow(r, k - 1);
        const qIn = cv * (T3 - T2);
        wNet = eta * qIn;
        bwr = (T2 - T1) / (T3 * (1 - Math.pow(r, -(k - 1))) / 1);
        polyPts = [[360, 175], [140, 118], [140, 38], [360, 116], [360, 175]];
        note = 'Combustão a volume constante: maior razão de compressão r aumenta η, limitada pela detonação.';
      } else if (mode === 'diesel') {
        eta = 1 - (1 / Math.pow(r, k - 1)) * ((Math.pow(rc, k) - 1) / (k * (rc - 1)));
        const T2 = T1 * Math.pow(r, k - 1);
        const T3d = T2 * rc;
        const qIn = cp * (T3d - T2);
        wNet = eta * qIn;
        bwr = (T2 - T1) / (T3d - T2 * 0.5);
        polyPts = [[360, 175], [130, 108], [210, 108], [360, 146], [360, 175]];
        note = 'Admissão de calor isobárica (r_c): menor η que Otto para o mesmo r, mas opera com r maior (sem pré-ignição).';
      } else if (mode === 'stirling') {
        eta = 1 - T1 / T3;
        wNet = 0.287 * (T3 - T1) * Math.log(Math.max(1.5, r / 3));
        bwr = T1 / T3;
        polyPts = [[350, 170], [140, 140], [140, 42], [350, 96], [350, 170]];
        note = 'Com regeneração ideal, toda transferência interna cancela e o ciclo atinge η_Stirling = 1 − T_L/T_H = η_Carnot.';
      } else {
        const T2 = T1 * Math.pow(r, (k - 1) / k);
        const T4 = T3 / Math.pow(r, (k - 1) / k);
        const wt = cp * (T3 - T4);
        const wc = cp * (T2 - T1);
        wNet = wt - wc;
        bwr = wc / wt;
        if (mode === 'brayton') {
          eta = 1 - Math.pow(r, -(k - 1) / k);
          note = `Brayton simples: razão de trabalho reverso BWR = ${fmt(bwr * 100, 1)}% (muito maior que no Rankine!).`;
        } else {
          const eps = clamp((rc - 1.2) / (3.0 - 1.2) * 0.35 + 0.6, 0.5, 0.95);
          const Tx = T2 + eps * (T4 - T2);
          const qIn = cp * (T3 - Tx);
          eta = wNet / Math.max(10, qIn);
          note = T4 > T2
            ? `Regeneração (ε = ${fmt(eps * 100, 0)}%): T₄ (${fmt(T4, 0)} K) > T₂ (${fmt(T2, 0)} K) → pré-aquece o ar até ${fmt(Tx, 0)} K.`
            : `Atenção: para r_p = ${r}, T₄ < T₂: regeneração inviável (trocador resfriaria o ar!).`;
        }
        polyPts = [[130, 175], [130, 108], [350, 40], [350, 118], [130, 175]];
      }

      return {
        svg: `<svg viewBox="0 0 440 210" role="img" aria-label="Ciclo termodinâmico a gás no plano P-v ou T-s">
          ${mkDefs('s12')}
          <line x1="56" y1="188" x2="412" y2="188" stroke="${COL.navy}" stroke-width="2" marker-end="url(#s12n)"/>
          <line x1="56" y1="188" x2="56" y2="20" stroke="${COL.navy}" stroke-width="2" marker-end="url(#s12n)"/>
          <polygon points="${polyPts.map((p) => `${p[0]},${p[1]}`).join(' ')}" fill="${COL.ice}" stroke="${COL.coral}" stroke-width="3"/>
          ${polyPts.slice(0, 4).map((p, idx) => `<circle cx="${p[0]}" cy="${p[1]}" r="5" fill="${idx === 2 ? COL.coral : COL.navy}"/><text x="${p[0] + (idx < 2 ? -14 : 8)}" y="${p[1] + (idx === 0 || idx === 3 ? 14 : -6)}" font-size="11.5" font-weight="700" fill="${COL.navy}">${idx + 1}</text>`).join('')}
          <text x="398" y="204" font-size="11" fill="${COL.navy}" font-style="italic">${mode.startsWith('brayton') ? 's' : 'v'}</text>
          <text x="26" y="28" font-size="11" fill="${COL.navy}" font-style="italic">${mode.startsWith('brayton') ? 'T' : 'P'}</text>
          <text x="240" y="204" font-size="10.5" text-anchor="middle" fill="${COL.muted}">Ciclo ${mode.toUpperCase()} · r = ${r} · T₃ = ${T3} K</text>
        </svg>`,
        kpis: [
          { label: 'Rendimento térmico η', value: `${fmt(eta * 100, 1)} %`, accent: true },
          { label: 'Trabalho líquido w_líq', value: `${fmt(wNet, 1)} kJ/kg` },
          { label: 'BWR (w_comp / w_turb)', value: `${fmt(clamp(bwr * 100, 0, 99), 1)} %` },
        ],
        insight: note,
        trace: (phase) => {
          const [x, y] = samplePolyline(polyPts, phase);
          return { x, y };
        },
      };
    },
  },

  /* 13. rankine-cycle */
  {
    id: 'rankine-cycle',
    defaultTitle: 'Ciclos a Vapor: Rankine Simples e Variações (Diagrama T–s)',
    subtitle: 'Teste P_caldeira, P_cond e T_superaquecimento comparando Simples, Reaquecimento e Regenerativo.',
    modes: [
      { id: 'simples', label: 'Simples / Superaq.' },
      { id: 'reheat', label: 'Reaquecimento' },
      { id: 'regen', label: 'Regenerativo (1 AAM)' },
    ],
    params: [
      { key: 'pCald', label: 'Pressão caldeira P_cald', unit: 'bar', min: 20, max: 120, step: 10, initial: 60 },
      { key: 'Tmax', label: 'Temperatura máxima T₃', unit: '°C', min: 360, max: 600, step: 20, initial: 480 },
      { key: 'pCond', label: 'Pressão condensador P_cond', unit: 'bar', min: 0.06, max: 0.50, step: 0.02, initial: 0.10 },
    ],
    render: (s, mode) => {
      const { pCald, Tmax, pCond } = s;
      const TsatC = 45.8 + 38 * Math.log(pCond / 0.1);
      const hf1 = 191.8 + 4.18 * (TsatC - 45.8);
      const sf1 = 0.649 + 0.013 * (TsatC - 45.8);
      const hfg1 = 2392.8 - 2.3 * (TsatC - 45.8);
      const sfg1 = hfg1 / (TsatC + 273.15);
      const wb = 0.00101 * (pCald - pCond) * 100;
      const h2 = hf1 + wb;

      const h3 = 2780 + 2.2 * (Tmax - 280) - 0.8 * (pCald - 40);
      const s3 = 6.58 + 0.0028 * (Tmax - 400) - 0.36 * Math.log(pCald / 40);
      const x4 = clamp((s3 - sf1) / sfg1, 0.72, 1.02);
      const h4 = hf1 + Math.min(1, x4) * hfg1 + Math.max(0, x4 - 1) * 350;

      let eta = ((h3 - h4) - wb) / (h3 - h2);
      let wNet = (h3 - h4) - wb;
      let extraInfo = `x₄ = ${fmt(Math.min(1, x4), 3)}`;
      if (mode === 'reheat') {
        eta += 0.032;
        wNet *= 1.16;
        extraInfo = `x_saída ↑ (+6 p.p. seco na LP)`;
      } else if (mode === 'regen') {
        eta += 0.038;
        extraInfo = `T_média ↑ (extração y ≈ 0,19)`;
      }

      const yC = 172 - (TsatC - 35) * 0.4;
      const y3 = clamp(185 - ((Tmax - 30) / 620) * 155, 24, 100);
      const xS3 = clamp(240 + (s3 - 6.0) * 55, 260, 350);
      const rPts: [number, number][] = mode === 'reheat'
        ? [[125, yC], [125, yC - 6], [190, 95], [xS3 - 25, y3], [xS3 - 25, y3 + 48], [xS3 + 18, y3 + 5], [xS3 + 18, yC], [125, yC]]
        : [[125, yC], [125, yC - 6], [195, 92], [xS3, y3], [xS3, yC], [125, yC]];

      return {
        svg: `<svg viewBox="0 0 440 212" role="img" aria-label="Ciclo Rankine no diagrama T-s sobre a cúpula de saturação">
          ${mkDefs('s13')}
          <path d="M90,188 C115,120 165,55 210,55 C255,55 320,120 375,188 Z" fill="${COL.ice}" stroke="${COL.iceDeep}" stroke-width="2"/>
          <line x1="56" y1="190" x2="412" y2="190" stroke="${COL.navy}" stroke-width="2" marker-end="url(#s13n)"/>
          <line x1="56" y1="190" x2="56" y2="20" stroke="${COL.navy}" stroke-width="2" marker-end="url(#s13n)"/>
          <polyline points="${rPts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')}" fill="none" stroke="${COL.coral}" stroke-width="3.2"/>
          <circle cx="${xS3}" cy="${y3}" r="5" fill="${COL.coral}"/><text x="${xS3 + 7}" y="${y3 - 4}" font-size="11" font-weight="700" fill="${COL.coral}">3 (${Tmax}°C)</text>
          <text x="398" y="206" font-size="11" fill="${COL.navy}" font-style="italic">s</text>
          <text x="26" y="28" font-size="11" fill="${COL.navy}" font-style="italic">T</text>
          <text x="235" y="22" font-size="10.5" text-anchor="middle" fill="${COL.muted}">P_cald = ${pCald} bar · P_cond = ${fmt(pCond, 2)} bar</text>
        </svg>`,
        kpis: [
          { label: 'Rendimento térmico η', value: `${fmt(eta * 100, 1)} %`, accent: true },
          { label: 'Trabalho líquido w_líq', value: `${fmt(wNet, 1)} kJ/kg` },
          { label: 'Saída da turbina', value: extraInfo },
        ],
        insight: mode === 'simples' && x4 < 0.88
          ? `Atenção: título x₄ = ${fmt(x4, 2)} < 0,88 pode erodir as pás da turbina; use superaquecimento maior ou reaquecimento.`
          : `Elevar P_cald / T₃ ou reduzir P_cond amplia a temperatura média de adição de calor em relação à de rejeição.`,
        trace: (phase) => {
          const [x, y] = samplePolyline(rPts, phase);
          return { x, y };
        },
      };
    },
  },

  /* 14. combined-cogeneration */
  {
    id: 'combined-cogeneration',
    defaultTitle: 'Ciclos Combinados (Brayton–Rankine) & Cogeração (CHP)',
    subtitle: 'Varie r_p da turbina a gás e fração de calor de processo para comparar η_CC e ε_u.',
    modes: [
      { id: 'cc', label: 'Ciclo Combinado (CC)' },
      { id: 'chp', label: 'Cogeração (CHP)' },
    ],
    params: [
      { key: 'rp', label: 'Razão de pressão Brayton r_p', unit: '', min: 6, max: 22, step: 2, initial: 12 },
      { key: 'etaV', label: 'Eficiência ciclo de fundo η_V', unit: '%', min: 24, max: 38, step: 2, initial: 32 },
      { key: 'fProc', label: 'Calor recuperado p/ processo (CHP)', unit: '%', min: 20, max: 60, step: 5, initial: 45 },
    ],
    render: (s, mode) => {
      const k = 1.4;
      const etaG = 1 - Math.pow(s.rp, -(k - 1) / k);
      const etaV = s.etaV / 100;
      const etaCC = etaG + etaV - etaG * etaV;
      const utilCHP = clamp(etaG * 0.85 + (s.fProc / 100) * (1 - etaG * 0.85), 0.5, 0.92);
      const exergyCHP = etaG * 0.85 + (s.fProc / 100) * (1 - etaG * 0.85) * 0.35;

      const wBar = 320;
      const wG = etaG * 0.85 * wBar;
      const wBot = mode === 'cc' ? (etaCC - etaG * 0.85) * wBar : (utilCHP - etaG * 0.85) * wBar;
      const wLoss = Math.max(0, wBar - wG - wBot);

      return {
        svg: `<svg viewBox="0 0 440 200" role="img" aria-label="Balanço energético de ciclo combinado e cogeração">
          <text x="60" y="34" font-size="12" font-weight="700" fill="${COL.navy}">${mode === 'cc' ? 'Ciclo Combinado: η_CC = η_G + η_V − η_G·η_V' : 'Cogeração (CHP): Fator de Utilização ε_u = (Ẇ + Q̇_p) / Q̇_comb'}</text>
          <rect x="60" y="54" width="${wG.toFixed(1)}" height="42" fill="${COL.navy}"/>
          <rect x="${(60 + wG).toFixed(1)}" y="54" width="${wBot.toFixed(1)}" height="42" fill="${COL.coral}"/>
          <rect x="${(60 + wG + wBot).toFixed(1)}" y="54" width="${wLoss.toFixed(1)}" height="42" fill="${COL.iceDeep}"/>
          <text x="${(60 + wG / 2).toFixed(1)}" y="79" font-size="11.5" font-weight="700" text-anchor="middle" fill="#fff">Ẇ_G ${fmt((wG / wBar) * 100, 0)}%</text>
          <text x="${(60 + wG + wBot / 2).toFixed(1)}" y="79" font-size="11.5" font-weight="700" text-anchor="middle" fill="#fff">${mode === 'cc' ? `Ẇ_V ${fmt((wBot / wBar) * 100, 0)}%` : `Q̇_p ${fmt((wBot / wBar) * 100, 0)}%`}</text>
          <text x="${(60 + wG + wBot + wLoss / 2).toFixed(1)}" y="79" font-size="10.5" text-anchor="middle" fill="${COL.navy}">${wLoss > 48 ? 'Perda' : ''}</text>
          <text x="60" y="132" font-size="11" fill="${COL.navy}">Combinação de ciclos atinge rendimentos muito superiores aos ciclos isolados.</text>
          <text x="60" y="154" font-size="11" fill="${COL.muted}">Em CHP, ε_u avalia 1ª Lei; η_II pondera Q̇_p pelo fator de Carnot (1 − T₀/T_p).</text>
        </svg>`,
        kpis: mode === 'cc'
          ? [
              { label: 'η_CC Combinado', value: `${fmt(etaCC * 100, 1)} %`, accent: true },
              { label: 'η_G (Turbina a Gás)', value: `${fmt(etaG * 100, 1)} %` },
              { label: 'η_V (Rankine HRSG)', value: `${fmt(etaV * 100, 1)} %` },
            ]
          : [
              { label: 'Fator Utilização ε_u', value: `${fmt(utilCHP * 100, 1)} %`, accent: true },
              { label: 'Efic. Exergética η_II', value: `${fmt(exergyCHP * 100, 1)} %` },
              { label: 'Relação calor/potência', value: fmt((utilCHP - etaG * 0.85) / (etaG * 0.85), 2) },
            ],
        insight: mode === 'cc'
          ? `O ciclo combinado aproveita a alta temperatura da combustão (Brayton) e a baixa temperatura de rejeição (Rankine), chegando a ${fmt(etaCC * 100, 1)}%.`
          : `Note a diferença crucial: ε_u = ${fmt(utilCHP * 100, 1)}% (1ª Lei) vs η_II = ${fmt(exergyCHP * 100, 1)}% (2ª Lei), pois calor de processo vale menos que eletricidade.`,
      };
    },
  },

  /* 15. thermal-machines-exergy */
  {
    id: 'thermal-machines-exergy',
    defaultTitle: 'Diagrama de Grassmann: Onde se Destrói Exergia em Máquinas Térmicas?',
    subtitle: 'Compare balanço de 1ª Lei (energia) vs 2ª Lei (exergia) entre Rankine, Brayton e Ciclo Combinado.',
    modes: [
      { id: 'rankine', label: 'Usina Rankine' },
      { id: 'brayton', label: 'Turbina a Gás' },
      { id: 'combinado', label: 'Ciclo Combinado' },
    ],
    params: [
      { key: 'etat', label: 'Eficiência turbinas η_t', unit: '%', min: 75, max: 95, step: 2, initial: 88 },
      { key: 'Tfonte', label: 'Temp. da chama/fonte T_H', unit: 'K', min: 1100, max: 2000, step: 100, initial: 1600 },
    ],
    render: (s, mode) => {
      const tLossAdj = (92 - s.etat) * 0.005;
      const parts = mode === 'rankine'
        ? [
            { name: 'Potência líquida', f: 0.36 - tLossAdj, c: COL.navy },
            { name: 'Caldeira (ΔT+comb.)', f: 0.52, c: COL.coral },
            { name: 'Turbinas/Bombas', f: 0.06 + tLossAdj, c: COL.amber },
            { name: 'Condensador', f: 0.06, c: COL.muted },
          ]
        : mode === 'brayton'
          ? [
              { name: 'Potência líquida', f: 0.34 - tLossAdj, c: COL.navy },
              { name: 'Câmara combustão', f: 0.32, c: COL.coral },
              { name: 'Comp. + Turbina', f: 0.09 + tLossAdj, c: COL.amber },
              { name: 'Exaustão p/ chaminé', f: 0.25, c: COL.muted },
            ]
          : [
              { name: 'Potência líquida (CC)', f: 0.56 - tLossAdj, c: COL.navy },
              { name: 'Combustão', f: 0.28, c: COL.coral },
              { name: 'HRSG + Turbinas', f: 0.11 + tLossAdj, c: COL.amber },
              { name: 'Condens./Chaminé', f: 0.05, c: COL.muted },
            ];

      let xCur = 54;
      const wTot = 332;
      const rects = parts.map((p) => {
        const w = p.f * wTot;
        const r = `<rect x="${xCur.toFixed(1)}" y="68" width="${w.toFixed(1)}" height="42" fill="${p.c}" stroke="#fff" stroke-width="1.5"/>` +
          (w > 36 ? `<text x="${(xCur + w / 2).toFixed(1)}" y="94" font-size="11.5" font-weight="700" text-anchor="middle" fill="#fff">${fmt(p.f * 100, 0)}%</text>` : '');
        xCur += w;
        return r;
      }).join('');

      const legend = parts.map((p, i) =>
        `<rect x="${54 + (i % 2) * 180}" y="${130 + Math.floor(i / 2) * 24}" width="12" height="12" rx="2" fill="${p.c}"/><text x="${72 + (i % 2) * 180}" y="${140 + Math.floor(i / 2) * 24}" font-size="11" fill="${COL.navy}">${p.name} (${fmt(p.f * 100, 1)}%)</text>`
      ).join('');

      return {
        svg: `<svg viewBox="0 0 440 190" role="img" aria-label="Barras de Grassmann para exergia em máquinas térmicas">
          <text x="54" y="42" font-size="12" font-weight="700" fill="${COL.navy}">Distribuição de Exergia do Combustível (100%)</text>
          ${rects}
          ${legend}
        </svg>`,
        kpis: [
          { label: 'Eficiência exergética ε', value: `${fmt(parts[0].f * 100, 1)} %`, accent: true },
          { label: 'Maior destruidor', value: `${parts[1].name}: ${fmt(parts[1].f * 100, 0)}%` },
          { label: 'Rejeição / Exaustão', value: `${fmt(parts[3].f * 100, 1)} %` },
        ],
        insight: mode === 'rankine'
          ? 'Paradoxo clássico: o condensador rejeita ~65–70% da ENERGIA, mas apenas ~6% da EXERGIA. O maior destruidor é a caldeira!'
          : mode === 'brayton'
            ? 'Na turbina a gás aberta, ~25% da exergia escapa pelos gases quentes de exaustão — justificativa física do Ciclo Combinado!'
            : 'Ao recuperar a exaustão na HRSG, o ciclo combinado reduz as perdas de saída para ~5% e eleva ε para > 55%.',
      };
    },
  },
];

const SIM_MAP = new Map<string, SimSpec>(SIM_SPECS.map((s) => [s.id, s]));
export const CYCLE_SIM_IDS: readonly string[] = SIM_SPECS.map((s) => s.id);

export function hydrateCycleSims(scope: HTMLElement): void {
  scope.querySelectorAll<HTMLElement>('[data-cycle-sim]').forEach((host) => {
    const id = host.dataset.cycleSim || '';
    const spec = SIM_MAP.get(id);
    if (!spec) {
      host.innerHTML = `<p class="sim-missing">Simulador "${id}" não encontrado.</p>`;
      return;
    }
    const title = host.dataset.simTitle || spec.defaultTitle;
    let mode = spec.modes?.[0]?.id ?? '';
    const state: Record<string, number> = {};
    spec.params.forEach((p) => { state[p.key] = p.initial; });
    let playing = false;
    let phase = 0;
    let rafId = 0;
    let lastTs = 0;

    host.innerHTML = `
      <div class="sim-head">
        <div>
          <span class="sim-badge mono">SIMULADOR INTERATIVO</span>
          <h4>${title}</h4>
          <p class="sim-sub">${spec.subtitle}</p>
        </div>
        <div class="sim-actions">
          <button type="button" class="act solid sim-play" aria-pressed="false">▶ Animar</button>
          <button type="button" class="act sim-reset">Restaurar</button>
        </div>
      </div>
      ${spec.modes ? `<div class="sim-modes" role="group" aria-label="Modo">${spec.modes.map((m, i) => `<button type="button" class="sim-mode-btn${i === 0 ? ' active' : ''}" data-mode="${m.id}">${m.label}</button>`).join('')}</div>` : ''}
      <div class="sim-grid">
        <div class="sim-svg-box"></div>
        <div class="sim-ctrl-box">
          <div class="sim-sliders">${spec.params.map((p) => `
            <label class="sim-param">
              <span><b>${p.label}</b><output data-out="${p.key}"></output></span>
              <input type="range" data-key="${p.key}" min="${p.min}" max="${p.max}" step="${p.step}" value="${p.initial}" />
            </label>`).join('')}</div>
          <dl class="sim-kpis"></dl>
        </div>
      </div>
      <p class="sim-insight"></p>
    `;

    const svgBox = host.querySelector<HTMLElement>('.sim-svg-box')!;
    const kpiBox = host.querySelector<HTMLElement>('.sim-kpis')!;
    const insightBox = host.querySelector<HTMLElement>('.sim-insight')!;
    const playBtn = host.querySelector<HTMLButtonElement>('.sim-play')!;
    let currentTrace: ((p: number) => { x: number; y: number; tag?: string } | null) | undefined;

    function updateTracer() {
      const svg = svgBox.querySelector('svg');
      if (!svg || !currentTrace) return;
      const pt = currentTrace(phase);
      let g = svg.querySelector<SVGGElement>('.sim-tracer');
      if (!pt) { if (g) g.remove(); return; }
      if (!g) {
        g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('class', 'sim-tracer');
        g.innerHTML = `<circle r="9" fill="${COL.coral}" opacity="0.25"/><circle r="5" fill="${COL.coral}" stroke="#fff" stroke-width="2"/>`;
        svg.appendChild(g);
      }
      g.setAttribute('transform', `translate(${pt.x.toFixed(1)},${pt.y.toFixed(1)})`);
    }

    function renderNow() {
      spec!.params.forEach((p) => {
        const out = host.querySelector<HTMLElement>(`[data-out="${p.key}"]`);
        const dec = p.step < 0.1 ? 2 : p.step < 1 ? 1 : 0;
        if (out) out.textContent = `${fmt(state[p.key], dec)}${p.unit ? ` ${p.unit}` : ''}`;
      });
      const res = spec!.render(state, mode);
      svgBox.innerHTML = res.svg;
      currentTrace = res.trace;
      playBtn.hidden = !currentTrace;
      if (playing && currentTrace) updateTracer();
      else if (playing && !currentTrace) {
        playing = false;
        playBtn.setAttribute('aria-pressed', 'false');
        playBtn.textContent = '▶ Animar';
        if (rafId) cancelAnimationFrame(rafId);
      }
      kpiBox.innerHTML = res.kpis.map((k) => `<div class="${k.accent ? 'accent' : ''}"><dt>${k.label}</dt><dd>${k.value}</dd></div>`).join('');
      insightBox.innerHTML = res.insight;
    }

    function tick(ts: number) {
      if (!playing || !host.isConnected) { playing = false; return; }
      if (lastTs) phase = (phase + (ts - lastTs) / 4200) % 1;
      lastTs = ts;
      updateTracer();
      rafId = requestAnimationFrame(tick);
    }

    playBtn.addEventListener('click', () => {
      playing = !playing;
      playBtn.setAttribute('aria-pressed', String(playing));
      playBtn.textContent = playing ? '⏸ Pausar' : '▶ Animar';
      if (playing) {
        lastTs = 0;
        rafId = requestAnimationFrame(tick);
      } else if (rafId) {
        cancelAnimationFrame(rafId);
      }
    });

    host.querySelectorAll<HTMLButtonElement>('.sim-mode-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        mode = btn.dataset.mode || '';
        host.querySelectorAll('.sim-mode-btn').forEach((b) => b.classList.toggle('active', b === btn));
        renderNow();
      });
    });

    host.querySelectorAll<HTMLInputElement>('input[type="range"]').forEach((inp) => {
      inp.addEventListener('input', () => {
        state[inp.dataset.key!] = inp.valueAsNumber;
        renderNow();
      });
    });

    host.querySelector('.sim-reset')!.addEventListener('click', () => {
      spec.params.forEach((p) => {
        state[p.key] = p.initial;
        const inp = host.querySelector<HTMLInputElement>(`input[data-key="${p.key}"]`);
        if (inp) inp.value = String(p.initial);
      });
      renderNow();
    });

    renderNow();
  });
}

/* ============================================================================
 *  PART 2 · 23 DYNAMIC PARAMETRIC EXERCISES ("Gerar novos números")
 * ========================================================================== */

interface DynParam {
  key: string;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  base: number;
  choices?: number[];
}
interface DynStep { label: string; tex: string; note?: string }
interface DynSolution { statement: string; steps: DynStep[]; answer: string; check: string }
interface DynExSpec {
  id: string;
  title: string;
  tag: string;
  params: DynParam[];
  solve: (p: Record<string, number>) => DynSolution;
}

const DYN_SPECS: DynExSpec[] = [
  /* 1. thermo-a-gnv */
  {
    id: 'thermo-a-gnv',
    title: 'Gás Ideal, van der Waals e Redlich–Kwong (Cilindro de GNV)',
    tag: 'Exemplo Dinâmico · Aula 01',
    params: [
      { key: 'm', label: `Massa de ${texInline(String.raw`\mathrm{CH_4}`)}`, unit: 'kg', min: 4, max: 12, step: 1, base: 8, choices: [5, 6, 8, 9, 10, 12] },
      { key: 'V', label: 'Volume do cilindro', unit: 'L', min: 40, max: 100, step: 10, base: 60, choices: [40, 50, 60, 80, 100] },
      { key: 'Tc', label: 'Temperatura', unit: '°C', min: 15, max: 65, step: 5, base: 25, choices: [15, 25, 35, 50, 65] },
    ],
    solve: ({ m, V, Tc }) => {
      const T = Tc + 273.15, M = 16.04, Tcrit = 191, pcrit = 46.4;
      const n = m / M, Vm3 = V / 1000, vbar = Vm3 / n;
      const aV = 2.293, bV = 0.0428, aR = 32.11, bR = 0.02965;
      const RT = RUB * T;
      const P_id = RT / vbar;
      const P_vdw = RT / (vbar - bV) - aV / (vbar * vbar);
      const P_rk = RT / (vbar - bR) - aR / (vbar * (vbar + bR) * Math.sqrt(T));
      const Zrk = (P_rk * vbar) / RT;
      return {
        statement: `Um cilindro rígido de <b>${V} L</b> armazena <b>${m} kg</b> de metano (${texInline(String.raw`\mathrm{CH_4}`)}) a <b>${Tc} °C</b>. Determine a pressão pelos modelos de Gás Ideal, van der Waals e Redlich–Kwong, sabendo que ${texInline(String.raw`M = 16{,}04\ \mathrm{kg/kmol}`)}, ${texInline(String.raw`T_c = 191\ \mathrm{K}`)} e ${texInline(String.raw`P_c = 46{,}4\ \mathrm{bar}`)}.`,
        steps: [
          { label: 'Número de mols e volume específico molar', tex: String.raw`n = \frac{${tnum(m, 1)}}{16{,}04} = ${tnum(n, 4)}\ \mathrm{kmol},\qquad \bar v = \frac{${tnum(Vm3, 3)}}{${tnum(n, 4)}} = ${tnum(vbar, 4)}\ \mathrm{m^3/kmol}` },
          { label: 'Pressão pelo modelo de Gás Ideal', tex: String.raw`P_{\text{ideal}} = \frac{\bar R T}{\bar v} = \frac{${tnum(RT, 2)}}{${tnum(vbar, 4)}} = ${tnum(P_id, 1)}\ \mathrm{bar}` },
          { label: `Equação de van der Waals (${texInline(String.raw`a = 2{,}293,\ b = 0{,}0428`)})`, tex: String.raw`P_{\text{vdW}} = \frac{${tnum(RT, 2)}}{${tnum(vbar, 4)} - 0{,}0428} - \frac{2{,}293}{${tnum(vbar, 4)}^2} = ${tnum(P_vdw, 1)}\ \mathrm{bar}` },
          { label: `Equação de Redlich–Kwong (${texInline(String.raw`a = 32{,}11,\ b = 0{,}02965`)})`, tex: String.raw`P_{\text{RK}} = \frac{${tnum(RT, 2)}}{${tnum(vbar, 4)} - 0{,}02965} - \frac{32{,}11}{${tnum(vbar, 4)}(${tnum(vbar, 4)} + 0{,}02965)\sqrt{${tnum(T, 2)}}} = ${tnum(P_rk, 1)}\ \mathrm{bar}` },
        ],
        answer: `${texInline(`P_{\\text{ideal}} = ${tnum(P_id, 1)}\\ \\mathrm{bar}`)} · ${texInline(`P_{\\text{vdW}} = ${tnum(P_vdw, 1)}\\ \\mathrm{bar}`)} · ${texInline(`P_{\\text{RK}} = ${tnum(P_rk, 1)}\\ \\mathrm{bar}`)} (${texInline(`Z_{\\text{RK}} = ${tnum(Zrk, 3)}`)})`,
        check: `Desvio do modelo ideal em relação a Redlich–Kwong: ${texInline(`+${tnum(((P_id - P_rk) / P_rk) * 100, 1)}\\%`)} (com ${texInline(`T_R = ${tnum(T / Tcrit, 2)}`)} e ${texInline(`p_R = ${tnum(P_rk / pcrit, 2)}`)}).`,
      };
    },
  },

  /* 2. thermo-b-polytropic */
  {
    id: 'thermo-b-polytropic',
    title: 'Trabalho de Fronteira em Processo Politrópico (P Vⁿ = C)',
    tag: 'Exemplo Dinâmico · Aula 2',
    params: [
      { key: 'P1', label: 'Pressão inicial P₁', unit: 'kPa', min: 200, max: 1000, step: 100, base: 800, choices: [400, 600, 800, 1000] },
      { key: 'V1', label: 'Volume inicial V₁', unit: 'm³', min: 0.04, max: 0.12, step: 0.02, base: 0.06, choices: [0.04, 0.05, 0.06, 0.08, 0.10] },
      { key: 'n', label: 'Expoente n', unit: '', min: 0, max: 1.5, step: 0.1, base: 1.3, choices: [0, 0.8, 1.0, 1.2, 1.3, 1.4] },
    ],
    solve: ({ P1, V1, n }) => {
      const V2 = V1 * 3;
      const P2 = P1 * Math.pow(V1 / V2, n);
      const W = Math.abs(n - 1) < 1e-4 ? P1 * V1 * Math.log(V2 / V1) : (P2 * V2 - P1 * V1) / (1 - n);
      return {
        statement: `Um gás dentro de um conjunto cilindro–pistão expande-se de <b>V₁ = ${fmt(V1, 2)} m³</b> e <b>P₁ = ${P1} kPa</b> até triplicar o volume (<b>V₂ = ${fmt(V2, 2)} m³</b>) segundo um processo politrópico com <b>n = ${fmt(n, 1)}</b>. Determine P₂ e o trabalho de fronteira.`,
        steps: [
          { label: 'Pressão final pela relação politrópica', tex: String.raw`P_2 = P_1\left(\frac{V_1}{V_2}\right)^n = ${P1}\left(\frac{1}{3}\right)^{${tnum(n, 1)}} = ${tnum(P2, 1)}\ \mathrm{kPa}` },
          {
            label: Math.abs(n - 1) < 1e-4 ? 'Integração no caso isotérmico (n = 1)' : 'Integração da fronteira móvel (n ≠ 1)',
            tex: Math.abs(n - 1) < 1e-4
              ? String.raw`W_{12} = P_1 V_1 \ln\!\left(\frac{V_2}{V_1}\right) = ${P1}(${tnum(V1, 2)})\ln(3) = ${tnum(W, 2)}\ \mathrm{kJ}`
              : String.raw`W_{12} = \frac{P_2 V_2 - P_1 V_1}{1 - n} = \frac{${tnum(P2, 1)}(${tnum(V2, 2)}) - ${P1}(${tnum(V1, 2)})}{1 - ${tnum(n, 1)}} = ${tnum(W, 2)}\ \mathrm{kJ}`,
          },
        ],
        answer: `P₂ = ${fmt(P2, 1)} kPa · W₁₂ = +${fmt(W, 2)} kJ (trabalho realizado pelo gás)`,
        check: `Em expansão (V₂ > V₁), W > 0 e decresce monotonicamente à medida que n cresce (P₁V₁·ln3 = ${fmt(P1 * V1 * Math.log(3), 2)} kJ para n = 1).`,
      };
    },
  },

  /* 3. thermo-c-turbine */
  {
    id: 'thermo-c-turbine',
    title: 'Balanço de Energia em Turbina a Vapor Real (Tabelas A-3/A-4)',
    tag: 'Exemplo Dinâmico · Aula 3',
    params: [
      { key: 'p1', label: 'Pressão de entrada P₁', unit: 'bar', min: 20, max: 40, step: 10, base: 30, choices: [20, 30, 40] },
      { key: 'T1', label: 'Temperatura entrada T₁', unit: '°C', min: 400, max: 440, step: 40, base: 400, choices: [400, 440] },
      { key: 'mdot', label: 'Vazão mássica ṁ', unit: 'kg/s', min: 5, max: 20, step: 5, base: 10, choices: [5, 10, 15, 20] },
    ],
    solve: ({ p1, T1, mdot }) => {
      const sup = STEAM_SUP.find((r) => r.pBar === p1 && r.T === T1) || STEAM_SUP[4];
      const sat2 = STEAM_SAT[1]; // 0.10 bar
      const x2 = 0.90;
      const h2 = sat2.hf + x2 * sat2.hfg;
      const V1 = 50, V2 = 120;
      const dEc = (V1 * V1 - V2 * V2) / 2000;
      const Wdot = mdot * ((sup.h - h2) + dEc);
      return {
        statement: `Vapor d’água entra numa turbina adiabática a <b>${p1} bar (${p1 / 10} MPa)</b>, <b>${T1} °C</b> e <b>50 m/s</b> com vazão de <b>${mdot} kg/s</b>, saindo a <b>0,10 bar (10 kPa)</b>, título <b>x₂ = 0,90</b> e <b>120 m/s</b>. Calcule a potência entregue.`,
        steps: [
          { label: 'Entalpia de entrada (Tabela A-4) e de saída (Tabela A-3)', tex: String.raw`h_1 = ${tnum(sup.h, 1)}\ \mathrm{kJ/kg},\qquad h_2 = 191{,}83 + 0{,}90(2392{,}8) = ${tnum(h2, 1)}\ \mathrm{kJ/kg}` },
          { label: 'Contribuição da energia cinética', tex: String.raw`\Delta ec = \frac{V_1^2 - V_2^2}{2\,000} = \frac{50^2 - 120^2}{2\,000} = ${tnum(dEc, 2)}\ \mathrm{kJ/kg}` },
          { label: 'Balanço em regime permanente (Q̇ ≈ 0)', tex: String.raw`\dot W = \dot m\left[(h_1 - h_2) + \Delta ec\right] = ${mdot}\left[(${tnum(sup.h, 1)} - ${tnum(h2, 1)}) ${dEc < 0 ? '-' : '+'} ${tnum(Math.abs(dEc), 2)}\right] = ${tnum(Wdot, 0)}\ \mathrm{kW}` },
        ],
        answer: `Ẇ = ${fmt(Wdot, 0)} kW (${fmt(Wdot / 1000, 2)} MW)`,
        check: `A energia cinética representa apenas ${fmt((Math.abs(dEc) / (sup.h - h2)) * 100, 2)}% da variação de entalpia.`,
      };
    },
  },

  /* 4. thermo-d-steam */
  {
    id: 'thermo-d-steam',
    title: 'Localização de Estado e Título em Mistura Saturada (Tabela A-3)',
    tag: 'Exemplo Dinâmico · Aula 4',
    params: [
      { key: 'p', label: 'Pressão da água P', unit: 'bar', min: 1, max: 20, step: 1, base: 5, choices: [1, 2, 5, 10, 20] },
      { key: 'x', label: 'Título real x', unit: '', min: 0.2, max: 0.85, step: 0.15, base: 0.5, choices: [0.2, 0.35, 0.5, 0.65, 0.8] },
    ],
    solve: ({ p, x }) => {
      const sat = STEAM_SAT.find((r) => r.pBar === p) || STEAM_SAT[6];
      const v = sat.vf + x * (sat.vg - sat.vf);
      const h = sat.hf + x * sat.hfg;
      const u = sat.uf + x * (sat.ug - sat.uf);
      const s = sat.sf + x * (sat.sg - sat.sf);
      return {
        statement: `Um recipiente contém água a <b>P = ${p} bar</b> com volume específico médio <b>v = ${fmt(v, 4)} m³/kg</b>. Identifique a fase, calcule o título <b>x</b>, a entalpia <b>h</b> e a entropia <b>s</b> (Moran, Tab. A-3).`,
        steps: [
          { label: `Teste de região na Tabela A-3 a ${p} bar (T_sat = ${fmt(sat.T, 1)} °C)`, tex: String.raw`v_f = ${tnum(sat.vf, 5)},\quad v_g = ${tnum(sat.vg, 4)}\ \mathrm{m^3/kg} \;\Rightarrow\; v_f < v < v_g\ (\text{mistura saturada})` },
          { label: 'Cálculo do título mássico x', tex: String.raw`x = \frac{v - v_f}{v_g - v_f} = \frac{${tnum(v, 4)} - ${tnum(sat.vf, 5)}}{${tnum(sat.vg, 4)} - ${tnum(sat.vf, 5)}} = ${tnum(x, 3)}` },
          { label: 'Entalpia, energia interna e entropia', tex: String.raw`h = h_f + x\,h_{fg} = ${tnum(sat.hf, 1)} + ${tnum(x, 2)}(${tnum(sat.hfg, 1)}) = ${tnum(h, 1)}\ \mathrm{kJ/kg},\quad s = ${tnum(s, 4)}\ \mathrm{kJ/(kg{\cdot}K)}` },
        ],
        answer: `Mistura saturada a ${fmt(sat.T, 1)} °C · x = ${fmt(x, 2)} · h = ${fmt(h, 1)} kJ/kg · u = ${fmt(u, 1)} kJ/kg · s = ${fmt(s, 4)} kJ/(kg·K)`,
        check: `Verificação física: h_f (${fmt(sat.hf, 1)}) < h (${fmt(h, 1)}) < h_g (${fmt(sat.hg, 1)}).`,
      };
    },
  },

  /* 5. thermo-e-compressor */
  {
    id: 'thermo-e-compressor',
    title: 'Eficiência Isentrópica e Geração de Entropia em Compressor de Ar',
    tag: 'Exemplo Dinâmico · Aula 5',
    params: [
      { key: 'rp', label: 'Razão de pressões P₂/P₁', unit: '', min: 4, max: 12, step: 2, base: 8, choices: [4, 6, 8, 10, 12] },
      { key: 'T1', label: 'Temperatura de admissão T₁', unit: 'K', min: 280, max: 320, step: 10, base: 300, choices: [280, 290, 300, 310, 320] },
      { key: 'etac', label: 'Eficiência isentrópica η_c', unit: '%', min: 75, max: 90, step: 5, base: 80, choices: [75, 80, 85, 90] },
    ],
    solve: ({ rp, T1, etac }) => {
      const k = 1.4, cp = 1.005, R = 0.287;
      const T2s = T1 * Math.pow(rp, (k - 1) / k);
      const ws = cp * (T2s - T1);
      const w = ws / (etac / 100);
      const T2 = T1 + (T2s - T1) / (etac / 100);
      const sger = cp * Math.log(T2 / T1) - R * Math.log(rp);
      return {
        statement: `Ar (gás ideal, k = 1,4; c<sub>p</sub> = 1,005 kJ/kg·K) entra num compressor adiabático a <b>T₁ = ${T1} K</b> e é comprimido por uma razão <b>P₂/P₁ = ${rp}</b> com <b>η_c = ${etac}%</b>. Calcule T₂, trabalho específico e s<sub>ger</sub>.`,
        steps: [
          { label: 'Temperatura de saída no processo isentrópico de referência', tex: String.raw`T_{2s} = T_1\left(\frac{P_2}{P_1}\right)^{(k-1)/k} = ${T1}(${rp})^{0{,}2857} = ${tnum(T2s, 1)}\ \mathrm{K}` },
          { label: 'Trabalho isentrópico e trabalho real pela definição de η_c', tex: String.raw`w_s = c_p(T_{2s}-T_1) = ${tnum(ws, 1)}\ \mathrm{kJ/kg},\qquad w_c = \frac{w_s}{\eta_c} = \frac{${tnum(ws, 1)}}{${tnum(etac / 100, 2)}} = ${tnum(w, 1)}\ \mathrm{kJ/kg}` },
          { label: 'Temperatura real e entropia gerada (Eq. T ds)', tex: String.raw`T_2 = ${tnum(T2, 1)}\ \mathrm{K},\qquad s_{\text{ger}} = c_p\ln\!\left(\frac{T_2}{T_1}\right) - R\ln\!\left(\frac{P_2}{P_1}\right) = ${tnum(sger, 4)}\ \mathrm{kJ/(kg{\cdot}K)}` },
        ],
        answer: `T₂ = ${fmt(T2, 1)} K · w_c = ${fmt(w, 1)} kJ/kg · s_ger = ${fmt(sger, 4)} kJ/(kg·K)`,
        check: `Irreversibilidades aumentam o consumo em ${fmt(((w - ws) / ws) * 100, 1)}% e garantem s_ger > 0.`,
      };
    },
  },

  /* 6. thermo-f-heatpump */
  {
    id: 'thermo-f-heatpump',
    title: 'Bomba de Calor vs Aquecedor Resistivo (2ª Lei)',
    tag: 'Exemplo Dinâmico · Aula 6',
    params: [
      { key: 'QHkjh', label: 'Carga térmica Q̇_H', unit: 'kJ/h', min: 45000, max: 120000, step: 15000, base: 72000, choices: [54000, 72000, 90000, 108000] },
      { key: 'cop', label: 'COP da bomba de calor', unit: '', min: 2.5, max: 4.5, step: 0.5, base: 3.2, choices: [2.5, 3.0, 3.2, 3.6, 4.0] },
    ],
    solve: ({ QHkjh, cop }) => {
      const QH = QHkjh / 3600;
      const W = QH / cop;
      const QL = QH - W;
      return {
        statement: `Uma edificação perde <b>${QHkjh.toLocaleString('pt-BR')} kJ/h</b> de calor para o exterior. Uma bomba de calor com <b>COP<sub>BC</sub> = ${fmt(cop, 1)}</b> mantém o ambiente aquecido. Determine a potência elétrica requerida e o calor extraído do ar externo.`,
        steps: [
          { label: 'Conversão da carga térmica para kW', tex: String.raw`\dot Q_H = \frac{${QHkjh}}{3\,600} = ${tnum(QH, 2)}\ \mathrm{kW}` },
          { label: 'Potência elétrica consumida e calor da fonte fria', tex: String.raw`\dot W = \frac{\dot Q_H}{COP_{BC}} = \frac{${tnum(QH, 2)}}{${tnum(cop, 1)}} = ${tnum(W, 2)}\ \mathrm{kW},\qquad \dot Q_L = \dot Q_H - \dot W = ${tnum(QL, 2)}\ \mathrm{kW}` },
        ],
        answer: `Ẇ = ${fmt(W, 2)} kW (contra ${fmt(QH, 2)} kW num aquecedor elétrico) · Q̇_L = ${fmt(QL, 2)} kW`,
        check: `Economia de energia elétrica = ${fmt((1 - 1 / cop) * 100, 1)}% porque o trabalho apenas "bombeia" ${fmt(QL, 2)} kW do meio externo.`,
      };
    },
  },

  /* 7. thermo-g-carnot */
  {
    id: 'thermo-g-carnot',
    title: 'Ciclo de Carnot a Vapor & Limites de Potência (Tabela A-2)',
    tag: 'Exemplo Dinâmico · Aula 7',
    params: [
      { key: 'THc', label: 'Temp. da caldeira T_H', unit: '°C', min: 150, max: 300, step: 50, base: 250, choices: [150, 200, 250, 300] },
      { key: 'TLc', label: 'Temp. condensador T_L', unit: '°C', min: 25, max: 55, step: 5, base: 40, choices: [25, 30, 40, 50] },
    ],
    solve: ({ THc, TLc }) => {
      const TH = THc + 273.15, TL = TLc + 273.15;
      const eta = 1 - TL / TH;
      const etaCA = 1 - Math.sqrt(TL / TH);
      const hfgMap: Record<number, number> = { 150: 2114.3, 200: 1940.7, 250: 1716.2, 300: 1404.9 };
      const qH = hfgMap[THc] ?? 1716.2;
      const w = eta * qH;
      const qL = qH - w;
      return {
        statement: `Água atua em um ciclo de Carnot entre <b>T_H = ${THc} °C</b> (vaporizando de líquido a vapor saturado; h<sub>fg</sub> = ${fmt(qH, 1)} kJ/kg, Tab. A-2) e <b>T_L = ${TLc} °C</b>. Calcule η<sub>Carnot</sub>, trabalho líquido e calor rejeitado.`,
        steps: [
          { label: 'Conversão obrigatória para Kelvin e rendimento máximo', tex: String.raw`\eta_{\text{Carnot}} = 1 - \frac{${tnum(TL, 2)}}{${tnum(TH, 2)}} = ${tnum(eta, 4)} \;\;(${tnum(eta * 100, 1)}\%)` },
          { label: 'Trabalho específico líquido e calor rejeitado', tex: String.raw`w = \eta\,q_H = ${tnum(eta, 4)}(${tnum(qH, 1)}) = ${tnum(w, 1)}\ \mathrm{kJ/kg},\qquad q_L = q_H - w = ${tnum(qL, 1)}\ \mathrm{kJ/kg}` },
        ],
        answer: `η_Carnot = ${fmt(eta * 100, 1)}% · w_líq = ${fmt(w, 1)} kJ/kg · q_L = ${fmt(qL, 1)} kJ/kg`,
        check: `Rendimento de Curzon–Ahlborn na potência máxima: ${fmt(etaCA * 100, 1)}% (sempre menor que η_Carnot).`,
      };
    },
  },

  /* 8. thermo-h-hx-irrev */
  {
    id: 'thermo-h-hx-irrev',
    title: 'Irreversibilidade em Trocador de Calor Contracorrente',
    tag: 'Exemplo Dinâmico · Aula 8',
    params: [
      { key: 'mq', label: 'Vazão água quente', unit: 'kg/s', min: 1, max: 4, step: 0.5, base: 1, choices: [1, 1.5, 2, 3] },
      { key: 'Tq1', label: 'Entrada quente T_q1', unit: '°C', min: 70, max: 95, step: 5, base: 90, choices: [75, 85, 90, 95] },
      { key: 'mf', label: 'Vazão água fria', unit: 'kg/s', min: 1.5, max: 5, step: 0.5, base: 2, choices: [1.5, 2, 2.5, 3, 4] },
    ],
    solve: ({ mq, Tq1, mf }) => {
      const cp = 4.18, T0 = 298.15, Tq2 = 50, Tf1 = 20;
      const Q = mq * cp * (Tq1 - Tq2);
      const Tf2 = Tf1 + Q / (mf * cp);
      const Sger = mq * cp * Math.log((Tq2 + 273.15) / (Tq1 + 273.15)) + mf * cp * Math.log((Tf2 + 273.15) / (Tf1 + 273.15));
      const I = T0 * Sger;
      return {
        statement: `Água quente (<b>${fmt(mq, 1)} kg/s</b>) entra a <b>${Tq1} °C</b> e sai a <b>50 °C</b> aquecendo <b>${fmt(mf, 1)} kg/s</b> de água fria que entra a <b>20 °C</b> (c = 4,18 kJ/kg·K; T₀ = 25 °C). Calcule Ṡ<sub>ger</sub> e İ.`,
        steps: [
          { label: 'Balanço de energia no trocador adiabático', tex: String.raw`\dot Q = \dot m_q c(T_{q1}-T_{q2}) = ${tnum(Q, 1)}\ \mathrm{kW} \;\Rightarrow\; T_{f2} = 20 + \frac{${tnum(Q, 1)}}{${tnum(mf, 1)}(4{,}18)} = ${tnum(Tf2, 1)}\ ^\circ\mathrm{C}` },
          { label: 'Geração de entropia e Gouy–Stodola', tex: String.raw`\dot S_{\text{ger}} = \dot m_q c\ln\!\frac{323{,}15}{${tnum(Tq1 + 273.15, 2)}} + \dot m_f c\ln\!\frac{${tnum(Tf2 + 273.15, 2)}}{293{,}15} = ${tnum(Sger, 4)}\ \mathrm{kW/K}` },
          { label: 'Trabalho destruído (irreversibilidade)', tex: String.raw`\dot I = T_0\dot S_{\text{ger}} = 298{,}15 \times ${tnum(Sger, 4)} = ${tnum(I, 2)}\ \mathrm{kW}` },
        ],
        answer: `T_f2 = ${fmt(Tf2, 1)} °C · Ṡ_ger = ${fmt(Sger, 4)} kW/K · İ = ${fmt(I, 2)} kW`,
        check: `Como T_q > T_f em todo o trocador, Ṡ_ger > 0 obrigatoriamente (${fmt(Sger, 4)} kW/K).`,
      };
    },
  },

  /* 9. thermo-i-rankine-exergy */
  {
    id: 'thermo-i-rankine-exergy',
    title: 'Balanço Exergético de Ciclo Rankine (Destruição por Componente)',
    tag: 'Exemplo Dinâmico · Aula 9',
    params: [
      { key: 'p3', label: 'Pressão da caldeira P₃', unit: 'bar', min: 40, max: 100, step: 20, base: 60, choices: [40, 60, 80, 100] },
      { key: 'etat', label: 'Eficiência isentrópica turbina η_t', unit: '%', min: 75, max: 95, step: 5, base: 85, choices: [75, 80, 85, 90] },
    ],
    solve: ({ p3, etat }) => {
      const T0 = 298.15, TH = 1500;
      const p1 = 0.10, sat1 = STEAM_SAT[1];
      const supMap: Record<number, { T: number; h: number; s: number }> = {
        40: { T: 440, h: 3307.1, s: 6.9041 },
        60: { T: 440, h: 3277.3, s: 6.6853 },
        80: { T: 480, h: 3348.4, s: 6.6586 },
        100: { T: 520, h: 3425.1, s: 6.6622 },
      };
      const st3 = supMap[p3] || supMap[60];
      const wb = sat1.vf * (p3 - p1) * 100 / 0.85;
      const h2 = sat1.hf + wb, s2 = sat1.sf;
      const x4s = (st3.s - sat1.sf) / (sat1.sg - sat1.sf);
      const h4s = sat1.hf + x4s * sat1.hfg;
      const wt = (etat / 100) * (st3.h - h4s);
      const h4 = st3.h - wt;
      const x4 = (h4 - sat1.hf) / sat1.hfg;
      const s4 = sat1.sf + x4 * (sat1.sg - sat1.sf);
      const qIn = st3.h - h2;
      const wNet = wt - wb;
      const etaI = wNet / qIn;
      const eQ = qIn * (1 - T0 / TH);
      const edCald = T0 * (st3.s - s2 - qIn / TH);
      const edTurb = T0 * (s4 - st3.s);
      const eps = wNet / eQ;
      return {
        statement: `Ciclo Rankine com vapor entrando na turbina a <b>${p3} bar e ${st3.T} °C</b> (h₃ = ${fmt(st3.h, 1)} kJ/kg, s₃ = ${fmt(st3.s, 4)}, Tab. A-4) e condensador a <b>0,10 bar</b>, com <b>η_t = ${etat}%</b>, η_b = 85%, fonte a 1500 K e T₀ = 298,15 K.`,
        steps: [
          { label: 'Expansão na turbina (real vs isentrópica)', tex: String.raw`x_{4s} = ${tnum(x4s, 3)} \;\Rightarrow\; h_{4s} = ${tnum(h4s, 1)},\quad w_t = ${tnum(etat / 100, 2)}(${tnum(st3.h, 1)} - ${tnum(h4s, 1)}) = ${tnum(wt, 1)}\ \mathrm{kJ/kg}` },
          { label: 'Rendimento de 1ª Lei e Exergia do calor recebido', tex: String.raw`\eta_I = \frac{${tnum(wNet, 1)}}{${tnum(qIn, 1)}} = ${tnum(etaI * 100, 1)}\%,\qquad e_Q = q_{\text{in}}\!\left(1 - \frac{298{,}15}{1500}\right) = ${tnum(eQ, 1)}\ \mathrm{kJ/kg}` },
          { label: 'Destruição na caldeira vs turbina (Gouy–Stodola)', tex: String.raw`e_{D,\text{cald}} = ${tnum(edCald, 1)}\ \mathrm{kJ/kg}\ (${tnum((edCald / eQ) * 100, 1)}\%),\qquad e_{D,\text{turb}} = ${tnum(edTurb, 1)}\ \mathrm{kJ/kg}\ (${tnum((edTurb / eQ) * 100, 1)}\%)` },
        ],
        answer: `η_I = ${fmt(etaI * 100, 1)}% · Eficiência exergética ε = ${fmt(eps * 100, 1)}% · Caldeira destrói ${fmt((edCald / eQ) * 100, 1)}% da exergia`,
        check: `Mesmo com η_t = ${etat}%, a caldeira domina a destruição exergética devido ao enorme salto térmico entre 1500 K e a água.`,
      };
    },
  },

  /* 10. thermo-j-clapeyron */
  {
    id: 'thermo-j-clapeyron',
    title: 'Equação de Clapeyron para Estimar Entalpia de Vaporização',
    tag: 'Exemplo Dinâmico · Aula 10',
    params: [
      { key: 'p', label: 'Pressão central P', unit: 'bar', min: 1, max: 10, step: 1, base: 1, choices: [1, 2, 5, 10] },
    ],
    solve: ({ p }) => {
      const idx = STEAM_SAT.findIndex((r) => r.pBar === p);
      const i = idx > 0 && idx < STEAM_SAT.length - 1 ? idx : 4;
      const lo = STEAM_SAT[i - 1], mid = STEAM_SAT[i], hi = STEAM_SAT[i + 1];
      const dPdT = ((hi.pBar - lo.pBar) * 100) / (hi.T - lo.T); // kPa/K
      const T = mid.T + 273.15;
      const dv = mid.vg - mid.vf;
      const hfgEst = T * dv * dPdT;
      const err = ((hfgEst - mid.hfg) / mid.hfg) * 100;
      return {
        statement: `Usando apenas dados P–T–v da Tabela A-3 em torno de <b>P = ${fmt(mid.pBar, 1)} bar</b> (T = ${fmt(lo.T, 1)} °C a ${fmt(lo.pBar, 2)} bar; T = ${fmt(hi.T, 1)} °C a ${fmt(hi.pBar, 2)} bar), estime <b>h<sub>fg</sub></b> pela equação de Clapeyron e compare com a tabela.`,
        steps: [
          { label: 'Inclinação da curva de saturação por diferença central', tex: String.raw`\left(\frac{dP}{dT}\right)_{\text{sat}} \approx \frac{(${tnum(hi.pBar, 1)} - ${tnum(lo.pBar, 1)})\times 100\ \mathrm{kPa}}{${tnum(hi.T, 2)} - ${tnum(lo.T, 2)}\ \mathrm{K}} = ${tnum(dPdT, 3)}\ \mathrm{kPa/K}` },
          { label: 'Aplicação da equação de Clapeyron', tex: String.raw`h_{fg} = T_{\text{sat}}\,(v_g - v_f)\left(\frac{dP}{dT}\right)_{\text{sat}} = ${tnum(T, 2)}(${tnum(dv, 4)})(${tnum(dPdT, 3)}) = ${tnum(hfgEst, 1)}\ \mathrm{kJ/kg}` },
        ],
        answer: `h_fg (Clapeyron) = ${fmt(hfgEst, 1)} kJ/kg vs Tabelado = ${fmt(mid.hfg, 1)} kJ/kg (diferença ${fmt(err, 1)}%)`,
        check: `Clapeyron permite medir propriedades calóricas (h_fg) usando exclusivamente medidas P, v e T.`,
      };
    },
  },

  /* 11. calor-a-mix */
  {
    id: 'calor-a-mix',
    title: 'Mistura de Gases Ideais: Massa Molar, Pressões Parciais e ΔS_mist',
    tag: 'Exemplo Dinâmico · Tec. Calor A',
    params: [
      { key: 'nCO2', label: 'Mols de CO₂', unit: 'kmol', min: 1, max: 5, step: 1, base: 2, choices: [1, 2, 3, 4] },
      { key: 'nN2', label: 'Mols de N₂', unit: 'kmol', min: 2, max: 10, step: 2, base: 6, choices: [2, 4, 6, 8] },
      { key: 'P', label: 'Pressão da mistura', unit: 'kPa', min: 100, max: 500, step: 50, base: 300, choices: [150, 200, 300, 450] },
    ],
    solve: ({ nCO2, nN2, P }) => {
      const nO2 = 2;
      const nTot = nCO2 + nO2 + nN2;
      const yC = nCO2 / nTot, yO = nO2 / nTot, yN = nN2 / nTot;
      const Mm = yC * 44.01 + yO * 32.0 + yN * 28.01;
      const Rm = RU / Mm;
      const dSmix = -nTot * RU * (yC * Math.log(yC) + yO * Math.log(yO) + yN * Math.log(yN));
      return {
        statement: `Uma mistura gasosa a <b>${P} kPa</b> e 300 K contém <b>${nCO2} kmol de CO₂</b>, <b>2 kmol de O₂</b> e <b>${nN2} kmol de N₂</b>. Determine M<sub>m</sub>, R<sub>m</sub>, a pressão parcial do CO₂ e a entropia gerada na mistura adiabática isobárica-isotérmica.`,
        steps: [
          { label: 'Frações molares e massa molar aparente', tex: String.raw`y_{\mathrm{CO_2}}=${tnum(yC, 3)},\ \ y_{\mathrm{O_2}}=${tnum(yO, 3)},\ \ y_{\mathrm{N_2}}=${tnum(yN, 3)} \;\Rightarrow\; M_m = ${tnum(Mm, 2)}\ \mathrm{kg/kmol}` },
          { label: 'Constante do gás e pressão parcial de Dalton', tex: String.raw`R_m = \frac{8{,}3145}{${tnum(Mm, 2)}} = ${tnum(Rm, 4)}\ \mathrm{kJ/(kg{\cdot}K)},\qquad P_{\mathrm{CO_2}} = y_{\mathrm{CO_2}} P = ${tnum(yC * P, 1)}\ \mathrm{kPa}` },
          { label: 'Entropia de mistura', tex: String.raw`\Delta S_{\text{mist}} = -\bar R\sum n_i\ln y_i = ${tnum(dSmix, 2)}\ \mathrm{kJ/K}` },
        ],
        answer: `M_m = ${fmt(Mm, 2)} kg/kmol · R_m = ${fmt(Rm, 4)} kJ/(kg·K) · P_CO₂ = ${fmt(yC * P, 1)} kPa · ΔS_mist = ${fmt(dSmix, 2)} kJ/K`,
        check: `Como M_m está entre 28,01 e 44,01 kg/kmol (${fmt(Mm, 2)}), o resultado satisfaz os limites dos componentes.`,
      };
    },
  },

  /* 12. calor-b-stoich */
  {
    id: 'calor-b-stoich',
    title: 'Estequiometria de Combustão, Excesso de Ar e Ponto de Orvalho',
    tag: 'Exemplo Dinâmico · Tec. Calor B',
    params: [
      { key: 'exc', label: 'Excesso de ar', unit: '%', min: 0, max: 100, step: 20, base: 40, choices: [0, 20, 40, 60, 80] },
      { key: 'P', label: 'Pressão dos produtos', unit: 'kPa', min: 100, max: 200, step: 25, base: 101.3, choices: [100, 125, 150, 200] },
    ],
    solve: ({ exc, P }) => {
      const aTh = 5; // Propano C3H8: a_th = 3 + 8/4 = 5
      const a = (1 + exc / 100) * aTh;
      const nProd = 3 + 4 + (a - 5) + 3.76 * a;
      const AF = (4.76 * a * 28.97) / 44.09;
      const yH2O = 4 / nProd;
      const Pv = yH2O * P;
      let Tpo = 40;
      for (let t = 15; t <= 85; t += 0.25) { if (pSatWaterKpa(t) >= Pv) { Tpo = t; break; } }
      return {
        statement: `Propano gasoso (C₃H₈) é queimado completamente com <b>${exc}% de excesso de ar</b> a <b>${fmt(P, 1)} kPa</b>. Escreva a reação balanceada, calcule a razão ar–combustível (AF) e a temperatura de ponto de orvalho dos gases.`,
        steps: [
          { label: 'Balanço atômico de C, H, O e N (ar = O₂ + 3,76 N₂)', tex: String.raw`\mathrm{C_3H_8} + ${tnum(a, 1)}(\mathrm{O_2} + 3{,}76\,\mathrm{N_2}) \to 3\,\mathrm{CO_2} + 4\,\mathrm{H_2O} + ${tnum(a - 5, 1)}\,\mathrm{O_2} + ${tnum(3.76 * a, 2)}\,\mathrm{N_2}` },
          { label: 'Razão ar–combustível mássica', tex: String.raw`AF = \frac{${tnum(4.76 * a, 2)} \times 28{,}97}{44{,}09} = ${tnum(AF, 2)}\ \mathrm{kg\ ar/kg\ comb}` },
          { label: 'Pressão parcial do vapor d’água e ponto de orvalho', tex: String.raw`P_v = y_{\mathrm{H_2O}} P = \frac{4}{${tnum(nProd, 2)}}(${tnum(P, 1)}) = ${tnum(Pv, 2)}\ \mathrm{kPa} \;\Rightarrow\; T_{po} \approx ${tnum(Tpo, 1)}\ ^\circ\mathrm{C}` },
        ],
        answer: `AF = ${fmt(AF, 2)} kg/kg · P_v = ${fmt(Pv, 2)} kPa · T_orvalho = ${fmt(Tpo, 1)} °C`,
        check: `Abaixo de ${fmt(Tpo, 1)} °C ocorre condensação ácida na chaminé (excesso de ar reduz y_H₂O e baixa T_po).`,
      };
    },
  },

  /* 13. calor-c-hcomb */
  {
    id: 'calor-c-hcomb',
    title: 'Entalpia de Combustão via Entalpias de Formação (Tabela A-25)',
    tag: 'Exemplo Dinâmico · Tec. Calor C',
    params: [
      { key: 'fuelIdx', label: 'Combustível (1=CH₄, 2=C₃H₈, 3=Etanol(l))', unit: '', min: 1, max: 3, step: 1, base: 1, choices: [1, 2, 3] },
    ],
    solve: ({ fuelIdx }) => {
      const fList = [
        { name: 'Metano CH₄(g)', c: 1, h: 4, hf: -74850, M: 16.04 },
        { name: 'Propano C₃H₈(g)', c: 3, h: 8, hf: -103850, M: 44.09 },
        { name: 'Etanol C₂H₅OH(l)', c: 2, h: 6, hf: -277690, M: 46.07 },
      ];
      const f = fList[fuelIdx - 1] || fList[0];
      const nW = f.h / 2;
      const hRPLiq = f.c * HF0.CO2 + nW * HF0.H2Ol - f.hf;
      const hRPGas = f.c * HF0.CO2 + nW * HF0.H2Og - f.hf;
      return {
        statement: `Usando as entalpias padrão de formação a 25 °C e 1 atm (Moran, Tab. A-25: CO₂ = −393 520; H₂O(l) = −285 830; H₂O(g) = −241 820 kJ/kmol), calcule a entalpia de combustão molar de <b>${f.name}</b> para água líquida e gasosa.`,
        steps: [
          { label: 'Definição de entalpia de combustão h̄_RP = H_P° − H_R°', tex: String.raw`\bar h_{RP} = ${f.c}\,\bar h_{f,\mathrm{CO_2}}^\circ + ${nW}\,\bar h_{f,\mathrm{H_2O}}^\circ - (1)\,\bar h_{f,\text{comb}}^\circ` },
          { label: 'Com água líquida nos produtos (base PCS)', tex: String.raw`\bar h_{RP,\text{liq}} = ${f.c}(-393\,520) + ${nW}(-285\,830) - (${f.hf}) = ${tnum(hRPLiq, 0)}\ \mathrm{kJ/kmol}` },
          { label: 'Com vapor d’água nos produtos (base PCI)', tex: String.raw`\bar h_{RP,\text{vap}} = ${f.c}(-393\,520) + ${nW}(-241\,820) - (${f.hf}) = ${tnum(hRPGas, 0)}\ \mathrm{kJ/kmol}` },
        ],
        answer: `h̄_RP(H₂O l) = ${fmt(hRPLiq, 0)} kJ/kmol · h̄_RP(H₂O g) = ${fmt(hRPGas, 0)} kJ/kmol`,
        check: `Diferença = ${nW} × 44 010 = ${fmt(nW * 44010, 0)} kJ/kmol (exatamente n_H₂O · h̄_fg a 25 °C).`,
      };
    },
  },

  /* 14. calor-d-react1st */
  {
    id: 'calor-d-react1st',
    title: 'I Lei em Câmara de Combustão em Regime Permanente',
    tag: 'Exemplo Dinâmico · Tec. Calor D',
    params: [
      { key: 'Tp', label: 'Temperatura dos produtos T_P', unit: 'K', min: 600, max: 1400, step: 200, base: 1000, choices: [600, 800, 1000, 1200] },
      { key: 'exc', label: 'Excesso de ar', unit: '%', min: 20, max: 100, step: 20, base: 40, choices: [20, 40, 60, 100] },
    ],
    solve: ({ Tp, exc }) => {
      // CH4(g) at 298 K + air at 298 K -> products at Tp
      const a = 2 * (1 + exc / 100), nO2 = a - 2, nN2 = 3.76 * a;
      const HR = HF0.CH4;
      const HP = (HF0.CO2 + hBarGas('CO2', Tp) - 9364) + 2 * (HF0.H2Og + hBarGas('H2O', Tp) - 9904) + nO2 * (hBarGas('O2', Tp) - 8682) + nN2 * (hBarGas('N2', Tp) - 8669);
      const Q = HP - HR; // negative = rejected
      return {
        statement: `Metano (CH₄) e ar entram a 25 °C (298 K) numa caldeira em regime permanente com <b>${exc}% de excesso de ar</b>. Os gases saem a <b>${Tp} K</b> (Moran, Tab. A-23 e A-25). Calcule o calor transferido por kmol de CH₄ e por kg de CH₄.`,
        steps: [
          { label: 'Entalpia dos reagentes a 298 K', tex: String.raw`\bar H_R = \bar h_{f,\mathrm{CH_4}}^\circ = -74\,850\ \mathrm{kJ/kmol\ CH_4}` },
          { label: `Entalpia dos produtos a ${Tp} K (CO₂ + 2 H₂O + ${fmt(nO2, 1)} O₂ + ${fmt(nN2, 2)} N₂)`, tex: String.raw`\bar H_P(${Tp}\ \mathrm{K}) = \sum n_e\left(\bar h_f^\circ + \Delta\bar h\right)_e = ${tnum(HP, 0)}\ \mathrm{kJ/kmol\ CH_4}` },
          { label: 'Calor útil transferido na caldeira (Ẇ_vc = 0)', tex: String.raw`\bar Q_{vc} = \bar H_P - \bar H_R = ${tnum(Q, 0)}\ \mathrm{kJ/kmol} = ${tnum(Q / 16.04, 0)}\ \mathrm{kJ/kg\ CH_4}` },
        ],
        answer: `Calor cedido ao fluido de trabalho: ${fmt(Math.abs(Q), 0)} kJ/kmol CH₄ (${fmt(Math.abs(Q) / 16.04, 0)} kJ/kg)`,
        check: `Rendimento de combustão em relação ao PCI (802 360 kJ/kmol): ${fmt((Math.abs(Q) / 802360) * 100, 1)}%.`,
      };
    },
  },

  /* 15. calor-e-hhv */
  {
    id: 'calor-e-hhv',
    title: 'Conversão Exata entre PCS (HHV) e PCI (LHV)',
    tag: 'Exemplo Dinâmico · Tec. Calor E',
    params: [
      { key: 'idx', label: 'Combustível (1=CH₄, 2=C₈H₁₈, 3=H₂)', unit: '', min: 1, max: 3, step: 1, base: 1, choices: [1, 2, 3] },
    ],
    solve: ({ idx }) => {
      const data = [
        { name: 'Metano (CH₄)', M: 16.04, nW: 2, pcs: 55510 },
        { name: 'Octano líquido (C₈H₁₈)', M: 114.22, nW: 9, pcs: 47900 },
        { name: 'Hidrogênio (H₂)', M: 2.016, nW: 1, pcs: 141780 },
      ][idx - 1];
      const hfg = 2442.3; // Water at 25 °C (Tab. A-2)
      const mW = (data.nW * 18.015) / data.M;
      const pci = data.pcs - mW * hfg;
      return {
        statement: `O Poder Calorífico Superior de <b>${data.name}</b> é <b>PCS = ${data.pcs.toLocaleString('pt-BR')} kJ/kg</b> (M = ${fmt(data.M, 2)} kg/kmol). Sabendo que 1 kmol gera <b>${data.nW} kmol de H₂O</b> e que h<sub>fg</sub>(25 °C) = 2442,3 kJ/kg, deduza o PCI.`,
        steps: [
          { label: 'Massa de água formada por kg de combustível', tex: String.raw`\frac{m_{\mathrm{H_2O}}}{m_{\text{comb}}} = \frac{${data.nW} \times 18{,}015}{${tnum(data.M, 2)}} = ${tnum(mW, 3)}\ \mathrm{kg\ H_2O/kg\ comb}` },
          { label: 'Relação termodinâmica PCS − PCI', tex: String.raw`\mathrm{PCI} = \mathrm{PCS} - \frac{m_{\mathrm{H_2O}}}{m_{\text{comb}}}\,h_{fg} = ${data.pcs} - ${tnum(mW, 3)}(2442{,}3) = ${tnum(pci, 0)}\ \mathrm{kJ/kg}` },
        ],
        answer: `PCI = ${fmt(pci, 0)} kJ/kg (diferença latente = ${fmt(((data.pcs - pci) / data.pcs) * 100, 1)}% do PCS)`,
        check: `Conferência na Tabela A-25 de Moran & Shapiro: valores nominais batem a < 0,2%.`,
      };
    },
  },

  /* 16. calor-f-tad */
  {
    id: 'calor-f-tad',
    title: 'Cálculo Iterativo da Temperatura Adiabática de Chama (Tabela A-23)',
    tag: 'Exemplo Dinâmico · Tec. Calor F',
    params: [
      { key: 'exc', label: 'Excesso de ar', unit: '%', min: 0, max: 150, step: 25, base: 50, choices: [0, 25, 50, 100, 150] },
    ],
    solve: ({ exc }) => {
      const a = 2 * (1 + exc / 100), nO = a - 2, nN = 3.76 * a;
      const HR = HF0.CH4;
      const HP = (T: number) =>
        (HF0.CO2 + hBarGas('CO2', T) - 9364) +
        2 * (HF0.H2Og + hBarGas('H2O', T) - 9904) +
        nO * (hBarGas('O2', T) - 8682) +
        nN * (hBarGas('N2', T) - 8669);
      let lo = 600, hi = 2800;
      for (let i = 0; i < 30; i++) { const mid = 0.5 * (lo + hi); if (HP(mid) < HR) lo = mid; else hi = mid; }
      const Tad = 0.5 * (lo + hi);
      return {
        statement: `Metano gasoso (CH₄) a 25 °C queima em regime permanente e câmara perfeitamente adiabática com ar a 25 °C e <b>${exc}% de excesso</b>. Resolva H<sub>P</sub>(T<sub>ad</sub>) = H<sub>R</sub> usando a Tabela A-23.`,
        steps: [
          { label: 'Balanço de energia adiabático (Q̇ = 0, Ẇ = 0)', tex: String.raw`H_P(T_{ad}) = H_R(298\ \mathrm{K}) = -74\,850\ \mathrm{kJ/kmol\ CH_4}` },
          { label: 'Equação implícita das entalpias sensíveis dos produtos', tex: String.raw`\Delta\bar h_{\mathrm{CO_2}} + 2\Delta\bar h_{\mathrm{H_2O}} + ${tnum(nO, 1)}\Delta\bar h_{\mathrm{O_2}} + ${tnum(nN, 2)}\Delta\bar h_{\mathrm{N_2}} = 802\,360\ \mathrm{kJ}` },
          { label: 'Raiz por interpolação na Tabela A-23', tex: String.raw`T_{ad} = ${tnum(Tad, 0)}\ \mathrm{K}\;\;(${tnum(Tad - 273.15, 0)}\ ^\circ\mathrm{C})` },
        ],
        answer: `T_ad = ${fmt(Tad, 0)} K (${fmt(Tad - 273.15, 0)} °C)`,
        check: `Para ar estequiométrico (0% excesso), T_ad ≈ 2328 K; com ${exc}% de excesso, cai para ${fmt(Tad, 0)} K.`,
      };
    },
  },

  /* 17. calor-g-psychro */
  {
    id: 'calor-g-psychro',
    title: 'Resfriamento com Desumidificação & Condensado (Psicrometria)',
    tag: 'Exemplo Dinâmico · Tec. Calor G',
    params: [
      { key: 'T1', label: 'Temp. entrada T₁', unit: '°C', min: 26, max: 36, step: 2, base: 30, choices: [28, 30, 32, 34] },
      { key: 'phi1', label: 'Umidade relativa φ₁', unit: '%', min: 50, max: 80, step: 10, base: 70, choices: [50, 60, 70, 80] },
      { key: 'T2', label: 'Saída da serpentina T₂', unit: '°C', min: 10, max: 16, step: 2, base: 14, choices: [10, 12, 14, 16] },
    ],
    solve: ({ T1, phi1, T2 }) => {
      const P = 101.325, Vdot = 2.0; // m³/s ar úmido
      const pv1 = (phi1 / 100) * pSatWaterKpa(T1);
      const w1 = 0.622 * (pv1 / (P - pv1));
      const h1 = 1.005 * T1 + w1 * (2501 + 1.86 * T1);
      const Ra = 0.287, v1 = (Ra * (T1 + 273.15)) / (P - pv1);
      const ma = Vdot / v1;
      const pv2 = pSatWaterKpa(T2);
      const w2 = 0.622 * (pv2 / (P - pv2));
      const h2 = 1.005 * T2 + w2 * (2501 + 1.86 * T2);
      const mw = ma * Math.max(0, w1 - w2);
      const Q = ma * ((h1 - h2) - Math.max(0, w1 - w2) * (4.18 * T2));
      return {
        statement: `Ar úmido entra numa serpentina a <b>${T1} °C</b>, <b>φ₁ = ${phi1}%</b>, 101,325 kPa e vazão de <b>2,0 m³/s</b>, saindo saturado a <b>${T2} °C</b>. Determine a vazão mássica de ar seco, o condensado removido e a taxa de calor removida.`,
        steps: [
          { label: 'Umidade absoluta ω₁, volume específico e vazão de ar seco', tex: String.raw`\omega_1 = ${tnum(w1, 5)},\quad v_1 = ${tnum(v1, 4)}\ \mathrm{m^3/kg_{as}} \;\Rightarrow\; \dot m_a = \frac{2{,}0}{${tnum(v1, 4)}} = ${tnum(ma, 3)}\ \mathrm{kg_{as}/s}` },
          { label: 'Umidade na saída saturada (φ₂ = 100%) e condensado', tex: String.raw`\omega_2 = ${tnum(w2, 5)} \;\Rightarrow\; \dot m_w = \dot m_a(\omega_1 - \omega_2) = ${tnum(mw * 3600, 2)}\ \mathrm{kg/h}` },
          { label: 'Capacidade de refrigeração da serpentina', tex: String.raw`\dot Q_{\text{sai}} = \dot m_a(h_1 - h_2) - \dot m_w h_{f,2} = ${tnum(Q, 2)}\ \mathrm{kW}\;\;(${tnum(Q / 3.517, 1)}\ \mathrm{TR})` },
        ],
        answer: `ṁ_a = ${fmt(ma, 3)} kg_as/s · Condensado = ${fmt(mw * 3600, 1)} kg/h · Q̇_sai = ${fmt(Q, 2)} kW`,
        check: `Como T₂ (${T2} °C) < T_po,1, ω₂ < ω₁ e há desumidificação real.`,
      };
    },
  },

  /* 18. calor-h-vcr */
  {
    id: 'calor-h-vcr',
    title: 'Ciclo de Refrigeração R-134a (Tabelas A-10/A-11/A-12)',
    tag: 'Exemplo Dinâmico · Tec. Calor H',
    params: [
      { key: 'pe', label: 'Pressão evaporador P_evap', unit: 'bar', min: 1.4, max: 2.4, step: 0.2, base: 1.8, choices: [1.4, 1.8, 2.0, 2.4] },
      { key: 'pc', label: 'Pressão condensador P_cond', unit: 'bar', min: 8, max: 12, step: 1, base: 10, choices: [8, 9, 10, 12] },
      { key: 'etac', label: 'Eficiência compressor η_c', unit: '%', min: 75, max: 95, step: 5, base: 80, choices: [75, 80, 85, 90] },
    ],
    solve: ({ pe, pc, etac }) => {
      const ev = R134A_SAT.find((r) => Math.abs(r.pBar - pe) < 0.05) || R134A_SAT[1];
      const cd = R134A_SAT.find((r) => Math.abs(r.pBar - pc) < 0.05) || R134A_SAT[6];
      const h1 = ev.hg, s1 = ev.sg;
      const st2s = interpR134aSupAtS(cd.pBar, s1);
      const ws = st2s.h - h1;
      const w = ws / (etac / 100);
      const h2 = h1 + w;
      const h3 = cd.hf, h4 = h3;
      const qL = h1 - h4;
      const cop = qL / w;
      const copMax = (ev.T + 273.15) / (cd.T - ev.T);
      return {
        statement: `Refrigerador com R-134a opera entre <b>${fmt(ev.pBar, 1)} bar (T_evap = ${fmt(ev.T, 1)} °C)</b> e <b>${fmt(cd.pBar, 0)} bar (T_cond = ${fmt(cd.T, 1)} °C)</b> com vapor saturado na sucção, líquido saturado na saída do condensador e <b>η_c = ${etac}%</b> (Tabs. A-11/A-12).`,
        steps: [
          { label: 'Estados 1 (vapor sat.), 2s (isentrópico Tab. A-12) e 3/4 (líq. sat.)', tex: String.raw`h_1=${tnum(h1, 2)},\ \ s_1=${tnum(s1, 4)}\ \Rightarrow\ h_{2s}=${tnum(st2s.h, 2)},\ \ h_3=h_4=${tnum(h3, 2)}\ \mathrm{kJ/kg}` },
          { label: 'Trabalho real de compressão e efeito refrigerante', tex: String.raw`w_c = \frac{h_{2s}-h_1}{\eta_c} = \frac{${tnum(ws, 2)}}{${tnum(etac / 100, 2)}} = ${tnum(w, 2)}\ \mathrm{kJ/kg},\qquad q_L = h_1 - h_4 = ${tnum(qL, 2)}\ \mathrm{kJ/kg}` },
          { label: 'Coeficiente de desempenho (COP)', tex: String.raw`\mathrm{COP}_R = \frac{q_L}{w_c} = ${tnum(cop, 2)}\qquad (\mathrm{COP}_{\text{Carnot}} = ${tnum(copMax, 2)})` },
        ],
        answer: `h₂ = ${fmt(h2, 1)} kJ/kg · w_c = ${fmt(w, 2)} kJ/kg · q_L = ${fmt(qL, 2)} kJ/kg · COP_R = ${fmt(cop, 2)}`,
        check: `Eficiência de 2ª Lei do ciclo: COP_R / COP_Carnot = ${fmt((cop / copMax) * 100, 1)}% (< 100% conforme esperado).`,
      };
    },
  },

  /* 19. calor-i-abs */
  {
    id: 'calor-i-abs',
    title: 'Ciclo de Absorção H₂O–LiBr: COP Reversível, Real e Irreversibilidade',
    tag: 'Exemplo Dinâmico · Tec. Calor I',
    params: [
      { key: 'TG', label: 'Temperatura gerador T_G', unit: '°C', min: 85, max: 140, step: 5, initial: 100, base: 100, choices: [85, 100, 115, 130] } as any,
      { key: 'TE', label: 'Temperatura evaporador T_E', unit: '°C', min: 4, max: 10, step: 2, base: 6, choices: [4, 6, 8, 10] },
      { key: 'QE', label: 'Capacidade frigorífica Q̇_E', unit: 'kW', min: 100, max: 500, step: 100, base: 200, choices: [100, 200, 300, 500] },
    ],
    solve: ({ TG, TE, QE }) => {
      const T0 = 30 + 273.15, TGk = TG + 273.15, TEk = TE + 273.15;
      const copRev = ((1 - T0 / TGk) * TEk) / (T0 - TEk);
      const copReal = 0.72;
      const QG = QE / copReal;
      const Q0 = QG + QE;
      const Sger = Q0 / T0 - QG / TGk - QE / TEk;
      const I = T0 * Sger;
      return {
        statement: `Um chiller por absorção H₂O–LiBr produz <b>${QE} kW</b> de água gelada a <b>${TE} °C</b> recebendo calor residual a <b>${TG} °C</b> e rejeitando calor para torre a <b>T₀ = 30 °C</b>, com <b>COP<sub>real</sub> = 0,72</b>. Calcule COP<sub>rev</sub>, Ṡ<sub>ger</sub> e a destruição de exergia total.`,
        steps: [
          { label: 'COP máximo reversível (motor de Carnot + refrigerador de Carnot)', tex: String.raw`\mathrm{COP}_{\text{rev}} = \left(1-\frac{T_0}{T_G}\right)\left(\frac{T_E}{T_0-T_E}\right) = \left(1-\frac{303{,}15}{${tnum(TGk, 2)}}\right)\left(\frac{${tnum(TEk, 2)}}{${tnum(T0 - TEk, 1)}}\right) = ${tnum(copRev, 2)}` },
          { label: 'Taxas de calor no gerador e rejeição combinada (condensador + absorvedor)', tex: String.raw`\dot Q_G = \frac{${QE}}{0{,}72} = ${tnum(QG, 1)}\ \mathrm{kW},\qquad \dot Q_{\text{rej}} = \dot Q_G + \dot Q_E = ${tnum(Q0, 1)}\ \mathrm{kW}` },
          { label: 'Geração de entropia global e destruição de exergia', tex: String.raw`\dot S_{\text{ger}} = \frac{\dot Q_{\text{rej}}}{T_0} - \frac{\dot Q_G}{T_G} - \frac{\dot Q_E}{T_E} = ${tnum(Sger, 4)}\ \mathrm{kW/K} \;\Rightarrow\; \dot I = T_0\dot S_{\text{ger}} = ${tnum(I, 2)}\ \mathrm{kW}` },
        ],
        answer: `COP_rev = ${fmt(copRev, 2)} · Q̇_G = ${fmt(QG, 1)} kW · İ_total = ${fmt(I, 2)} kW (η_II = ${fmt((copReal / copRev) * 100, 1)}%)`,
        check: `Como COP_real (${copReal}) < COP_rev (${fmt(copRev, 2)}), resulta Ṡ_ger > 0 e İ > 0.`,
      };
    },
  },

  /* 20. maq-ai-gas */
  {
    id: 'maq-ai-gas',
    title: 'Ciclo Brayton Real com Regeneração (Turbinas a Gás)',
    tag: 'Exemplo Dinâmico · Máq. Térmicas A.i',
    params: [
      { key: 'rp', label: 'Razão de pressão r_p', unit: '', min: 6, max: 14, step: 2, base: 10, choices: [6, 8, 10, 12, 14] },
      { key: 'T3', label: 'Temp. entrada turbina T₃', unit: 'K', min: 1100, max: 1500, step: 100, base: 1300, choices: [1100, 1200, 1300, 1400, 1500] },
      { key: 'eps', label: 'Efetividade regenerador ε', unit: '%', min: 0, max: 85, step: 15, base: 75, choices: [0, 60, 75, 85] },
    ],
    solve: ({ rp, T3, eps }) => {
      const k = 1.4, cp = 1.005, T1 = 300, etac = 0.85, etat = 0.88;
      const T2s = T1 * Math.pow(rp, (k - 1) / k);
      const T2 = T1 + (T2s - T1) / etac;
      const T4s = T3 / Math.pow(rp, (k - 1) / k);
      const T4 = T3 - etat * (T3 - T4s);
      const Tx = T4 > T2 ? T2 + (eps / 100) * (T4 - T2) : T2;
      const wc = cp * (T2 - T1), wt = cp * (T3 - T4), wNet = wt - wc, qIn = cp * (T3 - Tx);
      const eta = wNet / qIn;
      return {
        statement: `Ciclo Brayton com ar-padrão (T₁ = 300 K, η<sub>c</sub> = 85%, η<sub>t</sub> = 88%) opera com <b>r_p = ${rp}</b>, <b>T₃ = ${T3} K</b> e regenerador de efetividade <b>ε = ${eps}%</b>. Determine o trabalho líquido, BWR e rendimento térmico.`,
        steps: [
          { label: 'Compressor e turbina reais', tex: String.raw`T_2 = ${tnum(T2, 1)}\ \mathrm{K},\qquad T_4 = ${tnum(T4, 1)}\ \mathrm{K},\qquad w_{\text{líq}} = c_p[(T_3-T_4)-(T_2-T_1)] = ${tnum(wNet, 1)}\ \mathrm{kJ/kg}` },
          { label: 'Regenerador e calor adicionado na câmara de combustão', tex: String.raw`T_x = T_2 + \varepsilon(T_4-T_2) = ${tnum(Tx, 1)}\ \mathrm{K},\qquad q_{\text{in}} = c_p(T_3 - T_x) = ${tnum(qIn, 1)}\ \mathrm{kJ/kg}` },
          { label: 'Rendimento térmico e razão de trabalho reverso (BWR)', tex: String.raw`\eta = \frac{w_{\text{líq}}}{q_{\text{in}}} = ${tnum(eta * 100, 1)}\%,\qquad \mathrm{BWR} = \frac{w_c}{w_t} = ${tnum((wc / wt) * 100, 1)}\%` },
        ],
        answer: `w_líq = ${fmt(wNet, 1)} kJ/kg · η = ${fmt(eta * 100, 1)}% · BWR = ${fmt((wc / wt) * 100, 1)}%`,
        check: T4 > T2 ? `Regeneração possível porque T₄ (${fmt(T4, 0)} K) > T₂ (${fmt(T2, 0)} K).` : 'Atenção: T₄ ≤ T₂; regeneração desativada.',
      };
    },
  },

  /* 21. maq-aii-rankine */
  {
    id: 'maq-aii-rankine',
    title: 'Ciclo Rankine com Variações (Regenerativo com Aquecedor Aberto)',
    tag: 'Exemplo Dinâmico · Máq. Térmicas A.ii',
    params: [
      { key: 'pCald', label: 'Pressão caldeira P_cald', unit: 'bar', min: 40, max: 100, step: 20, base: 80, choices: [40, 60, 80, 100] },
      { key: 'pExt', label: 'Pressão extração (AAM)', unit: 'bar', min: 2, max: 10, step: 1, base: 5, choices: [2, 5, 10] },
    ],
    solve: ({ pCald, pExt }) => {
      const supMap: Record<number, { T: number; h: number; s: number }> = {
        40: { T: 440, h: 3307.1, s: 6.9041 },
        60: { T: 440, h: 3277.3, s: 6.6853 },
        80: { T: 480, h: 3348.4, s: 6.6586 },
        100: { T: 520, h: 3425.1, s: 6.6622 },
      };
      const st5 = supMap[pCald] || supMap[80];
      const cond = STEAM_SAT[1]; // 0.10 bar
      const ext = STEAM_SAT.find((r) => r.pBar === pExt) || STEAM_SAT[6];
      const x6 = clamp((st5.s - ext.sf) / (ext.sg - ext.sf), 0, 1.05);
      const h6 = x6 <= 1 ? ext.hf + x6 * ext.hfg : ext.hg + (x6 - 1) * 450;
      const x7 = (st5.s - cond.sf) / (cond.sg - cond.sf);
      const h7 = cond.hf + x7 * cond.hfg;
      const h2 = cond.hf + cond.vf * (pExt - 0.10) * 100;
      const h3 = ext.hf;
      const h4 = h3 + ext.vf * (pCald - pExt) * 100;
      const y = (h3 - h2) / (h6 - h2);
      const wt = (st5.h - h6) + (1 - y) * (h6 - h7);
      const wb = (1 - y) * (h2 - cond.hf) + (h4 - h3);
      const wNet = wt - wb;
      const qIn = st5.h - h4;
      const etaReg = wNet / qIn;
      const etaSimp = ((st5.h - h7) - cond.vf * (pCald - 0.10) * 100) / (st5.h - (cond.hf + cond.vf * (pCald - 0.10) * 100));
      return {
        statement: `Ciclo Rankine regenerativo ideal (1 aquecedor de mistura aberto a <b>${pExt} bar</b>) opera entre <b>${pCald} bar, ${st5.T} °C</b> e <b>0,10 bar</b>. Calcule a fração de vapor extraída <b>y</b> e o ganho de rendimento sobre o Rankine simples.`,
        steps: [
          { label: 'Balanço de energia no aquecedor aberto (AAM)', tex: String.raw`y\,h_6 + (1-y)\,h_2 = h_3 \;\Rightarrow\; y = \frac{${tnum(h3, 1)} - ${tnum(h2, 1)}}{${tnum(h6, 1)} - ${tnum(h2, 1)}} = ${tnum(y, 4)}` },
          { label: 'Trabalho líquido por kg na caldeira e calor adicionado', tex: String.raw`w_{\text{líq}} = (h_5-h_6) + (1-y)(h_6-h_7) - w_b = ${tnum(wNet, 1)}\ \mathrm{kJ/kg},\qquad q_{\text{in}} = h_5 - h_4 = ${tnum(qIn, 1)}\ \mathrm{kJ/kg}` },
          { label: 'Comparação com o ciclo Rankine simples', tex: String.raw`\eta_{\text{reg}} = ${tnum(etaReg * 100, 1)}\%\quad\text{vs}\quad \eta_{\text{simples}} = ${tnum(etaSimp * 100, 1)}\%` },
        ],
        answer: `Fração extraída y = ${fmt(y * 100, 1)}% · η_reg = ${fmt(etaReg * 100, 1)}% (ganho de +${fmt((etaReg - etaSimp) * 100, 1)} p.p.)`,
        check: `A regeneração eleva T_entrada na caldeira (${fmt(ext.T, 1)} °C vs 45,8 °C), aumentando a temperatura média de adição de calor.`,
      };
    },
  },

  /* 22. maq-aiii-cc */
  {
    id: 'maq-aiii-cc',
    title: 'Acoplamento Ciclo Combinado (HRSG) & Fator de Utilização CHP',
    tag: 'Exemplo Dinâmico · Máq. Térmicas A.iii',
    params: [
      { key: 'Wg', label: 'Potência turbina a gás Ẇ_G', unit: 'MW', min: 40, max: 160, step: 20, base: 80, choices: [40, 60, 80, 120, 160] },
      { key: 'etaG', label: 'Eficiência Brayton η_G', unit: '%', min: 30, max: 40, step: 2, base: 34, choices: [30, 32, 34, 36, 38] },
      { key: 'etaV', label: 'Eficiência fundo Rankine η_V', unit: '%', min: 28, max: 36, step: 2, base: 32, choices: [28, 30, 32, 36] },
    ],
    solve: ({ Wg, etaG, etaV }) => {
      const eG = etaG / 100, eV = etaV / 100;
      const Qcomb = Wg / eG;
      const Qexh = Qcomb - Wg;
      const Wv = eV * Qexh;
      const Wtot = Wg + Wv;
      const etaCC = Wtot / Qcomb;
      const checkFormula = eG + eV - eG * eV;
      return {
        statement: `Num ciclo combinado ideal sem queima suplementar, a turbina a gás entrega <b>${Wg} MW</b> com rendimento <b>η_G = ${etaG}%</b>. Os gases de exaustão alimentam integralmente uma caldeira de recuperação (HRSG) ligada a um ciclo Rankine de rendimento <b>η_V = ${etaV}%</b>.`,
        steps: [
          { label: 'Calor do combustível e energia térmica na exaustão da TG', tex: String.raw`\dot Q_{\text{comb}} = \frac{${Wg}}{${tnum(eG, 2)}} = ${tnum(Qcomb, 1)}\ \mathrm{MW},\qquad \dot Q_{\text{exaust}} = \dot Q_{\text{comb}} - \dot W_G = ${tnum(Qexh, 1)}\ \mathrm{MW}` },
          { label: 'Potência do ciclo a vapor e potência total da usina', tex: String.raw`\dot W_V = \eta_V\,\dot Q_{\text{exaust}} = ${tnum(eV, 2)}(${tnum(Qexh, 1)}) = ${tnum(Wv, 1)}\ \mathrm{MW},\qquad \dot W_{\text{total}} = ${tnum(Wtot, 1)}\ \mathrm{MW}` },
          { label: 'Verificação pela fórmula analítica acoplada', tex: String.raw`\eta_{CC} = \frac{\dot W_{\text{total}}}{\dot Q_{\text{comb}}} = ${tnum(etaCC * 100, 2)}\%\;\;=\;\; \eta_G + \eta_V - \eta_G\eta_V = ${tnum(checkFormula * 100, 2)}\%` },
        ],
        answer: `Ẇ_V = ${fmt(Wv, 1)} MW · Ẇ_total = ${fmt(Wtot, 1)} MW · η_CC = ${fmt(etaCC * 100, 1)}%`,
        check: `As duas vias (balanço de potência e fórmula acoplada η_G + η_V − η_G·η_V) dão o resultado idêntico ${fmt(etaCC * 100, 2)}%.`,
      };
    },
  },

  /* 23. maq-b-exergy */
  {
    id: 'maq-b-exergy',
    title: 'Análise Exergética em Cogeração (1ª Lei vs 2ª Lei)',
    tag: 'Exemplo Dinâmico · Máq. Térmicas B',
    params: [
      { key: 'W', label: 'Potência elétrica gerada Ẇ', unit: 'MW', min: 15, max: 60, step: 5, base: 30, choices: [15, 20, 30, 45, 60] },
      { key: 'Qp', label: 'Calor útil de processo Q̇_p', unit: 'MW', min: 30, max: 100, step: 10, base: 60, choices: [30, 45, 60, 80, 100] },
      { key: 'Tp', label: 'Temperatura do processo T_p', unit: '°C', min: 110, max: 230, step: 20, base: 150, choices: [110, 130, 150, 190, 230] },
    ],
    solve: ({ W, Qp, Tp }) => {
      const T0 = 298.15, Tpk = Tp + 273.15;
      const Qcomb = (W + Qp) / 0.82; // assume 82% first-law utilization factor
      const ExFuel = 1.04 * Qcomb;
      const util = (W + Qp) / Qcomb;
      const carnotF = 1 - T0 / Tpk;
      const ExQ = Qp * carnotF;
      const etaII = (W + ExQ) / ExFuel;
      const Ed = ExFuel - (W + ExQ);
      return {
        statement: `Uma planta de cogeração consome <b>${fmt(Qcomb, 1)} MW</b> térmicos de gás natural (exergia do combustível = 1,04·Q̇<sub>comb</sub>) para entregar <b>${W} MW</b> de eletricidade e <b>${Qp} MW</b> de vapor de processo a <b>${Tp} °C</b> (T₀ = 25 °C). Compare o Fator de Utilização (1ª Lei) e a Eficiência Exergética (2ª Lei).`,
        steps: [
          { label: 'Fator de utilização energética (1ª Lei)', tex: String.raw`\varepsilon_u = \frac{\dot W + \dot Q_p}{\dot Q_{\text{comb}}} = \frac{${W} + ${Qp}}{${tnum(Qcomb, 1)}} = ${tnum(util * 100, 1)}\%` },
          { label: 'Exergia associada ao calor de processo a T_p', tex: String.raw`\dot E_{Q,p} = \dot Q_p\left(1 - \frac{298{,}15}{${tnum(Tpk, 2)}}\right) = ${Qp}(${tnum(carnotF, 4)}) = ${tnum(ExQ, 2)}\ \mathrm{MW}` },
          { label: 'Eficiência exergética e exergia destruída/perdida', tex: String.raw`\eta_{II} = \frac{\dot W + \dot E_{Q,p}}{\dot E_{\text{comb}}} = \frac{${W} + ${tnum(ExQ, 2)}}{${tnum(ExFuel, 1)}} = ${tnum(etaII * 100, 1)}\%,\qquad \dot E_D + \dot E_L = ${tnum(Ed, 1)}\ \mathrm{MW}` },
        ],
        answer: `1ª Lei (ε_u) = ${fmt(util * 100, 1)}% · 2ª Lei (η_II) = ${fmt(etaII * 100, 1)}% · Ė_Q,processo = ${fmt(ExQ, 1)} MW`,
        check: `Elevar T_p aumenta o valor termodinâmico (exergia) do vapor entregue, aproximando η_II do rendimento de 1ª Lei.`,
      };
    },
  },
];

const DYN_MAP = new Map<string, DynExSpec>(DYN_SPECS.map((d) => [d.id, d]));
export const DYNAMIC_EX_IDS: readonly string[] = DYN_SPECS.map((d) => d.id);

export function hydrateDynamicExercises(scope: HTMLElement): void {
  scope.querySelectorAll<HTMLElement>('[data-dyn-ex]').forEach((host) => {
    const id = host.dataset.dynEx || '';
    const spec = DYN_MAP.get(id);
    if (!spec) {
      host.innerHTML = `<p class="dyn-missing">Exercício dinâmico "${id}" não encontrado.</p>`;
      return;
    }
    const vals: Record<string, number> = {};
    spec.params.forEach((p) => { vals[p.key] = p.base; });
    let shownSteps = 1;

    host.innerHTML = `
      <div class="dyn-split">
        <div class="dyn-left">
          <div class="dyn-head">
            <span class="dyn-badge mono">${spec.tag}</span>
            <h4>${spec.title}</h4>
          </div>
          <div class="dyn-actions">
            <button type="button" class="act solid dyn-rand">🎲 Gerar novos números</button>
            <button type="button" class="act dyn-reset">Base</button>
          </div>
          <div class="dyn-params">
            ${spec.params.map((p) => {
              const dec = p.step < 0.1 ? 2 : p.step < 1 ? 1 : 0;
              return `<label class="dyn-chip">
                <span>${p.label}</span>
                <input type="range" data-dyn-key="${p.key}" min="${p.min}" max="${p.max}" step="${p.step}" value="${p.base}" />
                <b data-dyn-val="${p.key}">${fmt(p.base, dec)}${p.unit ? ` ${p.unit}` : ''}</b>
              </label>`;
            }).join('')}
          </div>
          <p class="dyn-stmt"></p>
        </div>
        <div class="dyn-right handwritten-sheet taped">
          <div class="dyn-sol-head">
            <span class="dyn-sol-title">Resolução comentada à mão</span>
            <div class="dyn-step-bar">
              <button type="button" class="act dyn-step-next">+ Passo</button>
              <button type="button" class="act dyn-step-all">Tudo</button>
              <button type="button" class="act dyn-step-hide">Ocultar</button>
            </div>
          </div>
          <ol class="dyn-steps"></ol>
          <div class="dyn-ans"></div>
          <p class="dyn-check"></p>
        </div>
      </div>
    `;

    const stmtEl = host.querySelector<HTMLElement>('.dyn-stmt')!;
    const stepsEl = host.querySelector<HTMLElement>('.dyn-steps')!;
    const ansEl = host.querySelector<HTMLElement>('.dyn-ans')!;
    const checkEl = host.querySelector<HTMLElement>('.dyn-check')!;
    let totalSteps = 1;

    function renderSolution() {
      spec!.params.forEach((p) => {
        const dec = p.step < 0.1 ? 2 : p.step < 1 ? 1 : 0;
        const b = host.querySelector<HTMLElement>(`[data-dyn-val="${p.key}"]`);
        if (b) b.textContent = `${fmt(vals[p.key], dec)}${p.unit ? ` ${p.unit}` : ''}`;
        const inp = host.querySelector<HTMLInputElement>(`input[data-dyn-key="${p.key}"]`);
        if (inp) inp.value = String(vals[p.key]);
      });
      const sol = spec!.solve(vals);
      totalSteps = sol.steps.length;
      shownSteps = clamp(shownSteps, 0, totalSteps);
      stmtEl.innerHTML = sol.statement;
      stepsEl.innerHTML = sol.steps.slice(0, shownSteps).map((st) => `
        <li>
          <span class="dyn-st-lbl">${st.label}</span>
          <div class="eq">${texDisplay(st.tex)}</div>
          ${st.note ? `<p class="dyn-st-note">${st.note}</p>` : ''}
        </li>`).join('');
      const done = shownSteps >= totalSteps;
      ansEl.hidden = !done;
      checkEl.hidden = !done;
      if (done) {
        ansEl.innerHTML = `<strong>Resultado:</strong> ${sol.answer}`;
        checkEl.innerHTML = `<b>Verificação física:</b> ${sol.check}`;
      }
      void texInline;
    }

    host.querySelector('.dyn-rand')!.addEventListener('click', () => {
      spec.params.forEach((p) => {
        if (p.choices && p.choices.length > 1) {
          const other = p.choices.filter((c) => Math.abs(c - vals[p.key]) > 1e-6);
          vals[p.key] = other[Math.floor(Math.random() * other.length)];
        } else {
          const count = Math.max(1, Math.round((p.max - p.min) / p.step));
          vals[p.key] = Number((p.min + Math.floor(Math.random() * (count + 1)) * p.step).toFixed(4));
        }
      });
      shownSteps = totalSteps;
      renderSolution();
    });

    host.querySelector('.dyn-reset')!.addEventListener('click', () => {
      spec.params.forEach((p) => { vals[p.key] = p.base; });
      shownSteps = 1;
      renderSolution();
    });

    host.querySelector('.dyn-step-next')!.addEventListener('click', () => {
      shownSteps = Math.min(totalSteps, shownSteps + 1);
      renderSolution();
    });
    host.querySelector('.dyn-step-all')!.addEventListener('click', () => {
      shownSteps = totalSteps;
      renderSolution();
    });
    host.querySelector('.dyn-step-hide')!.addEventListener('click', () => {
      shownSteps = 0;
      renderSolution();
    });

    host.querySelectorAll<HTMLInputElement>('input[data-dyn-key]').forEach((inp) => {
      inp.addEventListener('input', () => {
        vals[inp.dataset.dynKey!] = inp.valueAsNumber;
        shownSteps = totalSteps;
        renderSolution();
      });
    });

    renderSolution();
  });
}
