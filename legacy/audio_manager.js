/**
 * 记忆翻牌大师 · AudioManager
 * 微信小游戏音频系统 — 程序化合成，零外部音频文件
 *
 * 兼容性策略：
 * 1. 优先使用 wx.createWebAudioContext()（基础库 2.28.0+）
 * 2. 不支持时创建静默 stub，保证游戏不崩溃、API 仍可调用
 * 3. 首次用户交互后惰性初始化，绕过自动播放策略
 */
var AudioManager = (function() {

  var _ctx = null;          // AudioContext
  var _ready = false;       // 是否已初始化
  var _inited = false;      // 是否已调用过 init
  var _currentState = '';   // 当前 BGM 状态
  var _bgmInterval = null;  // BGM 循环句柄

  // ========== 公开开关 ==========
  var api = {
    musicOn: true,
    sfxOn: true,
    masterVolume: 1.0,
    available: false
  };

  // ========== 初始化 ==========
  function init() {
    if (_inited) return;
    _inited = true;

    try {
      // 只有在 wx 环境且存在 createWebAudioContext 时才启用真实音频
      if (typeof wx !== 'undefined' && wx.createWebAudioContext) {
        _ctx = wx.createWebAudioContext();
        if (_ctx && _ctx.resume) {
          if (_ctx.state === 'suspended') {
            _ctx.resume().catch(function(){});
          }
          _ready = true;
          api.available = true;
          if (typeof console !== 'undefined' && console.log) {
            console.log('[Audio] WebAudio ready');
          }
          return;
        }
      }
    } catch (e) {
      if (typeof console !== 'undefined' && console.warn) {
        console.warn('[Audio] WebAudio init failed:', e.message || e);
      }
    }

    // 静默 fallback
    _ready = false;
    api.available = false;
    if (typeof console !== 'undefined' && console.warn) {
      console.warn('[Audio] WebAudio not supported, audio disabled');
    }
  }

  // ========== 工具：播放单音 ==========
  function playTone(freq, duration, type, volume, rampTo) {
    if (!_ready || !api.sfxOn) return;
    try {
      var osc = _ctx.createOscillator();
      var gain = _ctx.createGain();
      osc.type = type || 'sine';
      var now = _ctx.currentTime;
      osc.frequency.setValueAtTime(freq, now);
      if (rampTo !== undefined) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(rampTo, 20), now + duration);
      }
      var vol = (volume || 0.3) * api.masterVolume;
      gain.gain.setValueAtTime(Math.min(vol, 0.8), now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      osc.connect(gain);
      gain.connect(_ctx.destination);
      osc.start(now);
      osc.stop(now + duration + 0.01);
    } catch(e) {}
  }

  // ========== 工具：播放和弦 ==========
  function playChord(freqs, duration, type, volume) {
    if (!_ready || !api.sfxOn) return;
    try {
      var now = _ctx.currentTime;
      var vol = (volume || 0.25) * api.masterVolume;
      for (var i = 0; i < freqs.length; i++) {
        var osc = _ctx.createOscillator();
        var gain = _ctx.createGain();
        osc.type = type || 'sine';
        osc.frequency.setValueAtTime(freqs[i], now);
        gain.gain.setValueAtTime(Math.min(vol / freqs.length, 0.3), now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
        osc.connect(gain);
        gain.connect(_ctx.destination);
        osc.start(now);
        osc.stop(now + duration + 0.01);
      }
    } catch(e) {}
  }

  // ========== 工具：播放琶音 ==========
  function playArpeggio(freqs, noteDuration, type, volume) {
    if (!_ready || !api.sfxOn) return;
    try {
      var now = _ctx.currentTime;
      var vol = (volume || 0.25) * api.masterVolume;
      for (var i = 0; i < freqs.length; i++) {
        var osc = _ctx.createOscillator();
        var gain = _ctx.createGain();
        osc.type = type || 'triangle';
        osc.frequency.setValueAtTime(freqs[i], now + i * noteDuration);
        gain.gain.setValueAtTime(Math.min(vol, 0.3), now + i * noteDuration);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * noteDuration + noteDuration);
        osc.connect(gain);
        gain.connect(_ctx.destination);
        osc.start(now + i * noteDuration);
        osc.stop(now + i * noteDuration + noteDuration + 0.01);
      }
    } catch(e) {}
  }

  // ========== 工具：播放噪声（短促冲击） ==========
  function playNoise(duration, volume, lowpass) {
    if (!_ready || !api.sfxOn) return;
    try {
      var bufferSize = Math.floor(Math.max(duration, 0.01) * _ctx.sampleRate);
      var buffer = _ctx.createBuffer(1, bufferSize, _ctx.sampleRate);
      var data = buffer.getChannelData(0);
      for (var i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1);
      }
      var source = _ctx.createBufferSource();
      source.buffer = buffer;
      var gain = _ctx.createGain();
      var now = _ctx.currentTime;
      var vol = (volume || 0.15) * api.masterVolume;
      gain.gain.setValueAtTime(Math.min(vol, 0.5), now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      if (lowpass) {
        var filter = _ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(lowpass, now);
        source.connect(filter);
        filter.connect(gain);
      } else {
        source.connect(gain);
      }
      gain.connect(_ctx.destination);
      source.start(now);
      source.stop(now + duration + 0.01);
    } catch(e) {}
  }

  // ========== 停止 BGM ==========
  function _stopBgNodes() {
    _currentState = '';
  }

  // ========== 启动 BGM 循环 ==========
  function _startBgmLoop(notes, bpm, type, volume) {
    if (!_ready || !api.musicOn) return;
    try {
      _stopBgNodes();
      var beatDuration = 60 / bpm;
      var vol = (volume || 0.12) * api.masterVolume;
      var step = 0;

      if (_bgmInterval) clearInterval(_bgmInterval);

      function playStep() {
        if (!api.musicOn || !_ready) return;
        var note = notes[step % notes.length];
        try {
          var now = _ctx.currentTime;
          var dur = beatDuration * 0.85;
          if (note) {
            var osc = _ctx.createOscillator();
            var gain = _ctx.createGain();
            osc.type = type || 'triangle';
            osc.frequency.setValueAtTime(note, now);
            gain.gain.setValueAtTime(Math.min(vol, 0.2), now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
            gain.connect(_ctx.destination);
            osc.connect(gain);
            osc.start(now);
            osc.stop(now + dur + 0.01);
          }
          // 低音脉冲
          if (step % 4 === 0) {
            var bass = _ctx.createOscillator();
            var bg = _ctx.createGain();
            bass.type = 'sine';
            bass.frequency.setValueAtTime(110, now);
            bg.gain.setValueAtTime(Math.min(vol * 0.3, 0.08), now);
            bg.gain.exponentialRampToValueAtTime(0.001, now + dur * 0.5);
            bg.connect(_ctx.destination);
            bass.connect(bg);
            bass.start(now);
            bass.stop(now + dur * 0.5 + 0.01);
          }
          // 打击乐
          if (step % 2 === 0) {
            playNoise(0.04, 0.08, 600);
          }
        } catch(e) {}
        step++;
      }

      playStep();
      _bgmInterval = setInterval(playStep, beatDuration * 1000);
    } catch(e) {}
  }

  // ========== 播放命名音效 ==========
  function play(name) {
    if (!_ready || !api.sfxOn) return;
    switch (name) {
      case 'card_flip':
        playTone(400, 0.08, 'sine', 0.3, 800);
        break;
      case 'card_unflip':
        playTone(800, 0.08, 'sine', 0.2, 400);
        break;
      case 'card_match':
        playChord([523.25, 659.25, 783.99], 0.4, 'sine', 0.3);
        break;
      case 'card_mismatch':
        playTone(500, 0.25, 'sawtooth', 0.2, 150);
        break;
      case 'combo':
        playArpeggio([523, 659, 784, 1047], 0.08, 'triangle', 0.25);
        break;
      case 'button_click':
        playTone(1000, 0.03, 'square', 0.15);
        break;
      case 'level_up':
        playArpeggio([262, 330, 392, 523], 0.12, 'triangle', 0.3);
        setTimeout(function() { playChord([523, 659], 0.6, 'sine', 0.25); }, 50);
        break;
      case 'game_over':
        playTone(300, 1.0, 'triangle', 0.25, 60);
        break;
      case 'countdown_warn':
        playTone(880, 0.05, 'sine', 0.25);
        break;
      case 'page_turn':
        playNoise(0.08, 0.12, 2000);
        break;
      case 'star_earned':
        playTone(1200, 0.15, 'sine', 0.2, 1600);
        break;
      default:
        break;
    }
  }

  // ========== 切换 BGM 状态 ==========
  function setState(state) {
    if (!_ready || !api.musicOn) {
      _currentState = state;
      return;
    }
    if (state === _currentState) return;
    switch (state) {
      case 'MENU':
        _startBgmLoop([262, 294, 330, 392, 440], 80, 'triangle', 0.08);
        break;
      case 'SHOWING':
        _startBgmLoop([523, 587, 659, 784, 880, 1047], 90, 'triangle', 0.10);
        break;
      case 'PLAYING':
        _startBgmLoop([392, 440, 523, 587, 659, 784, 880], 100, 'triangle', 0.12);
        break;
      case 'OVER_WIN':
        _startBgmLoop([523, 659, 784, 1047, 1319], 80, 'triangle', 0.15);
        break;
      case 'OVER_LOSE':
        _startBgmLoop([196, 175, 165, 147], 60, 'triangle', 0.08);
        break;
      case 'NONE':
      default:
        _stopBgNodes();
        if (_bgmInterval) { clearInterval(_bgmInterval); _bgmInterval = null; }
        break;
    }
    _currentState = state;
  }

  // ========== 停止 BGM ==========
  function stopMusic() {
    setState('NONE');
  }

  // ========== 获取当前 BGM 状态 ==========
  function getState() {
    return _currentState;
  }

  // ========== 切换开关 ==========
  function toggleMusic() {
    api.musicOn = !api.musicOn;
    if (!api.musicOn) {
      if (_bgmInterval) { clearInterval(_bgmInterval); _bgmInterval = null; }
    } else if (_currentState && _currentState !== '' && _currentState !== 'NONE') {
      var s = _currentState;
      _currentState = '';
      setState(s);
    }
    return api.musicOn;
  }

  function toggleSFX() {
    api.sfxOn = !api.sfxOn;
    return api.sfxOn;
  }

  // ========== 导出公共接口 ==========
  api.init = init;
  api.play = play;
  api.setState = setState;
  api.stopMusic = stopMusic;
  api.toggleMusic = toggleMusic;
  api.toggleSFX = toggleSFX;
  api.getState = getState;

  return api;

})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = AudioManager;
}
