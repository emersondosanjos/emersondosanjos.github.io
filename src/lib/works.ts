import data from '../data/works.json';
import type { Lang } from './i18n';

export type Status = 'published' | 'under-review' | 'in-preparation';
export type PublicStatus = Exclude<Status, 'under-review'> | 'confidential';
export type LineId = 'reforming' | 'droplets' | 'desalination' | 'electrolysis' | 'recovery';
export type Kind = 'journal' | 'conference' | 'chapter' | 'thesis' | 'tool';

export interface Work {
  year: number;
  line: LineId;
  type: Kind;
  status: Status;
  confidential?: boolean;
  title: string;
  venue: string;
  authors?: string;
  doi?: string;
  github?: string;
  zenodo?: string;
  series?: string;
}

export interface LineEntry {
  id: LineId;
  name: string;
  name_pt?: string;
  span: string;
  summary: string;
  summary_pt?: string;
  gallery?: GalleryImage[];
}

/* Real photographs and CAD renders only: never generated imagery. */
export interface GalleryImage {
  src: string;
  src_pt?: string;
  alt: string;
  alt_pt?: string;
  caption?: string;
  caption_pt?: string;
  wide?: boolean;
  /** name of the related entry in `projects`, shown in the image viewer */
  project?: string;
  /** bibliographic reference of the figure */
  ref?: string;
  doi?: string;
  /** numbered callouts drawn on the image (1-based) */
  legend?: string[];
  legend_pt?: string[];
  /** balloon centres in % of the image, same order as `legend` */
  hotspots?: { x: number; y: number }[];
}

export interface ToolEntry {
  confidential?: boolean;
  year: number;
  line: LineId;
  name: string;
  name_pt?: string;
  note: string;
  note_pt?: string;
}

export interface ProjectEntry {
  span: string;
  name: string;
  name_pt?: string;
  role: string;
  role_pt?: string;
  org: string;
  org_pt?: string;
  line: LineId;
  trl?: number[];
  trl_note?: string;
  trl_note_pt?: string;
  trl_confirmed?: boolean;
  sponsor?: string;
  industry?: boolean;
  confidential?: boolean;
  /** contract / grant number, only when confirmed */
  code?: string;
  image?: string;
  image_alt?: string;
  image_alt_pt?: string;
  image_caption?: string;
  image_caption_pt?: string;
}

export interface AwardEntry {
  year: number;
  name: string;
  name_pt?: string;
}

export interface EducationEntry {
  span: string;
  degree: string;
  degree_pt?: string;
  org: string;
  note: string;
  note_pt?: string;
}

/* Each research line owns one Balmer line of hydrogen (wavelength in nm). */
export const SERIES: Record<LineId, { symbol: string; nm: number; label: string; label_pt: string }> = {
  desalination: { symbol: 'Hε', nm: 397.0, label: 'Desalination', label_pt: 'Dessalinização' },
  reforming: { symbol: 'Hδ', nm: 410.2, label: 'Reforming reactors', label_pt: 'Reatores de reforma' },
  droplets: { symbol: 'Hγ', nm: 434.0, label: 'Droplets & solidification', label_pt: 'Gotas e solidificação' },
  electrolysis: { symbol: 'Hβ', nm: 486.1, label: 'Membraneless electrolysis', label_pt: 'Eletrólise sem membrana' },
  recovery: { symbol: 'Hα', nm: 656.3, label: 'H₂ recovery & digital twins', label_pt: 'Recuperação de H₂ & VR' },
};
export const SERIES_ORDER: LineId[] = ['desalination', 'reforming', 'droplets', 'electrolysis', 'recovery'];

export const lines = data.lines as LineEntry[];
export const tools = data.tools as ToolEntry[];
export const works = (data.works as Work[]).slice().sort((a, b) => a.year - b.year);
export const projects = data.projects as ProjectEntry[];
export const awards = data.awards as AwardEntry[];
export const education = data.education as EducationEntry[];
export const reviewer = data.reviewer as string[];
export const links = data.links;
export const emails = (data.links.emails ?? [data.links.email]) as string[];

export function workFigure(work: Work): GalleryImage | undefined {
  if (work.status !== 'published' || !work.doi) return;
  return lines.find((line) => line.id === work.line)?.gallery?.find((image) => image.doi === work.doi);
}

export function publicStatus(work: Work): PublicStatus {
  if (work.status === 'published') return 'published';
  return work.confidential || work.status === 'under-review' ? 'confidential' : 'in-preparation';
}

export const STATUS_LABEL: Record<PublicStatus, string> = {
  published: 'Published',
  confidential: 'Confidential',
  'in-preparation': 'In preparation',
};

export const STATUS_LABEL_PT: Record<PublicStatus, string> = {
  published: 'Publicado',
  confidential: 'Em sigilo',
  'in-preparation': 'Em preparação',
};

export const TYPE_LABEL: Record<Kind, string> = {
  journal: 'Journal article',
  conference: 'Conference paper',
  chapter: 'Book chapter',
  thesis: 'Thesis',
  tool: 'Software & tools',
};

export const TYPE_LABEL_PT: Record<Kind, string> = {
  journal: 'Artigo em periódico',
  conference: 'Artigo em congresso',
  chapter: 'Capítulo de livro',
  thesis: 'Tese / Dissertação',
  tool: 'Software & ferramentas',
};

export const seriesLabel = (id: LineId, lang: Lang = 'en') =>
  lang === 'pt' ? SERIES[id].label_pt : SERIES[id].label;

