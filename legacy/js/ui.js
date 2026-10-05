// js/ui.js — 渲染层（自动生成，请勿手动编辑）

const { state, LEVELS, ACHIEVEMENTS, SHOP_ITEMS, SYMBOLS, S, sz, drawButton, AudioManager } = require('./engine.js');
const { bgParticles, updateBgParticles, drawBgParticles } = require('./audio.js');

function renderPowerUpEffects(ctx){
  // 提示效果：高亮一对卡片
  if(state._hintPair && state._hintEndTime > Date.now()){
    state._hintPair.forEach(function(idx){
      var c = state.cards[idx];
      if(c && !c.matched){
        ctx.save();
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = S(0.004);
        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur = S(0.006);
        ctx.beginPath();
        drawRoundRect(ctx, c.x-S(0.003), c.y-S(0.003), c.w+S(0.006), c.h+S(0.006), S(0.015));
        ctx.stroke();
        ctx.restore();
      }
    });
  } else if(state._hintPair){
    state._hintPair = null;
  }
  // 冻结效果：显示冻结图标
  if(state._freezeActive && state._freezeLeft > 0){
    ctx.fillStyle = 'rgba(0,188,212,0.7)';
    ctx.font = 'bold '+sz(0.03)+'px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('❄️ 冻结中 +'+state._freezeLeft+'s', W/2, safeTop + S(0.12));
  }
  // Toast 提示
  if(state._toast && state._toast.time > Date.now()){
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.beginPath(); drawRoundRect(ctx, W/2-S(0.18), H*0.35, S(0.36), S(0.04), S(0.01));
    ctx.fill();
    ctx.fillStyle = 'white'; ctx.font = sz(0.018)+'px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(state._toast.text, W/2, H*0.35+S(0.02));
  } else if(state._toast){
    state._toast = null;
  }
}

function renderTutorial(ctx){
  if(!state._tutorialPopup) return;
  var P = state._tutorialPopup;
  // 半透明遮罩
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fillRect(0, 0, W, H);
  // 弹窗背景
  var pw = SW(0.78), ph = S(0.36);
  var px = (W - pw)/2, py = (H - ph)/2;
  ctx.fillStyle = '#23234a';
  ctx.beginPath(); drawRoundRect(ctx, px, py, pw, ph, S(0.025));
  ctx.fill();
  // 边框
  ctx.strokeStyle = '#FFD700'; ctx.lineWidth = S(0.003);
  ctx.beginPath(); drawRoundRect(ctx, px, py, pw, ph, S(0.025));
  ctx.stroke();
  // 道具图标（大号）
  ctx.fillStyle = '#FFD700'; ctx.font = sz(0.055)+'px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(P.icon, W/2, py + S(0.1));
  // 道具名称
  ctx.fillStyle = 'white'; ctx.font = 'bold '+sz(0.032)+'px sans-serif';
  ctx.fillText(P.name, W/2, py + S(0.17));
  // 说明文字（支持 \n 换行）
  ctx.fillStyle = '#ccc'; ctx.font = sz(0.022)+'px sans-serif'; ctx.textAlign = 'center';
  var lines = P.desc.split('\n');
  var descY = py + S(0.24);
  lines.forEach(function(line){
    ctx.fillText(line, W/2, descY);
    descY += S(0.032);
  });
  // "知道了" 按钮
  var btnW = SW(0.4), btnH = S(0.048);
  drawButton(ctx, W/2 - btnW/2, py + ph - S(0.065), btnW, btnH, '知道了', '#07c160', 'white', S(0.022));
}

