# HANDOFF.md

> **⚠️ 这是一份历史开发记录，不是当前待办清单。**
>
> 项目已于 2026-10-05 定稿为 Demo（标签 `v0.1.0-demo`），**不再迭代**。
> 下面记录的「下一阶段首要目标」「待办事项」等**均已作废**，保留只是为了说明「为什么代码长成这样」。
>
> - 想知道现在怎么跑、怎么玩、有哪些限制 → 看 [README.md](README.md)
> - 想知道分层重构为什么烂尾 → 看本文第 5 节和第 8 节（结论：别接回来）
> - 2026-10-05 之后的改动：历史文件已全部移入 `legacy/`，本文末尾的路径清单里不带 `legacy/` 前缀的路径请自行补上

---

## 1. 📌 项目快照

- **一句话定义**：微信小游戏平台上的记忆翻牌配对游戏，使用原生 Canvas 2D API 渲染，单文件 `game.js` 架构，包含关卡推进、限时模式、成就系统、金币商店等完整玩法循环。
- **当前完成度**：核心玩法完成度约 90%，UI 交互完成度约 80%，项目架构分层完成度约 20%（配置层、音频层、工具层已生成但未整合，`js/engine.js` 缺导出且未定义 `state`，当前仍以 game.js 为主入口）。
- **2026-10-05 定稿说明**：上面这个完成度是当时的评估。定稿时核心玩法与 UI 判定为「够用」，未做的部分（音效、难度选择、广告道具、排行榜后端、云存档）**明确列为 Demo 范围外**，不是遗留缺陷。

---

## 2. 🎯 下一阶段首要目标

- **硬性目标**：在微信开发者工具中做回归验证：商店购买/装备/翻页/返回、金币持久化、每日挑战结算、成就弹窗、图片资源加载。代码侧已通过 `node --check game.js`。
- **次要目标**：完成项目分层重构，将 `game.js`（当前 2611 行）拆分为 `js/engine.js`（游戏引擎逻辑）和 `js/ui.js`（渲染层），降低后续维护成本。⚠️ 前置条件：先补 `js/engine.js` 的 `state` 定义和 `module.exports`。

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
  1. **项目分层重构未完工，且比原记录更严重**：`js/config.js`、`js/audio.js`、`js/util.js`、`js/engine.js`、`js/ui.js` 均已生成且语法检查通过，但 `js/engine.js` 末尾只有注释 `// Export`、**没有 `module.exports`**，也**没有 `state` 的定义语句**（只有 3 行 require，全文 0 处 exports）。`js/ui.js` 依赖 `require('./engine.js')` 取 `state`，直接使用必崩。`game.refactored.js`（1872 行）只 require 了 `config.js` 和 `audio.js`，未接 engine/ui/util，同样残缺。
  2. **缺少微信开发者工具回归结果**：当前只能确认 `node --check` 对 game.js / game.refactored.js / js 下 5 个文件全部通过，尚未确认模拟器/真机里的购买、装备、图片加载、成就弹窗、每日挑战结算全链路。

---

## 4. 🧠 关键架构约定

- **选型与理由**：
  - 使用微信小游戏原生 `wx.createCanvas()` API + Canvas 2D 渲染，而非第三方游戏引擎（如 Cocos/Laya），原因是项目规模小、学习成本低、包体体积小。
  - 单文件架构（`game.js`）原因是项目初期快速迭代，但当前已膨胀至 2611 行，维护成本陡增。**必须尽快完成分层重构**。
  - 数据存储使用 `wx.getStorageSync()` / `wx.setStorageSync()` 本地存储，无后端服务器。
  - **项目类型是小游戏（`compileType: "game"`）**，入口 `game.js`、配置 `game.json`，**不存在 `app.json`**，也不使用 `miniprogramRoot`。

