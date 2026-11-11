#!/usr/bin/env python3
"""Gera games/<jogo>/index.html (arquivo unico, pronto para usar)
a partir de src/joiplay_fix.js + games/<jogo>/index.original.html.

Uso:  python3 build.py
"""
import os

ROOT = os.path.dirname(os.path.abspath(__file__))
MARK = '<script type="text/javascript" src="js/main.js"></script>'

with open(os.path.join(ROOT, 'src', 'joiplay_fix.js'), encoding='utf-8') as f:
    fix = f.read()
assert '</script>' not in fix, 'o conserto nao pode conter </script>'

games_dir = os.path.join(ROOT, 'games')
for game in sorted(os.listdir(games_dir)):
    original = os.path.join(games_dir, game, 'index.original.html')
    if not os.path.isfile(original):
        continue
    with open(original, encoding='utf-8') as f:
        html = f.read()
    lines = html.split('\n')
    out, done = [], False
    for line in lines:
        if MARK in line and not done:
            indent = line[:len(line) - len(line.lstrip())]
            out.append(indent + '<script type="text/javascript">')
            out.append(fix.rstrip('\n'))
            out.append(indent + '</script>')
            done = True
        out.append(line)
    assert done, game + ': nao achei a linha do main.js'
    dest = os.path.join(games_dir, game, 'index.html')
    with open(dest, 'w', encoding='utf-8') as f:
        f.write('\n'.join(out))
    print('gerado:', os.path.relpath(dest, ROOT))
