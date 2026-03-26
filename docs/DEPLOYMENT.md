# GitHub Pages 部署指南

本文档介绍如何将 Easy Copilot 的首页部署到 GitHub Pages。

## 目录

- [部署方式](#部署方式)
- [方式一：GitHub Actions 自动部署（推荐）](#方式一 github-actions-自动部署推荐)
- [方式二：手动部署](#方式二手动部署)
- [访问页面](#访问页面)
- [常见问题](#常见问题)

---

## 部署方式

### 方式一：GitHub Actions 自动部署（推荐）

项目已配置好 GitHub Actions 工作流，当 `docs/` 目录有更新并推送到 `master` 分支时，会自动部署到 GitHub Pages。

#### 步骤：

1. **推送到 GitHub**
   ```bash
   git add docs/ .github/workflows/pages.yml
   git commit -m "docs: add homepage and GitHub Pages deployment"
   git push origin master
   ```

2. **启用 GitHub Pages**
   - 访问 https://github.com/ylfeng250/easy-copilot/settings/pages
   - 在 **Source** 部分，确保选择 **GitHub Actions**
   - 等待部署完成（约 1-2 分钟）

3. **查看部署状态**
   - 访问 https://github.com/ylfeng250/easy-copilot/actions
   - 查看 "Deploy to GitHub Pages" 工作流的运行状态

#### 后续更新

之后每次修改 `docs/` 目录并推送，都会自动触发部署：

```bash
# 修改首页后
git add docs/
git commit -m "docs: update homepage"
git push origin master
```

---

### 方式二：手动部署（使用 gh-pages 分支）

如果你更喜欢使用传统的 `gh-pages` 分支方式：

#### 步骤：

1. **创建 gh-pages 分支**
   ```bash
   git checkout --orphan gh-pages
   git reset --hard
   ```

2. **复制静态文件**
   ```bash
   mkdir -p docs-temp
   cp -r docs/* docs-temp/
   ```

3. **提交并推送**
   ```bash
   git add docs-temp/
   git commit -m "Initial GitHub Pages deployment"
   git push -f origin gh-pages
   ```

4. **配置 GitHub Pages**
   - 访问 https://github.com/ylfeng250/easy-copilot/settings/pages
   - 在 **Source** 部分选择 **Deploy from a branch**
   - Branch 选择 `gh-pages`，Folder 选择 `/ (root)`
   - 点击 **Save**

---

## 访问页面

部署成功后，可以通过以下 URL 访问首页：

```
https://ylfeng250.github.io/easy-copilot/
```

如果你配置了自定义域名，也可以通过自定义域名访问。

---

## 自定义域名（可选）

如需使用自定义域名：

1. 在 `docs/` 目录下创建 `CNAME` 文件：
   ```bash
   echo "your-domain.com" > docs/CNAME
   ```

2. 提交并推送：
   ```bash
   git add docs/CNAME
   git commit -m "docs: add custom domain"
   git push origin master
   ```

3. 在你的 DNS 提供商处配置 CNAME 记录：
   ```
   CNAME ylfeng250.github.io
   ```

---

## 常见问题

### 1. 部署失败怎么办？

查看 GitHub Actions 日志：
- 访问 https://github.com/ylfeng250/easy-copilot/actions
- 点击失败的运行记录，查看具体错误信息

常见错误：
- **权限问题**：确保仓库设置了正确的 permissions
- **路径问题**：确保 `docs/` 目录存在且包含 `index.html`

### 2. 页面显示 404

- 等待几分钟，GitHub Pages 可能需要时间生效
- 检查 `.github/workflows/pages.yml` 是否正确配置
- 确认 `docs/index.html` 文件存在

### 3. 样式或图片加载失败

检查文件路径是否正确。本项目使用相对路径：
- 图片：`../assets/icon.png`
- 所有静态资源应放在正确的位置

### 4. 如何禁用自动部署？

删除或重命名 `.github/workflows/pages.yml` 文件即可：
```bash
git rm .github/workflows/pages.yml
git commit -m "ci: disable GitHub Pages deployment"
git push origin master
```

---

## 文件结构

```
easy-copilot/
├── docs/
│   └── index.html          # 首页文件
├── .github/
│   └── workflows/
│       └── pages.yml       # GitHub Pages 部署工作流
├── assets/
│   └── icon.png            # 项目图标（在首页中引用）
└── package.json
```

---

## 首页功能

首页是一个单页面应用，包含以下模块：

- **Hero Section** - 项目介绍和快速操作
- **功能特性** - 核心功能展示
- **支持平台** - 已支持的 AI 平台列表
- **安装指南** - 从源码构建步骤
- **使用指南** - 基本使用方法
- **页脚** - 版权信息和链接

### 技术栈

- **Tailwind CSS** - 实用优先的 CSS 框架
- **Font Awesome** - 图标库
- **Google Fonts** - Inter 字体

### 深色模式

首页支持深色/浅色模式切换，点击导航栏右上角的切换按钮即可。

---

## 维护

### 更新内容

直接编辑 `docs/index.html` 文件，然后推送即可自动更新。

### 本地预览

可以使用任何静态文件服务器在本地预览：

```bash
# 使用 Python
cd docs
python -m http.server 8000

# 使用 Node.js
npx serve docs

# 使用 PHP
php -S localhost:8000 -t docs
```

然后在浏览器访问 `http://localhost:8000` 查看效果。

---

## 许可证

MIT License © 2026 ylfeng250
