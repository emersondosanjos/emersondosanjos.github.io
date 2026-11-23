/*
 * Guardião do padrão da área de ensino e do site (rode antes de publicar):
 *   node --experimental-strip-types --no-warnings scripts/check-teaching.ts [--strict] [arquivo.ts ...]
 * Verifica:
 *   A. Site: arquivos protegidos intactos em relação ao último commit e larguras-padrão do TeachingView.
 *   B. Aulas (src/teaching/{thermo,calor,maquinas}/*.ts, ou os arquivos passados): estrutura do molde ouro,
 *      regras de escrita e de forma (sem "Prof.", sem travessão em prosa, subscritos reais em SVG, sem caixas
 *      clássicas de IA, passos sem numeração duplicada, KaTeX nos textos), IDs de simulador/exercício válidos.
 *   C. Pacote publicado: nenhum texto plano das aulas em public/teaching/.
 * Sai com código 1 se houver erro. Avisos não bloqueiam (use --strict para que bloqueiem).
 */
import { execSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = new URL('..', import.meta.url).pathname;
const args = process.argv.slice(2);
const STRICT = args.includes('--strict');
const only = args.filter((a) => !a.startsWith('--'));
const errors: string[] = [];
const warns: string[] = [];
const err = (m: string) => errors.push(m);
const warn = (m: string) => warns.push(m);

/* ---------- A. guardas do site ---------- */
const PROTECTED = ['src/layouts/Base.astro', 'src/styles/global.css', 'src/components/PageHead.astro', 'src/lib/i18n.ts', 'scripts/check-article-design.mjs'];
for (const f of PROTECTED) {
  if (!existsSync(join(ROOT, f))) continue;
  try {
    const diff = execSync(`git diff --stat HEAD -- "${f}"`, { cwd: ROOT, encoding: 'utf8' }).trim();
    if (diff) err(`Site: arquivo protegido alterado (${f}). Reverta ou peça autorização explícita.`);
  } catch {
    warn('Site: git indisponível para checar arquivos protegidos.');
    break;
  }
}
const tv = existsSync(join(ROOT, 'src/views/TeachingView.astro')) ? readFileSync(join(ROOT, 'src/views/TeachingView.astro'), 'utf8') : '';
if (tv) {
  if (!/\.presentation-grid[^}]*max-width:\s*1240px/s.test(tv)) err('TeachingView: .presentation-grid deve manter max-width 1240px fora da tela cheia.');
  if (!/\.lesson[^}]*max-width:\s*920px/s.test(tv)) warn('TeachingView: .lesson deveria manter max-width 920px.');
  const bl = [...tv.matchAll(/border-left\s*:/g)].length;
  if (bl) err(`TeachingView: ${bl} ocorrência(s) de border-left (caixa clássica de IA é proibida).`);
  if (!/\.handout :global\(p\)[^{]*\{[^}]*text-align:\s*justify/s.test(tv)) err('TeachingView: a apostila deve ter texto justificado.');
}

/* ---------- B. aulas ---------- */
const COURSE_DIRS = ['thermo', 'calor', 'maquinas'].map((c) => join(ROOT, 'src/teaching', c));
const files = only.length
  ? only.map((f) => (f.startsWith('/') ? f : join(ROOT, f)))
  : COURSE_DIRS.filter(existsSync).flatMap((d) => readdirSync(d).filter((x) => x.endsWith('.ts')).map((x) => join(d, x)));

let interactive: { CYCLE_SIM_IDS: readonly string[]; DYNAMIC_EX_IDS: readonly string[] } | null = null;
try {
  interactive = await import(pathToFileURL(join(ROOT, 'src/teaching/interactive.ts')).href);
} catch {
  warn('Não foi possível importar interactive.ts para validar IDs.');
}

