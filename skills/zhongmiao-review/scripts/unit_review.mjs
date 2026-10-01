#!/usr/bin/env node
/**
 * unit_review.mjs — 审 /tutor 题目单元（k12 unit JSON）的内容。零依赖，Node 18+。
 *
 * 子命令：
 *   dump  把单元打印成好读的文本：讲解（intro / demo / 每步 say|expr）+ 每道题（题干、规格、选项、答案、解析、错因）
 *   scan  只报“可指认”的结构问题，作为人工读题的定位线索：
 *           concept-gap   第 1 题用到的易混术语，讲解里一次都没出现（铁律 17 判据，同仓库 scan_db_concept_gap.mjs）
 *           demo-repeat   讲解示范用的式子 / 数字组合在某道题里原样出现（学生看完示范可直接照抄答案）
 *           dup-in-unit   同一单元里两道题规格相同（或题干+选项相同）
 *           dup-cross-tier 同一知识点不同档出现同一道题
 *           answer-mismatch 选项[answer] 与 trueDeg / trueValue / answerValue 不一致
 *
 * 来源可以是目录、文件，或某个 git 版本里的目录：
 *   node unit_review.mjs dump server/scripts/m024_regen_units/
 *   node unit_review.mjs scan server/scripts/m024_regen_units/ --base-ref <合并基点SHA> --repo .
 *   node unit_review.mjs scan new_dir/ --base old_dir/
 *   node unit_review.mjs dump server/scripts/ans/g7-math-x.basic.json --ref upstream/main --repo .
 *
 * 给了 --base / --base-ref 时，scan 会把每条命中标成「新增」或「原有」，并给出 main→PR 的数量对比：
 * 审核结论只写「新增」的和 PR 声称修了却还在的；「原有」的不算本 PR 引入（不要写成新问题）。
 *
 * ⚠ 输出是疑似清单，不是定罪：每一条都要打开原文读完讲解与题目再判。
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const TERM_GROUPS = [
  ['对顶角', '邻补角', '同位角', '内错角', '同旁内角'],
  ['SSS', 'SAS', 'ASA', 'AAS', 'HL'],
  ['圆心角', '圆周角'],
  ['平均数', '中位数', '众数', '方差', '极差'],
  ['串联', '并联'],
  ['平方根', '算术平方根', '立方根'],
  ['正弦', '余弦', '正切'],
  ['弧长', '扇形面积'],
];
const ALL_TERMS = TERM_GROUPS.flat().sort((a, b) => b.length - a.length);

function parseArgs(argv) {
  const out = { cmd: argv[0], paths: [], opts: {} };
  for (let i = 1; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const k = a.slice(2);
      const v = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
      out.opts[k] = v;
    } else out.paths.push(a);
  }
  return out;
}

function listFromDisk(p) {
  const st = fs.statSync(p);
  if (st.isDirectory()) {
    return fs.readdirSync(p).filter((f) => f.endsWith('.json')).sort()
      .map((f) => ({ name: f, text: fs.readFileSync(path.join(p, f), 'utf8') }));
  }
  return [{ name: path.basename(p), text: fs.readFileSync(p, 'utf8') }];
}

function listFromGit(repo, ref, p) {
  const git = (...args) => execFileSync('git', ['-C', repo, ...args],
    { encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] });
  const rel = p.replace(/\/$/, '');
  let files;
  try {
    files = git('ls-tree', '--name-only', `${ref}:${rel}`).trim().split('\n').filter(Boolean)
      .filter((f) => f.endsWith('.json')).map((f) => `${rel}/${f}`);
  } catch {
    files = [rel];
  }
  const out = [];
  for (const f of files) {
    try { out.push({ name: path.basename(f), text: git('show', `${ref}:${f}`) }); } catch { /* 该版本没有这个文件 */ }
  }
  return out;
}

function loadUnits(paths, { ref, repo }) {
  const units = [];
  for (const p of paths) {
    const raw = ref ? listFromGit(repo || '.', ref, p) : listFromDisk(p);
    for (const { name, text } of raw) {
      let u;
      try { u = JSON.parse(text); } catch { console.error(`跳过（不是 JSON）：${name}`); continue; }
      if (!u || !Array.isArray(u.questions)) continue;
      const kp = u.k12?.knowledgePointId || name.replace(/\.(basic|standard|challenge)?\.?json$/, '');
      const tier = u.k12?.difficultyTier || (name.match(/\.(basic|standard|challenge)\.json$/) || [])[1] || '?';
      units.push({ name, kp, tier, u });
    }
  }
  return units;
}

