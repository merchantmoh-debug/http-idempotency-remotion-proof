import {spawnSync} from 'node:child_process';
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const bin = resolve('node_modules/@remotion/compositor-win32-x64-msvc');
const video = resolve('out/retry-proof.mp4');
const probe = spawnSync(resolve(bin, 'ffprobe.exe'), ['-v', 'error', '-count_frames', '-show_streams', '-show_format', '-of', 'json', video], {encoding: 'utf8', timeout: 120000});
assert.equal(probe.status, 0, probe.stderr);
const metadata = JSON.parse(probe.stdout);
await writeFile('evidence/ffprobe.json', JSON.stringify(metadata, null, 2));
const streams = metadata.streams;
const v = streams.find(s => s.codec_type === 'video');
assert.equal(streams.length, 1);
assert.equal(v.width, 1920); assert.equal(v.height, 1080);
assert.equal(v.avg_frame_rate, '30/1'); assert.equal(Number(v.nb_read_frames), 1800);
assert.equal(Number(metadata.format.duration), 60);
assert.equal(v.codec_name, 'h264'); assert.equal(v.pix_fmt, 'yuv420p');
const decode = spawnSync(resolve(bin, 'ffmpeg.exe'), ['-v', 'error', '-i', video, '-c:v', 'rawvideo', '-f', 'null', '-'], {encoding: 'utf8', timeout: 120000});
assert.equal(decode.status, 0, decode.stderr); assert.equal(decode.stderr.trim(), '');
const hash = async p => createHash('sha256').update(await readFile(p)).digest('hex');
assert.equal(await hash('out/frames/1650.png'), await hash('out/frames/1799.png'));
await mkdir('out/encoded-frames', {recursive: true});
const sampleSeconds = [3, 8, 21, 32, 44, 52, 59.966667];
for (const time of sampleSeconds) {
  const extract = spawnSync(resolve(bin, 'ffmpeg.exe'), ['-v', 'error', '-ss', String(time), '-i', video, '-frames:v', '1', '-y', `out/encoded-frames/${time}.png`], {encoding: 'utf8', timeout: 15000});
  assert.equal(extract.status, 0, extract.stderr);
}
const textBounds = JSON.parse(await readFile('evidence/text-bounds.json'));
assert(textBounds.every(a => a.passed));
const result = {
  passed: true, video: 'out/retry-proof.mp4', durationSeconds: 60, frames: 1800, fps: 30,
  width: 1920, height: 1080, codec: 'h264', pixelFormat: 'yuv420p', audioStreams: 0,
  fullVideoDecode: 'PASS: no decoder errors',
  textBounds: `${textBounds.length} representative frames pass screen and panel bounds`,
  finalHold: '55–60 seconds; rendered PNG at 55s and final frame are byte-identical',
  encodedFramesExtractedSeconds: sampleSeconds,
  audioReview: 'Not performed: intentional silent version has no audio stream',
  sha256: await hash(video),
};
await writeFile('evidence/media-qa.json', JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
