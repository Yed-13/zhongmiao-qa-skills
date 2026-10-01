/*
 * 本地 QA 挂载入口模板：在真实课件组件上加载指定单元，不登录、不连后端。
 * 用法：复制为 frontend/local-qa/main.jsx，改下面「配置」三处，然后用 vite.qa.config.js 起服务。
 *
 *   /local-qa/index.html                 首页：列出每个单元和每道题的入口
 *   /local-qa/index.html?u=2&q=3         第 3 个单元，从第 4 题开始（只是把题目轮转到前面，内容不变）
 *   /local-qa/index.html?u=2&q=3&single  只保留这一道题
 *   /local-qa/index.html?u=2&keep        不清本机存档（默认每次清掉，避免续玩状态把上次的相位带进来）
 *   /local-qa/index.html?u=2&render=2d   强制走无 WebGL 的 2D 降级（index.html 里的开关）
 *
 * 这里看到的是「组件 + 这份数据」的表现，不代表正式站当前题库、登录、进度、接口或缓存。
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

/* ── 配置 ① 要测的世界组件：从 src 引真组件，不要复制一份 ── */
import World from '../src/components/tutor/worlds/LaserRelay';

/* ── 配置 ② 单元数据：数组，每项 { kp, tier, source, unit }（做法见 references/local-qa.md） ── */
import cases from './units.json';

/* 全局样式必须引：舞台尺寸和相机取景依赖它，缺了量出来的数据是错的 */
import '../src/index.css';
import '../src/mobile-overrides.css';
import './style.css';

/* ── 配置 ③ 世界需要的额外 props（例：StarHarbor 用 { runtimeMode: 'trial' }），和缺省年级 ── */
const WORLD_PROPS = {};
const DEFAULT_GRADE = 'g7';

const home = '/local-qa/index.html';
const params = new URLSearchParams(location.search);
const u = params.get('u');
const q = Number(params.get('q') || 0);
if (!params.has('keep')) {
  try { localStorage.clear(); sessionStorage.clear(); } catch { /* 隐私模式下可能抛错，忽略 */ }
}

function Home() {
  return (
    <main className="qa-panel">
      <h1>本地 QA</h1>
      <p>真实课件组件 + 本地单元数据；不登录、不连后端，不代表正式站当前题库。</p>
      {cases.map((c, i) => (
        <section key={i}>
          <h2>{c.kp || c.unit?.k12?.knowledgePointId} · {c.tier || c.unit?.k12?.difficultyTier}</h2>
          {c.source && <p>来源：{c.source}</p>}
          <div className="qa-links">
            {(c.unit?.questions || []).map((_, k) => (
              <a key={k} href={`${home}?u=${i}&q=${k}`}>Q{k + 1}</a>
            ))}
            <a href={`${home}?u=${i}&render=2d`}>2D 降级</a>
          </div>
        </section>
      ))}
    </main>
  );
}

function Lesson() {
  const c = cases[Number(u)];
  if (!c) return <Home />;
  const unit = structuredClone(c.unit);
  const qs = unit.questions || [];
  if (qs.length && q > 0 && q < qs.length) {
    unit.questions = params.has('single') ? [qs[q]] : [...qs.slice(q), ...qs.slice(0, q)];
  } else if (params.has('single') && qs.length) {
    unit.questions = [qs[0]];
  }
  unit._k12Meta = {
    knowledgePointId: c.kp || unit.k12?.knowledgePointId,
    knowledgePointTitle: c.title || c.kp || unit.k12?.knowledgePointId,
    grade: unit.k12?.grade || DEFAULT_GRADE,
    subject: unit.k12?.subject || 'math',
    tier: c.tier || unit.k12?.difficultyTier,
    onReturnToTierSelect: () => location.assign(home),
  };
  return (
    <>
      <World unit={unit} {...WORLD_PROPS} />
      <a className="qa-return" href={home}>返回 QA · {u}/{q + 1}</a>
    </>
  );
}

createRoot(document.getElementById('root')).render(
  <BrowserRouter>{u != null ? <Lesson /> : <Home />}</BrowserRouter>,
);