function renderAchievementPopup(ctx) {
  if (!state._achievementPopup) return;
  var P = state._achievementPopup;
  // 半透明遮罩
  ctx.fillStyle = 'rgba(0,0,0,0.78)';
  ctx.fillRect(0, 0, W, H);
  // 弹窗背景（金色主题）- 屏幕上方，不遮挡结算界面按钮
  var pw = SW(0.72), ph = S(0.36);
  var px = (W - pw)/2, py = safeTop + S(0.06);
  // 外发光
  ctx.shadowColor = '#FFD700';
  ctx.shadowBlur = S(0.012);
  ctx.fillStyle = '#2a1f00';
  ctx.beginPath(); drawRoundRect(ctx, px, py, pw, ph, S(0.025));
  ctx.fill();
  ctx.shadowColor = 'rgba(0,0,0,0)';
  // 金色边框
  ctx.strokeStyle = '#FFD700'; ctx.lineWidth = S(0.004);
  ctx.beginPath(); drawRoundRect(ctx, px, py, pw, ph, S(0.025));
  ctx.stroke();
  // 标题
  ctx.fillStyle = '#FFD700'; ctx.font = 'bold ' + sz(0.022) + 'px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('🏆 成就解锁！', W/2, py + S(0.055));
  // 成就图标（大号）
  ctx.font = sz(0.055) + 'px sans-serif';
  ctx.fillText(P.icon, W/2, py + S(0.14));
  // 成就名称
  ctx.fillStyle = 'white'; ctx.font = 'bold ' + sz(0.026) + 'px sans-serif';
  ctx.fillText(P.name, W/2, py + S(0.205));
  // 成就描述
  ctx.fillStyle = '#ccc'; ctx.font = sz(0.018) + 'px sans-serif';
  ctx.fillText(P.desc, W/2, py + S(0.25));
  // 金币奖励
  if (P.coinReward) {
    ctx.fillStyle = '#FFD700'; ctx.font = 'bold ' + sz(0.022) + 'px sans-serif';
    ctx.fillText('💰 +' + P.coinReward + ' 金币', W/2, py + S(0.30));
  }
  // "太棒了！" 按钮
  var btnW = SW(0.40), btnH = S(0.042);
  drawButton(ctx, W/2 - btnW/2, py + ph - S(0.058), btnW, btnH, '太棒了！', '#FFD700', '#1a1a2e', S(0.02));
}

function renderAchievements() {
  // 背景
  var bgGrad = ctx.createLinearGradient(0, 0, 0, H);
  bgGrad.addColorStop(0, '#12121F');
  bgGrad.addColorStop(0.5, '#1a1a2e');
  bgGrad.addColorStop(1, '#0f0f1a');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);
  drawBgParticles(ctx);
  // 标题
  var titleY = safeTop + S(0.075);
  ctx.fillStyle = '#FFD700'; ctx.font = 'bold ' + sz(0.042) + 'px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('🏆 成就', W/2, titleY);
  // 统计
  var unlockedCount = 0;
  for (var ai = 0; ai < ACHIEVEMENTS.length; ai++) { if (isAchievementUnlocked(ACHIEVEMENTS[ai].id)) unlockedCount++; }
  ctx.fillStyle = '#aaa'; ctx.font = sz(0.02) + 'px sans-serif';
  ctx.fillText('已解锁 ' + unlockedCount + ' / ' + ACHIEVEMENTS.length, W/2, titleY + S(0.042));
  // 分页
  var PER_PAGE = 6;
  var totalPages = Math.ceil(ACHIEVEMENTS.length / PER_PAGE);
  var startIdx = state._achPage * PER_PAGE;
  var endIdx = Math.min(startIdx + PER_PAGE, ACHIEVEMENTS.length);
  // 成就列表
  var listTop = safeTop + S(0.13);
  var itemH = S(0.068);
  var itemGap = S(0.008);
  for (var i = startIdx; i < endIdx; i++) {
    var ach = ACHIEVEMENTS[i];
    var iy = listTop + (i - startIdx) * (itemH + itemGap);
    var unlocked = isAchievementUnlocked(ach.id);
    // 背景
    ctx.fillStyle = unlocked ? '#23234a' : '#1a1a2e';
    ctx.beginPath(); drawRoundRect(ctx, S(0.03), iy, W - S(0.06), itemH, S(0.012));
    ctx.fill();
    if (unlocked) {
      ctx.strokeStyle = '#FFD700'; ctx.lineWidth = S(0.002);
      ctx.beginPath(); drawRoundRect(ctx, S(0.03), iy, W - S(0.06), itemH, S(0.012));
      ctx.stroke();
    }
    // 图标
    ctx.font = sz(0.03) + 'px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(ach.icon, S(0.055), iy + itemH/2);
    // 名称 + 描述
    ctx.fillStyle = unlocked ? 'white' : '#555';
    ctx.font = (unlocked ? 'bold ' : '') + sz(0.022) + 'px sans-serif';
    ctx.fillText(ach.name, S(0.11), iy + itemH/2 - S(0.01));
    ctx.fillStyle = unlocked ? '#aaa' : '#444';
    ctx.font = sz(0.016) + 'px sans-serif';
    ctx.fillText(ach.desc, S(0.11), iy + itemH/2 + S(0.016));
    // 状态
    ctx.textAlign = 'right';
    if (unlocked) {
      ctx.fillStyle = '#FFD700'; ctx.font = sz(0.02) + 'px sans-serif';
      ctx.fillText('✓ 已解锁', W - S(0.045), iy + itemH/2);
    } else {
      ctx.fillStyle = '#444'; ctx.font = sz(0.018) + 'px sans-serif';
      ctx.fillText('未解锁', W - S(0.045), iy + itemH/2);
    }
    ctx.textAlign = 'center';
  }
  // 页码指示
  var pageY = H - S(0.11);
  ctx.fillStyle = '#aaa'; ctx.font = sz(0.02) + 'px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('第 ' + (state._achPage + 1) + '/' + totalPages + ' 页', W/2, pageY);
  // 上一页按钮
  if (state._achPage > 0) {
    var prevW = SW(0.25), prevH = S(0.04);
    var prevX = W/2 - prevW - S(0.02), prevY = pageY + S(0.006);
    drawButton(ctx, prevX, prevY, prevW, prevH, '◀ 上一页', '#444', 'white', prevH/2);
  }
  // 下一页按钮
  if (state._achPage < totalPages - 1) {
    var nextW = SW(0.25), nextH = S(0.04);
    var nextX = W/2 + S(0.02), nextY = pageY + S(0.006);
    drawButton(ctx, nextX, nextY, nextW, nextH, '下一页 ▶', '#444', 'white', nextH/2);
  }
  // 底部返回按钮
  var backW = SW(0.18), backH = S(0.045);
  var backX = S(0.03), backY = H - S(0.07);
  drawButton(ctx, backX, backY, backW, backH, '◀ 返回', '#666', 'white', backH/2);
}

