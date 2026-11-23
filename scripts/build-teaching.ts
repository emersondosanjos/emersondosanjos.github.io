/*
 * Builds the ENCRYPTED teaching bundle locally:  npm run teaching
 *   reads   src/teaching/{thermo,calor,maquinas}/*.ts   (lesson sources — kept OUT of git)
 *   reads   .teaching-users                             ("user:password" per line — kept OUT of git) or env TEACHING_USERS
 *   writes  public/teaching/vault.json + public/teaching/data/<id>.json  (ciphertext only — committed)
 * AES-256-GCM content key, wrapped per user with PBKDF2-SHA256(user:password).
 */
import { createCipheriv, createHash, pbkdf2Sync, randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { finalizeSlides, H } from '../src/teaching/kit.ts';
import type { CourseId, Lesson } from '../src/teaching/kit.ts';
import { CYCLE_SIM_IDS, DYNAMIC_EX_IDS } from '../src/teaching/interactive.ts';

interface CourseDef {
  id: CourseId;
  dir: string;
  badge: string;
  title: string;
  subtitle: string;
  description: string;
}

const ROOT = new URL('..', import.meta.url).pathname;
const OUT = join(ROOT, 'public/teaching');
const ITER = 200_000;

const COURSES: CourseDef[] = [
  {
    id: 'thermo',
    dir: join(ROOT, 'src/teaching/thermo'),
    badge: 'Curso 01',
    title: 'Termodinâmica Clássica',
    subtitle: 'Graduação & Pós-Graduação · Engenharia Mecânica',
    description:
      'Conceitos básicos, temperatura e relações P–V–T, 1ª e 2ª Leis, substância simples, entropia, ciclo de Carnot, disponibilidade, exergia e relações termodinâmicas.',
  },
  {
    id: 'calor',
    dir: join(ROOT, 'src/teaching/calor'),
    badge: 'Curso 02',
    title: 'Tecnologia do Calor',
    subtitle: 'Processos Reativos, Psicrometria & Refrigeração',
    description:
      'Misturas de gases ideais, combustão e conservação de massa, entalpia de formação, poder calorífico, temperatura adiabática de chama, psicrometria, refrigeração por compressão e absorção de vapor.',
  },
  {
    id: 'maquinas',
    dir: join(ROOT, 'src/teaching/maquinas'),
    badge: 'Curso 03',
    title: 'Máquinas Térmicas',
    subtitle: 'Ciclos de Potência a Gás, a Vapor & Disponibilidade',
    description:
      'Ciclos Otto, Diesel, Stirling e Brayton com variações; ciclos Rankine simples e com variações; ciclos combinados, cogeração e disponibilidade em máquinas térmicas.',
  },
];

const rawUsers =
  process.env.TEACHING_USERS ??
  (existsSync(join(ROOT, '.teaching-users')) ? readFileSync(join(ROOT, '.teaching-users'), 'utf8') : '');
const users = rawUsers
  .split(/[\n,]/)
  .map((s) => s.trim())
  .filter((s) => s && !s.startsWith('#') && s.includes(':'))
  .map((s) => {
    const i = s.indexOf(':');
    return { u: s.slice(0, i).toLowerCase(), p: s.slice(i + 1) };
  });
if (!users.length) {
  console.error('No users: create .teaching-users with "user:password" lines (or set TEACHING_USERS).');
  process.exit(1);
}

const validSimIds = new Set<string>(CYCLE_SIM_IDS);
const validDynIds = new Set<string>(DYNAMIC_EX_IDS);

function assertKnownInteractiveIds(lessonId: string, html: string): void {
  for (const match of html.matchAll(/data-cycle-sim="([^"]+)"/g)) {
    if (!validSimIds.has(match[1])) {
      console.error(`Error in ${lessonId}: unknown cycleSim id "${match[1]}"`);
      process.exit(1);
    }
  }
  for (const match of html.matchAll(/data-dyn-ex="([^"]+)"/g)) {
    if (!validDynIds.has(match[1])) {
      console.error(`Error in ${lessonId}: unknown dynExercise id "${match[1]}"`);
      process.exit(1);
    }
  }
}

