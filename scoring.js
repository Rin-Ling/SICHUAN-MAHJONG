const SUITS = ['万', '条', '筒'];
const TILE_NAMES = SUITS.flatMap(suit => Array.from({ length: 9 }, (_, index) => `${index + 1}${suit}`));
const TILE_INDEX = Object.fromEntries(TILE_NAMES.map((tile, index) => [tile, index]));
const VALID_TILES = new Set([...TILE_NAMES, '红中']);

function getKongCounts(options) {
  return ['exposedKong', 'concealedKong', 'returnKong'].map(key => Number(options[key]) || 0);
}

function createCounts(tiles) {
  return tiles.reduce((map, tile) => {
    map[tile] = (map[tile] || 0) + 1;
    return map;
  }, {});
}

function getSuitSet(tiles) {
  return new Set(tiles.filter(tile => tile !== '红中').map(tile => tile.slice(-1)));
}

function choose(items, count, start = 0, current = [], result = []) {
  if (current.length === count) {
    result.push([...current]);
    return result;
  }
  for (let index = start; index <= items.length - (count - current.length); index += 1) {
    current.push(items[index]);
    choose(items, count, index + 1, current, result);
    current.pop();
  }
  return result;
}

function findSevenPairsGroups(tileCounts, wildcardCount) {
  const groups = [];
  let wildcards = wildcardCount;
  let luxurious = false;

  tileCounts.forEach((count, index) => {
    const tile = TILE_NAMES[index];
    if (count === 4) luxurious = true;
    let remaining = count;
    while (remaining >= 2) {
      groups.push({ type: '对子', tiles: [tile, tile] });
      remaining -= 2;
    }
    if (remaining === 1) {
      if (wildcards === 0) {
        groups.push(null);
        return;
      }
      groups.push({ type: '对子', tiles: [tile, '红中'] });
      wildcards -= 1;
    }
  });

  if (groups.includes(null)) return null;
  while (wildcards >= 2) {
    groups.push({ type: '对子', tiles: ['红中', '红中'] });
    wildcards -= 2;
  }
  if (groups.length !== 7 || wildcards !== 0) return null;
  return { groups, luxurious };
}

function findMeldGroups(tileCounts, wildcardCount, failedStates) {
  const firstIndex = tileCounts.findIndex(count => count > 0);
  if (firstIndex === -1) {
    if (wildcardCount % 3 !== 0) return null;
    return Array.from({ length: wildcardCount / 3 }, () => ({ type: '大对', tiles: ['红中', '红中', '红中'] }));
  }

  const stateKey = `${tileCounts.join(',')}|${wildcardCount}`;
  if (failedStates.has(stateKey)) return null;
  const tile = TILE_NAMES[firstIndex];

  const sameTileCount = Math.min(3, tileCounts[firstIndex]);
  const tripletWildcards = 3 - sameTileCount;
  if (tripletWildcards <= wildcardCount) {
    const nextCounts = [...tileCounts];
    nextCounts[firstIndex] -= sameTileCount;
    const remainingGroups = findMeldGroups(nextCounts, wildcardCount - tripletWildcards, failedStates);
    if (remainingGroups) {
      return [{ type: '大对', tiles: [...Array.from({ length: sameTileCount }, () => tile), ...Array.from({ length: tripletWildcards }, () => '红中')] }, ...remainingGroups];
    }
  }

  const suitPosition = firstIndex % 9;
  if (suitPosition <= 6) {
    const sequenceIndexes = [firstIndex, firstIndex + 1, firstIndex + 2];
    const nextCounts = [...tileCounts];
    const sequenceTiles = [];
    let neededWildcards = 0;
    sequenceIndexes.forEach(index => {
      if (nextCounts[index] > 0) {
        nextCounts[index] -= 1;
        sequenceTiles.push(TILE_NAMES[index]);
      } else {
        neededWildcards += 1;
        sequenceTiles.push('红中');
      }
    });
    if (neededWildcards <= wildcardCount) {
      const remainingGroups = findMeldGroups(nextCounts, wildcardCount - neededWildcards, failedStates);
      if (remainingGroups) return [{ type: '顺子', tiles: sequenceTiles }, ...remainingGroups];
    }
  }

  failedStates.add(stateKey);
  return null;
}

function findStandardGroups(tileCounts, wildcardCount) {
  for (let index = 0; index < tileCounts.length; index += 1) {
    if (tileCounts[index] >= 2) {
      const nextCounts = [...tileCounts];
      nextCounts[index] -= 2;
      const melds = findMeldGroups(nextCounts, wildcardCount, new Set());
      if (melds) return [...melds, { type: '对子', tiles: [TILE_NAMES[index], TILE_NAMES[index]] }];
    }
  }

  if (wildcardCount >= 1) {
    for (let index = 0; index < tileCounts.length; index += 1) {
      if (tileCounts[index] >= 1) {
        const nextCounts = [...tileCounts];
        nextCounts[index] -= 1;
        const melds = findMeldGroups(nextCounts, wildcardCount - 1, new Set());
        if (melds) return [...melds, { type: '对子', tiles: [TILE_NAMES[index], '红中'] }];
      }
    }
  }

  if (wildcardCount >= 2) {
    const melds = findMeldGroups([...tileCounts], wildcardCount - 2, new Set());
    if (melds) return [...melds, { type: '对子', tiles: ['红中', '红中'] }];
  }
  return null;
}