function renderShop() {
  // 背景
  var bgGrad = ctx.createLinearGradient(0, 0, 0, H);
  bgGrad.addColorStop(0, '#12121F');
  bgGrad.addColorStop(0.5, '#1a1a2e');
  bgGrad.addColorStop(1, '#0f0f1a');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);
  drawBgParticles(ctx);

  // 标题
  var titleY = safeTop + S(0.065);
  ctx.fillStyle = '#FFD700'; ctx.font = 'bold ' + sz(0.036) + 'px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('🏪 商店', W/2, titleY);

  // 金币显示
  ctx.fillStyle = '#FFD700'; ctx.font = 'bold ' + sz(0.02) + 'px sans-serif';
  ctx.fillText('💰 ' + state.coins, W/2, titleY + S(0.032));

  // 商品列表
  var itemsPerPage = 4;
  var page = state._shopPage || 0;
  var totalPages = Math.ceil(SHOP_ITEMS.length / itemsPerPage);
  var startIdx = page * itemsPerPage;
  var endIdx = Math.min(startIdx + itemsPerPage, SHOP_ITEMS.length);

  var cardW = SW(0.72), cardH = S(0.088);
  var cardGap = S(0.012);
  var listTop = safeTop + S(0.13);

  for (var i = startIdx; i < endIdx; i++) {
    var item = SHOP_ITEMS[i];
    var iy = listTop + (i - startIdx) * (cardH + cardGap);
    var purchased = isItemPurchased(item.id);
    var equipped = (item.type === 'cardback' && state.selectedCardBack === item.id);

    // 卡片背景
    ctx.fillStyle = equipped ? '#2a1f00' : (purchased ? '#1a1a2e' : '#12121F');
    ctx.beginPath(); drawRoundRect(ctx, (W - cardW)/2, iy, cardW, cardH, S(0.012));
    ctx.fill();
    if (equipped) {
      ctx.strokeStyle = '#FFD700'; ctx.lineWidth = S(0.003);
      ctx.beginPath(); drawRoundRect(ctx, (W - cardW)/2, iy, cardW, cardH, S(0.012));
      ctx.stroke();
    }

    // 图标
    ctx.font = sz(0.03) + 'px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(item.icon, (W - cardW)/2 + S(0.025), iy + cardH/2);

    // 名称
    ctx.fillStyle = purchased ? 'white' : '#888';
    ctx.font = (purchased ? 'bold ' : '') + sz(0.022) + 'px sans-serif';
    ctx.fillText(item.name, (W - cardW)/2 + S(0.065), iy + cardH/2 - S(0.01));

    // 价格/状态
    ctx.textAlign = 'right';
    if (purchased) {
      if (equipped) {
        ctx.fillStyle = '#FFD700'; ctx.font = sz(0.018) + 'px sans-serif';
        ctx.fillText('✔ 已装备', (W + cardW)/2 - S(0.025), iy + cardH/2);
      } else if (item.type === 'cardback') {
        ctx.fillStyle = '#4CAF50'; ctx.font = sz(0.018) + 'px sans-serif';
        ctx.fillText('点击装备', (W + cardW)/2 - S(0.025), iy + cardH/2);
      } else {
        ctx.fillStyle = '#666'; ctx.font = sz(0.018) + 'px sans-serif';
        ctx.fillText('已拥有', (W + cardW)/2 - S(0.025), iy + cardH/2);
      }
    } else {
      ctx.fillStyle = '#FFD700'; ctx.font = sz(0.02) + 'px sans-serif';
      ctx.fillText('💰 ' + item.price, (W + cardW)/2 - S(0.025), iy + cardH/2);
    }
    ctx.textAlign = 'center';
  }

  // 翻页按钮
  if (totalPages > 1) {
    var pageBtnW = SW(0.24), pageBtnH = S(0.045);
    if (page > 0) drawButton(ctx, W/2 - pageBtnW - SW(0.02), H - S(0.09), pageBtnW, pageBtnH, '◀ 上一页', '#4A90D9', 'white', S(0.022));
    if (page < totalPages - 1) drawButton(ctx, W/2 + SW(0.02), H - S(0.09), pageBtnW, pageBtnH, '下一页 ▶', '#4A90D9', 'white', S(0.022));
  }

  // 底部返回按钮
  var backW = SW(0.18), backH = S(0.045);
  var backX = S(0.03), backY = H - S(0.07);
  drawButton(ctx, backX, backY, backW, backH, '◀ 返回', '#666', 'white', backH/2);

  // 装备预览（小卡片）
  if (state.selectedCardBack !== 'cardback_classic') {
    var pvX = W - S(0.18), pvY = H - S(0.11);
    ctx.fillStyle = '#1a1a2e'; ctx.font = sz(0.016) + 'px sans-serif'; ctx.textAlign = 'right';
    ctx.fillText('当前卡背', pvX, pvY);
    // 画一个小卡片背面预览
    var prevW = S(0.055), prevH = S(0.065);
    var prevX = pvX - prevW, prevY = pvY + S(0.008);
    ctx.fillStyle = getCardBackColor(state.selectedCardBack);
    ctx.beginPath(); drawRoundRect(ctx, prevX, prevY, prevW, prevH, S(0.008));
    ctx.fill();
    ctx.strokeStyle = '#FFD700'; ctx.lineWidth = S(0.002);
    ctx.beginPath(); drawRoundRect(ctx, prevX, prevY, prevW, prevH, S(0.008));
    ctx.stroke();
  }
}

