import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync('index.html', 'utf8');

assert.match(html, /\.tiles \{[^}]*grid-template-columns: repeat\(6, minmax\(0, 1fr\)\)/s, '手机端选择牌面应使用 6 列布局');
assert.match(html, /@media \(min-width: 501px\) \{[\s\S]*?\.tiles \{ grid-template-columns: repeat\(9, minmax\(0, 1fr\)\); \}/, '501px 起应恢复 9 列布局');
assert.match(html, /const pickerTile = picker\.querySelector\('\.tile-canvas'\);\s*const tileWidth = pickerTile\?\.clientWidth \|\| 36;\s*const tileHeight = pickerTile\?\.clientHeight \|\| 54;/s, '手牌应复用选择牌面的实际尺寸');
assert.match(html, /const tileGap = 3;\s*const groupGap = 4;/s, '手牌组合间距应允许两个三张组合并排');
assert.match(html, /<label class="switch">海底捞月 <input type="checkbox" data-option="lastTileDraw"><\/label>/, '状态区应提供海底捞月开关');

for (const option of ['goldHook', 'concealedHand', 'middleTiles', 'heavenlyWin', 'earthlyWin']) {
  assert.ok(html.includes(`data-option="${option}"`), `页面应提供 ${option} 状态选项`);
}

console.log('All 10 mobile layout tests passed');
