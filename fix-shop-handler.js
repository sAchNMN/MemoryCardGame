// fix-shop-handler.js
// 把错误嵌套在 ACHIEVEMENTS 块内的 SHOP 处理代码移到正确位置
const fs = require('fs');
const path = 'C:/Users/34759/MemoryCardGame-Pure/game.js';
let src = fs.readFileSync(path, 'utf8');

// 策略：找到 ACHIEVEMENTS 块的结束位置，然后把 SHOP 处理代码插到它后面
// ACHIEVEMENTS 块格式：
//   if(state.phase==='ACHIEVEMENTS'){ ... }
// SHOP 处理代码被错误插入在 ACHIEVEMENTS 块内部

// 方法：用正则找到 ACHIEVEMENTS if 块，提取其中的 SHOP 代码，移除它，再在块外追加

// 更简单的方法：直接找特征字符串，做字符串替换
// 在 ACHIEVEMENTS 块内，SHOP 代码前有注释，后有额外的 return; 和 }

// 直接构造正确结构：
// 1. 找到 "if(state.phase==='ACHIEVEMENTS'){" 的位置
// 2. 找到对应的 closing "}"（即 ACHIEVEMENTS 块结束）
// 3. 在这两者之间提取内容，去掉 SHOP 相关代码
// 4. 在 closing "}" 后插入 SHOP 处理代码

// 用 brace counting 找 ACHIEVEMENTS 块的结束位置
const achStart = src.indexOf("if(state.phase==='ACHIEVEMENTS'){");
console.log('ACHIEVEMENTS starts at offset:', achStart);

// 从 achStart 开始，计算 brace 深度，找到匹配的结束 "}"
let brace = 0;
let inStr = false, strCh = '', esc = false;
let started = false;
let achEnd = -1;
for (let i = achStart; i < src.length; i++) {
  const c = src[i];
  if (esc) { esc = false; continue; }
  if (c === '\\') { esc = true; continue; }
  if (inStr) { if (c === strCh) inStr = false; continue; }
  if (c === '"' || c === "'" || c === '`') { inStr = true; strCh = c; continue; }
  if (c === '{') { if (!started) started = true; brace++; }
  if (c === '}') { brace--; if (started && brace === 0) { achEnd = i; break; } }
}
console.log('ACHIEVEMENTS ends at offset:', achEnd, '(char:', src[achEnd], ')');

// 现在 achEnd 指向 ACHIEVEMENTS 块的 closing "}"
// 在此之前，SHOP 代码被错误嵌套在里面
// 我们把 SHOP 代码从 ACHIEVEMENTS 块内移除，放到块外

// 找 SHOP 代码在 ACHIEVEMENTS 块内的位置
const shopComment = src.indexOf('// ===== 商店页面交互 =====', achStart);
console.log('SHOP comment at offset:', shopComment);

if (shopComment === -1 || shopComment > achEnd) {
  console.log('ERROR: SHOP code not found inside ACHIEVEMENTS block');
  process.exit(1);
}

// 找 SHOP if 块的结束位置（在 ACHIEVEMENTS 块内）
// SHOP 代码从 shopComment 开始，到第一个 "  }\n    return;\n  }" 模式
const shopIfStart = src.indexOf("if(state.phase==='SHOP'){", shopComment);
console.log('SHOP if starts at offset:', shopIfStart);

// 计算 SHOP if 块的 brace 深度，找到它的结束 "}"
let brace2 = 0, started2 = false, inStr2 = false, strCh2 = '', esc2 = false;
let shopIfEnd = -1;
for (let i = shopIfStart; i < achEnd; i++) {
  const c = src[i];
  if (esc2) { esc2 = false; continue; }
  if (c === '\\') { esc2 = true; continue; }
  if (inStr2) { if (c === strCh2) inStr2 = false; continue; }
  if (c === '"' || c === "'" || c === '`') { inStr2 = true; strCh2 = c; continue; }
  if (c === '{') { if (!started2) started2 = true; brace2++; }
  if (c === '}') { brace2--; if (started2 && brace2 === 0) { shopIfEnd = i; break; } }
}
console.log('SHOP if ends at offset:', shopIfEnd);

// 提取 SHOP 处理代码（包括前面的注释）
const shopCode = src.substring(shopComment, shopIfEnd + 1);
console.log('SHOP code length:', shopCode.length);
console.log('SHOP code preview:', shopCode.substring(0, 100));

// 现在：
// 1. 从 src 中移除 shopComment 到 shopIfEnd+1 的内容（即 SHOP 代码）
// 2. 在 achEnd+1 位置（ACHIEVEMENTS 块结束后）插入 SHOP 代码
// 但注意：achEnd 的位置在移除 SHOP 代码后会变化

