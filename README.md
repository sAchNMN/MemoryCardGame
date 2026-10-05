# 记忆翻牌大师

微信小游戏，单文件 `game.js` 架构 + Canvas 2D 渲染，无第三方依赖、无游戏引擎、无场景文件。

远端仓库：`https://github.com/sAchNMN/MemoryCardGame`

---

## ⚠️ 先读这一段：项目类型必须是「小游戏」

这是最容易踩的坑。

本项目是**微信小游戏**（入口 `game.js` + 配置 `game.json`），**不是小程序**。
小游戏项目**没有 `app.json`**。如果按小程序导入，开发者工具会报：

```
Error: app.json: 在项目根目录未找到 app.json
```

`project.config.json` 里必须是：

```json
"compileType": "game"
```

**不要**找 `miniprogramRoot` 字段 —— 那是小程序专用，小游戏项目不需要，HANDOFF.md 旧版本里写错过。

### project.config.json 不在 Git 仓库里

远端仓库根目录**没有** `project.config.json`。它在本地导入项目时由开发者工具自动生成，
所以类型可能默认写成 `miniprogram` 而出错。生成后请手动确认 `compileType` 是 `game`。

参考配置（当前项目实际使用的）：

```json
{
  "compileType": "game",
  "appid": "touristappid",
  "setting": {
    "es6": true,
    "postcss": true,
    "minified": true,
    "enhance": true
  },
  "packOptions": { "ignore": [], "include": [] }
}
```

`project.private.config.json` 已被 `.gitignore` 忽略，不用管。

---

## 导入步骤

1. 下载或克隆仓库到本地目录。
2. 打开**微信开发者工具** → **导入项目** → 项目类型选 **「小游戏」**（不是「小程序」）。
3. AppID 点「使用测试号」即可（`touristappid`）。
4. 目录选择仓库根目录（含 `game.js` 和 `game.json` 的那一层）。
5. 导入后检查 `project.config.json` 的 `compileType` 是 `game`。
6. 点「编译」。

如果已经导错了：工具右上角模式下拉从「小程序模式」切到「小游戏模式」，或直接改 `compileType` 后重开项目。

---

## 项目结构

```
MemoryCardGame/                    ← 仓库根目录（本地下载后可能叫 MemoryCardGame-main）
├── game.js                        ← 主入口，全部游戏逻辑（2611 行，当前唯一生效的入口）
├── game.js.bak2                   ← 历史备份
├── game.json                      ← 小游戏配置（方向、状态栏、网络超时）
├── game.refactored.js             ← 分层重构版入口（1872 行，未启用，见「已知问题」）
├── project.config.json            ← 项目配置（不在 git 里，本地生成）
├── project.private.config.json    ← 工具私有配置（已 gitignore）
│
├── js/                            ← 分层重构产物，当前【未接入】主流程
│   ├── config.js                  # 配置层：LEVELS / ACHIEVEMENTS / SHOP_ITEMS / SYMBOLS
│   ├── audio.js                   # 音频层：AudioManager + 背景粒子
│   ├── util.js                    # 工具层：S / sz / drawButton / shuffle
│   ├── engine.js                  # 引擎层：棋盘、计时、金币、道具（⚠️ 缺 module.exports）
│   └── ui.js                      # 渲染层：各页面 render 函数
│
├── images/
│   ├── clean/                     ← 实际接入的去水印资源（27 个 PNG）
│   │   ├── cardbacks/             # 7 张卡背
│   │   ├── icons/                 # 8 个图标
│   │   ├── achievements/          # 7 个成就图标
│   │   └── settlement/            # 5 个结算装饰
│   ├── cardbacks/                 # 原始卡背（源图）
│   ├── icons/                     # 原始图标（源图）
│   ├── achievements/              # 原始成就图标（源图）
│   └── settlement/                # 原始结算装饰（源图）
│
├── docs/                          ← 设计文档（HTML）
├── build.js                       ← 音频模块打包脚本
├── fix-shop-handler.js            ← 修 SHOP 事件嵌套 bug 的脚本（已用完，可删）
├── extract_layers_v3/v4/v5.py     ← 分层拆分脚本（v5 有 bug，不建议再用）
├── refactor.js / refactor-v2.js   ← 早期重构尝试
└── audio_manager.js               ← 早期音频尝试
```

`game.js` 引用了 24 个 `images/clean/` 下的 PNG，全部存在。
`images/clean/icons/` 里的 `home.png` / `play.png` / `retry.png` 目前**未被引用**（备用）。

---

## 玩法

1. 开局展示全部卡片（记忆阶段，时长由关卡配置 `previewTime` 决定）
2. 全部翻回背面
3. 点击翻两张，配对成功加分并翻开放置，不匹配则翻回
4. 计时归零或全部配对即结束，结算按用时/失误评星
5. 金币用于商店购买卡背皮肤和成就边框，通过 `wx.setStorageSync` 持久化
6. 每日挑战按日期种子生成关卡，连续打卡发放奖励

## 文件说明

- **`game.js`** — Canvas 渲染、卡片逻辑、游戏流程、计时计分、商店/成就/道具/每日挑战、Canvas 绘制型分享与排行榜
- **`game.json`** — `deviceOrientation: portrait`、隐藏状态栏、5 秒网络超时
- **无第三方依赖**，卡片图案用 Canvas 2D API 绘制（星/心/钻/叶/月/日/闪/雪），卡背等已改为图片加载并带 emoji/纯色回退

---

## 已知问题

- **`js/` 分层重构未完成，不要切过去**。`js/engine.js` 文件末尾只有一行注释 `// Export`，**缺 `module.exports`**，而 `js/ui.js` 依赖 `require('./engine.js')` 取 `state` —— 直接替换入口会崩。`game.refactored.js` 也只 require 了 `config.js` 和 `audio.js`，没接 engine/ui/util，同样是残缺的。
- `game.js` 2611 行单文件，`handleTap()` 是最长函数，维护成本高。
- `HANDOFF.md` 里部分行号和字段说明已过期，见该文件「2026-10-05 文档校正」章节。

---

## 后续可以加的

- [ ] 修复并完成分层重构（先补 `js/engine.js` 的 `module.exports`）
- [ ] `render()` 每帧全量重绘，改成脏矩形局部刷新
- [ ] 游戏规则说明页
- [ ] 难度选择扩展（4×4 / 4×5 / 4×6）
- [ ] 分数翻倍道具（看广告获取）