export const statusLabel = (status: PublicStatus, lang: Lang = 'en') =>
  lang === 'pt' ? STATUS_LABEL_PT[status] : STATUS_LABEL[status];

export const typeLabel = (kind: Kind, lang: Lang = 'en') =>
  lang === 'pt' ? TYPE_LABEL_PT[kind] : TYPE_LABEL[kind];

export const doiUrl = (doi?: string) => (doi ? `https://doi.org/${doi}` : undefined);

/* Plate geometry: the year axis and the wavelength ruler share one width. */
export const YEAR_MIN = 2016;
export const YEAR_MAX = 2027;
export const NM_MIN = 390;
export const NM_MAX = 662;
export const yearToPct = (y: number) => ((y - YEAR_MIN) / (YEAR_MAX - YEAR_MIN)) * 100;
export const nmToPct = (nm: number) => ((nm - NM_MIN) / (NM_MAX - NM_MIN)) * 100;
export const pctToNm = (pct: number) => NM_MIN + (pct / 100) * (NM_MAX - NM_MIN);

export type Placed = Work & { pct: number; pctW: number; nm: number; id: string };

/* Narrow screens: each year's width grows with its number of entries, so dense years stay legible. */
function yearWeights() {
  const n = new Map<number, number>();
  for (const w of works) n.set(w.year, (n.get(w.year) ?? 0) + 1);
  for (const t of tools) n.set(t.year, (n.get(t.year) ?? 0) + 1);
  const ys = Array.from({ length: YEAR_MAX - YEAR_MIN }, (_, i) => YEAR_MIN + i);
  const wts = ys.map((y) => 0.6 + (n.get(y) ?? 0));
  const total = wts.reduce((a, b) => a + b, 0);
  return { ys, wts, total };
}
export function yearToPctW(t: number) {
  const { ys, wts, total } = yearWeights();
  let acc = 0;
  for (let i = 0; i < ys.length; i++) {
    if (t < ys[i] + 1 || i === ys.length - 1) return ((acc + Math.min(1, Math.max(0, t - ys[i])) * wts[i]) / total) * 100;
    acc += wts[i];
  }
  return 100;
}

/* Papers and tools as emission lines; the works of one year spread across its band. */
export function placedWorks(lang: Lang = 'en'): Placed[] {
  const all: Work[] = [
    ...works,
    ...tools.map<Work>((t) => ({
      year: t.year,
      line: t.line,
      type: 'tool' as Kind,
      status: t.confidential ? 'under-review' : 'published',
      title: lang === 'pt' && t.name_pt ? t.name_pt : t.name,
      venue: t.confidential ? statusLabel('confidential', lang) : lang === 'pt' && t.note_pt ? t.note_pt : t.note,
    })),
  ];
  const byYear = new Map<number, Work[]>();
  for (const w of all) byYear.set(w.year, [...(byYear.get(w.year) ?? []), w]);
  const out: Placed[] = [];
  for (const [year, list] of byYear) {
    list.forEach((w, i) => {
      const t = year + (i + 0.5) / list.length;
      const pct = yearToPct(t);
      out.push({ ...w, pct, pctW: yearToPctW(t), nm: pctToNm(pct), id: `w-${year}-${i}` });
    });
  }
  return out.sort((a, b) => a.pct - b.pct);
}

export const worksOf = (line: LineId) => works.filter((w) => w.line === line);

export const bibtex = (w: Work, key: string) =>
  `@article{${key},\n  author  = {${(w.authors ?? '').replace(/, /g, ' and ')}},\n  title   = {${w.title}},\n  journal = {${w.venue}},\n  year    = {${w.year}},\n  doi     = {${w.doi ?? ''}}\n}`;

/* Publisher / society mark shown next to each venue (journal-specific marks are rarely free to reuse). */
const VENUE_LOGOS: [RegExp, string, string][] = [
  [/International Journal of Hydrogen Energy/i, 'elsevier', 'Elsevier'],
  [/Philosophical Transactions/i, 'royal-society', 'The Royal Society'],
  [/Journal of Engineering Mathematics|Brazilian Society of Mechanical|Springer/i, 'springer-nature', 'Springer Nature'],
  [/IEEE/i, 'ieee', 'IEEE'],
  [/Chemical Engineering Transactions/i, 'aidic', 'AIDIC'],
  [/COBEM|ENCIT|ABCM/i, 'abcm', 'ABCM'],
  [/CONV-22|Convective Heat and Mass/i, 'ichmt', 'ICHMT'],
  [/COPPE|UFRJ/i, 'ufrj', 'COPPE/UFRJ'],
  [/Revista de Engenharia e Pesquisa Aplicada/i, 'upe', 'Universidade de Pernambuco'],
];
export function venueLogo(venue: string): { src: string; name: string } | null {
  const hit = VENUE_LOGOS.find(([re]) => re.test(venue));
  return hit ? { src: `/images/logos/${hit[1]}.png`, name: hit[2] } : null;
}

/* Logo for any work: the venue's publisher mark, otherwise the lab where the work was done
   (LabPAM for the hydrogen-recovery pilot plant line, LabMEMS for the rest). */
export function workLogo(w: { venue: string; line: LineId }): { src: string; name: string } {
  return venueLogo(w.venue)
    ?? (w.line === 'recovery'
      ? { src: '/images/logos/labpam.png', name: 'LabPAM · COPPE/UFRJ' }
      : { src: '/images/logos/labmems.png', name: 'LabMEMS · COPPE/UFRJ' });
}
