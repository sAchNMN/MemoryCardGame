#!/usr/bin/env python3
"""
extract_layers_v5.py - 用最简单可靠的方法提取各层
方法：数据数组用 "];" 行定位，AudioManager 用 "})();" 定位
用法: python extract_layers_v5.py
"""
import re, os

SRC = 'C:/Users/34759/MemoryCardGame-Pure/game.js'
DST = 'C:/Users/34759/MemoryCardGame-Pure'

with open(SRC, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 去掉每行末尾的 \n
lines = [l.rstrip('\n').rstrip('\r') for l in lines]

# ---- 工具：找 "];" 所在行 ---- 
def find_closing_bracket_line(start_line, bracket='[]'):
    """从 start_line 开始，找匹配的 ]; 或 }; 行"""
    depth = 0
    for i in range(start_line, len(lines)):
        line = lines[i]
        # 简单字符扫描，处理字符串
        in_str = None
        for j, c in enumerate(line):
            if in_str:
                if c == in_str and (j == 0 or line[j-1] != '\\'):
                    in_str = None
                continue
            if c == '"' or c == "'":
                in_str = c
                continue
            if c == '[': depth += 1
            if c == ']': 
                depth -= 1
                if depth == 0:
                    if bracket == '[]' and '];' in line:
                        return i
            if c == '{': depth += 1
            if c == '}':
                depth -= 1
                if depth == 0:
                    if bracket == '{}' and '};' in line:
                        return i
        # 也检查整行是否是 "];" （处理 depth 已在上面处理的情况）
        if depth == 0 and bracket == '[]' and line.strip() == '];':
            return i
        if depth == 0 and bracket == '{}' and line.strip() == '};':
            return i
    return len(lines) - 1

# ---- Step 1: 找数据数组边界 ----
data_arrays = []
for name in ['LEVELS', 'ACHIEVEMENTS', 'SHOP_ITEMS', 'SYMBOLS']:
    # 找 "var NAME = [" 行
    start = -1
    for i, line in enumerate(lines):
        if re.match(r'var\s+' + re.escape(name) + r'\s*=\s*\[', line):
            start = i
            break
    if start < 0:
        print('[WARN] ' + name + ' not found!')
        continue
    
    # 找 ]; 行
    end = find_closing_bracket_line(start, '[]')
    
    data_arrays.append({
        'name': name,
        'start': start,
        'end': end,
    })
    print('[DATA] ' + name + ': lines ' + str(start+1) + '-' + str(end+1))
    print('   End line: ' + lines[end].strip()[:60])

# ---- Step 2: 写 js/config.js ----
config_parts = []
config_parts.append('// js/config.js - Game config data (auto-generated)')
config_parts.append('// Do not edit manually. Edit this file and re-run the script.\n')

for item in data_arrays:
    config_parts.append('// --- ' + item['name'] + ' ---')
    for i in range(item['start'], item['end'] + 1):
        config_parts.append(lines[i])
    config_parts.append('')  # empty line

config_parts.append('// --- Exports ---')
config_parts.append('module.exports = { ' + ', '.join([i['name'] for i in data_arrays]) + ' };')

config_content = '\n'.join(config_parts) + '\n'
with open(os.path.join(DST, 'js/config.js'), 'w', encoding='utf-8') as f:
    f.write(config_content)
print('\n[OK] js/config.js written')

# ---- Step 3: 找 AudioManager + 视觉特效 ----
audio_start = -1
audio_end = -1
for i, line in enumerate(lines):
    if 'var AudioManager = (function()' in line:
        audio_start = i
    if audio_start >= 0 and line.strip() == '})();':
        audio_end = i
        break

if audio_start < 0:
    print('[ERROR] AudioManager not found!')
else:
    print('\n[DATA] AudioManager: lines ' + str(audio_start+1) + '-' + str(audio_end+1))
    
    # 视觉特效：从 audio_end+1 到 LEVELS 前一行
    levels_start = data_arrays[0]['start'] if data_arrays else 501
    effects_end = levels_start - 1
    
    audio_parts = []
    audio_parts.append('// js/audio.js - Audio system + visual effects (auto-generated)\n')
    for i in range(audio_start, audio_end + 1):
        audio_parts.append(lines[i])
    audio_parts.append('\n// --- Visual effects ---\n')
    for i in range(audio_end + 1, effects_end + 1):
        audio_parts.append(lines[i])
    audio_parts.append('\nmodule.exports = { AudioManager, bgParticles, initBgParticles, updateBgParticles, drawBgParticles };')
    
    audio_content = '\n'.join(audio_parts)
    with open(os.path.join(DST, 'js/audio.js'), 'w', encoding='utf-8') as f:
        f.write(audio_content)
    print('[OK] js/audio.js written')

# ---- Step 4: 生成合并后的 game.js ----
# 策略：把已提取的部分注释掉，在开头加 require()

# 读取原始文件
with open(SRC, 'r', encoding='utf-8') as f:
    orig_lines = f.readlines()
orig_lines = [l.rstrip('\n').rstrip('\r') for l in orig_lines]

# 标记要移除的行
to_remove = set()
if audio_start >= 0:
    for i in range(audio_start, audio_end + 1):
        to_remove.add(i)
    for i in range(audio_end + 1, effects_end + 1):
        to_remove.add(i)
for item in data_arrays:
    for i in range(item['start'], item['end'] + 1):
        to_remove.add(i)

# 生成新内容
new_lines = []
new_lines.append('// game.js - Main entry (merged from layers by extract_layers_v5.py)')
new_lines.append('// Edit js/*.js for development, then re-run this script to build.\n')
new_lines.append("const { LEVELS, ACHIEVEMENTS, SHOP_ITEMS, SYMBOLS } = require('./js/config.js');")
new_lines.append("const { AudioManager } = require('./js/audio.js');\n")

kept = 0
for i, line in enumerate(orig_lines):
    if i not in to_remove:
        new_lines.append(line)
        kept += 1

game_content = '\n'.join(new_lines)
with open(os.path.join(DST, 'game.refactored.js'), 'w', encoding='utf-8') as f:
    f.write(game_content)

print('\n[OK] game.refactored.js written')
print('   Original lines: ' + str(len(orig_lines)))
print('   Refactored lines: ' + str(kept + 4))  # +4 for the require lines
print('   Removed lines: ' + str(len(to_remove)))

print('\n[NEXT STEPS]')
print('  1. Test game.refactored.js in WeChat DevTools')
print('  2. If OK, backup game.js and rename game.refactored.js to game.js')
print('  3. For development: edit js/config.js, js/audio.js, then re-run this script')