function render(){
  try {
    // 背景：深蓝紫渐变
    var bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    bgGrad.addColorStop(0, '#12121F');
    bgGrad.addColorStop(0.5, '#1a1a2e');
    bgGrad.addColorStop(1, '#0f0f1a');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);
    // 背景光斑
    drawBgParticles(ctx);

    switch(state.phase){
      case 'MENU': renderMenu(); break;
      case 'LEVELS': renderLevels(); break;
      case 'ACHIEVEMENTS': renderAchievements(); break;
      case 'SHOP': renderShop(); break;
      case 'SHOWING': case 'PLAYING': case 'CHECKING': renderGame(); break;
      case 'OVER': renderOver(); break;
    }
    // 全局特效层
    drawBurstParticles(ctx);
    drawFloatingTexts(ctx);
    drawComboAnim(ctx);
    // 成就解锁弹窗（最上层，优先于新手引导）
    if (state._achievementPopup) { renderAchievementPopup(ctx); return; }
    // 新手引导弹窗
    renderTutorial(ctx);
  } catch (e) {
    if (typeof console !== 'undefined' && console.error) console.error('[render] error:', e);
  }
}

function renderMenu(){
  // 标题：渐变色
  var titleY = H*0.18 + safeTop;
  var titleGrad = ctx.createLinearGradient(W/2 - S(0.18), titleY - sz(0.058)/2, W/2 + S(0.18), titleY + sz(0.058)/2);
  titleGrad.addColorStop(0, '#FFD700');
  titleGrad.addColorStop(0.5, '#FFA94D');
  titleGrad.addColorStop(1, '#FFD700');
  ctx.fillStyle = titleGrad;
  ctx.font = 'bold ' + sz(0.058) + 'px sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.shadowColor = '#FFD700';
  ctx.shadowBlur = S(0.008);
  ctx.fillText('记忆翻牌大师', W/2, titleY);
  ctx.shadowColor = 'rgba(0,0,0,0)';

  ctx.fillStyle = '#aaa'; ctx.font = sz(0.024) + 'px sans-serif';
  ctx.fillText('翻转卡片，配对所有图案', W/2, titleY + S(0.07));

  // 开始按钮
  var bw=SW(0.66), bh=S(0.065), bx=W/2-bw/2, by=H*0.42 + safeTop;
  drawButton(ctx, bx, by, bw, bh, '选择关卡', '#07c160', 'white', bh/2);

  // 每日挑战按钮
  var dw=SW(0.5), dh=S(0.05), dpx=W/2-dw/2, dpy=by+bh+S(0.025);
  var dstreak=loadDailyStreak(), today=new Date().toDateString(), done=dstreak.lastDate===today;
  drawButton(ctx, dpx, dpy, dw, dh, (done?'✅ 今日已完成':'📅 每日挑战'), '#9C27B0', 'white', dh/2);
  // 打卡天数
  if(dstreak.streak>0){
    ctx.fillStyle='#FFD700';ctx.font='bold '+sz(0.018)+'px sans-serif';ctx.textAlign='center';
    ctx.fillText('连续打卡: '+dstreak.streak+' 天 🔥', W/2, dpy+dh+S(0.018));
  }
  // 成就按钮
  var aw=SW(0.5), ah=S(0.045), apx=W/2-aw/2, apy=dpy+dh+S(0.025)+(dstreak.streak>0?S(0.018):0);
  // 计算已解锁数，显示红点提示
  var achCount=0; for(var ai=0;ai<ACHIEVEMENTS.length;ai++){if(isAchievementUnlocked(ACHIEVEMENTS[ai].id))achCount++;}
  drawButton(ctx, apx, apy, aw, ah, '🏆 成就 ('+achCount+'/'+ACHIEVEMENTS.length+')', '#FFD700', '#1a1a2e', ah/2);

  // 限时模式按钮
  var tw=SW(0.5), th=S(0.045), tpx=W/2-tw/2, tpy=apy+ah+S(0.018);
  drawButton(ctx, tpx, tpy, tw, th, '⏱ 限时模式', '#FF6B35', 'white', th/2);

  // 商店按钮
  var sw=SW(0.5), sh=S(0.045), spx=W/2-sw/2, spy=tpy+th+S(0.018);
  var purchasedCount = loadPurchasedItems().length;
  drawButton(ctx, spx, spy, sw, sh, '🏪 商店 (已购'+purchasedCount+')', '#FFD700', '#1a1a2e', sh/2);

  try{var best=wx.getStorageSync('best_score')||0;}catch(e){best=0;}
  if(best>0){ctx.fillStyle='#888';ctx.font=sz(0.022)+'px sans-serif';ctx.fillText('最高分: '+best,W/2,H*0.62+safeTop);}
  // 金币显示
  var coins = state.coins > 0 ? state.coins : loadCoins();
  state.coins = coins;
  ctx.fillStyle='#FFD700';ctx.font='bold '+sz(0.02)+'px sans-serif';ctx.textAlign='right';
  ctx.fillText('💰 '+coins, W-S(0.03), H*0.62+safeTop+sz(0.03));
  ctx.textAlign='center';
  var unlocked=0;for(var i=1;i<=15;i++)if(isLevelUnlocked(i))unlocked++;
  ctx.fillStyle='#666';ctx.font=sz(0.020)+'px sans-serif';ctx.fillText('已解锁 '+unlocked+' / 15 关',W/2,H*0.89+safeTop);
}

