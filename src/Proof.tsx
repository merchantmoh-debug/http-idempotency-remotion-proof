import React, {useEffect, useState} from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate, Easing, delayRender, continueRender, useCurrentScale} from 'remotion';
import evidence from '../evidence/execution.json';
import {CaptionBar} from './CaptionBar';

const C = {bg: '#0b1727', ink: '#f0f2ec', dim: '#acbbc9', mint: '#83efc1', red: '#ffab85', panel: '#14263a'};
const mono = 'Consolas, monospace';
const T: React.FC<{children: React.ReactNode; style?: React.CSSProperties; name?: string}> = ({children, style, name}) => <div data-qa={name || 'text'} style={style}>{children}</div>;
const Panel: React.FC<{children: React.ReactNode; style?: React.CSSProperties}> = ({children, style}) => <div data-panel style={{background: 'linear-gradient(135deg, #182e43, #112236)', border: '1px solid #344b61', borderRadius: 22, padding: 34, ...style}}>{children}</div>;
const Tag: React.FC<{children: React.ReactNode; color?: string}> = ({children, color = C.mint}) => <T style={{fontSize: 25, letterSpacing: 3, fontWeight: 700, color, marginBottom: 26}}>{children}</T>;
const CodeLine: React.FC<{children: React.ReactNode; color?: string}> = ({children, color = C.ink}) => <T style={{fontFamily: mono, fontSize: 34, lineHeight: 1.55, whiteSpace: 'pre', color}}>{children}</T>;
const Metric: React.FC<{n: number; label: string; color: string}> = ({n, label, color}) => <div style={{display: 'flex', alignItems: 'baseline', gap: 24}}><T style={{fontSize: 150, fontWeight: 700, color, letterSpacing: -8, lineHeight: 1.12}}>{n}</T><T style={{fontSize: 36, color: C.dim}}>{label}</T></div>;
const times = [0, 6, 17, 25, 39, 49, 55];
const titles = ['The retry that created two orders.', 'The response is lost. The order is not.', 'A retry becomes a second operation.', 'One operation. One key.', 'Same key. Original order.', 'Protect the key from misuse.', 'A tutorial you can verify.'];
const labels = ['THE PROBLEM', '01 / REPRODUCE', '02 / OBSERVE', '03 / FIX', '04 / CHECK', '05 / GUARD', 'RESULT / REUSABLE PROOF'];

