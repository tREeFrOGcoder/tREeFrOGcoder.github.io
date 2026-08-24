> **⚠️ 已过期，请读 [HANDOFF.md](HANDOFF.md)。**
> 本文第 3 节的「步骤 6 · CS180」和第 4 节的资源压缩方案
> 已被 Ziche 推翻 —— 现在的决定是 CS180 一点都不动。
> 保留此文件仅为记录当时的推导过程。

# 个人主页改版方案 · 2026-08

> 分支 `redesign-2026-08`，基线 tag `pre-redesign-2026-08-23`（= 改版前最后一个提交 `86e68a7`）。
> 任何时候 `git checkout main` 回到旧站；`git reset --hard pre-redesign-2026-08-23` 回到改版前那一秒。

---

## 0. 已定的决策

| 项 | 决定 |
|---|---|
| 代码地基 | Jekyll 正规化（`_layouts` / `_includes` / `_data`），走 GitHub Pages 自带构建，**不加 Actions** |
| 视觉方向 | 「A · 精修现状」—— 保留冷蓝配色、侧栏 250 / 正文 750、圆头像、venue 药丸 |
| 字体 | **Arial 400 / 16px**（零网络请求，全平台都有） |
| Gallery | 对齐行（可切瀑布流）、默认「舒适」、全功能 lightbox |
| CS180 | 新封面页 + 资源压缩；**6 个子页的内容一个字不改** |
| 仓库 | 删 `_site`，**git 历史不动** |

## 1. 为什么是 Jekyll 3.9 而不是 4.x

GitHub Pages 自带的是 Jekyll 3.9，装 GitHub Actions 才能用 4.x。
本项目只用 layouts / includes / data / Liquid 循环 —— 这些在 3.9 和 4.x 上行为完全一致。
**选 3.9 = push 即上线，没有 CI 会坏。** 本地你现有的 Jekyll 4.2.2 照常 `bundle exec jekyll serve` 预览。

**约束**：不能用任何第三方插件（Pages 有白名单）。本方案没有用到。

---

## 2. 目标结构

```
_config.yml              新建 —— 站点配置 + exclude
.gitignore               新建 —— _site / .DS_Store / .jekyll-cache

_data/                   内容 = 数据。以后更新只动这里
  publications.yml         加论文 = 加一段 YAML
  education.yml
  research.yml
  links.yml                侧栏三个外链
  projects.yml             并入 Fun 的项目列表

_includes/               组件。改一处，全站生效
  head.html                <head> + 防闪白的主题脚本
  header.html              导航 + 明暗按钮
  sidebar.html             头像 + 外链
  pub-card.html            一篇论文的卡片
  footer.html
  icon.html                SVG 图标（贴合 viewBox）

_layouts/
  default.html             页面骨架
  home.html                首页（侧栏 + 正文）
  wide.html                Gallery 这类需要整宽的页

assets/
  css/tokens.css           ← 颜色 / 字阶 / 间距，改配色只动这个文件
  css/base.css             ← 排版基础
  css/layout.css           ← 页面骨架 + 响应式
  css/components.css       ← 导航 / 论文卡 / 按钮 / 页脚
  css/gallery.css          ← Gallery + lightbox
  js/site.js               ← 主题 / 回顶 / scroll-spy / 论文图放大
  js/gallery.js            ← 拼图引擎 + lightbox

tools/
  make_gallery.py          照片流水线（生成多档 WebP + manifest）
  shrink_cs180.sh          CS180 巨型资源压缩

index.html                 首页（只剩 front-matter）
gallery/index.html         Gallery（只剩 front-matter）
gallery/photos/            原图（仓库里留着，但 exclude 出发布）
gallery/derived/           生成的多档 WebP（发布）
gallery/photos.json        生成的 manifest
gallery/photos.meta.json   你手写的标题/说明 —— 脚本永不覆盖
projects/index.html        → 重定向到 /#fun（保住旧链接）
cs180-portfolio/index.html 重写封面页
cs180-portfolio/proj1..6/  不动
docs/redesign-2026-08.md   本文件
```

---

## 3. 实施步骤（每步独立提交，可单独 revert）

### 步骤 1 · 仓库瘦身
- 删 `_site/`（804MB，Jekyll 的构建产物副本，GitHub Pages 从来不发布它）
- 删 `cs180-portfolio/proj1/_site/`（同上，嵌套的第二份）
- 删 28 个被 git 跟踪的 `.DS_Store`
- 删 `cs180-portfolio/DSC11994.JPG`（14MB，**已确认没有任何页面引用**）
- 新增 `.gitignore`

> **风险**：低。删的全是构建产物和无引用文件。git 历史不动，随时能取回。

### 步骤 2 · Jekyll 地基
- `_config.yml`：`title` / `url` / `exclude`（Gemfile、tools、docs、gallery/photos）
- `_layouts` + `_includes` 建起来，先让首页原样渲染
- **验收**：`bundle exec jekyll build` 通过，产物和旧站视觉一致