function renderLevels(){
  try {
    var titleTop = safeTop + S(0.075);
    ctx.fillStyle='#FFD700';ctx.font='bold '+sz(0.046)+'px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText('选择关卡',W/2,titleTop);
    var levelsPerPage=8,page=(state.levelPage>0)?state.levelPage:0,maxPage=Math.ceil(LEVELS.length/levelsPerPage)-1;
    var start=page*levelsPerPage,end=Math.min(start+levelsPerPage,LEVELS.length);
    var topY=safeTop + S(0.16),btnW=SW(0.72),btnH=S(0.068),gap=S(0.016);
    for(var i=start;i<end;i++){
      var idx=i-start,by=topY+idx*(btnH+gap),bx=W/2-btnW/2,level=LEVELS[i];
      var unlocked=isLevelUnlocked(level.id),stars=getStars(level.id);
      // 按钮背景
      var bgColor = unlocked ? (i%2===0 ? '#2a2a4e' : '#22223e') : '#1a1a2e';
      drawButton(ctx, bx, by, btnW, btnH,
        (unlocked?'':'🔒 ') + level.id+'. '+level.name + (unlocked?'  '+'★'.repeat(stars)+'☆'.repeat(3-stars):''),
        bgColor, unlocked?'#fff':'#555', S(0.012));
    }
    var pbY=topY+levelsPerPage*(btnH+gap)+S(0.03);
    var pageBtnW=SW(0.24),pageBtnH=S(0.045);
    if(page>0) drawButton(ctx,W/2-pageBtnW-SW(0.02),pbY,pageBtnW,pageBtnH,'◀ 上一页','#4A90D9','white',S(0.022));
    if(page<maxPage) drawButton(ctx,W/2+SW(0.02),pbY,pageBtnW,pageBtnH,'下一页 ▶','#4A90D9','white',S(0.022));
    // 底部左侧返回按钮
    var backW = SW(0.18), backH = S(0.045);
    var backX = S(0.03), backY = H - S(0.07);
    drawButton(ctx, backX, backY, backW, backH, '◀ 返回', '#666', 'white', backH/2);
  } catch(e) {
    ctx.fillStyle='#ff4444';ctx.font='bold '+sz(0.02)+'px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText('LEVELS ERROR: '+e.message, W/2, H/2);
  }
}

