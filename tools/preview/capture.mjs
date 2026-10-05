/**
 * 截图工装 —— 用无头 Chromium 加载 tools/preview/index.html（内含真实 game.js），
 * 逐场景截图 + 逐帧导出配对成功的动画序列，输出到 docs/screenshots/。
 *
 * 用法（仓库根目录）：
 *   "C:\Users\34759\.workbuddy\binaries\node\versions\22.22.2-3\node.exe" tools\preview\capture.mjs
 *
 * 依赖：Node 22（自带 WebSocket / fetch）+ 本机已装的 Chromium。
 * 不需要 npm install，不联网。
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const OUT = path.join(ROOT, 'docs', 'screenshots');
const PORT = 8731;
const CDP_PORT = 9333;

const CHROME_CANDIDATES = [
  path.join(process.env.LOCALAPPDATA || '', 'ms-playwright/chromium-1228/chrome-win64/chrome.exe'),
  path.join(process.env.LOCALAPPDATA || '', 'ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-win64/chrome-headless-shell.exe'),
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
];

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.css': 'text/css; charset=utf-8'
};

/* ---------------- 静态服务器 ---------------- */
function startServer() {
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(req.url.split('?')[0]);
    const filePath = path.join(ROOT, urlPath === '/' ? '/tools/preview/index.html' : urlPath);
    if (!filePath.startsWith(ROOT)) { res.writeHead(403).end(); return; }
    fs.readFile(filePath, (err, buf) => {
      if (err) { res.writeHead(404).end('not found: ' + urlPath); return; }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
      res.end(buf);
    });
  });
  return new Promise((resolve) => server.listen(PORT, '127.0.0.1', () => resolve(server)));
}

/* ---------------- CDP 客户端 ---------------- */
class CDP {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    this.sessionId = null;
    this.consoleErrors = [];
    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
        this.consoleErrors.push(msg.params.args.map((a) => a.value || a.description || '').join(' '));
      }
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
      }
    });
  }
  static async connect(url) {
    const ws = new WebSocket(url);
    await new Promise((resolve, reject) => {
      ws.addEventListener('open', resolve, { once: true });
      ws.addEventListener('error', reject, { once: true });
    });
    return new CDP(ws);
  }
  send(method, params = {}, useSession = true) {
    const id = ++this.id;
    const payload = { id, method, params };
    if (useSession && this.sessionId) payload.sessionId = this.sessionId;
    this.ws.send(JSON.stringify(payload));
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
  }
  async evaluate(expression) {
    const r = await this.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) {
      throw new Error('页面执行出错: ' + (r.exceptionDetails.exception?.description || JSON.stringify(r.exceptionDetails)));
    }
    return r.result.value;
  }
  /** 推进 n 帧，每帧 dt 毫秒（虚拟时钟） */
  async step(frames, dt = 16) {
    for (let i = 0; i < frames; i++) await this.evaluate('__step(' + dt + ')');
  }
  async shoot(file) {
    const { data } = await this.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    fs.writeFileSync(file, Buffer.from(data, 'base64'));
  }
}

