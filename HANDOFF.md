# HANDOFF.md

## 1. 📌 项目快照

- **一句话定义**：微信小游戏平台上的记忆翻牌配对游戏，使用原生 Canvas 2D API 渲染，单文件 `game.js` 架构，包含关卡推进、限时模式、成就系统、金币商店等完整玩法循环。
- **当前完成度**：核心玩法完成度约 90%，UI 交互完成度约 80%，项目架构分层完成度约 20%（配置层和音频层已提取但未整合，当前仍以 game.js 为主入口）。

---

## 2. 🎯 下一阶段首要目标

- **硬性目标**：在微信开发者工具中做回归验证：商店购买/装备/翻页/返回、金币持久化、每日挑战结算、成就弹窗、图片资源加载。代码侧已通过 `node --check game.js`。
- **次要目标**：完成项目分层重构，将 `game.js`（当前约 2613 行）拆分为 `js/engine.js`（游戏引擎逻辑）和 `js/ui.js`（渲染层），降低后续维护成本。

---

## 3. 📊 当前状态仪表盘

- **✅ 已完成（含文件路径）**：
  1. **关卡系统**：15 关从 4×4 到 6×6 渐进难度，`LEVELS` 定义在 `game.js` / `js/config.js`。
  2. **成就系统**：成就解锁逻辑在 `checkAndUnlock()`，解锁时给 `state.coins` +50 并调用 `saveCoins()` 持久化。
  3. **商店系统**：8 个商品（7 款卡背皮肤 + 1 款成就边框），`handleTap()` 中已有 `SHOP` 分支，支持购买、装备、翻页、返回。
  4. **图片资源接入**：已生成 `images/clean/` 去水印资源；`ASSET_PATHS`、`preloadImageAssets()`、`drawAssetContain()`、`drawAssetCover()`、`drawRoundedCoverAsset()` 已接入 `game.js`。
  5. **卡背图片加载**：卡牌背面、商店缩略图、当前卡背预览已使用清理后的卡背图片；图片未加载时回退到原 Canvas/emoji 绘制。
  6. **成就弹窗 UI**：新增 `getAchievementPopupLayout()`，渲染和点击检测共用布局；修复金币奖励和“太棒了！”按钮重叠、点击无响应问题。
  7. **每日挑战基础闭环**：`getDailyChallengeLevel()` 生成日期种子关卡，结算时 `checkDailyStreak()` 发放连续打卡奖励；每日挑战结算页只保留一个“主页”按钮。
  8. **结算页 UI 修正**：主页按钮统一为白底深色字；道具栏数量前缀由 `?` 改为 `x`。
- **🔄 正在处理**：代码侧 UI/资源/交互修复已完成，等待在微信开发者工具中做完整回归验证。重点看：商店购买与装备、每日挑战重试/主页、成就弹窗关闭、金币显示与持久化、图片资源是否加载。

- **🚧 已知阻塞项**：
  1. **项目分层重构未完工**：`js/config.js`、`js/audio.js`、`js/engine.js`、`js/ui.js` 已存在，但当前实际入口仍是单文件 `game.js`。`game.refactored.js` 未启用，自动拆分脚本历史上不可靠。
  2. **缺少微信开发者工具回归结果**：当前只能确认 `node --check game.js` 通过，尚未确认模拟器/真机里的购买、装备、图片加载、成就弹窗、每日挑战结算全链路。

---

## 4. 🧠 关键架构约定

- **选型与理由**：
  - 使用微信小游戏原生 `wx.createCanvas()` API + Canvas 2D 渲染，而非第三方游戏引擎（如 Cocos/Laya），原因是项目规模小、学习成本低、包体体积小。
  - 单文件架构（`game.js`）原因是项目初期快速迭代，但当前已膨胀至约 2613 行，维护成本陡增。**必须尽快完成分层重构**。
  - 数据存储使用 `wx.getStorageSync()` / `wx.setStorageSync()` 本地存储，无后端服务器。

- **代码规范**：
  - 所有数值型 UI 尺寸必须使用 `S()` 函数（scale 函数）包装，适配不同屏幕尺寸。`S()` 定义于 `game.js` 约 8 行。
  - 安全区域顶部偏移必须使用 `safeTop` 变量（来自 `wx.getMenuButtonBoundingClientRect()`），避免刘海屏遮挡。
  - 触摸事件统一在 `handleTap(x, y)` 函数中处理，根据 `state.phase` 分发到不同阶段的点击逻辑。**新增 phase 必须在此函数中添加对应处理分支**。
  - 状态管理使用全局 `state` 对象（约 630 行），所有游戏状态集中存储。**禁止在函数中直接使用全局变量而不通过 `state` 对象**。

