# EM 实验摇号系统

Electron + React + Ant Design + TypeScript 的桌面工具，用于实现 EM 实验机时的权重摇号、紧急调剂和闲置流转管理。

## 快速开始

```powershell
yarn install
yarn dev
```

- `yarn dev` 同时启动 Vite/React 与 Electron 主进程。
- `yarn build` 将渲染层输出到 `dist-renderer/`，主进程输出到 `dist-electron/`。

## 核心功能

1. **基础摇号**：按 n² 权重统筹，输出本轮的中签顺序名单。
2. **紧急通道**：可配置保留名额，审核通过后直接进入中签名单前列。
3. **保底机制**：连续多周未中者优先摇取，避免长时间轮空。
4. **晚场处理**：22:00 后时段记为晚场，本轮未摇到可在 17:00 后先到先得。
5. **历史追溯**：本地保存每轮参与/落空/晚场信息，便于下一轮权重累计。
6. **SQLite 名册**：全部同学信息保存在 `.electron-data/participants.sqlite`，支持桌面端集中维护与实时查询。

## 目录速览

- `electron/` Electron 主进程与 preload。
- `src/main.tsx` React 入口。
- `src/App.tsx` 主界面（名册、参与选择、机时、紧急申请、摇号面板、历史记录）。
- `src/core/` 权重摇号逻辑、保底策略与历史存储。

## 推荐流程

1. **维护名册**：在“参与同学”面板增删或调整权重，信息立即写入 SQLite。
2. **勾选本轮参与者**：通过“参与名单选择”勾选需要参加本轮的同学，支持一键全选/仅可参与/清空。
3. **紧急需求**：使用紧急通道申请维护审核，通过者锁定保留名额。
4. **14:00 摇号**：在摇号面板输入紧急/保底参数，使用已选择的同学名单发起摇号。
5. **结果展示**：页面仅展示中签顺序及通道来源，避免提前分配具体机时。
6. **历史回溯**：随时在历史记录中查询任意一轮的获奖顺序与晚场余量。

> 首次运行 `yarn dev`/`yarn build` 时会自动在 `.electron-data/participants.sqlite` 中创建名册库，可直接复制该文件进行备份或迁移。

## Windows PowerShell 常用命令

```powershell
# 安装依赖
yarn install

# 开发模式（热加载）
yarn dev

# 构建静态资源 + 主进程
yarn build

# 静态类型检查
yarn typecheck
```

## 通过 GitHub Actions 自动打包发布

本仓库已配置 GitHub Actions workflow，会在推送符合 `v*.*.*` 格式的 tag 时自动在 Windows 上执行 `yarn build` 与 `yarn dist`，并上传打包产物。

发布流程示例：

1. 确认 `package.json` 中的 `version` 已更新为预期版本号，例如 `0.1.0`。
2. 提交并推送代码到远程仓库：

	```powershell
	git add .
	git commit -m "chore: release 0.1.0"
	git push origin main  # 或你的主分支名
	```

3. 创建并推送对应的版本 tag（必须符合 `vX.Y.Z` 格式）：

	```powershell
	git tag v0.1.0
	git push origin v0.1.0
	```

4. 打开 GitHub 仓库的 **Actions** 页面，等待 `Build and Release` 工作流完成。
5. 在该工作流运行详情页的 **Artifacts** 中，下载 `em-lottery-windows` 工件，其中包含：
	- 安装包：`release/EM-Lottery-Setup-<version>.exe`
	- 绿色版目录：`release/win-unpacked/`

如需进一步集成自动创建 GitHub Release，可在现有 workflow 基础上追加发布步骤。 

## 后续可扩展

- 导出 CSV/Excel 报表
- 账号/权限控制（协调员/普通成员）
- 在线化部署（将 React 前端迁移到网页端 + 后端 API）
- WebSocket 实时同步，方便远程参与

如需进一步扩展，可在 `src/core/lottery.ts` 或对应 UI 组件中继续迭代。
