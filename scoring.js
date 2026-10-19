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

function findMeldGroups(tileCounts, wildcardCount, failedStates, terminals = false) {
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
  if (tripletWildcards <= wildcardCount && (!terminals || firstIndex % 9 === 0 || firstIndex % 9 === 8)) {
    const nextCounts = [...tileCounts];
    nextCounts[firstIndex] -= sameTileCount;
    const remainingGroups = findMeldGroups(nextCounts, wildcardCount - tripletWildcards, failedStates, terminals);
    if (remainingGroups) {
      return [{ type: '大对', tiles: [...Array.from({ length: sameTileCount }, () => tile), ...Array.from({ length: tripletWildcards }, () => '红中')] }, ...remainingGroups];
    }
  }

  const suitPosition = firstIndex % 9;
  for (let start = Math.max(0, suitPosition - 2); start <= Math.min(6, suitPosition); start += 1) {
    if (terminals && start !== 0 && start !== 6) continue;
    const sequenceStart = firstIndex - suitPosition + start;
    const sequenceIndexes = [sequenceStart, sequenceStart + 1, sequenceStart + 2];
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
      const remainingGroups = findMeldGroups(nextCounts, wildcardCount - neededWildcards, failedStates, terminals);
      if (remainingGroups) return [{ type: '顺子', tiles: sequenceTiles }, ...remainingGroups];
    }
  }

  failedStates.add(stateKey);
  return null;
}