- **关键函数清单**（`game.js` 中的核心函数，行号基于最新版本）：
  - `S()` / `sz()` — 尺寸缩放工具函数，位于 Canvas 初始化后
  - `AudioManager` — 音频管理器 IIFE，约 13-335 行（已提取至 `js/audio.js` 但未整合）
  - `state` — 全局状态对象，集中存储阶段、金币、卡牌、道具、每日挑战等状态
  - `createBoard()` — 生成棋盘，约 800 行
  - `handleTap()` — 触摸事件分发，处理 MENU / LEVELS / SHOP / ACHIEVEMENTS / OVER / PLAYING 等阶段（**最长函数，建议拆分**）
  - `render()` — 主渲染入口，根据 `state.phase` 分发页面渲染
  - `renderMenu()` / `renderShop()` / `renderAchievements()` — 各页面渲染函数
  - `checkAndUnlock()` — 成就解锁，并发放 +50 金币奖励
  - `checkAchievementsAfterGame()` — 结算时检查普通关卡、每日挑战、连击、累计局数等成就

---

## 5. 💀 已失败的尝试（避坑指南）

- **尝试方案**：使用 `build.js` Node.js 脚本自动向 `handleTap` 函数插入 SHOP 阶段处理代码。
- **失败点**：脚本按行号插入，未考虑代码块的 brace 嵌套层级，导致 SHOP 处理代码被错误嵌套在 ACHIEVEMENTS 的 `if` 块内。进入商店后 `state.phase === 'SHOP'`，但 `handleTap` 中的 ACHIEVEMENTS 判断为 `false`，整段代码被跳过。
- **结论**：下次修改 `handleTap` 这种大函数时，**必须手动修改或使用 brace-counting 脚本精准定位插入位置**，不能依赖固定行号。已编写 `fix-shop-handler.js`（使用 brace counting）成功修复，该脚本可复用。

- **尝试方案**：使用 Python 脚本 `extract_layers_v5.py` 自动拆分 `game.js` 为分层文件。
- **失败点**：脚本的 `find_matching_bracket` 函数使用同一个 `depth` 计数器处理 `[`/`]` 和 `{`/`}`，导致数组嵌套时计数错误，`SHOP_ITEMS` 只提取了 10 行（实际 70+ 行）。虽然后来验证 `js/config.js` 内容正确（可能是缓存问题），但脚本逻辑不可靠。
- **结论**：下次做代码切片时，使用**字符级解析器**（区分字符串内的括号、转义字符），或直接在微信开发者工具中手动复制粘贴拆分，不要依赖一次性脚本。

---

## 6. 🚀 接手恢复指令（分步走）

### 第一步 环境初始化
```bash
# 1. 安装微信开发者工具（Windows 版）
#    下载地址：https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html

# 2. 导入项目
#    打开微信开发者工具 → 导入项目 → 选择目录 C:\Users\34759\MemoryCardGame-Pure
#    AppID 可使用测试号（点击"使用测试号"）

# 3. 确认项目配置
#    检查 project.config.json 中 "miniprogramRoot": "./" 是否正确
```

### 第二步 验证环境
```
在微信开发者工具中：
1. 点击"编译"按钮，模拟器应显示游戏主菜单
2. 点击"开始游戏"，应能进入关卡选择界面
3. 选择一个关卡，应能正常游玩翻牌
4. 完成一局游戏，应能看到结算画面

如果以上流程有任何一步报错，检查微信开发者工具控制台（调试器 → Console）
```

### 第三步 开始干活

**如果要修复商店交互问题**：
1. 打开 `C:/Users/34759/MemoryCardGame-Pure/game.js`
2. 搜索 `function handleTap`，定位到约 2140 行
3. 找到 `} else if (state.phase === 'SHOP') {`（约 2228 行），确认其不在任何 `if` 块内
4. 在微信开发者工具中进入商店页面，点击商品、翻页按钮、返回按钮，观察控制台是否有报错
5. 如果点击无响应，在 `handleTap` 的 SHOP 分支开头加 `console.log('SHOP tap', x, y)` 调试

**如果要完成项目分层重构**：
1. 手动备份 `game.js`：`copy game.js game.js.bak`
2. 打开 `game.refactored.js`，确认其有 `require('./js/config.js')` 和 `require('./js/audio.js')`
3. 替换：`copy game.refactored.js game.js`
4. 在微信开发者工具中测试所有功能是否正常
5. 如果正常，继续拆分 `game.js` 为 `js/engine.js` 和 `js/ui.js`