const str = (x) => (x == null ? '' : typeof x === 'string' ? x : JSON.stringify(x));
const demoOf = (u) => u?.fiveAct?.demo || {};
const demoText = (u) => { const d = demoOf(u); return [d.q, d.problem, d.prompt, d.title].filter(Boolean).join(' '); };
const stepText = (s) => (typeof s === 'string' ? s : [s?.say, s?.expr, s?.equals].filter((x) => x != null).join(' '));
const teachText = (u) => [str(u?.fiveAct?.intro), demoText(u), ...(demoOf(u).steps || []).map((s) => (typeof s === 'string' ? s : s?.say || ''))].join(' ');

/* 示范里“可抄”的记号：一次式（4x-20）、带角标的等式（∠1=40）、带等号的算式 */
function mathTokens(text) {
  const t = String(text).replace(/[−–]/g, '-').replace(/\s+/g, '').replace(/[（]/g, '(').replace(/[）]/g, ')');
  const toks = new Set();
  for (const m of t.matchAll(/\d*[a-z]\s*[+\-]\s*\d+|\d+[+\-]\d*[a-z]/gi)) toks.add(m[0].toLowerCase());
  for (const m of t.matchAll(/∠\w+=\d+(\.\d+)?/g)) toks.add(m[0]);
  for (const m of t.matchAll(/\d+(\.\d+)?[×*÷/+\-]\d+(\.\d+)?/g)) toks.add(m[0]);
  return toks;
}

function questionKey(q) {
  if (q?.trueValueSpec) return 'spec:' + JSON.stringify(q.trueValueSpec);
  return 'text:' + String(q?.q || '').replace(/\s+/g, '') + '|' + JSON.stringify(q?.options || []);
}

function expectedValue(q) {
  for (const k of ['trueDeg', 'trueValue', 'answerValue']) if (typeof q?.[k] === 'number') return q[k];
  return null;
}

function scanUnits(units) {
  const hits = [];
  // key 用于和对照版比对「新增 / 原有」：只放稳定的部分（不放讲解原文片段）
  const add = (check, unit, where, msg, core = msg) => hits.push({ check, kp: unit.kp, tier: unit.tier, where, msg,
    key: `${check}|${unit.kp}|${unit.tier}|${where}|${core}` });

  const byKp = new Map();
  for (const unit of units) {
    const { u } = unit;
    const qs = u.questions || [];
    // concept-gap
    const q1 = String(qs[0]?.q || '');
    const teach = teachText(u);
    const used = [];
    let rest = q1;
    for (const t of ALL_TERMS) if (rest.includes(t)) { used.push(t); rest = rest.split(t).join(' '); }
    const untaught = used.filter((t) => !teach.includes(t));
    if (untaught.length) add('concept-gap', unit, 'Q1', `第1题用「${untaught.join('、')}」，讲解没提（讲解：${demoText(u).slice(0, 40)}）`, untaught.join('、'));
    // demo-repeat
    const dTok = mathTokens(demoText(u) + ' ' + (demoOf(u).steps || []).map(stepText).join(' '));
    qs.forEach((q, i) => {
      const common = [...mathTokens(q?.q || '')].filter((t) => dTok.has(t));
      const sameSpec = demoOf(u).trueValueSpec && q?.trueValueSpec && JSON.stringify(demoOf(u).trueValueSpec) === JSON.stringify(q.trueValueSpec);
      if (common.length >= 2 || sameSpec) add('demo-repeat', unit, `Q${i + 1}`, `与讲解示范同式：${sameSpec ? '规格相同' : common.join('、')}`);
    });
    // dup-in-unit
    const seen = new Map();
    qs.forEach((q, i) => {
      const k = questionKey(q);
      if (seen.has(k)) add('dup-in-unit', unit, `Q${seen.get(k)}=Q${i + 1}`, `两题相同：${k.slice(0, 80)}`);
      else seen.set(k, i + 1);
    });
    // answer-mismatch
    qs.forEach((q, i) => {
      const exp = expectedValue(q);
      if (exp == null || !Array.isArray(q?.options) || typeof q?.answer !== 'number') return;
      const opt = Number(String(q.options[q.answer]).replace(/[°\s]/g, ''));
      if (Number.isFinite(opt) && Math.abs(opt - exp) > 1e-9) add('answer-mismatch', unit, `Q${i + 1}`, `选项[answer]=${q.options[q.answer]}，真值=${exp}`);
    });
    if (!byKp.has(unit.kp)) byKp.set(unit.kp, []);
    byKp.get(unit.kp).push(unit);
  }
  // dup-cross-tier
  const TIER_ORDER = { basic: 0, standard: 1, challenge: 2 };
  for (const [, list] of byKp) {
    list.sort((a, b) => (TIER_ORDER[a.tier] ?? 9) - (TIER_ORDER[b.tier] ?? 9));
    const first = new Map();
    for (const unit of list) {
      (unit.u.questions || []).forEach((q, i) => {
        const k = questionKey(q);
        const prev = first.get(k);
        if (prev && prev.tier !== unit.tier) add('dup-cross-tier', unit, `${prev.tier} Q${prev.i} = ${unit.tier} Q${i + 1}`, `${String(q?.q || '').slice(0, 40)} ｜ ${k.slice(0, 60)}`, k);
        else if (!prev) first.set(k, { tier: unit.tier, i: i + 1 });
      });
    }
  }
  return hits;
}