function renderGame(){
  var hudTop = safeTop + S(0.05); // 整体下移，避开刘海/前置摄像头
  // 返回按钮尺寸（与 handleTap 保持一致）
  var backW = SW(0.15), backH = S(0.038);
  var backX = W - backW - S(0.012), backY = hudTop + S(0.016);
  // HUD 背景
  var hudGrad = ctx.createLinearGradient(0, hudTop, 0, hudTop + S(0.07));
  hudGrad.addColorStop(0, '#0000008c');
  hudGrad.addColorStop(1, '#00000000');
  ctx.fillStyle = hudGrad;
  ctx.fillRect(0, hudTop, W, S(0.07));

  ctx.fillStyle='white';ctx.font=sz(0.018)+'px sans-serif';ctx.textAlign='left';ctx.textBaseline='middle';
  ctx.fillText('分数: '+state.score,S(0.02),hudTop+S(0.035));
  // 限时模式 HUD
  if(state.isTimedMode){
    ctx.fillStyle='#FF6B35';ctx.font='bold '+sz(0.016)+'px sans-serif';ctx.textAlign='left';
    ctx.fillText('⏱ 限时模式',S(0.02),hudTop+S(0.058));
    ctx.textAlign='center';ctx.fillStyle=state.timeLeft<=10?'#ff4444':'white';ctx.font='bold '+sz(0.024)+'px sans-serif';
    var min=Math.floor(state.timeLeft/60),sec=state.timeLeft%60;
    ctx.fillText(min+':'+String(sec).padStart(2,'0'),W/2,hudTop+S(0.035));
    ctx.fillStyle='#FFD700';ctx.font=sz(0.016)+'px sans-serif';ctx.textAlign='right';
    ctx.fillText('累计: '+state._timedPairsMatched+' 对',backX-S(0.012),hudTop+S(0.035));
    ctx.textAlign='right';ctx.fillStyle='#aaa';ctx.font=sz(0.014)+'px sans-serif';
    ctx.fillText('本局: '+state.matched+'/'+state.totalPairs,backX-S(0.012),hudTop+S(0.058));
  } else {
    ctx.textAlign='center';var min=Math.floor(state.timeLeft/60),sec=state.timeLeft%60;
    ctx.fillStyle=state.timeLeft<=30?'#ff4444':'white';ctx.font='bold '+sz(0.024)+'px sans-serif';
    ctx.fillText(min+':'+String(sec).padStart(2,'0'),W/2,hudTop+S(0.035));
    ctx.textAlign='right';ctx.fillStyle='white';ctx.font=sz(0.018)+'px sans-serif';
    ctx.fillText('尝试: '+state.moves,backX-S(0.012),hudTop+S(0.035));
  }

  // 返回按钮 — OVER 界面有自己的按钮，不重复显示
  if(state.phase!=='OVER'){
    drawButton(ctx, backX, backY, backW, backH, '◀ 退出', '#993333', 'white', backH/2);
  }

  // 连击显示（静态，配合动画）
  if(state.combo>1){
    ctx.fillStyle='#FFD700';ctx.font='bold '+sz(0.02)+'px sans-serif';ctx.textAlign='center';
    ctx.fillText('连击 x'+state.combo,W/2,hudTop+S(0.1));
  }

  // ===== 道具栏（游戏界面底部）=====
  if(state.phase==='PLAYING'||state.phase==='SHOWING'){
    var pw=S(0.072), ph=S(0.04), px=W/2-pw*2-S(0.008), py=H-S(0.065);
    var icons=['🔍','💡','⏱️','🔄'];
    var keys=['peek','hint','freeze','shuffle'];
    var names=['偷看','提示','冻结','洗牌'];
    var colors=['#4A90D9','#FFA94D','#00BCD4','#9C27B0'];
    for(var i=0;i<4;i++){
      var bx=px+i*(pw+S(0.008)), have=state.powerUps[keys[i]]||0;
      // 按钮背景
      ctx.fillStyle=have>0?colors[i]:'#333';
      ctx.beginPath(); drawRoundRect(ctx,bx,py,pw,ph,ph*0.3); ctx.fill();
      // 图标+数量
      ctx.fillStyle=have>0?'white':'#777'; ctx.font=sz(0.018)+'px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(icons[i]+(have>0?'×'+have:''), bx+pw/2, py+ph/2);
      // 记录点击区域（供 handleTap 使用）
    }
    // 金币显示（右下角）
    ctx.fillStyle='#FFD700'; ctx.font='bold '+sz(0.018)+'px sans-serif'; ctx.textAlign='right'; ctx.textBaseline='middle';
    ctx.fillText('💰'+state.coins, W-S(0.02), py+ph/2);
    ctx.textAlign='center';
  }

  state.cards.forEach(function(c){c.draw(ctx);});
  // 道具特效渲染（提示高亮、冻结图标、Toast）
  if(state.phase==='PLAYING') renderPowerUpEffects(ctx);

  // 预览阶段倒计时
  if(state.phase==='SHOWING'&&state.previewEndTime){
    var remaining=Math.max(0,Math.ceil((state.previewEndTime-Date.now())/1000));
    ctx.fillStyle='rgba(0,0,0,0.6)';ctx.fillRect(0,hudTop,W,S(0.07));
    ctx.fillStyle='#FFD700';ctx.font='bold '+sz(0.024)+'px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText('记住位置!  '+remaining+'s',W/2,hudTop+S(0.035));
    // 预览阶段也显示返回按钮
    if(state.phase!=='OVER') drawButton(ctx, backX, backY, backW, backH, '◀ 退出', '#993333', 'white', backH/2);
  }
}

