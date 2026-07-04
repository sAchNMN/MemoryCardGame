// js/util.js — 工具函数（自动生成，请勿手动编辑）

function S(ratio) { return Math.floor(H * ratio); }

function sz(ratio) { return Math.floor(H * ratio); }

function drawButton(ctx, x, y, w, h, text, bgColor, textColor, radius) {
  radius = radius || h/2;
  var hovered = touchHover && touchHover.x >= x && touchHover.x <= x+w && touchHover.y >= y && touchHover.y <= y+h;
  var scale = hovered ? 1.04 : 1;
  ctx.save();
  ctx.translate(x + w/2, y + h/2);
  ctx.scale(scale, scale);
  ctx.translate(-(x + w/2), -(y + h/2));

  // 按钮阴影
  ctx.shadowColor = 'rgba(0,0,0,0.18)';
  ctx.shadowBlur = S(0.004);
  ctx.shadowOffsetY = S(0.002);

  ctx.beginPath();
  drawRoundRect(ctx, x, y, w, h, radius);
  // 渐变按钮背景（容错：颜色格式异常时降级为纯色）
  try {
    var grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, bgColor);
    grad.addColorStop(1, darkenColor(bgColor, 0.15));
    ctx.fillStyle = grad;
  } catch(e) {
    ctx.fillStyle = bgColor;
  }
  ctx.fill();

  ctx.shadowColor = 'rgba(0,0,0,0)';

  // 高光条
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.beginPath();
  drawRoundRect(ctx, x, y, w, h * 0.45, radius);
  ctx.fill();

  ctx.fillStyle = textColor || 'white';
  ctx.font = 'bold ' + sz(0.02) + 'px sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, x + w/2, y + h/2);
  ctx.restore();
}

function drawRoundRect(ctx,x,y,w,h,r){
  if(r>w/2)r=w/2; if(r>h/2)r=h/2;
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y);
  ctx.quadraticCurveTo(x+w,y,x+w,y+r); ctx.lineTo(x+w,y+h-r);
  ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h); ctx.lineTo(x+r,y+h);
  ctx.quadraticCurveTo(x,y+h,x,y+h-r); ctx.lineTo(x,y+r);
  ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath();
}

function shuffle(arr){for(var i=arr.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=arr[i];arr[i]=arr[j];arr[j]=t;}}

function tapFeedback(){try{wx.vibrateShort({type:'light'});}catch(e){}}

module.exports = { S, sz, drawButton, drawRoundRect, shuffle, tapFeedback };