/* ---------------- 场景定义 ---------------- */
// 每个场景：setup 切画面，steps 推进多少帧让动画落定
const SCENES = [
  {
    name: '01-menu',
    desc: '主菜单',
    setup: `
      __freeze();
      state.phase = 'MENU';
      state.coins = 480;
      state._tutorialPopup = null;
      state._achievementPopup = null;
      __step(16);
    `
  },
  {
    name: '02-levels',
    desc: '关卡选择',
    setup: `
      __freeze();
      state.phase = 'LEVELS';
      state.levelPage = 0;
      __step(16);
    `
  },
  {
    name: '03-preview',
    desc: '开局记忆阶段：全部翻开',
    setup: `
      __freeze();
      cleanupGame();
      startGame(LEVELS[0]);
      __freeze();
      state.cards.forEach(function(c){ c.animating=false; c.animProgress=1; c.flipAngle=Math.PI; c.flipped=true; });
      state.animating = 0;
      state.canInteract = false;
      __step(16);
    `
  },
  {
    name: '04-playing',
    desc: '对局中：已配对 / 已翻开 / 未翻三种状态',
    setup: `
      __freeze();
      cleanupGame();
      startGame(LEVELS[2]);
      __freeze();
      state.phase = 'PLAYING';
      state.canInteract = true;
      state.previewEndTime = 0;
      state.cards.forEach(function(c){ c.animating=false; c.animProgress=0; c.flipAngle=0; c.flipped=false; });
      state.animating = 0;
      var byPair = {};
      state.cards.forEach(function(c,i){ (byPair[c.pairId] = byPair[c.pairId] || []).push(i); });
      var pids = Object.keys(byPair);
      // 第 0 对：已配对（会被置灰）
      byPair[pids[0]].forEach(function(i){ var c=state.cards[i]; c.matched=true; c.flipped=true; c.animProgress=1; c.flipAngle=Math.PI; });
      // 第 1、2 对：已翻开、等待玩家点第二张
      [pids[1], pids[2]].forEach(function(pid){
        byPair[pid].forEach(function(i){ var c=state.cards[i]; c.flipped=true; c.animProgress=1; c.flipAngle=Math.PI; });
      });
      state.matched = 1; state.moves = 4; state.mistakes = 1;
      state.score = 460; state.combo = 0; state.timeLeft = 42;
      __step(16);
    `
  },
  {
    name: '05-shop',
    desc: '商店：卡背皮肤',
    setup: `
      __freeze();
      state.phase = 'SHOP';
      state._shopPage = 0;
      state.coins = 480;
      state.selectedCardBack = 'cardback_sakura';
      __step(16);
    `
  },
  {
    name: '06-achievements',
    desc: '成就墙',
    setup: `
      __freeze();
      state.phase = 'ACHIEVEMENTS';
      state._achPage = 0;
      __step(16);
    `
  },
  {
    name: '07-settlement',
    desc: '结算：三星',
    setup: `
      __freeze();
      cleanupGame();
      startGame(LEVELS[2]);
      __freeze();
      state.phase = 'PLAYING';
      state.canInteract = true;
      state.cards.forEach(function(c){ c.animating = false; });
      state.matched = state.totalPairs;
      state.moves = 9; state.mistakes = 0;
      state.score = 1280; state.timeLeft = 23;
      state._maxComboThisGame = 4;
      state.coins = 480;
      gameOver(true);
      __freeze();
      // gameOver 会解锁成就并弹窗，挡住结算画面 —— 这里只关心结算本身
      state._achievementPopup = null;
      state._tutorialPopup = null;
      __step(16);
    `
  },
  {
    name: '08-achievement-popup',
    desc: '成就解锁弹窗',
    setup: `
      __freeze();
      cleanupGame();
      startGame(LEVELS[1]);
      __freeze();
      state.phase = 'PLAYING';
      state.canInteract = true;
      state.cards.forEach(function(c){ c.animating = false; });
      state.matched = state.totalPairs;
      state.moves = 11; state.mistakes = 0;
      state.score = 940; state.timeLeft = 31;
      state.coins = 480;
      gameOver(true);
      __freeze();
      // 上面这次通关真实解锁了no_props（没使用任何道具），保留弹窗展示
      __step(16);
    `
  }
];

/* ---------------- GIF 帧：一次配对成功的完整过程 ---------------- */
// 用真实交互链路：__tap 点第一张 → 点第二张 → checkMatch 自己跑
// 帧数 / 每帧 dt 决定 GIF 时长。
// 粒子 life 是 550~900ms，飘字约 1s，所以总时长要 ≥2.5s 才看得清。
//合成时用 fps=15 降帧采样，60 帧 × 50ms = 3s 原始时长。
const GIF = { frames: 60, dt: 50, level: 2, fps: 15 };