function dump(units) {
  for (const { kp, tier, name, u } of units) {
    console.log(`\n##### ${kp} · ${tier}  (${name})`);
    if (u.fiveAct?.intro) console.log(`INTRO: ${str(u.fiveAct.intro).slice(0, 200)}`);
    const d = demoOf(u);
    console.log(`DEMO: ${demoText(u)}`);
    (d.steps || []).forEach((s, i) => {
      if (typeof s === 'string') return console.log(`  d${i}: ${s}`);
      const eq = s.expr ? ` | ${s.expr}${s.equals != null && s.equals !== '' ? ' = ' + s.equals : ''}` : '';
      console.log(`  d${i}: ${s.say || ''}${eq}`);
    });
    (u.questions || []).forEach((q, i) => {
      const tags = [q.type, q.answerMode, q.isChallenge ? 'challenge' : null, q.difficultyRole, q.reasoningSteps].filter((x) => x != null).join('/');
      console.log(`Q${i + 1} [${tags}] ${q.q}`);
      const exp = expectedValue(q);
      if (q.trueValueSpec || exp != null) console.log(`   spec=${str(q.trueValueSpec)}${exp != null ? ' 真值=' + exp : ''}`);
      if (q.options) console.log(`   options=${str(q.options)} answer=${q.answer}`);
      if (q.explanation) console.log(`   解析=${str(q.explanation)}`);
      if (q.wrongWhy) console.log(`   错因=${str(q.wrongWhy)}`);
    });
  }
}

function report(hits, baseHits) {
  const checks = ['concept-gap', 'demo-repeat', 'dup-in-unit', 'dup-cross-tier', 'answer-mismatch'];
  const baseKeys = baseHits ? new Set(baseHits.map((h) => h.key)) : null;
  for (const c of checks) {
    const list = hits.filter((h) => h.check === c);
    const baseN = baseHits ? baseHits.filter((h) => h.check === c).length : null;
    console.log(`\n== ${c}: ${list.length}${baseHits ? `（对照版 ${baseN}）` : ''}`);
    for (const h of list) {
      const tag = baseKeys ? (baseKeys.has(h.key) ? '[原有] ' : '[新增] ') : '';
      console.log(`  ${tag}${h.kp}.${h.tier} ${h.where}: ${h.msg}`);
    }
  }
  console.log('\n⚠ 以上是定位线索：逐条打开原文读完讲解和题目再下结论；[原有] 的不要写成本 PR 引入。');
}

const { cmd, paths, opts } = parseArgs(process.argv.slice(2));
if (!['dump', 'scan'].includes(cmd) || !paths.length) {
  console.log(fs.readFileSync(new URL(import.meta.url), 'utf8').split('*/')[0]);
  process.exit(2);
}
const units = loadUnits(paths, { ref: opts.ref, repo: opts.repo });
if (!units.length) { console.error('没读到任何单元（需要含 questions 数组的 JSON）'); process.exit(1); }
if (cmd === 'dump') dump(units);
else {
  let base = null;
  if (opts.base) base = loadUnits([opts.base], {});
  else if (opts['base-ref']) base = loadUnits(paths, { ref: opts['base-ref'], repo: opts.repo || '.' });
  console.log(`读取 ${units.length} 个单元${base ? `；对照版 ${base.length} 个` : ''}`);
  report(scanUnits(units), base ? scanUnits(base) : null);
}
