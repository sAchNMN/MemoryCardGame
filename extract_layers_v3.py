#!/usr/bin/env python3
"""
extract_layers_v3.py — 用 Python 正确提取 game.js 的各层
用法: python extract_layers_v3.py
"""
import re, os

SRC = 'C:/Users/34759/MemoryCardGame-Pure/game.js'
DST = 'C:/Users/34759/MemoryCardGame-Pure'

with open(SRC, 'r', encoding='utf8') as f:
    content = f.read()
lines = content.split('\n')

def find_matching_bracket(content, start_idx, open_ch='[', close_ch=']'):
    """
    从 start_idx（指向 open_ch 字符）开始，找到匹配的 close_ch 位置。
    正确处理嵌套、字符串、注释。
    """
    depth = 0
    in_str = None   # None, '"', "'", '`'
    escaped = False
    in_line_comment = False
    in_block_comment = False
    
    i = start_idx
    while i < len(content):
        c = content[i]
        
        # 处理转义
        if escaped:
            escaped = False
            i += 1
            continue
        if c == '\\':
            escaped = True
            i += 1
            continue
        
        # 处理字符串
        if in_str:
            if c == in_str:
                # 检查是否是结束引号（前面不是转义）
                in_str = None
            i += 1
            continue
        
        if content[i:i+2] == '//' and not in_line_comment:
            in_line_comment = True
            i += 2
            continue
        if c == '\n':
            in_line_comment = False
            i += 1
            continue
        if content[i:i+2] == '/*' and not in_block_comment:
            in_block_comment = True
            i += 2
            continue
        if content[i:i+2] == '*/' and in_block_comment:
            in_block_comment = False
            i += 2
            continue
        if in_line_comment or in_block_comment:
            i += 1
            continue
        
        if c == '"' or c == "'" or c == '`':
            in_str = c
            i += 1
            continue
        
        if c == open_ch:
            depth += 1
        elif c == close_ch:
            depth -= 1
            if depth == 0:
                return i
        
        i += 1
    
    return len(content) - 1

# ── 1. 找数据数组的精确边界 ─────────────────────────
data_arrays = []
for name in ['LEVELS', 'ACHIEVEMENTS', 'SHOP_ITEMS', 'SYMBOLS']:
    # 找 "var NAME = [" 或 "var NAME = {" 
    pattern = r'var\s+' + re.escape(name) + r'\s*=\s*(\[|\{)'
    m = re.search(pattern, content)
    if not m:
        print(f'⚠️  {name} not found!')
        continue
    
    start_idx = m.start() + len(m.group()) - 1  # 指向 [ 或 { 的位置
    start_line = content[:start_idx].count('\n') + 1
    
    open_ch = m.group(1)
    close_ch = ']' if open_ch == '[' else '}'
    
    end_idx = find_matching_bracket(content, start_idx, open_ch, close_ch)
    # 跳到行尾（包含 ; 或换行）
    end_line = content[:end_idx].count('\n') + 1
    
    # 找 ]; 或 }; 的完整行
    # 从 end_idx 往前找到行首，往后找到行尾
    line_start = content.rfind('\n', 0, end_idx) + 1
    line_end = content.find('\n', end_idx)
    if line_end == -1: line_end = len(content)
    end_line_content = content[line_start:line_end].strip()
    
    data_arrays.append({
        'name': name,
        'start_line': start_line,
        'end_line': end_line,
        'start_idx': start_idx,
        'end_idx': end_idx,
        'content': content[line_start:line_end]
    })
    print(f'[DATA] {name}: lines {start_line}-{end_line}')
    print(f'   End content: {end_line_content[:60]}')

# ── 2. 写 js/config.js ─────────────────────────────────────
config_lines = []
config_lines.append('// js/config.js — 游戏配置数据（自动生成，请勿手动编辑）')
config_lines.append('// 修改配置请编辑本文件，然后运行 extract_layers_v3.py 重新构建\n')

