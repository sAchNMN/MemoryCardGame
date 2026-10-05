// js/config.js - Game config data (auto-generated)
// Do not edit manually. Edit this file and re-run the script.

// --- LEVELS ---
var LEVELS = [
  { id:1,name:'初试身手',rows:4,cols:4,time:90,showPreview:true,previewTime:2500,colorMode:'bright',stars:[90,70,0] },
  { id:2,name:'渐入佳境',rows:4,cols:4,time:75,showPreview:true,previewTime:2200,colorMode:'bright',stars:[95,75,0] },
  { id:3,name:'初阶考验',rows:4,cols:4,time:60,showPreview:true,previewTime:2000,colorMode:'bright',stars:[100,80,0] },
  { id:4,name:'步入广场',rows:4,cols:5,time:120,showPreview:true,previewTime:2200,colorMode:'warm',stars:[120,90,0] },
  { id:5,name:'渐增难度',rows:4,cols:5,time:105,showPreview:true,previewTime:2000,colorMode:'cold',stars:[125,95,0] },
  { id:6,name:'中阶考验',rows:4,cols:5,time:90,showPreview:true,previewTime:1800,colorMode:'mixed',stars:[130,100,0] },
  { id:7,name:'记忆迷宫',rows:4,cols:6,time:150,showPreview:true,previewTime:2000,colorMode:'rainbow',stars:[150,110,0] },
  { id:8,name:'记忆迷宫2',rows:4,cols:6,time:135,showPreview:true,previewTime:1800,colorMode:'rainbow',stars:[155,115,0] },
  { id:9,name:'高阶考验',rows:4,cols:6,time:120,showPreview:true,previewTime:1500,colorMode:'rainbow',stars:[160,120,0] },
  { id:10,name:'极限挑战',rows:5,cols:6,time:180,showPreview:true,previewTime:1800,colorMode:'pastel',stars:[180,130,0] },
  { id:11,name:'极限挑战2',rows:5,cols:6,time:165,showPreview:true,previewTime:1500,colorMode:'pastel',stars:[185,135,0] },
  { id:12,name:'专家考验',rows:5,cols:6,time:150,showPreview:true,previewTime:1200,colorMode:'pastel',stars:[190,140,0] },
  { id:13,name:'大师之路',rows:6,cols:6,time:240,showPreview:true,previewTime:1500,colorMode:'random',stars:[220,160,0] },
  { id:14,name:'大师之路2',rows:6,cols:6,time:220,showPreview:true,previewTime:1200,colorMode:'random',stars:[230,170,0] },
  { id:15,name:'终极记忆',rows:6,cols:6,time:200,showPreview:true,previewTime:1000,colorMode:'random',stars:[240,180,0] }
];

// --- ACHIEVEMENTS ---
var ACHIEVEMENTS = [
  {id:'first_win',   icon:'🎮', name:'初次通关', desc:'完成任意一关'},
  {id:'all_levels',   icon:'👑', name:'全部通关', desc:'通关全部15关'},
  {id:'no_mistakes',  icon:'⭐', name:'完美匹配', desc:'0错误完成一关（3星）'},
  {id:'speed_run',    icon:'⚡', name:'闪电记忆', desc:'30秒内完成一关'},
  {id:'no_props',     icon:'🧠', name:'纯粹记忆', desc:'不使用任何道具通关'},
  {id:'daily_first',  icon:'📅', name:'每日打卡', desc:'完成每日挑战'},
  {id:'streak_3',    icon:'🔥', name:'连续三天', desc:'每日挑战连续打卡3天'},
  {id:'streak_7',    icon:'💎', name:'一周坚持', desc:'每日挑战连续打卡7天'},
  {id:'all_props',    icon:'🎒', name:'道具大师', desc:'在一局中使用全部4种道具'},
  {id:'games_10',     icon:'📊', name:'记忆新秀', desc:'累计游玩10局'},
  {id:'games_50',     icon:'🏆', name:'记忆高手', desc:'累计游玩50局'},
  {id:'combo_5',      icon:'🎯', name:'连击达人', desc:'一局内达成5连击'},
  {id:'timed_20',     icon:'⏱️', name:'限时达人', desc:'限时模式单局匹配20对以上'},
];

// --- SHOP_ITEMS ---
var SHOP_ITEMS = [
  { id:'cardback_classic', name:'经典卡背', icon:'🎴', price:0,   type:'cardback', desc:'默认经典卡背', color:'#1a1a2e' },
  { id:'cardback_sakura',  name:'樱花卡背', icon:'🌸', price:200, type:'cardback', desc:'浪漫樱花主题', color:'#FFB7C5' },
  { id:'cardback_ocean',   name:'海洋卡背', icon:'🌊', price:200, type:'cardback', desc:'深邃海洋波纹', color:'#1E90FF' },
  { id:'cardback_flame',   name:'火焰卡背', icon:'🔥', price:300, type:'cardback', desc:'炽热火焰纹理', color:'#FF4500' },
  { id:'cardback_starfield',name:'星空卡背', icon:'🌐', price:300, type:'cardback', desc:'神秘星空图案', color:'#191970' },
  { id:'cardback_diamond',  name:'钻石卡背', icon:'💎', price:500, type:'cardback', desc:'闪耀钻石光芒', color:'#B9F2FF' },
  { id:'cardback_china',   name:'中国红卡背',icon:'🏆', price:500, type:'cardback', desc:'中国红经典卡背', color:'#C41E3A' },
  { id:'achievement_frame',name:'成就展示框',icon:'🏆', price:800, type:'deco',     desc:'成就页金色展示框', color:'#FFD700' },
];

// --- SYMBOLS ---
var SYMBOLS = [
  // 星光主题 0-9
  '★','☆','✦','✧','✨','♦','♥','♣','♠','•',
  // 几何主题 10-19
  '■','▲','●','◆','□','△','○','◇','◐','◑',
  // 箭头主题 20-29
  '→','←','↑','↓','↗','↘','↙','↖','↔','↕',
  // 数学主题 30-39
  '∞','∑','∏','√','∆','∇','π','Ω','∫','∂',
  // 自然主题 40-49
  '☀','☁','☂','☃','☽','☾','❄','✿','❀','☘',
  // 音乐主题 50-59
  '♩','♪','♫','♬','♭','♮','♯','¶','§','†'
];

// --- Exports ---
module.exports = { LEVELS, ACHIEVEMENTS, SHOP_ITEMS, SYMBOLS };
