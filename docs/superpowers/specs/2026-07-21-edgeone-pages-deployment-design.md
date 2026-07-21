# EdgeOne Pages 部署设计

## 目标

将当前四川麻将静态站点通过 GitHub 自动部署到 EdgeOne Pages，并先使用 EdgeOne 提供的默认域名访问。后续推送到生产分支时，由 EdgeOne Pages 自动触发新部署。

## 部署来源

- GitHub 仓库：`Rin-Ling/SICHUAN-MAHJONG`
- 生产分支：`main`
- 项目根目录：仓库根目录

## 发布配置

当前项目由 `index.html`、`scoring.js` 和 `assets/` 组成，不需要安装依赖或执行构建。EdgeOne Pages 使用以下配置：

- 框架预设：优先选择 Static HTML；控制台没有该项时选择 Other
- 安装命令：留空
- 构建命令：留空
- 输出目录：仓库根目录；控制台强制要求填写时使用 `.`
- 环境变量：无
- 访问域名：EdgeOne 默认域名

`serve.mjs` 仅用于本地预览，不作为线上 Node.js 服务运行。

## 改动范围

部署不需要修改业务代码、增加依赖、复制构建产物或新增 CI 流水线。EdgeOne Pages 直接发布 GitHub 仓库中的静态文件。

## 发布流程

1. 在 EdgeOne Pages 创建项目并选择 GitHub 导入。
2. 授权 EdgeOne 读取 `Rin-Ling/SICHUAN-MAHJONG`。
3. 选择 `main` 作为生产分支，按发布配置创建部署。
4. 等待首次部署完成，并通过默认域名验证页面。
5. 后续向 `main` 推送提交时自动触发生产部署。

## 风险与边界

- 当前环境无法在线核对 EdgeOne Pages 控制台的最新字段名称；如果界面措辞变化，应按“无构建、发布仓库根目录”的语义填写。
- GitHub 授权和 EdgeOne 项目创建属于外部账号操作，执行时可能需要用户登录或确认授权。
- 本次不配置自定义域名、环境变量、服务端函数或额外 CI。

## 验证

- 运行现有计分测试与布局测试，确认待发布代码通过项目校验。
- 使用本地静态服务器访问首页，确认 `index.html`、`scoring.js` 和麻将牌 SVG 资源可加载。
- 首次部署后访问 EdgeOne 默认域名，确认首页返回成功、页面可交互且静态资源无 404。