function gifInit() {
  return `
    __freeze();
    cleanupGame();
    startGame(LEVELS[${GIF.level}]);
    __freeze();
    state.phase = 'PLAYING';
    state.canInteract = true;
    state.previewEndTime = 0;
    state.cards.forEach(function(c){ c.animating=false; c.animProgress=0; c.flipAngle=0; c.flipped=false; });
    state.animating = 0;
    state.matched = 0; state.moves = 0; state.mistakes = 0;
    state.score = 0; state.combo = 0; state.timeLeft = 58;
    burstParticles = []; floatingTexts = [];
    // 找一对同 pairId 的牌，记下屏幕坐标供 __tap 用
    var byPair = {};
    state.cards.forEach(function(c,i){ (byPair[c.pairId] = byPair[c.pairId] || []).push(i); });
    window.__pair = byPair[Object.keys(byPair)[0]];
    window.__pairXY = window.__pair.map(function(i){
      return [state.cards[i].x + state.cards[i].w/2, state.cards[i].y + state.cards[i].h/2];
    });
    // 先摆一对已配对 + 一对已翻开，画面不空
    var pids = Object.keys(byPair);
    byPair[pids[1]].forEach(function(i){ var c=state.cards[i]; c.matched=true; c.flipped=true; c.animProgress=1; c.flipAngle=Math.PI; });
    byPair[pids[2]].forEach(function(i){ var c=state.cards[i]; c.flipped=true; c.animProgress=1; c.flipAngle=Math.PI; });
    state.matched = 1; state.moves = 3; state.score = 250;
    __step(16);
  `;
}

/* ---------------- ffmpeg ---------------- */
const FFMPEG_CANDIDATES = [
  'C:/Users/34759/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-8.1.2-full_build/bin/ffmpeg.exe',
  'ffmpeg'
];
function findFfmpeg() {
  return FFMPEG_CANDIDATES.find((p) => {
    if (p === 'ffmpeg') return true;               // 交给 PATH 解析
    return fs.existsSync(p);
  }) || null;
}
function run(cmd, args) {
  return new Promise((resolve) => {
    const p = spawn(cmd, args, { stdio: 'ignore' });
    p.on('error', () => resolve(-1));
    p.on('close', (code) => resolve(code));
  });
}

