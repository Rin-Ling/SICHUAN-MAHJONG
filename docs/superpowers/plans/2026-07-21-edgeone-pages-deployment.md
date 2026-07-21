# EdgeOne Pages Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 GitHub 仓库 `Rin-Ling/SICHUAN-MAHJONG` 的 `main` 分支作为零构建静态站点部署到 EdgeOne Pages，并通过默认域名验证可用性。

**Architecture:** 保持现有静态文件结构，不增加构建脚本、依赖或平台专用配置。先验证仓库中的页面与资源，再同步 GitHub，最后在 EdgeOne Pages 关联仓库根目录并验证首次生产部署。

**Tech Stack:** HTML、原生 JavaScript、Node.js 内置测试运行器、GitHub、EdgeOne Pages

---

## 文件范围

- 不修改：`index.html`，继续作为静态站点入口。
- 不修改：`scoring.js`，继续由 `index.html` 通过相对路径加载。
- 不修改：`assets/mahjong/tiles/*.svg`，继续作为静态资源直接发布。
- 不修改：`serve.mjs`，仅用于本地部署前自检。
- 创建：`docs/superpowers/plans/2026-07-21-edgeone-pages-deployment.md`，记录本实施计划。

### Task 1: 验证待发布代码

**Files:**
- Test: `scoring.test.mjs`
- Test: `layout.test.mjs`
- Verify: `index.html`
- Verify: `scoring.js`
- Verify: `assets/mahjong/tiles/Man1.svg`

- [ ] **Step 1: 运行现有测试**

Run: `node --test scoring.test.mjs layout.test.mjs`

Expected: 命令退出码为 `0`，全部测试通过。

- [ ] **Step 2: 启动本地静态服务器**

Run: `node serve.mjs 52342`

Expected: 进程监听 `http://127.0.0.1:52342`。

- [ ] **Step 3: 检查入口、脚本和 SVG 资源**

Run: `Invoke-WebRequest -UseBasicParsing http://127.0.0.1:52342/`

Expected: HTTP 状态码为 `200`，响应包含页面 HTML。

Run: `Invoke-WebRequest -UseBasicParsing http://127.0.0.1:52342/scoring.js`

Expected: HTTP 状态码为 `200`，响应内容类型为 JavaScript。

Run: `Invoke-WebRequest -UseBasicParsing http://127.0.0.1:52342/assets/mahjong/tiles/Man1.svg`

Expected: HTTP 状态码为 `200`，响应内容类型为 SVG。

- [ ] **Step 4: 停止本地静态服务器**

Expected: `52342` 端口不再监听。

### Task 2: 同步 GitHub 生产分支

**Files:**
- Verify: Git 工作区和 `main` 分支提交历史

- [ ] **Step 1: 确认工作区只保留已知的用户未跟踪文件**

Run: `git status --short --branch`

Expected: 当前分支为 `main`；除两份既有未跟踪文档外，没有未提交的业务代码改动。

- [ ] **Step 2: 推送生产分支**

Run: `git push origin main`

Expected: GitHub 的 `origin/main` 更新到当前 `main` 提交。

- [ ] **Step 3: 确认本地与 GitHub 分支一致**

Run: `git status --short --branch`

Expected: `main` 不再领先 `origin/main`。

### Task 3: 创建 EdgeOne Pages 项目

**Files:**
- No repository file changes

- [ ] **Step 1: 在 EdgeOne Pages 创建 GitHub 导入项目**

选择 GitHub 仓库 `Rin-Ling/SICHUAN-MAHJONG`，生产分支选择 `main`。

Expected: EdgeOne Pages 显示该仓库和生产分支已关联。

- [ ] **Step 2: 设置静态发布参数**

设置：框架预设优先选择 Static HTML，没有该项时选择 Other；安装命令留空；构建命令留空；输出目录使用仓库根目录，字段必填时填写 `.`；不添加环境变量。

Expected: 配置明确表示不执行构建并发布仓库根目录。

- [ ] **Step 3: 创建首次生产部署**

Expected: EdgeOne Pages 部署状态变为成功，并生成默认访问域名。

### Task 4: 验证线上部署

**Files:**
- Verify: EdgeOne Pages default deployment URL

- [ ] **Step 1: 访问默认域名首页**

Expected: HTTP 状态码为 `200`，页面显示四川麻将算番工具。

- [ ] **Step 2: 检查线上脚本和牌面资源**

访问默认域名下的 `/scoring.js` 和 `/assets/mahjong/tiles/Man1.svg`。

Expected: 两个资源均返回 `200`，无静态资源路径错误。

- [ ] **Step 3: 验证关键交互**

在牌面选择区选择一张牌，再点击已选牌将其移除。

Expected: 已选牌数量先增加再减少，浏览器控制台无加载错误。

- [ ] **Step 4: 记录部署结果**

记录 EdgeOne Pages 默认域名和首次成功部署状态，作为本次实施结果。