function renderOver(){
  renderGame();
  // 遮罩
  ctx.fillStyle='rgba(0,0,0,0.78)';ctx.fillRect(0,0,W,H);
  var cx=W/2;
  // 整体内容区
  var topY = H * 0.22;
  var lineHeight = S(0.044); // 每行固定间距

  // 限时模式特殊显示
  if(state.isTimedMode){
    // 标题
    ctx.fillStyle='#FF6B35';ctx.font='bold '+sz(0.044)+'px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText('时间到!',cx,topY);
    // 数据区
    var y = topY + S(0.065);
    // 总配对数
    ctx.fillStyle='#FFD700';ctx.font='bold '+sz(0.03)+'px sans-serif';
    ctx.fillText('累计配对: '+state._timedPairsMatched+' 对',cx,y);
    y += lineHeight;
    // 得分
    ctx.fillStyle='white';ctx.font='bold '+sz(0.03)+'px sans-serif';
    ctx.fillText('得分: '+state.score,cx,y);
    y += lineHeight;
    // 最大连击
    var stats = getAchStats();
    ctx.fillStyle='#aaa';ctx.font=sz(0.024)+'px sans-serif';
    ctx.fillText('最大连击: '+(stats.maxCombo||0)+'x',cx,y);
    y += lineHeight;
    // 金币奖励
    if(state._coinReward>0){
      ctx.fillStyle='#FFD700';ctx.font='bold '+sz(0.024)+'px sans-serif';
      ctx.fillText('💰 +'+state._coinReward+' 金币',cx,y);
      y += lineHeight;
    }
    // 当前金币总数
    ctx.fillStyle='#999';ctx.font=sz(0.018)+'px sans-serif';
    ctx.fillText('总金币: '+state.coins,cx,y);
    y += lineHeight;
    // 按钮区域
    var L = getOverButtonLayout();
    drawButton(ctx,cx-L.btnW/2,L.btnBottomY,L.btnW,L.btnH,'再来一局','#FF6B35','white',S(0.022));
    drawButton(ctx,cx-SW(0.12),L.btnBottomY+L.btnH+S(0.016),SW(0.24),S(0.036),'主页','#444','#aaa',S(0.017));
    return;
  }

  // 过关标题
  ctx.fillStyle=state.lastWin?'#4CAF50':'#ff4444';
  ctx.font='bold '+sz(0.044)+'px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText(state.lastWin?'过关!':'时间到!',cx,topY);

  // 星星（标题下方）
  var st=state.lastStars||0,starText='';
  for(var i=0;i<3;i++)starText+=i<st?'★':'☆';
  var y = topY + S(0.058);
  ctx.font=sz(0.048)+'px sans-serif';
  ctx.fillStyle='#FFD700';
  ctx.fillText(starText,cx,y);

  // ===== 数据区：每行一项，竖向排列，永不重叠 =====
  y += S(0.065);

  // 得分
  ctx.fillStyle='white';ctx.font='bold '+sz(0.03)+'px sans-serif';
  ctx.fillText('得分: '+state.score,cx,y);
  y += lineHeight;

  // 用时
  var used=(state.currentLevel.time||60)-state.timeLeft,um=Math.floor(used/60),us=used%60;
  ctx.fillStyle='#ccc';ctx.font=sz(0.024)+'px sans-serif';
  ctx.fillText('用时: '+um+'分'+String(us).padStart(2,'0')+'秒',cx,y);
  y += lineHeight;

  // 错误次数
  ctx.fillStyle='#ff8888';ctx.font=sz(0.024)+'px sans-serif';
  ctx.fillText('错误: '+state.mistakes+' 次',cx,y);
  y += lineHeight;

  // 金币奖励
  if(state._coinReward>0){
    ctx.fillStyle='#FFD700';ctx.font='bold '+sz(0.024)+'px sans-serif';
    ctx.fillText('💰 +'+state._coinReward+' 金币',cx,y);
    y += lineHeight;
  }

  // 当前金币总数
  ctx.fillStyle='#999';ctx.font=sz(0.018)+'px sans-serif';
  ctx.fillText('总金币: '+state.coins,cx,y);
  y += lineHeight;

  // 每日挑战打卡奖励
  if(state._dailyBonus>0){
    ctx.fillStyle='#4CAF50';ctx.font='bold '+sz(0.02)+'px sans-serif';
    ctx.fillText('🔥 连续打卡 '+state._streak+'天! 奖励 +'+state._dailyBonus+'金币',cx,y);
    y += lineHeight;
  }

  // ===== 按钮区域：根据内容动态定位，保证不重叠 =====
  var L = getOverButtonLayout();
  var isDaily = state.isDaily;
  if(state.lastWin&&!isDaily&&state.currentLevel.id>0&&state.currentLevel.id<LEVELS.length){
    drawButton(ctx,cx-L.btnW/2,L.btnBottomY,L.btnW,L.btnH,'下一关 ▶','#07c160','white',S(0.022));
  } else {
    var halfBtnW=(L.btnW-L.btnGap)/2;
    drawButton(ctx,cx-halfBtnW-L.btnGap/2,L.btnBottomY,halfBtnW,L.btnH,'重试','#07c160','white',S(0.022));
    // 每日挑战：失败/通关后右侧按钮都显示"主页"
    var rightLabel = isDaily ? '主页' : '关卡';
    drawButton(ctx,cx+L.btnGap/2,L.btnBottomY,halfBtnW,L.btnH,rightLabel,'#666','white',S(0.022));
  }
  drawButton(ctx,cx-SW(0.12),L.btnBottomY+L.btnH+S(0.016),SW(0.24),S(0.036),'主页','#444','#aaa',S(0.017));
}

module.exports = { render, renderMenu, renderShop, renderAchievements, renderAchievementPopup, renderLevels, renderTimedIntro, renderDailyChallenge, renderSettlement, renderOver, renderGame };
