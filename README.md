# Easy Copilot

<p align="center">
  <strong>AI 对话导航助手 - 快速回溯对话中的提问位置</strong>
</p>

<p align="center">
  <a href="#功能特性">功能特性</a> •
  <a href="#安装">安装</a> •
  <a href="#使用方法">使用方法</a> •
  <a href="#支持平台">支持平台</a> •
  <a href="#开发">开发</a>
</p>

---

## 功能特性

### 智能内容提取
- **多平台兼容**：预设主流 AI 平台的 CSS 选择器，开箱即用
- **动态监听**：使用 `MutationObserver` 监听 DOM 变化，自动更新索引列表
- **内容清洗**：提取文本前 80 个字符作为标题，自动去除代码块等干扰内容

### 锚点导航系统
- **侧边栏目录**：在页面右侧展示用户提问列表，默认隐藏，点击触发按钮展开
- **平滑滚动**：点击目录项后平滑滚动定位到目标 DOM
- **视觉反馈**：跳转后对目标元素进行短暂的高亮处理

### 搜索与过滤
- **实时搜索**：支持关键词实时过滤提问列表
- **计数显示**：显示当前检测到的提问数量

### 自定义配置
- **自定义选择器**：支持手动输入 CSS 选择器，适配任意 AI 平台
- **持久化存储**：使用 `chrome.storage.local` 保存用户配置
- **导入/导出**：支持配置的导入和导出（JSON 格式）
- **开关控制**：可单独启用/禁用每个平台的规则

## 安装

### 从源码构建

```bash
# 克隆仓库
git clone https://github.com/ylfeng250/easy-copilot.git
cd easy-copilot

# 安装依赖
pnpm install

# 开发模式
pnpm dev

# 生产构建
pnpm build
```

### 加载扩展

1. 打开 Chrome 浏览器，访问 `chrome://extensions/`
2. 开启右上角「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 选择 `build/chrome-mv3-prod` 目录

## 使用方法

### 基本使用

1. 访问支持的 AI 平台（如 ChatGPT、Claude 等）
2. 页面右侧会出现一个触发按钮
3. 点击按钮展开侧边栏，显示当前对话中的所有提问
4. 点击任意提问项，页面会自动滚动到对应位置并高亮显示

### 配置管理

点击浏览器工具栏中的 Easy Copilot 图标，打开配置面板：

- **添加规则**：为新的 AI 平台添加自定义选择器
- **测试选择器**：在保存前测试选择器是否有效
- **启用/禁用**：通过开关控制规则的启用状态
- **导入/导出**：备份或恢复配置

## 支持平台

| 平台 | 域名 | 选择器 |
|------|------|--------|
| ChatGPT | chatgpt.com | `div[data-message-author-role='user']` |
| Gemini | gemini.google.com | `user-query` |
| Claude | claude.ai | `[data-is-streaming] .font-user-message, div.font-user-message` |
| DeepSeek | chat.deepseek.com | `.fbb737a4` |
| 腾讯元宝 | yuanbao.tencent.com | `.agent-chat__conv--human` |
| Kimi | www.kimi.com | `.segment-user` |
| 通义千问 | chat.qwen.ai | `.chat-user-message` |

## 开发

### 技术栈

- [Plasmo](https://www.plasmo.com/) - Chrome 扩展开发框架
- [React 18](https://react.dev/) - UI 框架
- [TypeScript](https://www.typescriptlang.org/) - 类型安全

### 项目结构

```
easy-copilot/
├── content.tsx          # 内容脚本 - 侧边栏组件
├── content-style.css    # 侧边栏样式
├── popup.tsx            # 弹窗配置面板
├── background.ts        # 后台脚本
├── lib/
│   ├── storage.ts       # 存储工具
│   └── default-ai-nav-config.json  # 默认配置
├── theme/
│   └── tokens.ts        # 设计令牌
└── assets/
    └── icon.png         # 扩展图标
```

### 命令

```bash
pnpm dev      # 开发模式，支持热重载
pnpm build    # 生产构建
pnpm package  # 打包为 .crx 文件
```

## 许可证

MIT License © 2026 ylfeng250