export const Proof: React.FC<{audit?: boolean}> = ({audit = false}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const scale = useCurrentScale();
  const [handle] = useState(() => audit ? delayRender('Text bounds audit') : null);
  const sec = frame / fps;
  const scene = times.reduce((a, t, i) => sec >= t ? i : a, 0);
  const local = frame - times[scene] * fps;
  // The final five seconds are a static, readable hold.
  const enter = scene === 6 ? 1 : spring({frame: local, fps, config: {damping: 200}, durationInFrames: 18});
  const {unsafe, safe} = evidence.scenarios;

  useEffect(() => {
    if (!audit || handle === null) return;
    const origin = document.querySelector('[data-canvas]')!.getBoundingClientRect();
    const results = [...document.querySelectorAll('[data-qa]')].map(el => {
      const range = document.createRange(); range.selectNodeContents(el);
      const box = range.getBoundingClientRect();
      const r = {left: (box.left - origin.left) / scale, top: (box.top - origin.top) / scale, right: (box.right - origin.left) / scale, bottom: (box.bottom - origin.top) / scale};
      const node = el as HTMLElement;
      const panel = el.closest('[data-panel]')?.getBoundingClientRect();
      const insidePanel = !panel || (box.left >= panel.left + 16 * scale && box.right <= panel.right - 16 * scale && box.top >= panel.top + 16 * scale && box.bottom <= panel.bottom - 16 * scale);
      return {label: el.getAttribute('data-qa'), text: el.textContent, ...r, fontSize: Number.parseFloat(getComputedStyle(el).fontSize), insidePanel, passed: r.left >= 64 && r.right <= 1856 && r.top >= 42 && r.bottom <= 1038 && node.scrollWidth <= node.clientWidth + 1 && insidePanel};
    });
    console.log('BOUNDS_QA ' + JSON.stringify({frame, scene, results, passed: results.every(r => r.passed)}));
    continueRender(handle);
  }, [audit, handle, frame, scene, scale]);

  const content = () => {
    if (scene === 0) return <div style={{display: 'flex', gap: 42}}>
      <Panel style={{width: 850, height: 430}}><Tag color={C.red}>WITHOUT IDEMPOTENCY</Tag><Metric n={unsafe.storedOrders} label="stored orders" color={C.red}/><T style={{fontSize: 36, marginTop: 36, color: C.dim}}>One intended purchase. One risky retry.</T></Panel>
      <Panel style={{width: 850, height: 430}}><Tag>WITH IDEMPOTENCY</Tag><Metric n={safe.storedOrders} label="stored order" color={C.mint}/><T style={{fontSize: 36, marginTop: 36, color: C.dim}}>A stable key makes the retry safe.</T></Panel>
    </div>;
    if (scene === 1) return <div style={{display: 'flex', gap: 42}}>
      <Panel style={{width: 1050, height: 485}}><Tag color={C.red}>ACTUAL CLIENT OUTPUT</Tag><CodeLine>POST /orders</CodeLine><CodeLine>{JSON.stringify(evidence.payload)}</CodeLine><div style={{height: 36}}/><CodeLine color={C.red}>{`${unsafe.first.type}: ${unsafe.first.error}`}</CodeLine><T style={{fontSize: 32, color: C.dim, marginTop: 44}}>Fault injected after the server commits.</T></Panel>
      <Panel style={{width: 650, height: 485}}><Tag>SERVER STATE</Tag><T style={{fontSize: 32, color: C.dim}}>The first request already stored</T><T style={{fontFamily: mono, fontSize: 62, marginTop: 24}}>ord_001</T><div style={{height: 28}}/><Metric n={unsafe.first.storedOrders} label="order" color={C.mint}/></Panel>
    </div>;
    if (scene === 2) return <div style={{display: 'flex', gap: 42}}>
      <Panel style={{width: 1050, height: 485}}><Tag color={C.red}>RECORDED RETRY / NO KEY</Tag><CodeLine color={C.red}>{`HTTP ${unsafe.retry.status} Created`}</CodeLine><div style={{height: 30}}/><CodeLine>{`id:       "${unsafe.retry.body.id}"`}</CodeLine><CodeLine>{`replayed: ${unsafe.retry.body.replayed}`}</CodeLine><T style={{fontSize: 32, color: C.dim, marginTop: 44}}>The server cannot connect this call to the first.</T></Panel>
      <Panel style={{width: 650, height: 485}}><Tag color={C.red}>DUPLICATE OBSERVED</Tag><Metric n={unsafe.storedOrders} label="orders" color={C.red}/><CodeLine>ord_001</CodeLine><CodeLine color={C.red}>ord_002 ← retry</CodeLine></Panel>
    </div>;
    if (scene === 3) return <div style={{display: 'flex', gap: 42}}>
      <Panel style={{width: 1150, height: 535, padding: '26px 32px'}}><Tag>RUNNABLE SDK / sdk.mjs</Tag><div>{evidence.snippet.split('\n').map((line, i) => <T key={i} name="code-line" style={{fontFamily: mono, fontSize: 30, lineHeight: 1.28, whiteSpace: 'pre', color: line.includes('Idempotency-Key') ? C.mint : C.ink, background: line.includes('Idempotency-Key') ? '#23483f' : undefined}}>{line || ' '}</T>)}</div></Panel>
      <div style={{width: 550, paddingTop: 12}}><Tag>KEEP THE KEY</Tag><T style={{fontFamily: mono, fontSize: 37, color: C.mint, marginBottom: 44}}>{evidence.key}</T>{['First attempt → same key','Retry → same key','Server → stored result'].map((x, i) => <T key={x} style={{fontSize: 32, color: i === 2 ? C.mint : C.ink, marginBottom: 36, opacity: spring({frame: local - i * 3, fps, config: {damping: 200}})}}>{x}</T>)}<T style={{fontSize: 28, lineHeight: 1.5, color: C.dim}}>A header only works when the server implements the guarantee.</T></div>
    </div>;
    if (scene === 4) return <div style={{display: 'flex', gap: 42}}>
      <Panel style={{width: 1050, height: 485}}><Tag>RECORDED RETRY / SAME KEY</Tag><CodeLine color={C.mint}>{`HTTP ${safe.retry.status} OK`}</CodeLine><div style={{height: 30}}/><CodeLine>{`id:       "${safe.retry.body.id}"`}</CodeLine><CodeLine color={C.mint}>{`replayed: ${safe.retry.body.replayed}`}</CodeLine><T style={{fontSize: 32, color: C.dim, marginTop: 44}}>Same payload. Same key. Same order identity.</T></Panel>
      <Panel style={{width: 650, height: 485}}><Tag>ASSERTED SERVER STATE</Tag><Metric n={safe.storedOrders} label="order" color={C.mint}/><T style={{fontSize: 38, color: C.mint, marginTop: 40}}>{evidence.summary}</T><T style={{fontSize: 28, color: C.dim, marginTop: 24}}>Clean run × 2 · identical evidence</T></Panel>
    </div>;
    if (scene === 5) return <Panel style={{height: 485}}><Tag color={C.red}>RECORDED SAFETY CHECK</Tag><div style={{display: 'flex', gap: 80}}><div style={{width: 980}}><CodeLine>same key + quantity: 2</CodeLine><div style={{height: 28}}/><CodeLine color={C.red}>{`HTTP ${safe.conflict.status} Conflict`}</CodeLine><CodeLine>{safe.conflict.body.error}</CodeLine></div><div><Metric n={safe.conflict.storedOrders} label="order" color={C.mint}/><T style={{fontSize: 32, color: C.dim, marginTop: 32}}>Stored state stays unchanged.</T></div></div></Panel>;
    return <div><div style={{display: 'flex', gap: 42}}><Panel style={{width: 1050, height: 390}}><Tag>REPRODUCE IT LOCALLY</Tag><CodeLine>node example/run.mjs</CodeLine><CodeLine>node scripts/verify-clean.mjs</CodeLine><T style={{fontSize: 30, color: C.dim, marginTop: 38}}>Source → executed evidence → this video</T></Panel><Panel style={{width: 650, height: 390}}><Tag>CHECKED OUTCOME</Tag><T style={{fontSize: 52, fontWeight: 700, color: C.mint}}>{evidence.summary}</T><T style={{fontSize: 30, lineHeight: 1.5, color: C.dim, marginTop: 28}}>Real local HTTP.<br/>Original synthetic data.<br/>No external service.</T></Panel></div><T style={{fontSize: 27, color: C.dim, marginTop: 30}}>Teaching scope: sequential retries · in-memory server · production needs atomic, durable key storage.</T></div>;
  };

  return <AbsoluteFill data-canvas style={{width: 1920, height: 1080, background: 'radial-gradient(ellipse at 78% 18%, #20394a 0%, #0b1727 64%)', color: C.ink, fontFamily: 'Arial, sans-serif'}}>
    <div style={{position: 'absolute', top: 54, left: 80, right: 80, display: 'flex', justifyContent: 'space-between'}}><T style={{fontSize: 25, letterSpacing: 4, color: C.mint}}>MO / DEVELOPER WORKFLOW PROOF</T><T style={{fontSize: 24, letterSpacing: 2, color: C.dim}}>LOCAL HTTP · SILENT / CAPTIONED</T></div>
    <div style={{position: 'absolute', top: 138, left: 80, right: 80}}><Tag color={scene < 3 ? C.red : C.mint}>{labels[scene]}</Tag><T style={{fontSize: 74, fontWeight: 700, letterSpacing: -2.5, lineHeight: 1.12}}>{titles[scene]}</T></div>
    <div style={{position: 'absolute', top: 328, left: 80, right: 80, opacity: enter, transform: `translateY(${interpolate(enter, [0, 1], [18, 0], {easing: Easing.out(Easing.cubic)})}px)`}}>{content()}</div>
    <CaptionBar/>
    <div style={{position: 'absolute', bottom: 44, left: 80, right: 80, display: 'flex', justifyContent: 'space-between'}}><T style={{fontSize: 20, color: C.dim}}>RETRY SAFELY / IDEMPOTENCY</T><T style={{fontSize: 20, color: C.dim}}>{scene === 6 ? 'VERIFIED · END' : `${String(scene + 1).padStart(2, '0')} / 07`}</T></div>
    <div style={{position: 'absolute', top: 0, height: 4, width: `${scene === 6 ? 100 : (frame + 1) / 1800 * 100}%`, background: C.mint}}/>
  </AbsoluteFill>;
};
