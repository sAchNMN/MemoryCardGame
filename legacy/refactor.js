/**
 * refactor.js — 将 game.js 拆分为分层架构
 * 用法: node refactor.js
 *
 * 输出结构:
 *   js/config.js  — 配置数据
 *   js/audio.js    — AudioManager + 视觉特效
 *   js/engine.js   — 游戏引擎（state, createBoard, 计时器, 游戏逻辑, 金币系统）
 *   js/ui.js       — 渲染层（所有 render 函数, drawButton, S/sz）
 *   game.refactored.js — 入口（canvas 初始化, 事件绑定, 主循环, handleTap）
 *   game.js        — 备份为 game.bak.js, 然后用 game.refactored.js 覆盖
 */
const fs = require('fs');
const path = require('path');

const SRC = 'C:/Users/34759/MemoryCardGame-Pure/game.js';
const DST = 'C:/Users/34759/MemoryCardGame-Pure';
const lines = fs.readFileSync(SRC, 'utf8').split('\n');

// ── 工具：按行号提取并去除尾部空行 ────────────────────────────
function sliceLines(from, to) {
  // from/to 都是 1-based 行号, to 含
  const sl = lines.slice(from - 1, to);
  while (sl.length && sl[sl.length - 1].trim() === '') sl.pop();
  return sl.join('\n') + '\n';
}

// ── 1. 找关键行号 ─────────────────────────────────────────────
let LN = {};
for (let i = 0; i < lines.length; i++) {
  const t = lines[i].trim();
  if (t.startsWith('var AudioManager'))   LN.audioStart = i + 1;
  if (t === '})();' && LN.audioStart)  { LN.audioEnd = i + 1; break; }
}
// AudioManager 后第一个 var 在行 337
LN.effectsStart = 337;

