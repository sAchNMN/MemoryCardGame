// js/engine.js — 游戏引擎（自动生成，请勿手动编辑）

const { LEVELS, ACHIEVEMENTS, SHOP_ITEMS, SYMBOLS } = require('./config.js');
const { AudioManager } = require('./audio.js');
const { S, sz, drawButton, drawRoundRect, shuffle, tapFeedback } = require('./util.js');

function loadProgress() { try { return wx.getStorageSync('level_progress') || {}; } catch(e) { return {}; } }

function saveProgress(levelId, stars) { var p=loadProgress(); if(!p[levelId]||stars>p[levelId])p[levelId]=stars; try{wx.setStorageSync('level_progress',p);}catch(e){} }

function loadCoins() { try { return wx.getStorageSync('coins')||0; } catch(e) { return 0; } }

function saveCoins(n) { try { wx.setStorageSync('coins', Math.max(0,n)); } catch(e) {} }

function loadDailyStreak() { try { return wx.getStorageSync('daily_streak')||{lastDate:'',streak:0,history:[]}; } catch(e) { return {lastDate:'',streak:0,history:[]}; } }

function saveDailyStreak(data) { try { wx.setStorageSync('daily_streak',data); } catch(e) {} }

function loadPurchasedItems() {
  try { return wx.getStorageSync('purchased_items') || ['cardback_classic']; }
  catch(e) { return ['cardback_classic']; }
}

function saveShopState(){
  try{ wx.setStorageSync('selected_card_back', state.selectedCardBack); }catch(e){}
}

function isItemPurchased(itemId) {
  return loadPurchasedItems().indexOf(itemId) >= 0;
}

function purchaseItem(itemId) {
  var item = null;
  for (var i = 0; i < SHOP_ITEMS.length; i++) {
    if (SHOP_ITEMS[i].id === itemId) { item = SHOP_ITEMS[i]; break; }
  }
  if (!item) return { ok:false, msg:'商品不存在' };
  if (isItemPurchased(itemId)) return { ok:false, msg:'已经购买过了' };
  if (state.coins < item.price) return { ok:false, msg:'金币不足' };
  state.coins -= item.price;
  saveCoins(state.coins);
  var items = loadPurchasedItems();
  items.push(itemId);
  savePurchasedItems(items);
  // 如果是卡背，自动装备
  if (item.type === 'cardback') state.selectedCardBack = itemId;
  return { ok:true, msg:'购买成功！' };
}

function saveAchievement(id) {
  var data = loadAchievements();
  if (data[id]) return false; // already unlocked
  data[id] = { unlockedAt: new Date().toISOString() };
  try { wx.setStorageSync('achievements', data); } catch(e) {}
  return true; // newly unlocked
}

function loadAchievementStats() {
  try { return wx.getStorageSync('achievement_stats') || { gamesPlayed:0, maxCombo:0, propsUsed:{} }; }
  catch(e) { return { gamesPlayed:0, maxCombo:0, propsUsed:{} }; }
}

function saveAchievementStats(stats) {
  try { wx.setStorageSync('achievement_stats', stats); } catch(e) {}
}

function checkAchievementsAfterGame(win) {
  var stats = getAchStats();
  // 累计游玩局数
  stats.gamesPlayed = (stats.gamesPlayed || 0) + 1;
  // 本局用时的判断（用于闪电记忆）
  var used = (state.currentLevel.time || 60) - state.timeLeft;
  // 初次通关
  if (win && !isAchievementUnlocked('first_win')) {
    checkAndUnlock('first_win');
  }
  // 0错误通关（3星）
  if (win && state.mistakes === 0) {
    checkAndUnlock('no_mistakes');
  }
  // 30秒内完成
  if (win && used > 0 && used < 30) {
    checkAndUnlock('speed_run');
  }
  // 不使用道具通关
  var propsUsedThisGame = state._propsUsedThisGame || {};
  var usedAnyProp = !!(propsUsedThisGame.peek || propsUsedThisGame.hint || propsUsedThisGame.freeze || propsUsedThisGame.shuffle);
  if (win && !usedAnyProp) {
    checkAndUnlock('no_props');
  }
  // 每日挑战完成
  if (win && state.isDaily) {
    checkAndUnlock('daily_first');
  }
  // 连续打卡3天 / 7天
  var ds = loadDailyStreak();
  if (ds.streak >= 3) checkAndUnlock('streak_3');
  if (ds.streak >= 7) checkAndUnlock('streak_7');
  // 道具大师：本局使用了全部4种道具
  if (propsUsedThisGame.peek && propsUsedThisGame.hint && propsUsedThisGame.freeze && propsUsedThisGame.shuffle) {
    checkAndUnlock('all_props');
  }
  // 累计游玩
  if (stats.gamesPlayed >= 10) checkAndUnlock('games_10');
  if (stats.gamesPlayed >= 50) checkAndUnlock('games_50');
  // 最大连击（用本局追踪的最大值，不受 mismatches 重置影响）
  var maxC = state._maxComboThisGame || 0;
  if (maxC > (stats.maxCombo || 0)) {
    stats.maxCombo = maxC;
  }
  if (stats.maxCombo >= 5) checkAndUnlock('combo_5');
  // 限时达人：单局匹配20对以上
  if (state.isTimedMode && state._timedPairsMatched >= 20) checkAndUnlock('timed_20');
  // 全部通关
  var prog = loadProgress();
  var unlockedCount = 0;
  for (var i = 1; i <= 15; i++) { if ((prog[i] || 0) > 0) unlockedCount++; }
  if (unlockedCount >= 15) checkAndUnlock('all_levels');
  // 保存统计
  saveAchievementStats(stats);
}