function findStandardGroups(tileCounts, wildcardCount, terminals = false) {
  let groups = null;
  for (let index = 0; index < tileCounts.length; index += 1) {
    if (tileCounts[index] >= 2 && (!terminals || index % 9 === 0 || index % 9 === 8)) {
      const nextCounts = [...tileCounts];
      nextCounts[index] -= 2;
      const melds = findMeldGroups(nextCounts, wildcardCount, new Set(), terminals);
      if (melds) {
        const candidate = [...melds, { type: '对子', tiles: [TILE_NAMES[index], TILE_NAMES[index]] }];
        if (melds.every(group => group.type === '大对')) return candidate;
        if (!groups) groups = candidate;
      }
    }
  }

  if (wildcardCount >= 1) {
    for (let index = 0; index < tileCounts.length; index += 1) {
      if (tileCounts[index] >= 1 && (!terminals || index % 9 === 0 || index % 9 === 8)) {
        const nextCounts = [...tileCounts];
        nextCounts[index] -= 1;
        const melds = findMeldGroups(nextCounts, wildcardCount - 1, new Set(), terminals);
        if (melds) {
          const candidate = [...melds, { type: '对子', tiles: [TILE_NAMES[index], '红中'] }];
          if (melds.every(group => group.type === '大对')) return candidate;
          if (!groups) groups = candidate;
        }
      }
    }
  }

  if (wildcardCount >= 2) {
    const melds = findMeldGroups([...tileCounts], wildcardCount - 2, new Set(), terminals);
    if (melds) {
      const candidate = [...melds, { type: '对子', tiles: ['红中', '红中'] }];
      if (melds.every(group => group.type === '大对')) return candidate;
      if (!groups) groups = candidate;
    }
  }
  return groups;
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
  if ((options.heavenlyWin && options.earthlyWin) || (options.concealedHand && (Number(options.exposedKong) > 0 || Number(options.returnKong) > 0 || options.goldHook))) {
    return { isWin: false, reason: '天胡与地胡不能同时选择；门清不能与明杠、回头杠或金钩钓同时选择。', requiredTiles, groups: [], suits: [...suits], wildcards: wildcardCount, specials: {} };
  }
  if ((options.selfDraw || options.lastTileDraw || options.kongWin) && (options.kongDiscard || options.robKong)
    || (options.kongDiscard && options.robKong)
    || (options.heavenlyWin && (totalKongs > 0 || options.goldHook || options.lastTileDraw || options.kongWin || options.kongDiscard || options.robKong))
    || (options.earthlyWin && (totalKongs > 0 || options.goldHook || options.lastTileDraw || options.kongWin || options.kongDiscard || options.robKong))) {
    return { isWin: false, reason: '胡牌状态冲突：自摸类状态不能与杠上炮、抢杠胡并选；杠上炮与抢杠胡互斥；天胡、地胡不能与杠牌、金钩钓或海底及杠胡事件并选。', requiredTiles, groups: [], suits: [...suits], wildcards: wildcardCount, specials: {} };
  }

  if (totalKongs === 4) {
    const luohanGroups = findEighteenLuohan(counts, wildcardCount);
    if (luohanGroups) {
      const allTerminals = luohanGroups.every(group => group.tiles.some(tile => tile[0] === '1' || tile[0] === '9'));
      return { isWin: true, reason: '', requiredTiles, groups: luohanGroups, suits: [...suits], wildcards: wildcardCount, specials: { eighteenLuohan: true, sevenPairs: false, luxuriousSevenPairs: false, allTriplets: false, allTerminals } };
    }
  }

  const availableKongs = TILE_NAMES.filter(tile => counts[tile] === 4);
  if (availableKongs.length < totalKongs) {
    return { isWin: false, reason: '填写的杠数量与手牌中的四张相同牌不一致。', requiredTiles, groups: [], suits: [...suits], wildcards: wildcardCount, specials: {} };
  }

  const kongChoices = totalKongs === 0 ? [[]] : choose(availableKongs, totalKongs);
  const candidates = [];
  for (const kongTiles of kongChoices) {
    const tileCounts = TILE_NAMES.map(tile => counts[tile] || 0);
    kongTiles.forEach(tile => { tileCounts[TILE_INDEX[tile]] = 0; });
    const kongGroups = kongTiles.map(tile => ({ type: '杠', tiles: [tile, tile, tile, tile] }));

    if (totalKongs === 0 && !options.goldHook) {
      const sevenPairs = findSevenPairsGroups(tileCounts, wildcardCount);
      if (sevenPairs) {
        candidates.push({ isWin: true, reason: '', requiredTiles, groups: sevenPairs.groups, suits: [...suits], wildcards: wildcardCount, specials: { eighteenLuohan: false, sevenPairs: true, luxuriousSevenPairs: sevenPairs.luxurious, allTriplets: false } });
      }
    }

    const terminalGroups = kongTiles.every(tile => tile[0] === '1' || tile[0] === '9') ? findStandardGroups(tileCounts, wildcardCount, true) : null;
    for (const standardGroups of [terminalGroups, findStandardGroups(tileCounts, wildcardCount)]) {
      if (!standardGroups) continue;
      const allTriplets = standardGroups.filter(group => group.type !== '对子').every(group => group.type === '大对');
      if (options.goldHook && !allTriplets) continue;
      const nineGates = !options.goldHook && totalKongs === 0 && wildcardCount === 0 && suits.size === 1
        && Array.from({ length: 9 }, (_, index) => (counts[`${index + 1}${[...suits][0]}`] || 0) >= (index === 0 || index === 8 ? 3 : 1)).every(Boolean);
      candidates.push({ isWin: true, reason: '', requiredTiles, groups: [...kongGroups, ...standardGroups], suits: [...suits], wildcards: wildcardCount, specials: { eighteenLuohan: false, sevenPairs: false, luxuriousSevenPairs: false, allTriplets, nineGates, allTerminals: standardGroups === terminalGroups } });
    }
  }
  if (candidates.length > 0) {
    let best = candidates[0];
    let bestTotal = scoreAnalysis(tiles, options, best).total;
    for (const candidate of candidates.slice(1)) {
      const total = scoreAnalysis(tiles, options, candidate).total;
      if (total > bestTotal) {
        best = candidate;
        bestTotal = total;
      }
    }
    return best;
  }

  return { isWin: false, reason: options.goldHook ? '金钩钓需要四组已碰出或杠出的刻子／杠及一对将，请检查手牌和状态。' : '当前牌型不能组成四组牌和一对将，暂时不能胡牌。', requiredTiles, groups: [], suits: [...suits], wildcards: wildcardCount, specials: {} };
}