// 用正则找其余关键行（精确匹配行首）
const patterns = [
  [/^var\s+LEVELS\s*=/,         'levelsStart'],
  [/^var\s+ACHIEVEMENTS\s*=/,   'achStart'],
  [/^var\s+SHOP_ITEMS\s*=/,     'shopDataStart'],
  [/^var\s+state\s*=/,           'stateStart'],
  [/^var\s+SYMBOLS\s*=/,        'symbolsStart'],
  [/^function\s+createBoard\b/,  'createBoardStart'],
  [/^function\s+S\(/,            'SfuncStart'],       // S() 缩放函数
  [/^function\s+sz\(/,           'szFuncStart'],
  [/^function\s+drawButton\b/,   'drawButtonStart'],
  [/^function\s+render\b/,        'renderStart'],      // 主 render()
  [/^function\s+renderMenu\b/,   'renderMenuStart'],
  [/^function\s+renderShop\b/,   'renderShopStart'],
  [/^function\s+renderAchievements\b/, 'renderAchStart'],
  [/^function\s+handleTap\b/,    'handleTapStart'],
  [/^wx\.onTouchEnd\b/,          'touchStart'],
  [/^function\s+initCanvas\b/,   'initCanvasStart'],
  [/^function\s+startTimer\b/,    'startTimerStart'],
  [/^function\s+resetTimedBoard\b/, 'resetTimedStart'],
  [/^function\s+checkAchievementsAfterGame\b/, 'checkAchStart'],
  [/^function\s+purchaseItem\b/,  'purchaseStart'],
  [/^function\s+loadPurchasedItems\b/, 'loadPurchasedStart'],
  [/^function\s+isItemPurchased\b/, 'isPurchasedStart'],
  [/^function\s+getCardBackColor\b/, 'cardBackStart'],
  [/^function\s+saveCoins\b/,    'saveCoinsStart'],
  [/^function\s+loadCoins\b/,    'loadCoinsStart'],
  [/^function\s+saveShopState\b/, 'saveShopStart'],
  [/^function\s+loadShopState\b/, 'loadShopStart'],
];

for (const [re, key] of patterns) {
  for (let i = 0; i < lines.length; i++) {
    if (re.test(lines[i])) { LN[key] = i + 1; break; }
  }
}

// 手动校正几个关键边界
// AudioManager 结束在 335, 视觉特效系统从 337 到 LEVELS 前一行
LN.effectsEnd = (LN.levelsStart || 501) - 1;

// state 结束在 SYMBOLS 前一行（找 state 对象的结束花括号）
// 简化：state 从 LN.stateStart 到 LN.symbolsStart-1
// 但 state 后面紧跟着 SYMBOLS，所以这样是对的

// 找文件末尾
LN.fileEnd = lines.length;

console.log('=== 关键行号 ===');
for (const [k, v] of Object.entries(LN)) console.log(k + ': ' + v);

// ── 2. 写 js/config.js ─────────────────────────────────────────
const configParts = [];
// 文件头注释
configParts.push(lines.slice(0, 4).join('\n').replace(/^\uFEFF/, '') + '\n');
configParts.push('// js/config.js — 游戏配置数据（由 refactor.js 自动生成）\n');
// LEVELS
if (LN.levelsStart) configParts.push(sliceLines(LN.levelsStart, (LN.achStart || LN.levelsStart + 120) - 2));
// ACHIEVEMENTS
if (LN.achStart) configParts.push(sliceLines(LN.achStart, (LN.shopDataStart || LN.achStart + 30) - 2));
// SHOP_ITEMS
if (LN.shopDataStart) configParts.push(sliceLines(LN.shopDataStart, (LN.stateStart || LN.shopDataStart + 200) - 2));
// SYMBOLS
if (LN.symbolsStart) configParts.push(sliceLines(LN.symbolsStart, (LN.createBoardStart || LN.symbolsStart + 80) - 2));

const configContent = configParts.join('\n')
  .replace(/^var\s+(LEVELS|ACHIEVEMENTS|SHOP_ITEMS|SYMBOLS)\s*=/gm, 'var $1 =')
  + '\n\n// ── 导出 ──\nmodule.exports = {\n  LEVELS,\n  ACHIEVEMENTS,\n  SHOP_ITEMS,\n  SYMBOLS,\n};\n';

fs.writeFileSync(path.join(DST, 'js/config.js'), configContent, 'utf8');
console.log('✅ js/config.js written (' + configContent.split('\n').length + ' lines)');

// ── 3. 写 js/audio.js ──────────────────────────────────────────
const audioParts = [];
audioParts.push('// js/audio.js — 音频系统 + 视觉特效（由 refactor.js 自动生成）\n');
audioParts.push('var W, H, S, safeTop;\n');  // 占位，会从 engine 传入
audioParts.push(sliceLines(LN.audioStart, LN.audioEnd));
audioParts.push('\n');
// 视觉特效系统（bgParticles + 相关函数）
audioParts.push(sliceLines(LN.effectsStart, LN.effectsEnd));
audioParts.push('\nmodule.exports = { AudioManager, bgParticles, initBgParticles, updateBgParticles, drawBgParticles };\n');

const audioContent = audioParts.join('\n');
fs.writeFileSync(path.join(DST, 'js/audio.js'), audioContent, 'utf8');
console.log('✅ js/audio.js written (' + audioContent.split('\n').length + ' lines)');

// ── 4. 写 js/engine.js ─────────────────────────────────────────
// 这个文件最大：包含 state, createBoard, 计时器, 游戏逻辑, 金币系统, 成就检查
const engineParts = [];
engineParts.push('// js/engine.js — 游戏引擎（由 refactor.js 自动生成）\n');
engineParts.push("const { LEVELS, ACHIEVEMENTS, SHOP_ITEMS, SYMBOLS } = require('./config.js');\n");
engineParts.push('const { AudioManager, bgParticles, initBgParticles, updateBgParticles, drawBgParticles } = require("./audio.js");\n\n');

// state 对象
if (LN.stateStart) {
  // state 到 createBoard 之前
  const stateEnd = (LN.createBoardStart || LN.stateStart + 200) - 1;
  engineParts.push(sliceLines(LN.stateStart, stateEnd));
}

// 工具函数 S(), sz(), drawButton()
if (LN.SfuncStart) {
  engineParts.push('\n// ── 缩放工具 ──\n');
  engineParts.push(sliceLines(LN.SfuncStart, (LN.szFuncStart || LN.SfuncStart + 10) - 1));
}
if (LN.szFuncStart) {
  engineParts.push(sliceLines(LN.szFuncStart, (LN.drawButtonStart || LN.szFuncStart + 10) - 1));
}

// drawButton
if (LN.drawButtonStart) {
  // 找 drawButton 结束：下一个 function 或渲染函数开始
  const end = LN.renderStart ? LN.renderStart - 1 : LN.createBoardStart - 1;
  engineParts.push('\n// ── drawButton ──\n');
  engineParts.push(sliceLines(LN.drawButtonStart, end));
}

// createBoard 及所有引擎函数（到 render 之前）
if (LN.createBoardStart && LN.renderStart) {
  engineParts.push('\n// ── 游戏引擎函数 ──\n');
  engineParts.push(sliceLines(LN.createBoardStart, LN.renderStart - 1));
}

// 金币系统函数
const coinFns = ['saveCoinsStart', 'loadCoinsStart', 'saveShopStart', 'loadShopStart',
                  'purchaseStart', 'loadPurchasedStart', 'isPurchasedStart', 'cardBackStart',
                  'checkAchStart'];
for (const k of coinFns) {
  if (LN[k]) console.log('  Coin fn: ' + k + ' at line ' + LN[k]);
}

engineParts.push('\nmodule.exports = { state');
// 收集 engine.js 中所有 exported 函数/变量
engineParts.push(', createBoard, startLevel, resetTimedBoard, checkAchievementsAfterGame');
engineParts.push(', purchaseItem, loadPurchasedItems, isItemPurchased, getCardBackColor');
engineParts.push(', saveCoins, loadCoins, saveShopState, loadShopState');
engineParts.push(', S, sz, drawButton, Card');
engineParts.push(' };\n');

const engineContent = engineParts.join('\n');
fs.writeFileSync(path.join(DST, 'js/engine.js'), engineContent, 'utf8');
console.log('✅ js/engine.js written (' + engineContent.split('\n').length + ' lines)');

// ── 5. 写 js/ui.js ────────────────────────────────────────────
const uiParts = [];
uiParts.push('// js/ui.js — 渲染层（由 refactor.js 自动生成）\n');
uiParts.push("const { state, LEVELS, ACHIEVEMENTS, SHOP_ITEMS, SYMBOLS, S, sz, drawButton, AudioManager } = require('./engine.js');\n");
uiParts.push("const { bgParticles, updateBgParticles, drawBgParticles } = require('./audio.js');\n\n");

if (LN.renderStart && LN.handleTapStart) {
  uiParts.push(sliceLines(LN.renderStart, LN.handleTapStart - 1));
}

uiParts.push('\nmodule.exports = { render, renderMenu, renderShop, renderAchievements, renderAchievementPopup, renderLevels, renderTimedIntro, renderDailyChallenge, renderSettlement };\n');

const uiContent = uiParts.join('\n');
fs.writeFileSync(path.join(DST, 'js/ui.js'), uiContent, 'utf8');
console.log('✅ js/ui.js written (' + uiContent.split('\n').length + ' lines)');

// ── 6. 写 game.refactored.js（入口）───────────────────────────
const entryParts = [];
entryParts.push('// game.js — 入口（由 refactor.js 自动生成）\n');
entryParts.push("const AudioManager = require('./js/audio.js').AudioManager;\n");
entryParts.push("const { state, ... } = require('./js/engine.js');\n");
entryParts.push("const { render, ... } = require('./js/ui.js');\n\n");
// handleTap + 事件绑定 + 主循环
if (LN.handleTapStart) {
  entryParts.push(sliceLines(LN.handleTapStart, LN.touchStart ? LN.touchStart - 1 : LN.fileEnd));
}
if (LN.touchStart) {
  entryParts.push(sliceLines(LN.touchStart, LN.fileEnd));
}

const entryContent = entryParts.join('\n');
fs.writeFileSync(path.join(DST, 'game.refactored.js'), entryContent, 'utf8');
console.log('✅ game.refactored.js written (' + entryContent.split('\n').length + ' lines)');

console.log('\n⚠️  重构完成，请检查各文件后手动合并/验证！');
console.log('   建议：先检查 js/config.js 和 js/audio.js，再处理 engine 和 ui。');
