import assert from 'node:assert/strict';
import { analyzeHand, calculateScore, groupTiles } from './scoring.js';

let passed = 0;
function test(name, run) {
  console.log(`RUN ${name}`);
  try {
    run();
    passed += 1;
    console.log(`PASS ${name}`);
  } catch (error) {
    error.message = `${name}: ${error.message}`;
    throw error;
  }
}

const standardWin = ['1万', '2万', '3万', '1万', '2万', '3万', '4条', '5条', '6条', '7条', '8条', '9条', '5万', '5万'];
const allTriplets = ['1万', '1万', '1万', '2万', '2万', '2万', '3条', '3条', '3条', '4条', '4条', '4条', '5万', '5万'];
const sevenPairs = ['1万', '1万', '2万', '2万', '3万', '3万', '4万', '4万', '5万', '5万', '6万', '6万', '7万', '7万'];
const luxurious = ['1万', '1万', '1万', '1万', '2万', '2万', '3万', '3万', '4万', '4万', '5万', '5万', '6万', '6万'];
const eighteenLuohan = ['1万', '1万', '1万', '1万', '2万', '2万', '2万', '2万', '3万', '3万', '3万', '3万', '4万', '4万', '4万', '4万', '5万', '5万'];

test('标准四组一对可以胡牌', () => {
  const result = analyzeHand(standardWin);
  assert.equal(result.isWin, true);
  assert.equal(result.groups.filter(group => group.type === '顺子').length, 4);
  assert.equal(result.groups.some(group => group.type === '对子'), true);
});

test('大对子可以胡牌并识别特殊牌型', () => {
  const result = calculateScore(allTriplets);
  assert.equal(result.isWin, true);
  assert.equal(result.items.some(item => item.name === '大对子'), true);
  assert.equal(result.items.find(item => item.name === '大对子').explanation.includes('刻子或杠'), true);
});

test('同时可拆顺子和大对子时优先计算大对子', () => {
  const hand = ['1万', '1万', '1万', '2万', '2万', '3万', '3万', '3万', '4万', '4万', '4万', '5万', '5万', '5万'];
  const result = calculateScore(hand);
  assert.equal(result.specials.allTriplets, true);
  assert.equal(result.groups.filter(group => group.type === '大对').length, 4);
  assert.deepEqual(result.groups.find(group => group.type === '对子').tiles, ['2万', '2万']);
  assert.equal(result.total, 3);
  assert.equal(result.multiplier, 8);
  assert.deepEqual(groupTiles(hand), result.groups);
});

test('带赖子的多种拆法也优先计算大对子', () => {
  const hand = ['1万', '1万', '1万', '2万', '红中', '3万', '3万', '3万', '4万', '4万', '4万', '5万', '5万', '5万'];
  const result = calculateScore(hand);
  assert.equal(result.specials.allTriplets, true);
  assert.equal(result.groups.filter(group => group.type === '大对').length, 4);
  assert.deepEqual(result.groups.find(group => group.type === '对子').tiles, ['2万', '红中']);
  assert.equal(result.total, 3);
  assert.equal(result.multiplier, 8);
});

test('九莲宝灯支持三种花色及任意一张额外牌', () => {
  for (const suit of ['万', '条', '筒']) {
    const base = [1, 1, 1, 2, 3, 4, 5, 6, 7, 8, 9, 9, 9].map(number => `${number}${suit}`);
    for (let number = 1; number <= 9; number += 1) {
      const result = calculateScore([...base, `${number}${suit}`]);
      assert.equal(result.isWin, true);
      assert.equal(result.specials.nineGates, true);
      assert.equal(result.total, 8);
      assert.equal(result.multiplier, 256);
      assert.deepEqual(result.items.map(item => item.name), ['基础胡', '九莲宝灯', '清一色']);
    }
  }
});

