/**
 * refactor-v2.js — 精准拆分 game.js（v2， brace-aware）
 * 用法: node refactor-v2.js
 */
const fs = require('fs');
const path = require('path');

const SRC = 'C:/Users/34759/MemoryCardGame-Pure/game.js';
const DST = 'C:/Users/34759/MemoryCardGame-Pure';
const code = fs.readFileSync(SRC, 'utf8');
const lines = code.split('\n');

// ── 工具：找匹配的右花括号 ───────────────────────────────────
// 从指定行开始，跟踪 { } 深度，返回匹配 depth=0 的行号（1-based）
function findClosingBrace(startLine) {
  let depth = 0;
  let started = false;
  for (let i = startLine; i < lines.length; i++) {
    const line = lines[i];
    for (let j = 0; j < line.length; j++) {
      if (line[j] === '{') { depth++; started = true; }
      if (line[j] === '}') { depth--; }
    }
    if (started && depth === 0) return i + 1;
  }
  return lines.length;
}

// ── 工具：提取函数名 ─────────────────────────────────────────
function getFunctionName(lineText) {
  const m = lineText.match(/^function\s+(\w+)/);
  return m ? m[1] : null;
}

// ── 1. 找所有顶层函数/变量的行号 ───────────────────────────
const topLevel = [];
// 特殊处理：AudioManager IIFE
let inAudioMgr = false;
for (let i = 0; i < lines.length; i++) {
  const t = lines[i].trim();
  // AudioManager IIFE 开始
  if (t.startsWith('var AudioManager')) { inAudioMgr = true; topLevel.push({ line: i + 1, type: 'audio', name: 'AudioManager' }); continue; }
  // 跳过 AudioManager 内部
  if (inAudioMgr) { if (t === '})();') { inAudioMgr = false; } continue; }
  // 顶层 var/const
  if (t.match(/^var\s+\w+\s*=\s*\[/) || t.match(/^var\s+\w+\s*=\s*\{/)) {
    const name = (t.match(/^var\s+(\w+)/) || [])[1];
    if (name && !inAudioMgr) topLevel.push({ line: i + 1, type: 'data', name });
    continue;
  }
  // 顶层 function
  if (t.match(/^function\s+\w+/) && !inAudioMgr) {
    const name = getFunctionName(t);
    // 分类
    let type = 'other';
    if (name && name.startsWith('render')) type = 'ui';
    else if (['createBoard','startLevel','resetTimedBoard','startTimer','cleanupGame','checkAchievementsAfterGame',
                'purchaseItem','loadPurchasedItems','isItemPurchased','getCardBackColor',
                'saveCoins','loadCoins','saveShopState','loadShopState','saveProgress','loadProgress',
                'saveStars','loadStars','saveAchievement','loadAchievement','saveAchievementStats','loadAchievementStats',
                'checkDailyStreak','loadDailyStreak','saveDailyStreak'].includes(name)) type = 'engine';
    else if (['S','sz','drawButton','drawRoundRect','shuffle','tapFeedback'].includes(name)) type = 'util';
    else if (['initCanvas','handleTap','render'].includes(name)) type = 'entry';
    topLevel.push({ line: i + 1, type, name });
  }
}
// 找 AudioManager 结束
for (let i = 0; i < lines.length; i++) {
  if (lines[i].trim() === '})();') { 
    // 找到 AudioManager 的结束，更新 topLevel 中 AudioManager 的 endLine
    for (let t of topLevel) if (t.name === 'AudioManager') t.endLine = i + 1;
    break; 
  }
}

// 填充每个条目的结束行号
for (let i = 0; i < topLevel.length; i++) {
  if (topLevel[i].endLine) continue;
  const start = topLevel[i].line;
  // 用 brace matching 找函数/对象的结束
  const firstLine = lines[start - 1];
  if (firstLine.trim().startsWith('function') || firstLine.trim().match(/^var\s+\w+\s*=\s*function/)) {
    topLevel[i].endLine = findClosingBrace(start - 1);
  } else if (firstLine.trim().match(/^var\s+\w+\s*=\s*\[/)) {
    // 数组：找匹配的 ]
    let depth = 0; let inStr = false;
    for (let j = start - 1; j < lines.length; j++) {
      const line = lines[j];
      for (let k = 0; k < line.length; k++) {
        if (line[k] === '"' || line[k] === "'") inStr = !inStr;
        if (!inStr) {
          if (line[k] === '[') depth++;
          if (line[k] === ']') { depth--; if (depth === 0) { topLevel[i].endLine = j + 1; break; } }
        }
      }
      if (topLevel[i].endLine) break;
    }
  } else if (firstLine.trim().match(/^var\s+\w+\s*=\s*\{/)) {
    topLevel[i].endLine = findClosingBrace(start - 1);
  }
  if (!topLevel[i].endLine) topLevel[i].endLine = (topLevel[i + 1] || { line: lines.length + 1 }).line - 1;
}

console.log('=== 顶层条目（前20个）===');
topLevel.slice(0, 20).forEach(t => console.log(`${t.line}-${t.endLine}: [${t.type}] ${t.name}`));

// ── 2. 按类型收集代码 ───────────────────────────────────────
const buckets = { audio: [], data: [], util: [], engine: [], ui: [], entry: [] };
// 文件头（注释）
const header = lines.slice(0, 4).join('\n') + '\n';

// 收集 AudioManager + 视觉特效
const audioEnd = topLevel.find(t => t.name === 'AudioManager');
if (audioEnd) {
  // AudioManager IIFE
  buckets.audio.push(lines.slice(audioEnd.line - 1, audioEnd.endLine).join('\n'));
  // 视觉特效（AudioManager 结束后到 LEVELS 之前）
  const effectsStart = audioEnd.endLine; // _audioInited 等
  const levelsStart = topLevel.find(t => t.name === 'LEVELS');
  if (levelsStart) {
    buckets.audio.push(lines.slice(effectsStart, levelsStart.line - 1).join('\n'));
  }
}

// 收集数据
['LEVELS', 'ACHIEVEMENTS', 'SHOP_ITEMS', 'SYMBOLS'].forEach(name => {
  const t = topLevel.find(x => x.name === name);
  if (t) buckets.data.push(lines.slice(t.line - 1, t.endLine).join('\n'));
});

// 收集工具函数
['S', 'sz', 'drawButton', 'drawRoundRect', 'shuffle', 'tapFeedback'].forEach(name => {
  const t = topLevel.find(x => x.name === name);
  if (t) buckets.util.push(lines.slice(t.line - 1, t.endLine).join('\n'));
});

// 收集引擎函数
const engineFns = topLevel.filter(t => t.type === 'engine');
engineFns.forEach(t => {
  buckets.engine.push(lines.slice(t.line - 1, t.endLine).join('\n'));
});

// 收集 UI 函数
const uiFns = topLevel.filter(t => t.type === 'ui');
uiFns.forEach(t => {
  buckets.ui.push(lines.slice(t.line - 1, t.endLine).join('\n'));
});

// 收集入口（render主函数 + handleTap + initCanvas + 事件绑定）
const entryFns = topLevel.filter(t => t.type === 'entry');
entryFns.forEach(t => {
  buckets.entry.push(lines.slice(t.line - 1, t.endLine).join('\n'));
});

// ── 3. 写文件 ───────────────────────────────────────────────
// js/config.js
if (buckets.data.length) {
  const c = "// js/config.js — 游戏配置数据（自动生成，请勿手动编辑）\n\n" + buckets.data.join('\n\n') + "\n\nmodule.exports = { LEVELS, ACHIEVEMENTS, SHOP_ITEMS, SYMBOLS };\n";
  fs.writeFileSync(path.join(DST, 'js/config.js'), c, 'utf8');
  console.log('✅ js/config.js:', buckets.data.length, '个数据块');
}

// js/audio.js
if (buckets.audio.length) {
  const c = "// js/audio.js — 音频系统 + 视觉特效（自动生成，请勿手动编辑）\n\n" + buckets.audio.join('\n\n') + "\n\nmodule.exports = { AudioManager, bgParticles, initBgParticles, updateBgParticles, drawBgParticles };\n";
  fs.writeFileSync(path.join(DST, 'js/audio.js'), c, 'utf8');
  console.log('✅ js/audio.js:', buckets.audio.length, '个代码块');
}

// js/util.js
if (buckets.util.length) {
  const c = "// js/util.js — 工具函数（自动生成，请勿手动编辑）\n\n" + buckets.util.join('\n\n') + "\n\nmodule.exports = { S, sz, drawButton, drawRoundRect, shuffle, tapFeedback };\n";
  fs.writeFileSync(path.join(DST, 'js/util.js'), c, 'utf8');
  console.log('✅ js/util.js:', buckets.util.length, '个函数');
}

// js/engine.js
if (buckets.engine.length) {
  const c = "// js/engine.js — 游戏引擎（自动生成，请勿手动编辑）\n\n" +
    "const { LEVELS, ACHIEVEMENTS, SHOP_ITEMS, SYMBOLS } = require('./config.js');\n" +
    "const { AudioManager } = require('./audio.js');\n" +
    "const { S, sz, drawButton, drawRoundRect, shuffle, tapFeedback } = require('./util.js');\n\n" +
    buckets.engine.join('\n\n') + "\n\n// Export\n";
  fs.writeFileSync(path.join(DST, 'js/engine.js'), c, 'utf8');
  console.log('✅ js/engine.js:', buckets.engine.length, '个函数');
}

// js/ui.js
if (buckets.ui.length) {
  const c = "// js/ui.js — 渲染层（自动生成，请勿手动编辑）\n\n" +
    "const { state, LEVELS, ACHIEVEMENTS, SHOP_ITEMS, SYMBOLS, S, sz, drawButton, AudioManager } = require('./engine.js');\n" +
    "const { bgParticles, updateBgParticles, drawBgParticles } = require('./audio.js');\n\n" +
    buckets.ui.join('\n\n') + "\n\nmodule.exports = { render, renderMenu, renderShop, renderAchievements, renderAchievementPopup, renderLevels, renderTimedIntro, renderDailyChallenge, renderSettlement, renderOver, renderGame };\n";
  fs.writeFileSync(path.join(DST, 'js/ui.js'), c, 'utf8');
  console.log('✅ js/ui.js:', buckets.ui.length, '个函数');
}

console.log('\n⚠️  重构脚本完成。请手动检查各文件，然后更新 game.js 为入口文件。');
console.log('   注意：自动拆分可能不完整，请务必在微信开发者工具中验证！');