// 更简单：直接构造新的 handleTap 函数相关部分
// 把 src 分成三段：achStart 之前，ACHIEVEMENTS 块内容（不含SHOP），ACHIEVEMENTS 块之后
// 然后在 ACHIEVEMENTS 块结束后插入 SHOP 代码

const beforeAch = src.substring(0, achStart);

// ACHIEVEMENTS 块的内容（从 "if(..." 到 closing "}"）
// 但不包括错误嵌套的 SHOP 代码
const achBlockStart = achStart;
const achBlockContent = src.substring(achBlockStart, achEnd + 1);

// 从 achBlockContent 中移除 SHOP 代码
// SHOP 代码在 achBlockContent 中的偏移
const shopInAchOffset = shopComment - achBlockStart;
const shopInAchEndOffset = shopIfEnd + 1 - achBlockStart;
const achBlockClean = achBlockContent.substring(0, shopInAchOffset) + achBlockContent.substring(shopInAchEndOffset);

console.log('ACH block clean length:', achBlockClean.length);
console.log('ACH block clean ends with:', achBlockClean.slice(-50));

// 在 achBlockClean 的结尾 "  }\n" 之前，需要去掉可能多余的 `return;` 和 `}`
// 实际上 achBlockClean 现在已经去掉了 SHOP 代码，但可能保留了多余的缩进或 return
// 我们直接构造干净的版本

// 更直接的方法：找到 ACHIEVEMENTS 块中返回按钮代码后的 "}\n  return;\n}" 模式
// 实际上，我们看原始文件结构来构造

// 最终方案：直接字符串替换
// 把 "SHOP代码 + 多余的 return; + }" 替换成 "}\n    return;\n  }" (正确的 ACHIEVEMENTS 块结尾)
// 然后在 ACHIEVEMENTS 块结束后插入 SHOP 代码

// 我已经有 shopCode。现在构造新 src：
const afterAch = src.substring(achEnd + 1); // ACHIEVEMENTS 块之后的内容

// 新结构：beforeAch + achBlockClean + '\n' + shopCode + '\n' + afterAch
// 但 achBlockClean 的结尾可能已经正确（去掉SHOP后，应该正确关闭 ACHIEVEMENTS 块）
// 我们再检查一下 achBlockClean 的结尾

const newSrc = beforeAch + achBlockClean + '\n' + shopCode + '\n' + afterAch;

// 验证：检查新的 handleTap 函数中 SHOP 代码是否在正确位置
const testIdx = newSrc.indexOf("if(state.phase==='SHOP'){", achStart);
console.log('SHOP handler new position offset:', testIdx);
const achEndNew = newSrc.indexOf("if(state.phase==='ACHIEVEMENTS'){", achStart);
let brace3 = 0, started3 = false, inStr3 = false, strCh3 = '', esc3 = false;
let achEndNew2 = -1;
for (let i = achEndNew; i < newSrc.length; i++) {
  const c = newSrc[i];
  if (esc3) { esc3 = false; continue; }
  if (c === '\\') { esc3 = true; continue; }
  if (inStr3) { if (c === strCh3) inStr3 = false; continue; }
  if (c === '"' || c === "'" || c === '`') { inStr3 = true; strCh3 = c; continue; }
  if (c === '{') { if (!started3) started3 = true; brace3++; }
  if (c === '}') { brace3--; if (started3 && brace3 === 0) { achEndNew2 = i; break; } }
}
console.log('ACHIEVEMENTS block ends at new offset:', achEndNew2);
console.log('SHOP handler is AFTER ACHIEVEMENTS block:', testIdx > achEndNew2);

if (testIdx > achEndNew2) {
  console.log('SUCCESS: SHOP handler is now correctly placed after ACHIEVEMENTS block');
  // 备份
  fs.writeFileSync(path + '.bak2', src);
  // 写入
  fs.writeFileSync(path, newSrc, 'utf8');
  console.log('File written. Backup at:', path + '.bak2');
  // 语法检查
  const { execSync } = require('child_process');
  try {
    execSync('node -c "' + path + '"', { stdio: 'pipe' });
    console.log('Syntax check: PASSED');
  } catch (e) {
    console.log('Syntax check FAILED:', e.stderr ? e.stderr.toString() : e.message);
    // 恢复备份
    fs.writeFileSync(path, src, 'utf8');
    console.log('Original file restored');
  }
} else {
  console.log('ERROR: SHOP handler is still inside ACHIEVEMENTS block!');
  console.log('ACH end:', achEndNew2, 'SHOP start:', testIdx);
}