export function calculateScore(tiles, options = {}) {
  const analysis = analyzeHand(tiles, options);
  return scoreAnalysis(tiles, options, analysis);
}

function scoreAnalysis(tiles, options, analysis) {
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

  const items = [{ name: '基础胡', fan: 0, explanation: '手牌已经组成合法胡牌结构，基础胡不加番。' }];
  const roots = Object.entries(counts).filter(([tile, count]) => tile !== '红中' && count === 4).length;
  const jiangTiles = tiles.every(tile => tile === '红中' || '258'.includes(tile[0]));
  let total = 0;
  if (analysis.specials.nineGates) {
    items.push({ name: '九莲宝灯', fan: 6, explanation: '同一花色的 1112345678999 加任意一张同花色牌，不使用红中、不含杠；计 6 番，叠加清一色，不重复计根。' });
    total += 6;
  }
  if (analysis.suits.length === 1) {
    items.push({ name: '清一色', fan: 2, explanation: '除赖子外，所有牌都属于同一种花色。' });
    total += 2;
  }
  if (analysis.specials.sevenPairs) {
    const name = ['七对', '龙七对', '双龙七对', '三龙七对'][roots];
    items.push({ name, fan: 2 + roots, explanation: `七对基础 2 番，包含 ${roots} 根，每根加 1 番，不再重复计根。` });
    total += 2 + roots;
  }
  if (analysis.specials.eighteenLuohan) {
    items.push({ name: '十八罗汉', fan: 6, explanation: '四个杠加一对将牌，共 18 张牌。' });
    total += 6;
  }
  if (jiangTiles && (analysis.specials.allTriplets || analysis.specials.eighteenLuohan)) {
    items.push({ name: '将对', fan: 3, explanation: '全部由 2、5、8 组成的刻子或杠及将牌，替代普通大对子计番。' });
    total += 3;
  } else if (analysis.specials.allTriplets) {
    items.push({ name: '大对子', fan: 1, explanation: '除一对将牌外，其余组合全部是刻子或杠，没有顺子。' });
    total += 1;
  }

  if (analysis.specials.allTerminals) {
    items.push({ name: '带幺九', fan: 2, explanation: '每组顺子、刻子、杠和将牌均含 1 或 9，顺子仅为 123 或 789。' });
    total += 2;
  }
  if (roots > 0 && !analysis.specials.nineGates && !analysis.specials.sevenPairs) {
    items.push({ name: '根', fan: roots, explanation: `手牌中有 ${roots} 组四张相同牌，每组计一根。` });
    total += roots;
  }

  const optionItems = [
    ['goldHook', '金钩钓', '已碰出或杠出四组牌，手中只剩单钓将牌，由用户确认。'],
    ['concealedHand', '门清', '未碰牌、未明杠或补杠；暗杠不破门清，由用户确认。'],
    ['selfDraw', '自摸', '胡牌牌张由自己摸到。'],
    ['lastTileDraw', '海底捞月', '摸到牌墙最后一张牌并胡牌。'],
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
  if (options.middleTiles && tiles.every(tile => tile === '红中' || (tile[0] !== '1' && tile[0] !== '9'))) {
    items.push({ name: '中张', fan: 1, explanation: '启用中张玩法，所有数牌均为 2 至 8。' });
    total += 1;
  }
  if (options.heavenlyWin || options.earthlyWin) {
    items.push({ name: options.heavenlyWin ? '天胡' : '地胡', fan: 3, explanation: options.heavenlyWin ? '庄家起手即胡，由用户确认。' : '闲家在约定的首轮条件下胡牌，由用户确认。' });
    total += 3;
  }

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