test('九莲宝灯可以叠加自摸和海底捞月', () => {
  const hand = [1, 1, 1, 2, 3, 4, 5, 5, 6, 7, 8, 9, 9, 9].map(number => `${number}万`);
  const result = calculateScore(hand, { selfDraw: true, lastTileDraw: true });
  assert.equal(result.total, 10);
  assert.equal(result.multiplier, 1024);
  assert.deepEqual(result.items.map(item => item.name), ['基础胡', '九莲宝灯', '清一色', '自摸', '海底捞月']);
});

test('普通清一色和赖子补成的牌型不算九莲宝灯', () => {
  assert.equal(analyzeHand(sevenPairs).specials.nineGates, undefined);
  const base = [1, 1, 1, 2, 3, 4, 5, 6, 7, 8, 9, 9, 9].map(number => `${number}万`);
  const result = analyzeHand([...base, '红中']);
  assert.equal(result.isWin, true);
  assert.equal(result.specials.nineGates, false);
});

test('申报杠的手牌不算九莲宝灯', () => {
  const hand = [1, 1, 1, 1, 2, 3, 4, 5, 5, 6, 7, 8, 9, 9, 9].map(number => `${number}万`);
  const result = analyzeHand(hand, { exposedKong: 1 });
  assert.equal(result.isWin, true);
  assert.equal(result.specials.nineGates, false);
});

test('三门齐全不满足四川麻将缺一门', () => {
  const hand = ['1万', '2万', '3万', '4万', '5万', '6万', '1条', '2条', '3条', '7筒', '8筒', '9筒', '5万', '5万'];
  const result = analyzeHand(hand);
  assert.equal(result.isWin, false);
  assert.equal(result.reason.includes('缺一门'), true);
});

test('结构不成立的14张牌不能胡', () => {
  const hand = ['1万', '1万', '1万', '1万', '2万', '3万', '4万', '5万', '6万', '7万', '8万', '9万', '1条', '2条'];
  const result = analyzeHand(hand);
  assert.equal(result.isWin, false);
  assert.equal(result.reason.includes('四组牌和一对将'), true);
});

test('13张牌提示数量不足', () => {
  const result = analyzeHand(standardWin.slice(0, 13));
  assert.equal(result.isWin, false);
  assert.equal(result.requiredTiles, 14);
  assert.equal(result.reason.includes('还差 1 张'), true);
});

test('超过目标张数提示多选', () => {
  const result = analyzeHand([...standardWin, '9万']);
  assert.equal(result.isWin, false);
  assert.equal(result.reason.includes('多选了 1 张'), true);
});

test('单张牌最多只能出现4次', () => {
  const result = analyzeHand(['1万', '1万', '1万', '1万', '1万', '2万', '3万', '4万', '5万', '6万', '7万', '8万', '9万', '9万']);
  assert.equal(result.isWin, false);
  assert.equal(result.reason.includes('超过 4 张'), true);
});

test('不支持的牌名会被拒绝', () => {
  const result = analyzeHand([...standardWin.slice(0, 13), '东']);
  assert.equal(result.isWin, false);
  assert.equal(result.reason.includes('无法识别'), true);
});

test('七对可以胡牌', () => {
  const result = calculateScore(sevenPairs, { selfDraw: true });
  assert.equal(result.isWin, true);
  assert.deepEqual(result.items.map(item => item.name), ['基础胡', '清一色', '七对', '自摸']);
  assert.equal(result.total, 5);
});

test('豪华七对识别四张相同牌和一根', () => {
  const result = calculateScore(luxurious);
  assert.equal(result.isWin, true);
  assert.equal(result.items.some(item => item.name === '龙七对'), true);
  assert.equal(result.roots, 1);
  assert.equal(result.total, 5);
});

test('赖子可以补顺子', () => {
  const hand = ['1万', '2万', '红中', '4万', '5万', '6万', '2条', '3条', '4条', '7条', '8条', '9条', '5万', '5万'];
  const result = analyzeHand(hand);
  assert.equal(result.isWin, true);
  assert.equal(result.groups.some(group => group.type === '顺子' && group.tiles.includes('红中')), true);
});