const stripTags = (h: string) => h.replace(/<span class="katex[\s\S]*?<\/span>⁠?/g, ' ').replace(/<svg[\s\S]*?<\/svg>/g, ' ').replace(/<[^>]+>/g, ' ');
const seen = new Map<string, string>();

for (const file of files) {
  const rel = file.replace(ROOT, '');
  const src = readFileSync(file, 'utf8');
  let L: any;
  try {
    L = (await import(pathToFileURL(file).href)).lesson;
  } catch (e) {
    err(`${rel}: não importa (${(e as Error).message.split('\n')[0]})`);
    continue;
  }
  if (!L) { err(`${rel}: não exporta "lesson".`); continue; }
  const tag = `${rel} [${L.id}]`;
  if (seen.has(L.id)) err(`${tag}: id duplicado com ${seen.get(L.id)}.`);
  seen.set(L.id, rel);

  // legado (versões antigas ainda não reescritas) só gera aviso
  const legacy = !L.disserte;
  const report = legacy ? warn : err;
  if (legacy) warn(`${tag}: ainda no formato antigo (sem Disserte).`);

  // estrutura do molde ouro
  if (!legacy) {
    if (L.slides.length !== 26) warn(`${tag}: ${L.slides.length} slides (molde ouro tem 26).`);
    if (!/class="slide cover"/.test(L.slides[0] ?? '')) err(`${tag}: slide 1 deve ser a capa (cover()).`);
    if (!L.slides.some((s: string) => s.includes('data-cycle-sim'))) err(`${tag}: falta simulador (cycleSim) nos slides.`);
    if (!L.slides.some((s: string) => s.includes('data-dyn-ex'))) err(`${tag}: falta exercício dinâmico (dynExercise) nos slides.`);
    for (const piece of ['l-workbook-head', 'formula-sheet', 'l-ex', 'write-box', 'l-ref']) if (!L.handout.includes(piece)) err(`${tag}: apostila sem "${piece}".`);
    const nEx = (L.handout.match(/<div class="ex">/g) || []).length;
    if (nEx < 4) warn(`${tag}: apostila com ${nEx} exemplos resolvidos (mínimo 4).`);
    const nWb = (L.handout.match(/data-write-id=/g) || []).length;
    if (nWb < 3) warn(`${tag}: apostila com ${nWb} cadernos (writeBox), mínimo 3.`);
    const d = L.disserte;
    if (!d.modelAnswer || d.modelAnswer.paragraphs.length < 5) err(`${tag}: Disserte sem resposta-modelo R1–R5.`);
    if (!d.rubric?.length || !d.pitfalls?.length) err(`${tag}: Disserte sem rubrica ou armadilhas.`);
  }

  // regras de escrita e forma
  const all = [...L.slides, L.handout, JSON.stringify(L.disserte ?? {})].join('\n');
  if (/Prof\./.test(all)) report(`${tag}: contém "Prof.".`);
  const prose = stripTags(all);
  const dash = prose.match(/[^\n]{0,30}\s—\s[^\n]{0,30}/);
  if (dash) report(`${tag}: travessão em prosa: "…${dash[0].trim()}…"`);
  const svgTexts = [...all.matchAll(/<text\b[^>]*>([\s\S]*?)<\/text>/g)].map((m) => m[1].replace(/<[^>]+>/g, ''));
  const under = svgTexts.find((t) => /[A-Za-zΔṁẆQ̇]_[A-Za-z0-9{]/.test(t));
  if (under) report(`${tag}: subscrito com sublinhado em SVG ("${under.trim().slice(0, 40)}"); use <tspan> (helper sb).`);
  if (/style="[^"]*border-left/i.test(all)) report(`${tag}: estilo inline com border-left (caixa de IA).`);
  if (/<li class="frag"><p><strong>\d+\.\s/.test(all)) report(`${tag}: passo de steps() com número digitado (a lista já numera).`);
  if (/<p><\/p>/.test(all)) warn(`${tag}: parágrafo vazio <p></p>.`);
  const ids = [...all.matchAll(/data-cycle-sim="([^"]+)"/g)].map((m) => m[1]);
  const dyn = [...all.matchAll(/data-dyn-ex="([^"]+)"/g)].map((m) => m[1]);
  if (interactive) {
    for (const i of ids) if (!interactive.CYCLE_SIM_IDS.includes(i)) err(`${tag}: simulador inexistente "${i}".`);
    for (const i of dyn) if (!interactive.DYNAMIC_EX_IDS.includes(i)) err(`${tag}: exercício inexistente "${i}".`);
  }
  const markerIds = [...src.matchAll(/<marker id="([^"$]+)"/g)].map((m) => m[1]);
  const dupM = markerIds.find((x, i) => markerIds.indexOf(x) !== i);
  if (dupM) warn(`${tag}: marker id repetido no código-fonte ("${dupM}").`);
  // parênteses na prosa visível (fora de KaTeX)
  let bal = 0;
  for (const ch of prose) { if (ch === '(') bal++; else if (ch === ')') bal--; if (bal < 0) break; }
  if (bal !== 0) warn(`${tag}: parênteses desbalanceados na prosa (saldo ${bal}).`);
}

/* ---------- C. vazamento em texto plano ---------- */
const pub = join(ROOT, 'public/teaching');
if (existsSync(pub)) {
  const probes = ['Primeira Lei', 'Entropia', 'Disserte', 'apostila', 'Exemplo Resolvido', 'Emerson Barbosa'];
  const walk = (d: string): string[] => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]));
  for (const f of walk(pub)) {
    const t = readFileSync(f, 'utf8');
    const hit = probes.find((p) => t.includes(p));
    if (hit) err(`Vazamento: "${hit}" em texto plano em ${f.replace(ROOT, '')}.`);
  }
}

/* ---------- saída ---------- */
for (const w of warns) console.log(`aviso  ${w}`);
for (const e of errors) console.log(`ERRO   ${e}`);
console.log(`\ncheck-teaching: ${files.length} aula(s), ${errors.length} erro(s), ${warns.length} aviso(s).`);
if (errors.length || (STRICT && warns.length)) process.exit(1);
