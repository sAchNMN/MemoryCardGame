#!/usr/bin/env python3
"""
extract_layers_v4.py - Extract game.js layers (no emoji, safe for Windows GBK console)
Usage: python extract_layers_v4.py
"""
import re, os

SRC = 'C:/Users/34759/MemoryCardGame-Pure/game.js'
DST = 'C:/Users/34759/MemoryCardGame-Pure'

with open(SRC, 'r', encoding='utf-8') as f:
    content = f.read()
lines = content.split('\n')

def find_matching_bracket(content, start_idx, open_ch='[', close_ch=']'):
    depth = 0
    in_str = None
    escaped = False
    i = start_idx
    while i < len(content):
        c = content[i]
        if escaped:
            escaped = False
            i += 1
            continue
        if c == '\\':
            escaped = True
            i += 1
            continue
        if in_str:
            if c == in_str:
                in_str = None
            i += 1
            continue
        # Skip comments
        if content[i:i+2] == '//':
            while i < len(content) and content[i] != '\n':
                i += 1
            continue
        if content[i:i+2] == '/*':
            i += 2
            while i < len(content) and content[i:i+2] != '*/':
                i += 1
            i += 2
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

# ---- Step 1: Find data array boundaries ----
data_arrays = []
for name in ['LEVELS', 'ACHIEVEMENTS', 'SHOP_ITEMS', 'SYMBOLS']:
    pattern = r'var\s+' + re.escape(name) + r'\s*=\s*(\[|\{)'
    m = re.search(pattern, content)
    if not m:
        print('[WARN] ' + name + ' not found!')
        continue
    start_idx = m.start() + len(m.group()) - 1
    start_line = content[:start_idx].count('\n') + 1
    open_ch = m.group(1)
    close_ch = ']' if open_ch == '[' else '}'
    end_idx = find_matching_bracket(content, start_idx, open_ch, close_ch)
    end_line = content[:end_idx].count('\n') + 1
    # Get the line content at end
    end_line_content = lines[end_line - 1].strip()[:60]
    data_arrays.append({
        'name': name,
        'start_line': start_line,
        'end_line': end_line,
    })
    print('[DATA] ' + name + ': lines ' + str(start_line) + '-' + str(end_line))
    print('   End: ' + end_line_content)

# ---- Step 2: Write js/config.js ----
config_lines = []
config_lines.append('// js/config.js - Game config data (auto-generated)')
config_lines.append('// Do not edit manually. Edit this file and re-run the script.\n')
for item in data_arrays:
    config_lines.append('// --- ' + item['name'] + ' ---')
    start = item['start_line'] - 1
    end = item['end_line']
    config_lines.append('\n'.join(lines[start:end]))

config_lines.append('\n\n// --- Exports ---')
config_lines.append('module.exports = { ' + ', '.join([i['name'] for i in data_arrays]) + ' };')

config_content = '\n'.join(config_lines) + '\n'
with open(os.path.join(DST, 'js/config.js'), 'w', encoding='utf-8') as f:
    f.write(config_content)
print('\n[OK] js/config.js written')

# ---- Step 3: Find AudioManager IIFE boundaries ----
audio_start = None
audio_end = None
for i, line in enumerate(lines):
    if 'var AudioManager = (function()' in line:
        audio_start = i
    if audio_start is not None and line.strip() == '})();':
        audio_end = i
        break

if audio_start is None:
    print('[ERROR] AudioManager not found!')
else:
    print('\n[DATA] AudioManager: lines ' + str(audio_start+1) + '-' + str(audio_end+1))
    # Visual effects: from audio_end+1 to LEVELS start - 1
    levels_start_line = data_arrays[0]['start_line'] if data_arrays else 501
    effects_end = levels_start_line - 2
    audio_lines = lines[audio_start:audio_end+1]
    effects_lines = lines[audio_end+1:effects_end+1]
    audio_content = '// js/audio.js - Audio system + visual effects (auto-generated)\n\n'
    audio_content += '\n'.join(audio_lines) + '\n\n'
    audio_content += '// --- Visual effects ---\n\n'
    audio_content += '\n'.join(effects_lines) + '\n\n'
    audio_content += 'module.exports = { AudioManager, bgParticles, initBgParticles, updateBgParticles, drawBgParticles };\n'
    with open(os.path.join(DST, 'js/audio.js'), 'w', encoding='utf-8') as f:
        f.write(audio_content)
    print('[OK] js/audio.js written')

# ---- Step 4: Generate merged game.js ----
# Read original lines
with open(SRC, 'r', encoding='utf-8') as f:
    all_lines = f.readlines()

# Mark lines to remove
to_remove = set()
if audio_start is not None:
    for i in range(audio_start, audio_end + 1):
        to_remove.add(i)
    for i in range(audio_end + 1, effects_end + 1):
        to_remove.add(i)
for item in data_arrays:
    for i in range(item['start_line'] - 1, item['end_line']):
        to_remove.add(i)

# Build new content
new_lines = []
new_lines.append('// game.js - Main entry (merged from layers by extract_layers_v4.py)')
new_lines.append('// Edit js/*.js for development, then re-run this script to build.\n')
new_lines.append("const { LEVELS, ACHIEVEMENTS, SHOP_ITEMS, SYMBOLS } = require('./js/config.js');")
new_lines.append("const { AudioManager } = require('./js/audio.js');\n")

for i, line in enumerate(all_lines):
    if i not in to_remove:
        new_lines.append(line.rstrip('\n'))

game_content = '\n'.join(new_lines)
with open(os.path.join(DST, 'game.refactored.js'), 'w', encoding='utf-8') as f:
    f.write(game_content)

print('\n[OK] game.refactored.js written')
print('   Original lines: ' + str(len(all_lines)))
print('   Refactored lines: ' + str(len(new_lines)))
print('   Removed lines: ' + str(len(to_remove)))

print('\n[NEXT STEPS]')
print('  1. Test game.refactored.js in WeChat DevTools')
print('  2. If OK, backup game.js and rename game.refactored.js to game.js')
print('  3. For development: edit js/config.js, js/audio.js, then re-run this script')