test('赖子可以补将牌', () => {
  const hand = ['1万', '2万', '3万', '4万', '5万', '6万', '2条', '3条', '4条', '5条', '6条', '7条', '9万', '红中'];
  const result = analyzeHand(hand);
  assert.equal(result.isWin, true);
  assert.equal(result.groups.some(group => group.type === '对子' && group.tiles.includes('红中')), true);
});

test('两个赖子可以分别补两组牌', () => {
  const hand = ['1万', '2万', '红中', '4万', '5万', '红中', '2条', '2条', '2条', '7条', '8条', '9条', '5万', '5万'];
  assert.equal(analyzeHand(hand).isWin, true);
});

test('带赖子的七对可以胡牌', () => {
  const hand = ['1万', '1万', '2万', '2万', '3万', '3万', '4万', '4万', '5万', '5万', '6万', '6万', '7万', '红中'];
  const result = calculateScore(hand);
  assert.equal(result.isWin, true);
  assert.equal(result.items.some(item => item.name === '七对'), true);
});

test('红中不参与花色和根数判断', () => {
  const hand = ['红中', '红中', '1万', '1万', '2万', '2万', '3万', '3万', '4万', '4万', '5万', '5万', '6万', '6万'];
  const result = calculateScore(hand);
  assert.equal(result.suits.length, 1);
  assert.equal(result.roots, 0);
});

test('一个明杠时完整牌张数为15', () => {
  const hand = ['1万', '1万', '1万', '1万', '2万', '3万', '4万', '2条', '3条', '4条', '7条', '8条', '9条', '5万', '5万'];
  const result = analyzeHand(hand, { exposedKong: 1 });
  assert.equal(result.requiredTiles, 15);
  assert.equal(result.isWin, true);
  assert.equal(result.groups.some(group => group.type === '杠'), true);
});

test('申报杠但没有四张相同牌不能胡', () => {
  const hand = [...standardWin, '9万'];
  const result = analyzeHand(hand, { exposedKong: 1 });
  assert.equal(result.isWin, false);
  assert.equal(result.reason.includes('杠数量'), true);
});

test('14张牌配4个杠时提示还差4张', () => {
  const result = analyzeHand(sevenPairs, { exposedKong: 2, concealedKong: 1, returnKong: 1 });
  assert.equal(result.isWin, false);
  assert.equal(result.requiredTiles, 18);
  assert.equal(result.reason.includes('还差 4 张'), true);
});

test('杠总数不能超过4', () => {
  const result = analyzeHand([], { exposedKong: 3, concealedKong: 2 });
  assert.equal(result.isWin, false);
  assert.equal(result.reason.includes('最多只能有 4 个杠'), true);
});

test('十八罗汉正确识别并解释', () => {
  const result = calculateScore(eighteenLuohan, { exposedKong: 2, concealedKong: 1, returnKong: 1 });
  assert.equal(result.isWin, true);
  assert.equal(result.requiredTiles, 18);
  assert.equal(result.items.some(item => item.name === '十八罗汉'), true);
  assert.equal(result.items.find(item => item.name === '十八罗汉').explanation.includes('四个杠'), true);
  assert.equal(result.total, 12);
  assert.equal(result.multiplier, 4096);
});

test('18张但不是四杠加一对时不能算十八罗汉', () => {
  const hand = [...eighteenLuohan.slice(0, 17), '6万'];
  const result = analyzeHand(hand, { exposedKong: 2, concealedKong: 1, returnKong: 1 });
  assert.equal(result.isWin, false);
});

test('明杠暗杠回头杠分数独立计算', () => {
  const result = calculateScore(eighteenLuohan, { exposedKong: 2, concealedKong: 1, returnKong: 1 });
  assert.equal(result.kongScore, 5);
  assert.deepEqual(result.kongDetails.map(item => item.name), ['明杠', '暗杠', '回头杠']);
});

