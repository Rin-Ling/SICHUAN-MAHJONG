# 海底捞月 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为现有川麻算番页面增加海底捞月开关，单独计 1 番并允许与自摸叠加。

**Architecture:** 沿用现有 `data-option` 开关到 `calculateScore` 的数据流。UI 只新增一个复选框，计分层只在现有 `optionItems` 列表追加一项，不增加额外抽象或联动逻辑。

**Tech Stack:** HTML、Vanilla JavaScript、Node.js 内置断言测试

---

### Task 1: 用测试定义海底捞月行为

**Files:**
- Modify: `scoring.test.mjs`
- Modify: `layout.test.mjs`
- Test: `scoring.test.mjs`
- Test: `layout.test.mjs`

- [ ] **Step 1: 增加计分失败用例**

在 `scoring.test.mjs` 中加入：

```js
test('海底捞月单独增加一番', () => {
  const result = calculateScore(standardWin, { lastTileDraw: true });
  assert.equal(result.items.some(item => item.name === '海底捞月'), true);
  assert.equal(result.total, 2);
});

test('海底捞月可与自摸叠加', () => {
  const result = calculateScore(standardWin, { selfDraw: true, lastTileDraw: true });
  assert.deepEqual(result.items.slice(-2).map(item => item.name), ['自摸', '海底捞月']);
  assert.equal(result.total, 3);
});

test('无效牌型不计海底捞月', () => {
  const result = calculateScore(standardWin.slice(0, 13), { lastTileDraw: true });
  assert.equal(result.total, 0);
  assert.deepEqual(result.items, []);
});
```

- [ ] **Step 2: 增加界面接线失败用例**

在 `layout.test.mjs` 中加入：

```js
assert.match(html, /<label class="switch">海底捞月 <input type="checkbox" data-option="lastTileDraw"><\/label>/, '状态区应提供海底捞月开关');
```

并将末尾输出更新为：

```js
console.log('All 5 mobile layout tests passed');
```

- [ ] **Step 3: 运行测试并确认按预期失败**

Run: `node scoring.test.mjs`
Expected: FAIL，海底捞月明细不存在或总番数仍为 1。

Run: `node layout.test.mjs`
Expected: FAIL，提示状态区缺少海底捞月开关。

### Task 2: 实现计分与界面开关

**Files:**
- Modify: `scoring.js:265`
- Modify: `index.html:115`
- Test: `scoring.test.mjs`
- Test: `layout.test.mjs`

- [ ] **Step 1: 在计分列表追加海底捞月**

将 `optionItems` 更新为：

```js
const optionItems = [
  ['selfDraw', '自摸', '胡牌牌张由自己摸到。'],
  ['lastTileDraw', '海底捞月', '摸到牌墙最后一张牌并胡牌。'],
  ['kongWin', '杠上花', '开杠补牌后，补到的牌正好胡牌。'],
  ['kongDiscard', '杠上炮', '开杠补牌后打出的牌被其他玩家胡走。'],
  ['robKong', '抢杠胡', '其他玩家补杠时，用该牌完成胡牌。']
];
```

- [ ] **Step 2: 在状态区增加复选框**

在自摸开关后加入：

```html
<label class="switch">海底捞月 <input type="checkbox" data-option="lastTileDraw"></label>
```

现有 `[data-option]` 监听器会自动把选中状态写入 `options.lastTileDraw`，无需修改事件逻辑。

- [ ] **Step 3: 运行专项测试并确认通过**

Run: `node scoring.test.mjs`
Expected: 所有计分测试通过。

Run: `node layout.test.mjs`
Expected: `All 5 mobile layout tests passed`。

### Task 3: 完整验证

**Files:**
- Verify: `scoring.js`
- Verify: `index.html`

- [ ] **Step 1: 运行全部自动化校验**

Run: `node scoring.test.mjs`
Expected: 所有计分测试通过。

Run: `node layout.test.mjs`
Expected: `All 5 mobile layout tests passed`。

- [ ] **Step 2: 启动页面并验证关键路径**

Run: `node serve.mjs`
Expected: 服务器输出本地访问地址。在页面选择合法胡牌后，勾选“自摸”与“海底捞月”，结果明细同时显示两项且各为 `+1 番`。

- [ ] **Step 3: 检查变更范围**

Run: `git diff -- scoring.js scoring.test.mjs layout.test.mjs index.html`
Expected: 只包含海底捞月测试、计分项和开关。
