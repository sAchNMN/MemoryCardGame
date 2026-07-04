/**
 * extract-layers.js — 精准按节标记提取 game.js 的各层
 * 用法: node extract-layers.js
 *
 * 分层策略（最简可行）：
 *   js/config.js  — 纯数据（LEVELS, ACHIEVEMENTS, SHOP_ITEMS, SYMBOLS）
 *   js/audio.js   — AudioManager + 视觉特效
 *   game.js         — 其余所有逻辑（引擎 + UI + 入口），首部 require() 分层文件
 *
 * 注意：微信小游戏支持 require()，但全局变量（state, ctx 等）需特殊处理。
 * 本脚本采用「concat 合并」策略：开发时分层，构建时合并为单个 game.js。
 */
const fs = require('fs');
const path = require('path');

const SRC = 'C:/Users/34759/MemoryCardGame-Pure/game.js';
const DST = 'C:/Users/34759/MemoryCardGame-Pure';
const lines = fs.readFileSync(SRC, 'utf8').split('\n');

// ── 工具：找数组/对象的结束行（根据 [ 或 { 匹配到对应的 ] 或 }） ──
function findArrayEnd(startLine) {
  // startLine: 包含 "var FOO = [" 的行号（0-based）
  let depth = 0;
  let inStr = false;
  let started = false;
  for (let i = startLine; i < lines.length; i++) {
    const line = lines[i];
    for (let j = 0; j < line.length; j++) {
      const c = line[j];
      if (inStr) { if (c === inStr) inStr = false; continue; }
      if (c === '"' || c === "'") { inStr = c; continue; }
      if (c === '[') { depth++; started = true; }
      if (c === ']') { depth--; if (started && depth === 0) return i; }
    }
    // 也支持对象
    if (!started) {
      for (let j = 0; j < line.length; j++) {
        const c = line[j];
        if (c === '{') { depth++; started = true; }
        if (c === '}') { depth--; if (started && depth === 0) return i; }
      }
    }
  }
  return lines.length - 1;
}

// ── 1. 提取数据数组 ─────────────────────────────────────────
const dataSections = [];
const dataNames = ['LEVELS', 'ACHIEVEMENTS', 'SHOP_ITEMS', 'SYMBOLS'];

for (const name of dataNames) {
  let startIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(new RegExp('^var\\s+' + name + '\\s*=\\s*(\\[|{)'))) {
      startIdx = i;
      break;
    }
  }
  if (startIdx === -1) { console.warn('⚠️  ' + name + ' not found!'); continue; }
  const endIdx = findArrayEnd(startIdx);
  dataSections.push({ name, start: startIdx, end: endIdx });
  console.log('📦 ' + name + ': lines ' + (startIdx + 1) + '-' + (endIdx + 1));
}

// 写 js/config.js
let configContent = '// js/config.js — 游戏配置数据（自动生成）\n';
configContent += '// 请勿手动编辑，请修改 game.js 后重新运行 extract-layers.js\n\n';
for (const sec of dataSections) {
  configContent += 'var ' + sec.name + ' = ';
  configContent += lines.slice(sec.start).join('\n').match(/^var\s+\w+\s*=\s*[\s\S]*?(\]|\})\s*;/)[0] || '';
  configContent += '\n\n';
}
// 简化：直接把原始行写进去
configContent = '// js/config.js — 游戏配置数据（自动生成）\n\n';
for (const sec of dataSections) {
  configContent += lines.slice(sec.start, sec.end + 1).join('\n') + '\n\n';
}
configContent += 'module.exports = { ' + dataNames.join(', ') + ' };\n';
fs.writeFileSync(path.join(DST, 'js/config.js'), configContent, 'utf8');
console.log('✅ js/config.js written (' + dataSections.length + ' sections)');

// ── 2. 提取 AudioManager + 视觉特效 ────────────────────────
// AudioManager IIFE: 从 "var AudioManager = (function()" 到 "})();"
let audioStart = -1, audioEnd = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].match(/^var\s+AudioManager\s*=\s*\(function\(\)/)) { audioStart = i; }
  if (audioStart >= 0 && lines[i].trim() === '})();') { audioEnd = i; break; }
}
if (audioStart < 0) { console.error('❌ AudioManager not found!'); process.exit(1); }