const key = randomBytes(32);
const b64 = (b: Buffer) => b.toString('base64');
function seal(k: Buffer, data: Buffer) {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', k, iv);
  return { iv: b64(iv), ct: b64(Buffer.concat([c.update(data), c.final(), c.getAuthTag()])) };
}
const sealJSON = (o: unknown) => seal(key, Buffer.from(JSON.stringify(o), 'utf8'));

const keyring: Record<string, unknown> = {};
for (const { u, p } of users) {
  const salt = randomBytes(16);
  const id = createHash('sha256').update(u).digest('hex').slice(0, 16);
  keyring[id] = { salt: b64(salt), ...seal(pbkdf2Sync(`${u}:${p}`, salt, ITER, 32, 'sha256'), key) };
}

interface LessonPayload {
  id: string;
  courseId: CourseId;
  courseTitle: string;
  code: string;
  num: number;
  title: string;
  summary: string;
  slides: string[];
  handout: string;
  disserteHtml: string;
  hasDisserte: boolean;
  hasInteractive: boolean;
}

const catalog: unknown[] = [];
const payloads: LessonPayload[] = [];
const seenIds = new Set<string>();
const courseStats: string[] = [];

for (const course of COURSES) {
  const lessons: Lesson[] = [];
  if (existsSync(course.dir)) {
    const files = readdirSync(course.dir)
      .filter((x) => x.endsWith('.ts'))
      .sort();
    for (const f of files) {
      const mod = (await import(pathToFileURL(join(course.dir, f)).href)) as { lesson?: Lesson };
      if (mod.lesson) lessons.push(mod.lesson);
    }
  }
  lessons.sort((a, b) => a.num - b.num);

  let upgradedCount = 0;
  const catalogLessons = lessons.map((l) => {
    if (seenIds.has(l.id)) {
      console.error(`Duplicate lesson id "${l.id}" in course "${course.id}"`);
      process.exit(1);
    }
    seenIds.add(l.id);

    const courseId = l.courseId ?? course.id;
    const slides = finalizeSlides(course.title, l.code, l.num, l.slides);
    const combinedHtml = `${slides.join('\n')}\n${l.handout}`;
    assertKnownInteractiveIds(l.id, combinedHtml);

    const disserteHtml = l.disserte ? H.renderDisserte(l.disserte, l.id) : '';
    const hasDisserte = Boolean(l.disserte);
    const hasInteractive = /data-cycle-sim|data-dyn-ex/.test(slides.join(''));
    if (hasDisserte && hasInteractive) upgradedCount++;

    payloads.push({
      id: l.id,
      courseId,
      courseTitle: course.title,
      code: l.code,
      num: l.num,
      title: l.title,
      summary: l.summary,
      slides,
      handout: l.handout,
      disserteHtml,
      hasDisserte,
      hasInteractive,
    });

    return {
      id: l.id,
      courseId,
      code: l.code,
      num: l.num,
      title: l.title,
      summary: l.summary,
      topics: l.topics,
      slides: slides.length,
      hasDisserte,
      hasInteractive,
    };
  });

  catalog.push({
    id: course.id,
    badge: course.badge,
    title: course.title,
    subtitle: course.subtitle,
    description: course.description,
    lessons: catalogLessons,
  });

  courseStats.push(`${course.id}: ${lessons.length}${lessons.length ? ` (${upgradedCount} full)` : ''}`);
}

const strict = process.argv.includes('--strict');
if (strict) {
  const missingDisserte = payloads.filter((p) => !p.hasDisserte).map((p) => p.id);
  if (payloads.length < 23 || missingDisserte.length > 0) {
    console.error(
      `Strict validation failed: ${payloads.length}/23 lessons, missing disserte: ${missingDisserte.join(', ') || 'none'}`,
    );
    process.exit(1);
  }
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(join(OUT, 'data'), { recursive: true });
writeFileSync(join(OUT, 'vault.json'), JSON.stringify({ iter: ITER, keyring, catalog: sealJSON(catalog) }));
for (const p of payloads) {
  writeFileSync(join(OUT, 'data', `${p.id}.json`), JSON.stringify(sealJSON(p)));
}

console.log(`teaching bundle: ${payloads.length} lessons (${courseStats.join(', ')}), ${users.length} user(s) → public/teaching/`);