**如果要验证图片资源接入**：
1. 打开 `game.js`，搜索 `ASSET_PATHS`，确认 30 个 PNG 路径都指向 `images/clean/`。
2. 搜索 `preloadImageAssets()`，确认启动时会提交图片预加载任务。
3. 搜索 `drawRoundedCoverAsset()`，确认卡牌背面、商店缩略图、当前卡背预览都走图片绘制。
4. 在微信开发者工具中编译项目，观察控制台是否出现图片加载失败日志。
5. 进入商店切换卡背，开始游戏确认牌背图案随装备变化。

---

## 7. ⚠️ 遗留待办清单

- [ ] **微信开发者工具回归验证**：编译后完整测试主菜单、关卡、商店、成就、每日挑战、限时模式、结算页。
- [ ] **验证商店系统**：实际测试购买、装备、翻页、返回功能是否正常，并确认 `selected_card_back` 持久化。
- [ ] **金币系统闭环验证**：确认成就 +50、关卡结算奖励、每日打卡奖励都写入 `state.coins` 并持久化到 `coins`。
- [ ] **验证图片资源加载**：确认 `images/clean/` 下卡背、图标、成就、结算图在模拟器/真机中正常显示，无加载失败日志。
- [ ] **验证每日挑战**：确认日期种子关卡、重试、主页、打卡奖励、连续天数显示正常。
- [ ] **验证限时模式**：当前限时模式在 `resetTimedBoard()` 中会重置计时器，已修复但需验证。
- [ ] **完成项目分层重构**：将当前 `game.js` 拆分为 `js/engine.js` + `js/ui.js`，降低单文件维护成本。
- [ ] **音频系统完善**：当前 `AudioManager` 已定义并部分接入，仍需验证翻牌、匹配、成就、结算等音效触发。
- [ ] **性能优化**：`render()` 函数每帧重绘整个 Canvas，考虑只重绘脏区域。
- [ ] **添加游戏规则说明页面**：当前无规则说明，新用户可能不知道怎么玩。

---

## 附录：关键文件路径清单

```
C:\Users\34759\MemoryCardGame-Pure\
├── game.js              # 主入口文件（当前约 2613 行，单文件架构）
├── game.js.bak2         # 修复前的备份（可选保留或删除）
├── game.refactored.js   # 重构版入口文件（未启用）
├── js\
│   ├── config.js        # 配置层（LEVELS, ACHIEVEMENTS, SHOP_ITEMS, SYMBOLS）
│   └── audio.js         # 音频层（AudioManager + 视觉特效，未整合）
├── images\
│   ├── clean\           # 去水印后实际接入资源（卡背/图标/成就/结算）
│   ├── cardbacks\       # 原始卡背图案（7 款，AI 生成，保留作源图）
│   ├── icons\           # 原始 UI 图标（8 个，AI 生成，保留作源图）
│   ├── achievements\    # 原始成就图标（7 个，AI 生成，保留作源图）
│   └── settlement\      # 原始结算装饰（5 个，AI 生成，保留作源图）
├── fix-shop-handler.js  # 修复 SHOP 处理代码嵌套 bug 的脚本（可删除）
├── extract_layers_v5.py # 分层重构脚本（buggy，建议不用）
└── project.config.json  # 微信开发者工具项目配置
```

---

**文档生成时间**：2026-07-04 23:30 GMT+8
**文档作者**：AI 交接专家（基于对话历史自动生成）
**下一步更新**：接手者请在完成任一待办事项后更新本文档对应章节。

## 2026-07-04 图片资源接入更新
- 已生成去水印资源目录：images/clean/。原始图片保留在 images 原分类目录。
- 已接入 game.js：卡背、商店缩略图、成就列表/弹窗、道具栏、结算星级图。
- 图片加载入口：ASSET_PATHS、preloadImageAssets()、drawAssetContain()/drawAssetCover()/drawRoundedCoverAsset()。
- 失败回退：图片未加载时仍回退到原 emoji/纯色 Canvas 绘制。
- 已验证：node --check game.js 通过；ASSET_PATHS 中 30 个 PNG 路径均存在。

## 2026-07-05 交互与交接状态更新
- 已修复成就弹窗：金币奖励与“太棒了！”按钮不再重叠，按钮点击命中区扩大，并共用 `getAchievementPopupLayout()`。
- 已修复每日挑战结算页：只保留一个“主页”按钮；普通结算和限时模式主页按钮改为白底深色字。
- 已修复道具栏数量显示：`?2` / `?1` 改为 `x2` / `x1`。
- 已确认代码侧检查：`node --check game.js` 通过。
- 仍需微信开发者工具回归验证：商店、金币、图片、每日挑战、限时模式、成就弹窗。