// 视觉特效：从 audioEnd+1 到 LEVELS 前一行
const levelsStart = dataSections.find(s => s.name === 'LEVELS').start;
const effectsStart = audioEnd + 1;
const effectsEnd = levelsStart - 1;

let audioContent = '// js/audio.js — 音频系统 + 视觉特效（自动生成）\n\n';
audioContent += lines.slice(audioStart, audioEnd + 1).join('\n') + '\n\n';
audioContent += '// ── 视觉特效系统 ──────────────────────────────────\n\n';
audioContent += lines.slice(effectsStart, effectsEnd + 1).join('\n') + '\n\n';
audioContent += 'module.exports = { AudioManager, bgParticles, initBgParticles, updateBgParticles, drawBgParticles };\n';
fs.writeFileSync(path.join(DST, 'js/audio.js'), audioContent, 'utf8');
console.log('✅ js/audio.js written (lines ' + (audioStart + 1) + '-' + (effectsEnd + 1) + ')');

// ── 3. 剩余代码：从 LEVELS 之后到文件末尾 ─────────────────
// 但要把数据数组和 AudioManager 的声明替换成 require()
// 策略：生成一个「合并后」的 game.js，开头用 require() 引入分层文件

let mainContent = '// game.js — 主入口（由 extract-layers.js 从分层文件合并生成）\n';
mainContent += '// 开发时请编辑 js/*.js，然后运行 node extract-layers.js 重新构建\n\n';
mainContent += "const { LEVELS, ACHIEVEMENTS, SHOP_ITEMS, SYMBOLS } = require('./js/config.js');\n";
mainContent += "const { AudioManager } = require('./js/audio.js');\n\n";
mainContent += '// ── 以下为自动合并的引擎 + UI + 入口代码 ──\n\n';

// 从 LEVELS 之前开始（即跳过已提取的部分）
// 已提取的部分：
//   - AudioManager + effects: audioStart..effectsEnd
//   - data arrays: each sec.start..sec.end
// 剩余部分：effectsEnd+1 .. audioStart-1（实际上 data arrays 在 effectsEnd 之后）
// 正确逻辑：把文件中「不在已提取范围内」的行保留

const extractedRanges = [];
extractedRanges.push([audioStart, audioEnd]);    // AudioManager
extractedRanges.push([effectsStart, effectsEnd]); // effects
for (const sec of dataSections) extractedRanges.push([sec.start, sec.end]);

// 合并重叠范围
extractedRanges.sort((a, b) => a[0] - b[0]);
const merged = [];
let cur = extractedRanges[0];
for (let i = 1; i < extractedRanges.length; i++) {
  if (extractedRanges[i][0] <= cur[1] + 1) { cur[1] = Math.max(cur[1], extractedRanges[i][1]); }
  else { merged.push(cur); cur = extractedRanges[i]; }
}
merged.push(cur);

console.log('📐 已提取范围:');
merged.forEach(r => console.log('  lines ' + (r[0] + 1) + '-' + (r[1] + 1)));

// 保留的行：不在任何已提取范围内的行
const keep = new Array(lines.length).fill(true);
for (const [s, e] of merged) { for (let i = s; i <= e; i++) keep[i] = false; }

let keptLines = 0;
for (let i = 0; i < lines.length; i++) {
  if (keep[i]) { mainContent += lines[i] + '\n'; keptLines++; }
}
console.log('✅ 保留行数: ' + keptLines + ' / ' + lines.length);

fs.writeFileSync(path.join(DST, 'game.refactored.js'), mainContent, 'utf8');
console.log('\n✅ game.refactored.js written — 请验证后替换 game.js');
console.log('\n⚠️  重要提醒：');
console.log('  1. 本脚本假设所有数据数组和 AudioManager 可以安全提取');
console.log('  2. 提取后剩余代码中的全局变量引用必须仍然有效');
console.log('  3. require() 在微信小游戏中可用，但需验证');
console.log('  4. 建议在微信开发者工具中测试 game.refactored.js');