function findEighteenLuohan(counts, wildcardCount) {
  const kongTiles = TILE_NAMES.filter(tile => counts[tile] === 4);
  if (kongTiles.length !== 4) return null;
  const remainingTiles = [];
  TILE_NAMES.forEach(tile => {
    const remaining = (counts[tile] || 0) - (kongTiles.includes(tile) ? 4 : 0);
    remainingTiles.push(...Array.from({ length: remaining }, () => tile));
  });
  remainingTiles.push(...Array.from({ length: wildcardCount }, () => '红中'));
  if (remainingTiles.length !== 2) return null;
  if (remainingTiles[0] !== remainingTiles[1] && !remainingTiles.includes('红中')) return null;
  return [
    ...kongTiles.map(tile => ({ type: '杠', tiles: [tile, tile, tile, tile] })),
    { type: '对子', tiles: remainingTiles }
  ];
}

export function analyzeHand(tiles, options = {}) {
  const kongCounts = getKongCounts(options);
  const totalKongs = kongCounts.reduce((sum, count) => sum + count, 0);
  const requiredTiles = 14 + totalKongs;
  const counts = createCounts(tiles);
  const wildcardCount = counts['红中'] || 0;
  const suits = getSuitSet(tiles);

  if (kongCounts.some(count => !Number.isInteger(count) || count < 0) || totalKongs > 4) {
    return { isWin: false, reason: '一手牌最多只能有 4 个杠。', requiredTiles, groups: [], suits: [...suits], wildcards: wildcardCount, specials: {} };
  }
  const invalidTile = tiles.find(tile => !VALID_TILES.has(tile));
  if (invalidTile) {
    return { isWin: false, reason: `无法识别牌面“${invalidTile}”。`, requiredTiles, groups: [], suits: [...suits], wildcards: wildcardCount, specials: {} };
  }
  const overflowTile = Object.keys(counts).find(tile => counts[tile] > 4);
  if (overflowTile) {
    return { isWin: false, reason: `${overflowTile}超过 4 张，请检查手牌。`, requiredTiles, groups: [], suits: [...suits], wildcards: wildcardCount, specials: {} };
  }
  if (tiles.length < requiredTiles) {
    return { isWin: false, reason: `还差 ${requiredTiles - tiles.length} 张牌，当前需要 ${requiredTiles} 张。`, requiredTiles, groups: [], suits: [...suits], wildcards: wildcardCount, specials: {} };
  }
  if (tiles.length > requiredTiles) {
    return { isWin: false, reason: `当前多选了 ${tiles.length - requiredTiles} 张牌。`, requiredTiles, groups: [], suits: [...suits], wildcards: wildcardCount, specials: {} };
  }
  if (suits.size === 3) {
    return { isWin: false, reason: '四川麻将胡牌必须缺一门，当前万、条、筒三门齐全。', requiredTiles, groups: [], suits: [...suits], wildcards: wildcardCount, specials: {} };
  }

  if (totalKongs === 4) {
    const luohanGroups = findEighteenLuohan(counts, wildcardCount);
    if (luohanGroups) {
      return { isWin: true, reason: '', requiredTiles, groups: luohanGroups, suits: [...suits], wildcards: wildcardCount, specials: { eighteenLuohan: true, sevenPairs: false, luxuriousSevenPairs: false, allTriplets: false } };
    }
  }

  const availableKongs = TILE_NAMES.filter(tile => counts[tile] === 4);
  if (availableKongs.length < totalKongs) {
    return { isWin: false, reason: '填写的杠数量与手牌中的四张相同牌不一致。', requiredTiles, groups: [], suits: [...suits], wildcards: wildcardCount, specials: {} };
  }

  const kongChoices = totalKongs === 0 ? [[]] : choose(availableKongs, totalKongs);
  for (const kongTiles of kongChoices) {
    const tileCounts = TILE_NAMES.map(tile => counts[tile] || 0);
    kongTiles.forEach(tile => { tileCounts[TILE_INDEX[tile]] = 0; });
    const kongGroups = kongTiles.map(tile => ({ type: '杠', tiles: [tile, tile, tile, tile] }));

    if (totalKongs === 0) {
      const sevenPairs = findSevenPairsGroups(tileCounts, wildcardCount);
      if (sevenPairs) {
        return { isWin: true, reason: '', requiredTiles, groups: sevenPairs.groups, suits: [...suits], wildcards: wildcardCount, specials: { eighteenLuohan: false, sevenPairs: true, luxuriousSevenPairs: sevenPairs.luxurious, allTriplets: false } };
      }
    }

    const standardGroups = findStandardGroups(tileCounts, wildcardCount);
    if (standardGroups) {
      const allTriplets = standardGroups.filter(group => group.type !== '对子').every(group => group.type === '大对');
      return { isWin: true, reason: '', requiredTiles, groups: [...kongGroups, ...standardGroups], suits: [...suits], wildcards: wildcardCount, specials: { eighteenLuohan: false, sevenPairs: false, luxuriousSevenPairs: false, allTriplets } };
    }
  }

  return { isWin: false, reason: '当前牌型不能组成四组牌和一对将，暂时不能胡牌。', requiredTiles, groups: [], suits: [...suits], wildcards: wildcardCount, specials: {} };
}

