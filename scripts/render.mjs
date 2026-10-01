import {bundle} from '@remotion/bundler';
import {openBrowser, selectComposition, renderStill, renderMedia} from '@remotion/renderer';
import {mkdir, writeFile, copyFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';

await mkdir('out/frames', {recursive: true});
const browserExecutable = resolve('node_modules/.remotion/chrome-headless-shell/win64/chrome-headless-shell-win64/chrome-headless-shell.exe');
const browser = await openBrowser('chrome', {browserExecutable});
const audits = [];
try {
  const serveUrl = await bundle({entryPoint: resolve('src/index.tsx')});
  const composition = await selectComposition({serveUrl, id: 'RetryProof', puppeteerInstance: browser});
  const frames = [0, 90, 181, 240, 420, 511, 630, 751, 960, 1100, 1171, 1320, 1471, 1570, 1650, 1740, 1799];
  for (const frame of frames) {
    let audit;
    await renderStill({serveUrl, composition: {...composition, props: {audit: true}}, frame, output: resolve(`out/frames/${String(frame).padStart(4, '0')}.png`), imageFormat: 'png', inputProps: {audit: true}, puppeteerInstance: browser, onBrowserLog: log => {
      if (log.text.startsWith('BOUNDS_QA ')) audit = JSON.parse(log.text.slice(10));
    }});
    assert(audit, `Missing bounds audit at frame ${frame}`);
    audits.push(audit);
    console.log(`Frame ${frame}: ${audit.passed ? 'PASS' : 'FAIL'} (${audit.results.length} text elements)`);
  }
  await writeFile('evidence/text-bounds.json', JSON.stringify(audits, null, 2));
  assert(audits.every(a => a.passed), 'Text bounds failure; inspect evidence/text-bounds.json');
  await copyFile('out/frames/1320.png', 'out/preview.png');
  if (process.argv.includes('--stills-only')) process.exitCode = 0;
  else {
    let last = -1;
    await renderMedia({serveUrl, composition, puppeteerInstance: browser, outputLocation: resolve('out/retry-proof.mp4'), codec: 'h264', crf: 18, pixelFormat: 'yuv420p', imageFormat: 'png', muted: true, enforceAudioTrack: false, concurrency: 2, onProgress: ({renderedFrames}) => {
      const step = Math.floor(renderedFrames / 300);
      if (step > last) {last = step; console.log(`Rendered ${renderedFrames}/1800 frames`);}
    }});
    console.log('Rendered out/retry-proof.mp4');
  }
} finally {await browser.close({silent: true});}
