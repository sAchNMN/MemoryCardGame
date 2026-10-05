var fs = require('fs');
var src = fs.readFileSync('game.js', 'utf8');
var lines = src.split('\n');

// ===== 1. 在 handleTap() 的 ACHIEVEMENTS 阶段和 LEVELS 阶段之间插入 SHOP 阶段 =====
// 找 ACHIEVEMENTS 阶段里返回按钮的结束位置
var insertIdx = -1;
for (var i = 0; i < lines.length; i++) {
  if (lines[i].indexOf('state.phase=\'MENU\'') >= 0 && lines[i].indexOf('return') >= 0) {
    // 检查后面几行是否是 ACHIEVEMENTS 阶段的结束
    var braceDepth = 0, started = false;
    for (var j = Math.max(0,i-20); j <= i; j++) {
      for (var k = 0; k < lines[j].length; k++) {
        if (lines[j][k] === '{') { braceDepth++; started = true; }
        if (lines[j][k] === '}') { braceDepth--; }
      }
    }
    // 如果这一行是 ACHIEVEMENTS 阶段里的 return; 那后面就是 LEVELS 阶段
    for (var nj = i+1; nj < Math.min(i+8, lines.length); nj++) {
      if (lines[nj] && lines[nj].indexOf('state.phase===\'LEVELS\'') >= 0) {
        insertIdx = i + 1; // 在 return; 行之后插入
        break;
      }
    }
    if (insertIdx >= 0) break;
  }
}
console.log('Insert SHOP handler after line:', insertIdx + 1);

if (insertIdx >= 0) {
  var shopCode = [
    '  // ===== 商店页面交互 =====',
    '  if(state.phase===\'SHOP\'){',
    '    var itemsPerPage=4, page=state._shopPage||0;',
    '    var startIdx=page*itemsPerPage, endIdx=Math.min(startIdx+itemsPerPage,SHOP_ITEMS.length);',
    '    var cardW=SW(0.72), cardH=S(0.088), cardGap=S(0.012);',
    '    var listTop=safeTop+S(0.13);',
    '    // 检测点击商品',
    '    for(var i=startIdx;i<endIdx;i++){',
    '      var iy=listTop+(i-startIdx)*(cardH+cardGap);',
    '      if(tx>=(W-cardW)/2 && tx<=(W+cardW)/2 && ty>=iy && ty<=iy+cardH){',
    '        AudioManager.play(\'button_click\');tapFeedback();',
    '        var item=SHOP_ITEMS[i];',
    '        if(isItemPurchased(item.id)){',
    '          if(item.type===\'cardback\'){ state.selectedCardBack=item.id; saveShopState(); }',
    '        } else {',
    '          var result=purchaseItem(item.id);',
    '          state._shopMsg=result.msg;',
    '          setTimeout(function(){state._shopMsg=null;},1200);',
    '        }',
    '        return;',
    '      }',
    '    }',
    '    // 翻页按钮',
    '    if(page>0){',
    '      var pageBtnW=SW(0.24), pageBtnH=S(0.045);',
    '      var prevX=W/2-pageBtnW-SW(0.02), pageY=H-S(0.09);',
    '      if(tx>=prevX&&tx<=prevX+pageBtnW&&ty>=pageY&&ty<=pageY+pageBtnH){',
    '        AudioManager.play(\'button_click\');tapFeedback();',
    '        state._shopPage--; return;',
    '      }',
    '    }',
    '    if(page<Math.ceil(SHOP_ITEMS.length/itemsPerPage)-1){',
    '      var pageBtnW=SW(0.24), pageBtnH=S(0.045);',
    '      var nextX=W/2+SW(0.02), pageY=H-S(0.09);',
    '      if(tx>=nextX&&tx<=nextX+pageBtnW&&ty>=pageY&&ty<=pageY+pageBtnH){',
    '        AudioManager.play(\'button_click\');tapFeedback();',
    '        state._shopPage++; return;',
    '      }',
    '    }',
    '    // 返回按钮',
    '    var backW=SW(0.18), backH=S(0.045);',
    '    var backX=S(0.03), backY=H-S(0.07);',
    '    if(tx>=backX&&tx<=backX+backW&&ty>=backY&&ty<=backY+backH){',
    '      AudioManager.play(\'button_click\');tapFeedback();',
    '      state.phase=\'MENU\'; return;',
    '    }',
    '    return;',
    '  }',
    ''
  ].join('\n');
  
  lines.splice(insertIdx + 1, 0, shopCode);
  console.log('SHOP handler inserted OK, total lines:', lines.length);
}

// ===== 2. 加 saveShopState 函数 =====
var savePos = -1;
for (var i = 0; i < lines.length; i++) {
  if (lines[i].indexOf('function savePurchasedItems') >= 0) { savePos = i; break; }
}
if (savePos >= 0 && src.indexOf('function saveShopState') < 0) {
  lines.splice(savePos, 0, '', 'function saveShopState(){', '  try{ wx.setStorageSync(\'selected_card_back\', state.selectedCardBack); }catch(e){}', '}');
  console.log('saveShopState added');
}

// ===== 3. 初始化时读取 selectedCardBack =====
// 在 state 定义后面加初始化
for (var i = 0; i < lines.length; i++) {
  if (lines[i].indexOf('selectedCardBack:') >= 0) {
    // 已经存在，确保有初始化
    console.log('selectedCardBack already in state');
    break;
  }
}

// ===== 4. 写回文件 =====
fs.writeFileSync('game_temp.js', lines.join('\n'), 'utf8');
console.log('Written to game_temp.js, running syntax check...');
try {
  require('child_process').execSync('node -c game_temp.js', {stdio:'inherit'});
  console.log('Syntax OK! Renaming to game.js...');
  fs.writeFileSync('game.js', lines.join('\n'), 'utf8');
  console.log('All done!');
} catch(e) {
  console.log('Syntax error, not updating game.js');
  console.log(e.message);
}
