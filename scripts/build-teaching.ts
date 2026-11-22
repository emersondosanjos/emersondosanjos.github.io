/*
 * Builds the ENCRYPTED teaching bundle locally:  npm run teaching
 *   reads   src/teaching/thermo/*.ts   (lesson sources — kept OUT of git)
 *   reads   .teaching-users            ("user:password" per line — kept OUT of git) or env TEACHING_USERS
 *   writes  public/teaching/vault.json + public/teaching/data/<id>.json  (ciphertext only — committed)
 * AES-256-GCM content key, wrapped per user with PBKDF2-SHA256(user:password).
 */
import { createCipheriv, createHash, pbkdf2Sync, randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = new URL('..', import.meta.url).pathname;
const SRC = join(ROOT, 'src/teaching/thermo');
const OUT = join(ROOT, 'public/teaching');
const ITER = 200_000;

const rawUsers = process.env.TEACHING_USERS
  ?? (existsSync(join(ROOT, '.teaching-users')) ? readFileSync(join(ROOT, '.teaching-users'), 'utf8') : '');
const users = rawUsers.split(/[\n,]/).map((s) => s.trim()).filter((s) => s && !s.startsWith('#') && s.includes(':'))
  .map((s) => { const i = s.indexOf(':'); return { u: s.slice(0, i).toLowerCase(), p: s.slice(i + 1) }; });
if (!users.length) { console.error('No users: create .teaching-users with "user:password" lines (or set TEACHING_USERS).'); process.exit(1); }

const key = randomBytes(32);
const b64 = (b: Buffer) => b.toString('base64');
function seal(k: Buffer, data: Buffer) {
  const iv = randomBytes(12); const c = createCipheriv('aes-256-gcm', k, iv);
  return { iv: b64(iv), ct: b64(Buffer.concat([c.update(data), c.final(), c.getAuthTag()])) };
}
const sealJSON = (o: unknown) => seal(key, Buffer.from(JSON.stringify(o), 'utf8'));

const lessons: any[] = [];
for (const f of readdirSync(SRC).filter((x) => x.endsWith('.ts')).sort()) {
  const { lesson } = await import(pathToFileURL(join(SRC, f)).href);
  if (lesson) lessons.push(lesson);
}
lessons.sort((a, b) => a.num - b.num);

const keyring: Record<string, unknown> = {};
for (const { u, p } of users) {
  const salt = randomBytes(16);
  const id = createHash('sha256').update(u).digest('hex').slice(0, 16);
  keyring[id] = { salt: b64(salt), ...seal(pbkdf2Sync(`${u}:${p}`, salt, ITER, 32, 'sha256'), key) };
}
const catalog = [{
  id: 'thermo', title: 'Termodinâmica', subtitle: 'Pós-graduação · PEM/COPPE/UFRJ',
  lessons: lessons.map((l) => ({ id: l.id, code: l.code, num: l.num, title: l.title, summary: l.summary, topics: l.topics, slides: l.slides.length })),
}];

rmSync(OUT, { recursive: true, force: true });
mkdirSync(join(OUT, 'data'), { recursive: true });
writeFileSync(join(OUT, 'vault.json'), JSON.stringify({ iter: ITER, keyring, catalog: sealJSON(catalog) }));
for (const l of lessons) {
  writeFileSync(join(OUT, 'data', `${l.id}.json`), JSON.stringify(sealJSON({ id: l.id, title: l.title, num: l.num, slides: l.slides, handout: l.handout })));
}
console.log(`teaching bundle: ${lessons.length} lessons, ${users.length} user(s) → public/teaching/`);