/* ---------------- 主流程 ---------------- */
// 帧目录名带时间戳：避免每次运行前需要清空目录（不做批量删除）
const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const frameDir = path.join(os.tmpdir(), 'mcg-frames-' + stamp);
  fs.mkdirSync(frameDir, { recursive: true });

  const chromePath = CHROME_CANDIDATES.find((p) => p && fs.existsSync(p));
  if (!chromePath) throw new Error('找不到 Chromium/Chrome 可执行文件');
  console.log('浏览器:', chromePath);

  const server = await startServer();
  // 浏览器 profile 放系统临时目录，不污染仓库
  const profile = path.join(os.tmpdir(), 'mcg-chrome-' + stamp);

  const chrome = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=' + CDP_PORT,
    '--user-data-dir=' + profile,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
    '--hide-scrollbars',
    'about:blank'
  ], { stdio: 'ignore' });

  const cleanup = () => {
    try { chrome.kill(); } catch (e) {}
    try { server.close(); } catch (e) {}
  };
  process.on('exit', cleanup);

  let version = null;
  for (let i = 0; i < 60; i++) {
    try {
      version = await (await fetch('http://127.0.0.1:' + CDP_PORT + '/json/version')).json();
      break;
    } catch (e) { await new Promise((r) => setTimeout(r, 250)); }
  }
  if (!version) throw new Error('CDP 端口未就绪');

  const cdp = await CDP.connect(version.webSocketDebuggerUrl);
  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' }, false);
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true }, false);
  cdp.sessionId = sessionId;

  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 390, height: 844, deviceScaleFactor: 2, mobile: true
  });

  await cdp.send('Page.navigate', { url: `http://127.0.0.1:${PORT}/tools/preview/index.html` });

  let ready = false;
  for (let i = 0; i < 100; i++) {
    await new Promise((r) => setTimeout(r, 100));
    try { ready = await cdp.evaluate('!!window.__ready'); } catch (e) { /* 还在导航 */ }
    if (ready) break;
  }
  if (!ready) {
    const stats = await cdp.evaluate('JSON.stringify(window.__assetStats ? window.__assetStats() : "no-game-js")');
    throw new Error('资源未加载完成: ' + stats);
  }
  const stats = await cdp.evaluate('JSON.stringify(window.__assetStats())');
  console.log('资源加载:', stats);
  console.log('视口:', await cdp.evaluate('JSON.stringify({inner:[innerWidth,innerHeight], dpr:devicePixelRatio, canvas:[game.width,game.height]})'));

  /* --- 静帧 --- */
  for (const scene of SCENES) {
    await cdp.evaluate(scene.setup);
    await cdp.step(2);
    const file = path.join(OUT, scene.name + '.png');
    await cdp.shoot(file);
    console.log('  ✓', scene.name + '.png', '(' + scene.desc + ')', (fs.statSync(file).size / 1024).toFixed(0) + ' KB');
  }

  /* --- GIF 帧序列：真实点击两张牌 → checkMatch 触发粒子与飘字 --- */
  const pad = (n) => String(n).padStart(3, '0');
  const frameFile = (n) => path.join(frameDir, 'f' + pad(n) + '.png');
  const GIF_TOTAL = GIF.frames;
  let f = 0;

  await cdp.evaluate(gifInit());
  await cdp.step(2);
  await cdp.shoot(frameFile(f++));

  // 点第一张牌，看它翻面
  const xy = JSON.parse(await cdp.evaluate('JSON.stringify(window.__pairXY)'));
  await cdp.evaluate(`__tap(${xy[0][0]}, ${xy[0][1]})`);
  const firstTapEnd = 5;
  while (f <= firstTapEnd) { await cdp.step(1, GIF.dt); await cdp.shoot(frameFile(f++)); }

  // 点第二张牌。onCardClick 排了 350ms 的 setTimeout(checkMatch)，
  // setTimeout 走真实时间（虚拟时钟只管 rAF / Date.now），所以这里必须真等一下
  await cdp.evaluate(`__tap(${xy[1][0]}, ${xy[1][1]})`);
  await cdp.step(1, GIF.dt);
  await cdp.shoot(frameFile(f++));
  await new Promise((r) => setTimeout(r, 450));
  while (f < GIF_TOTAL) { await cdp.step(1, GIF.dt); await cdp.shoot(frameFile(f++)); }

  console.log('  ✓ GIF 帧序列', f, '帧（每帧', GIF.dt, 'ms 虚拟时间，共', (f * GIF.dt / 1000).toFixed(1) + 's）');

  /* --- 合成 GIF（ffmpeg） --- */
  const ffmpeg = findFfmpeg();
  if (!ffmpeg) {
    console.log('  ! 未找到 ffmpeg，跳过 GIF 合成。帧目录：', frameDir);
  } else {
    const gifPath = path.join(OUT, 'demo-loop.gif');
    const vf = `fps=${GIF.fps},scale=390:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer:bayer_scale=3`;
    const args = [
      '-y', '-framerate', String(Math.round(1000 / GIF.dt)),
      '-i', path.join(frameDir, 'f%03d.png'),
      '-vf', vf, '-loop', '0', gifPath
    ];
    const code = await run(ffmpeg, args);
    if (code === 0) {
      console.log('  ✓ demo-loop.gif', (fs.statSync(gifPath).size / 1024).toFixed(0) + ' KB',
        '(' + GIF.fps + ' fps, ' + (GIF.frames / GIF.fps).toFixed(1) + 's)');
    } else {
      console.log('  ! ffmpeg 退出码', code, '，GIF 未生成。帧目录：', frameDir);
    }
  }

  const uniq = [...new Set(cdp.consoleErrors)];
  if (uniq.length) {
    console.log('\n页面 console.error（game.js 自身问题，不影响出图）:');
    uniq.slice(0, 8).forEach((e) => console.log('   -', e));
  }

  console.log('\n完成 →', OUT);
  process.exit(0);
}

main().catch((e) => { console.error('失败:', e.message); process.exit(1); });