- **代码规范**：
  - 所有数值型 UI 尺寸必须使用 `S()` 函数（scale 函数）包装，适配不同屏幕尺寸。`S()` 定义于 `game.js` 开头附近。
  - 安全区域顶部偏移必须使用 `safeTop` 变量（来自 `wx.getMenuButtonBoundingClientRect()`），避免刘海屏遮挡。
  - 触摸事件统一在 `handleTap(tx, ty)` 函数中处理（第 **2340** 行），根据 `state.phase` 分发到不同阶段的点击逻辑。**新增 phase 必须在此函数中添加对应处理分支**。SHOP 分支在第 **2430** 行，写作 `if(state.phase==='SHOP'){`，不是 `} else if` 形式。
  - 状态管理使用全局 `state` 对象，所有游戏状态集中存储。**禁止在函数中直接使用全局变量而不通过 `state` 对象**。

- **关键函数清单**（`game.js` 中的核心函数，行号基于 2026-10-05 实测，共 2611 行）：
  - `S()` / `sz()` — 尺寸缩放工具函数，位于 Canvas 初始化后
  - `AudioManager` — 音频管理器 IIFE（已提取至 `js/audio.js` 但未整合）
  - `ASSET_PATHS` — 图片资源路径表，第 594 行，30 个键，指向 `images/clean/` 下 24 个唯一 PNG
  - `state` — 全局状态对象，集中存储阶段、金币、卡牌、道具、每日挑战等状态
  - `SHOP_ITEMS` — 商品定义，第 768 行
  - `render()` — 主渲染入口（约 1936 行有 `case 'SHOP': renderShop(); break;`）
  - `handleTap(tx, ty)` — 触摸事件分发，第 2340 行，处理 MENU / LEVELS / SHOP / ACHIEVEMENTS / OVER / PLAYING 等阶段（**最长函数，建议拆分**）
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
#    打开微信开发者工具 → 导入项目 → 项目类型必须选「小游戏」（不是「小程序」）
#    目录选择仓库根目录，即含 game.js 和 game.json 的那一层
#    AppID 点「使用测试号」即可（touristappid）

# 3. 确认项目配置
#    检查 project.config.json 中 "compileType": "game"
#    ⚠️ 小游戏项目没有 app.json，类型选错会报「app.json 未找到」
#    ⚠️ 不要找 miniprogramRoot，那是小程序专用字段，小游戏不需要
#    ⚠️ project.config.json 不在 Git 仓库里，是导入时工具自动生成的，记得手动核对
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
1. 打开仓库根目录下的 `game.js`（本地下载后目录名可能带 `-main` 后缀）
2. 搜索 `function handleTap`，定位到**第 2340 行**
3. 找到 `if(state.phase==='SHOP'){`，定位到**第 2430 行**，确认其不在任何 `if` 块内（注意：不是 `} else if` 形式）
4. 在微信开发者工具中进入商店页面，点击商品、翻页按钮、返回按钮，观察控制台是否有报错
5. 如果点击无响应，在 `handleTap` 的 SHOP 分支开头加 `console.log('SHOP tap', x, y)` 调试

**如果要完成项目分层重构**：
1. 手动备份 `game.js`：`copy game.js game.js.bak`
2. **先补 `js/engine.js` 的导出**：文件末尾只有一行注释 `// Export`，缺 `module.exports`。`js/ui.js` 通过 `require('./engine.js')` 取 `state`，不补会直接崩
3. 检查 `js/engine.js` 是否定义了 `state` 对象（当前文件里**没有** `state` 的定义语句，需要从 `game.js` 补过来）
4. 检查 `game.refactored.js`：当前只 require 了 `config.js` 和 `audio.js`，**没接** `engine.js` / `ui.js` / `util.js`，是残缺版本，不能直接替换入口
5. 补齐后再替换：`copy game.refactored.js game.js`
6. 在微信开发者工具中测试所有功能是否正常

**如果要验证图片资源接入**：
1. 打开 `game.js`，搜索 `ASSET_PATHS`（第 594 行），确认 30 个键值里的 PNG 路径都指向 `images/clean/`
2. 搜索 `preloadImageAssets()`，确认启动时会提交图片预加载任务
3. 搜索 `drawRoundedCoverAsset()`，确认卡牌背面、商店缩略图、当前卡背预览都走图片绘制
4. 在微信开发者工具中编译项目，观察控制台是否出现图片加载失败日志
5. 进入商店切换卡背，开始游戏确认牌背图案随装备变化