test('基础胡不加番，0番为1倍', () => {
  const result = calculateScore(standardWin);
  assert.equal(result.total, 0);
  assert.equal(result.multiplier, 1);
  assert.equal(result.items.find(item => item.name === '基础胡').fan, 0);
});

test('额外加1番时为2倍', () => {
  const result = calculateScore(standardWin, { selfDraw: true });
  assert.equal(result.total, 1);
  assert.equal(result.multiplier, 2);
});

test('无效牌型不会获得基础胡和倍数', () => {
  const result = calculateScore(standardWin.slice(0, 13));
  assert.equal(result.isWin, false);
  assert.equal(result.total, 0);
  assert.equal(result.multiplier, 0);
  assert.deepEqual(result.items, []);
});

test('海底捞月单独增加一番', () => {
  const result = calculateScore(standardWin, { lastTileDraw: true });
  assert.equal(result.items.some(item => item.name === '海底捞月'), true);
  assert.equal(result.total, 1);
});

test('海底捞月可与自摸叠加', () => {
  const result = calculateScore(standardWin, { selfDraw: true, lastTileDraw: true });
  assert.deepEqual(result.items.slice(-2).map(item => item.name), ['自摸', '海底捞月']);
  assert.equal(result.total, 2);
});

test('无效牌型不计海底捞月', () => {
  const result = calculateScore(standardWin.slice(0, 13), { lastTileDraw: true });
  assert.equal(result.total, 0);
  assert.deepEqual(result.items, []);
});

test('胡牌组合优先展示杠大对顺子对子赖子', () => {
  const grouped = groupTiles(['1万', '1万', '1万', '1万', '2条', '2条', '2条', '3筒', '4筒', '5筒', '6万', '6万', '红中', '红中']);
  assert.deepEqual(grouped.map(group => group.type), ['杠', '大对', '顺子', '对子', '赖子']);
});

test('四张相同牌允许作为输入边界', () => {
  const result = analyzeHand(luxurious);
  assert.equal(result.isWin, true);
});

test('五张红中会被拒绝', () => {
  const hand = ['红中', '红中', '红中', '红中', '红中', '1万', '2万', '3万', '4万', '5万', '6万', '7万', '8万', '9万'];
  const result = analyzeHand(hand);
  assert.equal(result.isWin, false);
  assert.equal(result.reason.includes('超过 4 张'), true);
});

test('将对替代大对子并支持将金钩钓', () => {
  const hand = ['2万','2万','2万','5万','5万','5万','8条','8条','8条','2条','2条','2条','5条','5条'];
  const result = calculateScore(hand, { goldHook: true });
  assert.equal(result.total, 4);
  assert.equal(result.items.some(item => item.name === '将对'), true);
  assert.equal(result.items.some(item => item.name === '大对子'), false);
});

test('带幺九及清幺九按组合计番', () => {
  const hand = ['1万','2万','3万','7万','8万','9万','1条','1条','1条','9条','9条','9条','1万','1万'];
  assert.equal(calculateScore(hand).total, 2);
  const clear = [1,2,3,1,2,3,7,8,9,9,9,9,1,1].map(number => `${number}万`);
  assert.equal(calculateScore(clear).total, 6);
  assert.equal(calculateScore(clear).items.some(item => item.name === '带幺九'), true);
  assert.equal(calculateScore(standardWin).items.some(item => item.name === '带幺九'), false);
});

test('龙七对双龙七对三龙七对只计一次根', () => {
  for (const [numbers, name, total] of [
    [[1,1,1,1,2,2,3,3,4,4,5,5,6,6], '龙七对', 5],
    [[1,1,1,1,2,2,2,2,3,3,4,4,5,5], '双龙七对', 6],
    [[1,1,1,1,2,2,2,2,3,3,3,3,4,4], '三龙七对', 7]
  ]) {
    const result = calculateScore(numbers.map(number => `${number}万`));
    assert.equal(result.total, total);
    assert.equal(result.items.some(item => item.name === name), true);
    assert.equal(result.items.some(item => item.name === '根'), false);
  }
});