export function calculateScore(tiles, options = {}) {
  const analysis = analyzeHand(tiles, options);
  const counts = createCounts(tiles);
  const kongItems = [
    ['exposedKong', '明杠', 1],
    ['concealedKong', '暗杠', 2],
    ['returnKong', '回头杠', 1]
  ];
  const kongDetails = kongItems.map(([key, name, score]) => ({ name, count: Number(options[key]) || 0, score })).filter(item => item.count > 0);
  const kongScore = kongDetails.reduce((sum, item) => sum + item.count * item.score, 0);

  if (!analysis.isWin) {
    return { ...analysis, total: 0, multiplier: 0, roots: 0, items: [], kongScore, kongDetails };
  }

  const items = [{ name: '基础胡', fan: 1, explanation: '手牌已经组成合法胡牌结构。' }];
  let total = 1;
  if (analysis.suits.length === 1) {
    items.push({ name: '清一色', fan: 2, explanation: '除赖子外，所有牌都属于同一种花色。' });
    total += 2;
  }
  if (analysis.specials.luxuriousSevenPairs) {
    items.push({ name: '豪华七对', fan: 4, explanation: '七对中包含一组四张相同牌，四张可拆成两个对子。' });
    total += 4;
  } else if (analysis.specials.sevenPairs) {
    items.push({ name: '七对', fan: 2, explanation: '14 张牌由 7 个对子组成，赖子可补成对子。' });
    total += 2;
  }
  if (analysis.specials.eighteenLuohan) {
    items.push({ name: '十八罗汉', fan: 6, explanation: '四个杠加一对将牌，共 18 张牌。' });
    total += 6;
  }
  if (analysis.specials.allTriplets) {
    items.push({ name: '大对子', fan: 1, explanation: '除一对将牌外，其余组合全部是刻子或杠，没有顺子。' });
    total += 1;
  }

  const roots = Object.entries(counts).filter(([tile, count]) => tile !== '红中' && count === 4).length;
  if (roots > 0) {
    items.push({ name: '根', fan: roots, explanation: `手牌中有 ${roots} 组四张相同牌，每组计一根。` });
    total += roots;
  }

  const optionItems = [
    ['selfDraw', '自摸', '胡牌牌张由自己摸到。'],
    ['kongWin', '杠上花', '开杠补牌后，补到的牌正好胡牌。'],
    ['kongDiscard', '杠上炮', '开杠补牌后打出的牌被其他玩家胡走。'],
    ['robKong', '抢杠胡', '其他玩家补杠时，用该牌完成胡牌。']
  ];
  optionItems.forEach(([key, name, explanation]) => {
    if (options[key]) {
      items.push({ name, fan: 1, explanation });
      total += 1;
    }
  });

  return { ...analysis, total, multiplier: 2 ** total, roots, items, kongScore, kongDetails };
}

function groupTilesFallback(tiles) {
  const counts = createCounts(tiles);
  const groups = [];
  const suitedTiles = Object.keys(counts).filter(tile => tile !== '红中' && VALID_TILES.has(tile)).sort((a, b) => TILE_INDEX[a] - TILE_INDEX[b]);

  suitedTiles.forEach(tile => {
    if (counts[tile] >= 4) {
      groups.push({ type: '杠', tiles: [tile, tile, tile, tile] });
      counts[tile] -= 4;
    }
  });
  suitedTiles.forEach(tile => {
    if (counts[tile] >= 3) {
      groups.push({ type: '大对', tiles: [tile, tile, tile] });
      counts[tile] -= 3;
    }
  });
  SUITS.forEach(suit => {
    for (let number = 1; number <= 7; number += 1) {
      const sequence = [`${number}${suit}`, `${number + 1}${suit}`, `${number + 2}${suit}`];
      while (sequence.every(tile => counts[tile] > 0)) {
        groups.push({ type: '顺子', tiles: sequence });
        sequence.forEach(tile => { counts[tile] -= 1; });
      }
    }
  });
  suitedTiles.forEach(tile => {
    if (counts[tile] >= 2) {
      groups.push({ type: '对子', tiles: [tile, tile] });
      counts[tile] -= 2;
    }
  });
  const singles = suitedTiles.flatMap(tile => Array.from({ length: counts[tile] || 0 }, () => tile));
  for (let index = 0; index < singles.length; index += 4) groups.push({ type: '散牌', tiles: singles.slice(index, index + 4) });
  if (counts['红中']) groups.push({ type: '赖子', tiles: Array.from({ length: counts['红中'] }, () => '红中') });
  return groups;
}

export function groupTiles(tiles, options = {}) {
  const analysis = analyzeHand(tiles, options);
  return analysis.isWin ? analysis.groups : groupTilesFallback(tiles);
}