### 步骤 3 · CSS / JS 系统
- 三份分叉的 CSS（16KB + 14KB + 18.5KB，重合 85%、颜色已漂移）合成一套 tokens + 分模块
- 三份复制粘贴的内联 JS 合成一个 `site.js`
- 修主题闪白：主题脚本提到 `<head>`，在首帧渲染前就定好

### 步骤 4 · 首页
把已定稿的这些落地：
- Arial 400 / 16px；去掉 4 处 `<p>&nbsp;</p>` 撑高，改成真实间距
- 头像窄屏变椭圆 → `height:auto`（`<img height>` 属性会让 `aspect-ratio` 失效）
- 日期 `2024.08 — now` 不再用主色（主色 = 可点击，是个语义错误）
- 论文缩略图可点开放大（FLIP，从原位长出来）
- `Edu & Honors` → `Education`；`Projects` tab 撤掉，内容并入 Fun
- 明暗按钮：`☾`/`☼` 字符 → 内联 SVG + 40×40 固定盒子（原来切换会让导航横移 7.03px）
- 窄屏导航可横滑（390px 下 5 个 tab 溢出 31px）
- 侧栏三个图标归一化到等大（原来 scholar 比 github 目测大 16%）

### 步骤 5 · Gallery
- 断行：贪心 → **线性划分动态规划**
- 渲染：`flex-wrap` → **绝对定位 + transform**（算出来的行 = 渲染的行）
- resize：`debounce(fn,0)` + `transition:width .5s` → **ResizeObserver + rAF 逐帧无过渡**
- 加载：19.5MB 全量 → 8KB manifest + 按屏宽挑档（400/800/1600/2400）
- lightbox：←→ / ESC / 点暗处关 / 锁滚动 / 预取邻居 / 手机滑动 / `#照片名` 深链
- 手机端不再裁切（原来 ≤768 是另一套硬三列 + `object-fit:cover`）
- `tools/make_gallery.py`：**以后加照片 = 丢文件 + 跑一次脚本**

### 步骤 6 · CS180
- 封面页重写，套用新设计语言（原来那版 `position:absolute` 在 1440 下已跑位）
- 资源压缩（详见第 4 节）
- **6 个子页的正文一个字不改**，只做一次机械的 `loading="lazy"` 注入（417 张图）

### 步骤 7 · 收尾
- `projects/` → 重定向到 `/#fun`
- 全宽度截图验收 + 死链检查 + 构建检查

---

## 4. CS180 资源压缩明细

| 文件 | 现在 | 手段 | 预计 |
|---|---|---|---|
| `proj3/src/3/morph_sequence*.gif` ×3 | 241 MB | `gif2webp` → 动画 WebP，**`<img>` 标签不变，只改扩展名** | ~12 MB |
| `proj3/anne-adams-2.png` | 58 MB | PNG → WebP | ~3 MB |
| `proj6/p1.gif` | 29.5 MB | 同上 | ~2 MB |
| `proj6/*.gif` ×2 | 33 MB | 同上 | ~3 MB |
| `spruce.JPG`（封面） | 16 MB | 降采样 + WebP | ~0.6 MB |
| `DSC11994.JPG` | 14 MB | **删**（无引用） | 0 |
| `proj1/emir.jpg`、`self-port-3.jpg` 等 | ~50 MB | 降采样 | ~5 MB |
| 其余 400+ 张 | — | 批量降采样到 ≤2000px | — |

目标：**842 MB → 100 MB 以内**。

> **为什么这很重要**：GitHub Pages 已发布站点上限 **1 GB**。现在实际发布约 874 MB，已经贴着红线。
> git log 里那两条 `what happened???` 和 `force build` 大概率就是这个。

**安全网**：压缩脚本**不覆盖原文件** —— 输出到新扩展名，确认无误后才在单独一个提交里删原文件。

---

## 5. 以后怎么更新（无 AI）

| 要做的事 | 怎么做 |
|---|---|
| 加一篇论文 | `_data/publications.yml` 加一段（6 行） |
| 换配色 | `assets/css/tokens.css` 改几个变量，全站生效 |
| 加照片 | 丢进 `gallery/photos/` → `python3 tools/make_gallery.py` |
| 改照片标题 | `gallery/photos.meta.json`，脚本永不覆盖你写的 |
| 加获奖 / 学历 | `_data/education.yml` |
| 本地预览 | `bundle exec jekyll serve` |

---

## 6. 明确不做的事

- 不动 CS180 那 6 个子页的正文、结构、配色
- 不重写 git 历史（`.git` 仍是 1.6GB；想清理是另一次单独的决定）
- 不加 GitHub Actions / 打包工具 / 前端框架
- 不做汉堡菜单（窄屏导航用可横滑的一条）
- 折纸单独页面 —— 你还没想好，暂缓