> 已验证：`game.js` 引用 24 个唯一 `images/clean/` 路径，磁盘上全部存在。
> `images/clean/icons/` 下 `home.png` / `play.png` / `retry.png` 暂未被引用（备用）。

---

## 7. ⚠️ 遗留待办清单

- [ ] **微信开发者工具回归验证**：编译后完整测试主菜单、关卡、商店、成就、每日挑战、限时模式、结算页。
- [ ] **验证商店系统**：实际测试购买、装备、翻页、返回功能是否正常，并确认 `selected_card_back` 持久化。
- [ ] **金币系统闭环验证**：确认成就 +50、关卡结算奖励、每日打卡奖励都写入 `state.coins` 并持久化到 `coins`。
- [ ] **验证图片资源加载**：确认 `images/clean/` 下卡背、图标、成就、结算图在模拟器/真机中正常显示，无加载失败日志。
- [ ] **验证每日挑战**：确认日期种子关卡、重试、主页、打卡奖励、连续天数显示正常。
- [ ] **验证限时模式**：当前限时模式在 `resetTimedBoard()` 中会重置计时器，已修复但需验证。
- [ ] **完成项目分层重构**：先把 `state` 定义和 `module.exports` 补进 `js/engine.js`，再让 `game.refactored.js` 接上 `engine.js` / `ui.js` / `util.js`，最后才替换入口。直接 `copy game.refactored.js game.js` 会崩。
- [ ] **提交 `project.config.json` 到仓库**：当前不在 git 里，每次本地导入都可能重新生成并写错 `compileType`。建议提交一份 `compileType: "game"` 的版本，或在 README 显著位置保留说明。
- [ ] **音频系统完善**：当前 `AudioManager` 已定义并部分接入，仍需验证翻牌、匹配、成就、结算等音效触发。
- [ ] **性能优化**：`render()` 函数每帧重绘整个 Canvas，考虑只重绘脏区域。
- [ ] **添加游戏规则说明页面**：当前无规则说明，新用户可能不知道怎么玩。

---

## 附录：关键文件路径清单