for item in data_arrays:
    config_lines.append('// ── ' + item['name'] + ' ──')
    # 提取从 start_line-1 到 end_line（包含）
    start = item['start_line'] - 1
    end = item['end_line']  # end_line 是 1-based，slice 要用 end
    config_lines.append('\n'.join(lines[start:end]))

config_lines.append('\n\n// ── 导出 ──')
config_lines.append('module.exports = { ' + ', '.join([i['name'] for i in data_arrays]) + ' };')

config_content = '\n'.join(config_lines) + '\n'
with open(os.path.join(DST, 'js/config.js'), 'w', encoding='utf8') as f:
    f.write(config_content)
print(f'\n✅ js/config.js written ({len(data_arrays)} arrays)')

# ── 3. 找 AudioManager IIFE 边界 ────────────────────────
audio_start = None
audio_end = None
for i, line in enumerate(lines):
    if 'var AudioManager = (function()' in line:
        audio_start = i
    if audio_start is not None and line.strip() == '})();':
        audio_end = i
        break

if audio_start is None:
    print('❌ AudioManager not found!')
else:
    print(f'\n[DATA] AudioManager: lines {audio_start+1}-{audio_end+1}')
    
    # 视觉特效系统：从 audio_end+1 到 LEVELS 前一行
    levels_start_line = data_arrays[0]['start_line'] if data_arrays else 501
    effects_end = levels_start_line - 2  # 前一行的0-based index
    
    audio_lines = lines[audio_start:audio_end+1]
    effects_lines = lines[audio_end+1:effects_end+1]
    
    audio_content = '// js/audio.js — 音频系统 + 视觉特效（自动生成）\n\n'
    audio_content += '\n'.join(audio_lines) + '\n\n'
    audio_content += '// ── 视觉特效系统 ──\n\n'
    audio_content += '\n'.join(effects_lines) + '\n\n'
    audio_content += 'module.exports = { AudioManager, bgParticles, initBgParticles, updateBgParticles, drawBgParticles };\n'
    
    with open(os.path.join(DST, 'js/audio.js'), 'w', encoding='utf8') as f:
        f.write(audio_content)
    print(f'[OK] js/audio.js written (AudioManager + effects)')

# ── 4. 生成合并后的 game.js ─────────────────────────────
# 策略：把已提取的部分替换为 require()，其余保留

# 读取当前 game.js 的所有行
with open(SRC, 'r', encoding='utf8') as f:
    all_lines = f.readlines()

# 标记要删除的行范围
to_remove = set()
# AudioManager
if audio_start is not None:
    for i in range(audio_start, audio_end + 1):
        to_remove.add(i)
# 视觉特效
if audio_start is not None:
    for i in range(audio_end + 1, effects_end + 1):
        to_remove.add(i)
# 数据数组
for item in data_arrays:
    for i in range(item['start_line'] - 1, item['end_line']):
        to_remove.add(i)

# 生成新内容
new_lines = []
new_lines.append('// game.js — 主入口（由 extract_layers_v3.py 从分层文件合并生成）\n')
new_lines.append('// 开发时请编辑 js/*.js，然后运行本脚本重新构建\n\n')
new_lines.append("const { LEVELS, ACHIEVEMENTS, SHOP_ITEMS, SYMBOLS } = require('./js/config.js');\n")
new_lines.append("const { AudioManager } = require('./js/audio.js');\n\n")

for i, line in enumerate(all_lines):
    if i not in to_remove:
        new_lines.append(line.rstrip('\n'))

game_content = '\n'.join(new_lines)
with open(os.path.join(DST, 'game.refactored.js'), 'w', encoding='utf8') as f:
    f.write(game_content)

print(f'\n[OK] game.refactored.js written')
print(f'   Original lines: {len(all_lines)}')
print(f'   Refactored lines: {len(new_lines)}')
print(f'   Removed lines: {len(to_remove)}')

print('\n[WARN] Important notes:')
print('  1. Test game.refactored.js in WeChat DevTools')
print('  2. require() needs base library >= 2.0.0')
print('  3. If test passes, rename game.refactored.js to game.js')
print('  4. Keep a backup of original game.js')