function checkDailyStreak(){
  var data=loadDailyStreak(),today=new Date().toDateString();
  if(data.lastDate===today) return {done:true,streak:data.streak};
  var yesterday=new Date(); yesterday.setDate(yesterday.getDate()-1);
  if(data.lastDate===yesterday.toDateString()) data.streak++;
  else data.streak=1;
  data.lastDate=today; saveDailyStreak(data);
  var bonus=0;
  if(data.streak>=7)bonus=300; else if(data.streak>=3)bonus=100; else bonus=50;
  return {done:false,streak:data.streak,bonus:bonus};
}

function createBoard(level){
  state.cards=[]; state.firstIdx=-1; state.secondIdx=-1;
  state.matched=0; state.moves=0; state.mistakes=0; state.score=0; state.combo=0; state.animating=0;
  state.timeLeft=level.time; state.currentLevel=level;
  var rows=level.rows, cols=level.cols, total=rows*cols; state.totalPairs=total/2;
  var sz=fitCardSize(cols,rows), cardW=sz.w, cardH=sz.h, gap=sz.gap;

  // ===== 符号分配：保证绝对不重复 =====
  // 1. 收集所有可用符号（主题 + 全局），去重
  var themeSymbols = getLevelSymbols(level.id);  // 当前主题符号
  var seen = {};
  var allUnique = [];
  // 先加主题符号
  for(var t=0; t<themeSymbols.length; t++){
    if(!seen[themeSymbols[t]]){ seen[themeSymbols[t]]=true; allUnique.push(themeSymbols[t]); }
  }
  // 再从 SYMBOLS 补充不重复的符号
  for(var s=0; s<SYMBOLS.length && allUnique.length < state.totalPairs; s++){
    if(!seen[SYMBOLS[s]]){ seen[SYMBOLS[s]]=true; allUnique.push(SYMBOLS[s]); }
  }
  // 如果还不够（SYMBOLS 太小），用字母/数字补充
  var fallbackIdx = 0;
  var fallbacks = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('');
  while(allUnique.length < state.totalPairs){
    var fb = fallbacks[fallbackIdx % fallbacks.length] + (Math.floor(fallbackIdx / fallbacks.length) || '');
    if(!seen[fb]){ seen[fb]=true; allUnique.push(fb); }
    fallbackIdx++;
  }
  var pairSymbols = allUnique.slice(0, state.totalPairs);

  var pairIds=[];
  for(var i=0;i<state.totalPairs;i++)pairIds.push(i,i);
  shuffle(pairIds);
  var colors=getLevelColors(level);
  var totalW=cols*cardW+(cols-1)*gap, totalH=rows*cardH+(rows-1)*gap;
  var startX=(W-totalW)/2, startY=(H-totalH)/2 - S(0.035) + safeTop + S(0.035);
  for(var i=0;i<total;i++){
    var r=Math.floor(i/cols), c=i%cols;
    var x=startX+c*(cardW+gap), y=startY+r*(cardH+gap);
    var pairIndex = pairIds[i];
    var cardSymbol = pairSymbols[pairIndex];
    state.cards.push(new Card(i, pairIds[i], x, y, cardW, cardH, colors[pairIndex], cardSymbol));
  }
  initBgParticles();
}

function cleanupGame(){
  // 清理所有定时器，防止多局叠加导致越玩越卡
  if(state.timer){ clearInterval(state.timer); state.timer=null; }
  if(state._previewTimer){ clearTimeout(state._previewTimer); state._previewTimer=null; }
  if(state._matchTimer){ clearTimeout(state._matchTimer); state._matchTimer=null; }
  if(state._unflipTimer){ clearTimeout(state._unflipTimer); state._unflipTimer=null; }
  // 清空特效粒子，避免跨关累积
  burstParticles = [];
  floatingTexts = [];
  // 重置交互状态
  state.firstIdx = -1;
  state.secondIdx = -1;
  state.canInteract = false;
  state.previewEndTime = 0;
}

function getCardBackColor(cardBackId) {
  for (var i = 0; i < SHOP_ITEMS.length; i++) {
    if (SHOP_ITEMS[i].id === cardBackId) return SHOP_ITEMS[i].color;
  }
  return '#1a1a2e';
}

function resetTimedBoard(){
  // 限时模式下翻完8对，重建棋盘继续
  // 重要：保存不重置的字段，createBoard 会把它们清掉
  var savedTimeLeft = state.timeLeft;
  var savedScore = state.score;
  var savedMoves = state.moves;
  var savedMistakes = state.mistakes;
  var savedCombo = state.combo;
  state.cards = [];
  state.firstIdx = -1;
  state.secondIdx = -1;
  state.animating = 0;
  createBoard(TIMED_MODE_CONFIG);
  // 恢复跨棋盘持久化的字段
  state.timeLeft = savedTimeLeft;
  state.score = savedScore;
  state.moves = savedMoves;
  state.mistakes = savedMistakes;
  state.combo = savedCombo;
}

function startTimer(){
  clearInterval(state.timer);
  // 冻结道具激活时，先倒数冻结时间，不减少 timeLeft
  if(state._freezeActive && state._freezeLeft>0){
    state.timer = setInterval(function(){
      if(state.phase!=='PLAYING')return;
      state._freezeLeft--;
      if(state._freezeLeft<=0){clearInterval(state.timer);state._freezeActive=false;startTimer();}
    },1000);
    return;
  }
  state.timer=setInterval(function(){
    if(state.phase!=='PLAYING')return;
    state.timeLeft--;
    if(state.timeLeft<=10&&state.timeLeft>0)AudioManager.play('countdown_warn');
    if(state.timeLeft<=0)gameOver(false);
  },1000);
}

// Export