test('门清中张天胡地胡状态计番及互斥', () => {
  assert.equal(calculateScore(standardWin, { concealedHand: true }).total, 1);
  assert.equal(calculateScore(standardWin, { heavenlyWin: true }).total, 3);
  assert.equal(calculateScore(standardWin, { earthlyWin: true }).total, 3);
  assert.equal(calculateScore(standardWin, { middleTiles: true }).total, 0);
  const hand = ['2万','3万','4万','3万','4万','5万','2条','3条','4条','6条','7条','8条','5万','5万'];
  assert.equal(calculateScore(hand, { middleTiles: true }).total, 1);
  assert.equal(calculateScore(hand).total, 0);
  assert.equal(calculateScore(hand, { heavenlyWin: true, earthlyWin: true }).isWin, false);
  assert.equal(calculateScore(allTriplets, { concealedHand: true, goldHook: true }).isWin, false);
});

test('金钩钓要求四组刻子或杠，所有状态不为无效牌加番', () => {
  assert.equal(calculateScore(standardWin, { goldHook: true }).isWin, false);
  const result = calculateScore(standardWin.slice(0, 13), { heavenlyWin: true, goldHook: true, middleTiles: true, concealedHand: true });
  assert.equal(result.total, 0);
  assert.deepEqual(result.items, []);
});

test('红中可补顺子首张中张末张且不跨花色', () => {
  const rest = ['1万','2万','3万','1条','1条','1条','9条','9条','9条','5条','5条'];
  for (const sequence of [['8万','9万','红中'], ['7万','9万','红中'], ['7万','8万','红中']]) {
    const hand = [...sequence, ...rest];
    const result = calculateScore(hand);
    assert.equal(result.isWin, true);
    assert.equal(result.groups.flatMap(group => group.tiles).sort().join(','), [...hand].sort().join(','));
  }
  assert.equal(calculateScore(['9万','1条','红中', ...rest]).isWin, false);
});

test('红中补123时正确计算带幺九', () => {
  const hand = ['2万','3万','红中','7万','8万','9万','1条','1条','1条','9条','9条','9条','9万','9万'];
  const result = calculateScore(hand);
  assert.equal(result.total, 2);
  assert.equal(result.items.some(item => item.name === '带幺九'), true);
});

test('七对与将对同时成立时选择更高番并同步展示', () => {
  const hand = ['2万','2万','2万','5万','5万','5万','8条','8条','8条','2条','2条','红中','红中','红中'];
  const result = calculateScore(hand);
  assert.equal(result.total, 3);
  assert.equal(result.multiplier, 8);
  assert.equal(result.specials.allTriplets, true);
  assert.equal(result.specials.sevenPairs, false);
  assert.deepEqual(groupTiles(hand), result.groups);
});

test('互斥胡牌事件不累计番数且提示原因', () => {
  for (const options of [
    { selfDraw: true, robKong: true },
    { selfDraw: true, kongDiscard: true },
    { lastTileDraw: true, robKong: true },
    { kongWin: true, kongDiscard: true },
    { kongDiscard: true, robKong: true },
    { heavenlyWin: true, lastTileDraw: true },
    { earthlyWin: true, kongWin: true }
  ]) {
    const result = calculateScore(standardWin, options);
    assert.equal(result.isWin, false);
    assert.equal(result.reason.includes('状态冲突'), true);
    assert.equal(result.total, 0);
    assert.deepEqual(result.items, []);
  }
  assert.equal(calculateScore(standardWin, { selfDraw: true, lastTileDraw: true }).total, 2);
  assert.equal(calculateScore(standardWin, { selfDraw: true, heavenlyWin: true }).total, 4);
});

console.log(`All ${passed} scoring tests passed`);