> **2026-10-05 更新**：历史文件已全部用 `git mv` 移入 `legacy/`，git 历史完整保留。
> 下表是定稿**前**的原始布局，供对照历史记录；**当前实际布局见 [README.md](README.md#代码结构)**。

```
<仓库根目录>/                     ← 本地下载后目录名可能带 -main 后缀
├── game.js                       # 主入口文件（2611 行，单文件架构，唯一生效入口）
├── game.js.bak2                  # 修复前的备份 → 现位于 legacy/game.js.bak2
├── game.refactored.js            # 重构版入口文件（1872 行，未启用，残缺）→ 现位于 legacy/
├── game.json                     # 小游戏配置（竖屏 / 隐藏状态栏 / 网络超时）
├── project.config.json           # 微信开发者工具项目配置（compileType 必须是 game）
├── js/                           # → 现位于 legacy/js/（未接入的分层重构）
│   ├── config.js                 # 配置层（LEVELS, ACHIEVEMENTS, SHOP_ITEMS, SYMBOLS）
│   ├── audio.js                  # 音频层（AudioManager + 背景粒子，未整合）
│   ├── util.js                   # 工具层（S, sz, drawButton, drawRoundRect, shuffle）
│   ├── engine.js                 # 引擎层（⚠️ 缺 module.exports，且未定义 state）
│   └── ui.js                     # 渲染层（依赖 engine.js 导出的 state）
├── images/
│   ├── clean/                    # 去水印后实际接入资源（27 个 PNG）
│   │   ├── cardbacks/            # 7 张卡背
│   │   ├── icons/                # 8 个图标（home/play/retry 暂未引用）
│   │   ├── achievements/         # 7 个成就图标
│   │   └── settlement/           # 5 个结算装饰
│   ├── cardbacks/                # 原始卡背图案（7 款，AI 生成，保留作源图）
│   ├── icons/                    # 原始 UI 图标（8 个，AI 生成，保留作源图）
│   ├── achievements/             # 原始成就图标（7 个，AI 生成，保留作源图）
│   └── settlement/               # 原始结算装饰（5 个，AI 生成，保留作源图）
├── docs/                         # 设计文档（HTML）+ screenshots/（截图与 GIF）
├── tools/preview/                # 截图工装（定稿时新增，不参与小游戏打包）
│   ├── index.html                #   wx API 的浏览器垫片
│   └── capture.mjs               #   无头 Chromium 截图脚本
├── fix-shop-handler.js           # → 现位于 legacy/（修 SHOP 嵌套 bug 的脚本）
├── extract_layers_v5.py          # → 现位于 legacy/（分层重构脚本，buggy，不建议再用）
└── build.js                      # → 现位于 legacy/（音频模块打包脚本）
```

---

**文档生成时间**：2026-07-04 23:30 GMT+8
**最近校正**：2026-10-05（导入失败排查 + 路径/行号/阻塞项事实核对；同日定稿为 Demo，历史文件移入 `legacy/`）
**文档作者**：AI 交接专家（基于对话历史自动生成）
**下一步更新**：项目已停止迭代，本文档不再更新。

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

## 2026-10-05 文档校正（导入失败排查 + 事实核对）

**导入失败根因**：开发者工具报 `Error: app.json: 在项目根目录未找到 app.json`。
本项目是**小游戏**而非小程序，`project.config.json` 里的 `compileType` 被写成了 `miniprogram`，
工具按小程序去找 `app.json` 自然找不到。已改为 `compileType: "game"`，原文件备份为 `project.config.json.bak-20261005`。

**为什么远端仓库没有这个 bug**：GitHub 远端根目录**不含 `project.config.json`**
（contents API 列表：.gitignore / HANDOFF.md / README.md / docs / images / js + 若干 .js/.py）。
该文件是本地导入时工具自动生成的，两个 config 的 mtime 均为导入当天，而源码是 7 月 5 日。
`.gitignore` 只忽略了 `project.private.config.json`，没忽略 `project.config.json`，但远端也从未提交过它。

**本次修正的过期内容**：
- 目录名：全文的 `MemoryCardGame-Pure` 与硬编码路径 `C:\Users\34759\MemoryCardGame-Pure` 已改为「仓库根目录」泛指。
- 第 6 步原指引检查 `miniprogramRoot: "./"` —— **该字段小程序专用，小游戏不需要，已删除并替换为检查 `compileType: "game"`**。这行错误指引很可能就是当年 `compileType` 被写错的源头。
- 行号全部实测刷新：`game.js` 2611 行（非 2613）、`handleTap` 在 2340 行（原写 2140）、SHOP 分支在 2430 行（原写 2228，且原文写成 `} else if` 形式，实际是独立 `if`）。
- 补录实测锚点：`ASSET_PATHS` 第 594 行、`SHOP_ITEMS` 第 768 行、`render()` 中 `case 'SHOP'` 第 1936 行。
- 附录文件树补全：新增 `js/util.js`（62 行）、`docs/`、`build.js`、`game.json`；标注 `images/clean/` 实际 27 个 PNG（cardbacks 7 / icons 8 / achievements 7 / settlement 5）。
- **新增阻塞项发现**：`js/engine.js` 全文 244 行只有 3 行 require，**0 处 `module.exports`**，末尾只有注释 `// Export`，且**没有 `state` 的定义语句**。`js/ui.js` 第 3 行 `require('./engine.js')` 取 `state` 必崩。`game.refactored.js` 也只接了 config 和 audio。原文只说「未完工」，实际比记录的更严重。
- 图片交叉校验：`game.js` 引用 24 个唯一 `images/clean/` 路径，磁盘全部存在（无缺失）。反向查出 `images/clean/icons/` 下 `home.png` / `play.png` / `retry.png` 未被任何代码引用。
- 语法校验：`node --check` 对 `game.js`、`game.refactored.js`、`js/` 下 5 个文件全部通过。
- **未做**：本目录当前不是 git 仓库（`git status` 报 not a git repository），未初始化、未提交。
- **仍需人工在开发者工具中回归验证**（本次仅做静态检查，未启动模拟器）。
