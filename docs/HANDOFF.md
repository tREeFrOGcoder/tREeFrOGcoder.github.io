# 交接文档 · 个人主页改版 2026-08

**给接手的 agent：先完整读这一份，再动任何代码。**
**给 Ziche：日常改内容看 [MAINTAIN.md](MAINTAIN.md)，那份是操作手册，不用读本文。**
本文件记录了与 Ziche 的全部讨论、已定的决策、已完成的部分、剩余工作，
以及一批只有实测才知道的坑。

---

## 0. 三十秒速览

| | |
|---|---|
| 仓库 | `~/Desktop/code/tREeFrOGcoder.github.io` |
| 线上 | https://zicheliu.com （GitHub Pages + CNAME） |
| 工作分支 | `redesign-2026-08`（**尚未 push**） |
| 回滚点 | tag `pre-redesign-2026-08-23` = 改版前最后一个提交 `86e68a7` |
| 备份分支 | `backup/pre-redesign-2026-08-23` |
| 已完成 | 全部步骤（7 个提交，见 §4 和 §10） |
| 剩余 | 只剩收尾验收（见 §5）。CS180 已定案：**永不改动** |
| 线上现状 | **完全没变**。`main` 仍在 `86e68a7`，改版分支未 push |

**回滚方式**：`git checkout main`（回到旧站），或
`git reset --hard pre-redesign-2026-08-23`（回到改版前那一秒）。

---

## 1. Ziche 明确表达过的偏好与底线

这些是反复确认过的，**不要重新决定**：

1. **讨厌模板**。整个站是他手搓的，每个比例、每个交互细节都是他自己调出来的。
   目标是"把地基弄干净"，不是"换成一套更好的模板"。
2. **要能无 AI 自己维护**。所以不要 npm、不要打包工具、不要前端框架、不要 CI。
   最终选了 Jekyll，因为 GitHub Pages 自带构建 —— push 即上线，没有会坏的中间层。
3. **不喜欢 tab 多的个人主页**。Projects 那个 tab 已经撤掉，内容并入 Fun。
   折纸单独页面他还没想好，**暂时不要做**。
4. **字体口味**（花了两轮才定下来，很具体）：
   - 要清晰、笔画不能细
   - **字母间距要紧**，这样词与词之间反而分得开
   - 但**不要瘦长挤在一起**的那种
   - 最终定 **Arial 400 / 16px**。他试过 Instrument Sans 和 Roboto 都喜欢，
     但最后选了 Arial（零网络请求、全平台一致）。
   - 他明确说 **Inter 最差，系统字体 400 其次差**。别再提这两个。
5. **CS180 一点都不要动**。→ 见 §6，这是我踩过的坑。
6. 要看 demo 再决定审美，不要凭描述定。他会在多个方案间挑。

---

## 2. 已定的设计决策（全部经他确认）

### 视觉方向：「A · 精修现状」
给他看过三个方向（A 精修 / B Quiet Academic 纸墨衬线 / C Editorial 大字号），
他选了 **A**。原话：*"这个分块最合理最清晰"*。B 也喜欢但"字体有点花哨、分块不明显"。
C 被否：*"这毕竟是学术主页"*。

**保留不动的**：冷蓝配色、侧栏 250 / 正文 750 的比例、圆形头像、venue 药丸、
回到顶部按钮、章节顺序。

**已定的改动清单**（都已实现，见 §4）：

| # | 改什么 | 为什么 |
|---|---|---|
| 1 | 正文 Arial 400 / 16px | 他的选择。**不要加 `-webkit-font-smoothing:antialiased`** —— 实测那会让墨量掉 7%，正文发虚 |
| 2 | 去掉 4 处 `<p>&nbsp;</p>` 撑高 | 改成真实的 margin |
| 3 | 头像窄屏变椭圆 → 修 | 见 §7 坑 #1 |
| 4 | `2024.08 — now` 不再用主色 | 主色 = 可点击。日期不可点却用主色，是语义错误。他自己发现的 |
| 5 | 论文缩略图可点开放大 | 他要求"越简单越好，点开就放大、周围变暗、再点缩小"。用 FLIP 从原位长出来 |
| 6 | `Edu & Honors` → `Education` | 他要求 |
| 7 | Projects tab 撤掉，并入 Fun | 他要求 |
| 8 | 明暗按钮 ☾/☼ → 内联 SVG | 见 §7 坑 #2。他一直想修这个 |
| 9 | 窄屏导航可横滑 | 见 §7 坑 #3 |
| 10 | 侧栏三个图标归一化等大 | 见 §7 坑 #4。他自己发现的 |

### Gallery：完全重写
他的原话：*"gallery 那块可能要完全重新设计，现有的 feature 都要有，
但现在的加载并不一定够好，拼图机制也不够好，目标是起码达到 flickr 那种拼图水平"*。

**已定**：默认「对齐行」+「舒适」尺寸，瀑布流作为可切换选项保留。

**他点名要的 lightbox 功能**（原来一个都没有）：
照片间切换、点暗处关闭、键盘、丝滑。全部已实现。

**他自己发现的 bug**（已修）：
- 左右翻页和右上角关闭键冲突
- 390px 下左右翻页难理解、箭头遮挡照片内容
- 键盘选中时"很清晰明显的蓝色选中框框"，翻页热区被框出来破坏玻璃效果

### 代码地基：Jekyll 正规化
他在「零构建纯静态 / Jekyll 正规化 / 最小改动」三者中选了 **Jekyll**。

**关键约束**：用 GitHub Pages 自带的 Jekyll **3.9**，不装 GitHub Actions。
本项目只用 layouts / includes / data / Liquid 循环 —— 这些在 3.9 和 4.x 行为一致。
`plugins: []`，不用任何第三方插件。**push 即上线，没有 CI 会坏**。
本地预览用他机器上已有的 Jekyll 4.2.2（`bundle exec jekyll serve`）。

### 仓库瘦身
他选了「删没用的，**git 历史不动**」。
他一开始担心"删 `_site` 是不是把 cs180 删了" —— 我用三条证据证明了不会（见 §3）。
**历史重写（git-filter-repo）他没有批准，不要做。**

---

## 3. 实测得到的事实（不要重新推测，这些都验证过）

### 仓库
- 改版前：工作区 3.2 GB，`.git` 1.6 GB，跟踪文件 1879 个
- `_site/` 804 MB 是 **Jekyll 构建产物的完整副本**，而 Jekyll 会自动把自己的
  输出目录排除在源文件之外 → **GitHub Pages 从来没有发布过这一份**
  - 证据：线上 `/cs180-portfolio/` 的 md5 = 顶层 `cs180-portfolio/index.html` 的 md5
    = `fb0141dcb0ef1bf876bf29eaab7bc6f0`
- `cs180-portfolio/proj1/_site/` 是嵌套的第二份构建产物
- 28 个 `.DS_Store` 被 git 跟踪，且没有 `.gitignore`
- `cs180-portfolio/DSC11994.JPG`（14 MB）**grep 全站零引用**

### ⚠️ GitHub Pages 1 GB 上限
已发布站点上限是 1 GB。改版前实际发布内容约 **874 MB**，已经贴着红线。
git log 里那两条 `what happened???` 和 `force build` 大概率就是这个。
**这是 CS180 必须瘦身的真正原因**，不只是美观问题。

### 首页资源
| | 改版前 | 改版后 |
|---|---|---|
| favicon | **972 KB**（2048×2048 PNG，每页每次都下） | 23 KB |
| 头像 | 1417 KB（860px PNG，显示只有 200px） | 40 KB WebP |
| 论文图 ×2 | 723 KB | 207 KB WebP |
| cal-squirrel | 2314 KB | 251 KB |
| `src/` 合计 | **7.9 MB** | `assets/img/` **624 KB** |

### Gallery
| | 改版前 | 改版后 |
|---|---|---|
| 首屏下载 | **19.5 MB**（12 张原图，且 `.invisible` 要等全部加载完才显示） | **8 KB** manifest（含内联模糊占位） |
| 之后按需 | — | 0.2–2.4 MB（按屏宽挑 400/800/1600/2400 档） |
| 行高平均偏差 | 16.6% | **13.0%** |
| 最坏一行 | 42% | **35%** |
| 36 张时 | 17.0% | **11.9%**（优势随规模增长） |
| 手机端 | 硬三列 **裁切** | 同一套算法，不裁切 |

拼图代价函数在 8 个候选里选定 `log(h/target)²`；`×k`、`+常数`、非对称罚项都更差。
72 档宽度密集扫描验证过，每一行都精确铺满容器、同行等高。

### 明暗按钮位移
| | 按钮宽度 | 导航位移 |
|---|---|---|
| 改版前 | 29.50 → 36.53 px | **−7.03 px** |
| 改版后（1240px） | 40.00 → 40.00 px | **0.00 px** |
| 改版后（390px） | 44.00 → 44.00 px | **0.00 px** |

### 窄屏导航
12 档宽度（320→1440）实测，**页面横向溢出全部为 0**。
≤414px 时导航可横滑，≥480px 全部放得下。

### 侧栏图标
三个图标共用 `viewBox="-8 -4 42 42"`，但图形在画布里占比各不相同：
scholar 66%×66%、github 57%×56%、mail 58%×**44%**。
所以哪怕 `width` 写一样，scholar 也会比 github **目测大 16%**。
修法是给每个图标算贴合自身的 viewBox 并归一化，实测后三个渲染宽度**全是 17.1 px**。

---

## 4. 已完成的部分

### `aa6835a` 步骤1 · 仓库瘦身
- 删 `_site/`（804 MB）、`cs180-portfolio/proj1/_site/`
- 删 28 个被跟踪的 `.DS_Store`，新增 `.gitignore`
- 删 `cs180-portfolio/DSC11994.JPG`（14 MB，零引用）
- 工作区 3.2 GB → 2.4 GB，跟踪文件 1879 → 913

### `2e7fa4a` 步骤2-4 · Jekyll 地基 + CSS/JS 系统 + 首页
新增结构：
```
_config.yml
_data/{publications,education,research,links,projects}.yml
_includes/{head,header,sidebar,pub-card,footer,icon}.html
_layouts/{default,home,wide}.html
assets/css/{tokens,base,layout,components}.css
assets/js/site.js
assets/img/{me.webp,favicon.png,cal-squirrel.webp,paper/*}
index.html            ← 只剩 front-matter + 内容
```
- 三份分叉的 CSS（16+14+18.5 KB，重合 85%、颜色已漂移：
  主色 `#428fb5` vs `#336b87`、背景 `#f7fcfc` vs `#edf7f9`）合成一套 tokens + 分模块
- 三份复制粘贴的内联 JS 合成 `assets/js/site.js`
- **主题的读取与应用提到 `<head>` 同步执行** —— 改版前在 `<body>` 里，每次刷新都闪白
- §2 表格里 1–10 全部实现

### `260fbf4` 步骤5 · Gallery 引擎 + 照片流水线
```
assets/css/gallery.css
assets/js/gallery.js
tools/make_gallery.py
gallery/index.html         ← 重写
gallery/photos.json        ← 脚本生成的 manifest
gallery/photos.meta.json   ← 手写标题，脚本永不覆盖
gallery/derived/           ← 生成的四档 WebP（8 MB，发布）
gallery/photos/            ← 6000px 原图（19.5 MB，exclude 出发布）
```
同时清理：删 `gallery/gallery-layout.js`、三份重复 `style.css`、
5 份 Gemfile 收敛成 1 份、删 `src/`（7.9 MB）、`projects/` 改成重定向到 `/#fun`。

**验收状态**：`bundle exec jekyll build` 通过，首页与 Gallery 都已截图确认渲染正确。

### 之后的四个提交（2026-08-24）

| 提交 | 内容 |
|---|---|
| `c92b100` | 交接文档 + 撤回 CS180 改动 |
| `5e46729` | CS180 定案摘链接 + 文案回归 + Gallery 英文化 |
| `3f7ca9c` | Gallery 收起调参按钮 + 修键盘翻页的整窗焦点环 |
| `6d94eb4` | 修关闭热区 + 撤掉冗余翻页键 + CSS/JS 加版本号 |
| `8091d5f` | 换图改成双层交叉淡入，根治切换闪动/形变 |

细节全部记在 **§10**。

---

## 5. 剩余工作

### ✅ 步骤 6 · CS180 —— 已定案（2026-08-24，Ziche 拍板）

**决定：`cs180-portfolio/` 永远不动。不压缩、不改 HTML、不重写封面页、不搬仓库。**

已执行：`_data/projects.yml` 里的 CS180 那条注释掉了（三行），首页 Fun 不再指过去。
目录、文件、`/cs180-portfolio/` 这个 URL 全部原样保留，仍可直接访问。
想恢复首页链接：把那三行的 `#` 去掉。

**1 GB 红线不再是紧急问题**，实测（按 git blob 精确统计，不是估）：

| | 改版前 `86e68a7` | 现在 |
|---|---|---|
| Pages 会发布的总量 | **871.3 MB** | **765.7 MB** |
| └ cs180-portfolio | 840.3 MB | 757.0 MB |
| └ gallery | 19.5 MB（原图直发） | 8.0 MB（只发 derived） |
| └ 其余全站 | 11.5 MB | **0.7 MB** |

余量 258 MB，而且是这次改版自己腾出来的（步骤1 删掉了 cs180 内嵌的第二份
`_site` 83 MB + 无引用的 14 MB 大图）。**不要拿这个当理由去动 CS180。**

顺带实测：本地全量构建（含拷贝 759 MB 静态文件）**1.69 秒**，构建时间不是问题。

### ✅ 文案回归 —— 已定案（2026-08-24）

把旧站首页和新站的**纯文本逐句 diff**，查出 6 处未经同意的文案漂移。Ziche 的裁定：

| # | 项 | 裁定 | 状态 |
|---|---|---|---|
| 1 | 论文标题 `Humans or llms as the judge? a study on judgement biases` → `Humans or LLMs as the Judge? A Study on Judgement Biases` | **不用改**，保留修正后的大小写 | 保持 |
| 2 | `TL;DR:` 的冒号丢了 | **补回来** | 已改 |
| 3 | 回顶按钮 `↑ Top` → `↑` | *"top 那里就不应该有字，你是对的"* | 保持 |
| 4 | footer 删掉 `Template may be used with proper attribution.` | 交给我判断 → 保持删除（他手搓的站写 Template 本来就不对），改成 `Design & code by Ziche Liu.` | 保持 |
| 5 | `© 2025` / `2025-12` → 跟随 `site.time` 自动 | 交给我判断 → 保持自动 | 保持 |
| 6 | Fun 引导语 | *"建议用我的原话"* → 改回 `Welcome!!! You've found my stash of some interesting projects~`，项目标签也回到 `INDENG174` / `NAACL2025`（无空格） | 已改 |

未列入表格但也有变化、判定为可接受的：
- `2024.08 - now:` → `2024.08 — now`（连字符改破折号、冒号去掉）。
  这是「日期不再用主色」那次改动的连带项，靠斜体灰 + 加粗黑做区分，实测可读性没问题。
- `<b>Language & LLMs</b>.` → `<span class="rk">Language & LLMs.</span>`，
  句号从粗体外挪到粗体内。16px 下肉眼不可辨。

### ✅ Gallery 界面语言 —— 已定案（2026-08-24）

**全部英文**。站点 `lang: en`，看这页的多半是 PhD 招生委员会。
Layout: Justified / Masonry · Size: Compact / Comfortable / Large ·
Filter: All / Photos / Origami，副标题 `Click to enlarge · ←→ to browse · ESC to close`。

**注意：JS / CSS / `_includes` 里的中文全是注释，不渲染，故意留着给 Ziche 自己维护用。**
唯一面向用户的中文原本只在 `gallery/index.html`，已清空。

### ✅ 拍摄参数 —— 已定案（2026-08-24）

Ziche：**不要拍摄参数**。lightbox 只显示标题 + 拍摄日期。
`tools/make_gallery.py` 里读 EXIF 的能力留着（现有 WebP 本来也没 EXIF，读不到就跳过），
但**不要主动去找原图补参数**。

### 步骤 7 · 收尾验收 —— 大部分已完成

已验（2026-08-24 实测，非推测）：

| 项 | 方法 | 结果 |
|---|---|---|
| `jekyll build` | 删 `_site` 全量重建 | exit 0，无警告 |
| 首页死链 | 抓全部 `href/src="/…"` 逐个 curl | **0 死链** |
| `/projects/` 重定向 | curl | 200，`<meta refresh>` + JS 双保险 → `/#fun` |
| `/cs180-portfolio/` | curl | 200，摘掉首页链接后 URL 仍可访问 |
| 横向溢出 | **iframe 探针**量 `scrollWidth vs innerWidth`，首页 + Gallery 各 9 档宽（320→1440） | **全部 0** |
| 头像圆形 | 同上量实际盒子 | 104² / 120² / 200² —— 每档正圆 |
| 明暗按钮位移 | 同上 | 窄屏恒 44、宽屏恒 40 → 位移 0 |
| Gallery 行铺满 | 量每行最右图块 vs grid 右边缘 | **Δ = 0.00 px**（768 下 +0.06 亚像素） |
| Gallery 内容 | 逐条比对 13 张 title | 13/13 与旧站逐字一致 |
| 暗色 + lightbox | 截图 | 月牙正常、箭头在照片外、关闭键不冲突、`1 / 13` 正常 |

还没做：
- Gallery 深链 `/gallery/#Owl` 的**运行时**验证（manifest 里 `Owl` 存在已确认，但没实跑过打开动作）
- 真机验证（目前全部是 headless Chrome + iframe）

### 还没做但讨论过的
- **折纸单独页面**：Ziche 说"还没想法，暂时也不打算公开折纸 tab"。**不要做。**
- **git 历史重写**：`.git` 仍是 1.6 GB。他没批准，**不要做**。
- **`.gitattributes` 三条死 LFS 规则**：全部指向已不再跟踪的 `_site/`，
  而 `git lfs ls-files` = 0 → LFS 从来没真生效过（那三个 80 MB GIF 是普通 blob，
  这就是 `.git` 1.6 GB 的来源）。清掉是零风险，但 Ziche 还没表态，**先别动**。

## 6. ⚠️ 我犯的错 —— 必读

**2026-08-23，我在没有逐项确认的情况下跑了 CS180 压缩脚本。**

做了什么：
- 生成了 37 个 `.webp`（GIF/PNG → 动画 WebP / WebP）
- **就地覆盖了一批 JPG**（降采样，原文件只剩 git 历史里有）
- 改写了 5 个子页 HTML 的 `src` 扩展名

Ziche 打断并说不该动 CS180。**已完整还原并逐项核对**：
- `git checkout -- cs180-portfolio/` + `git clean -fdq cs180-portfolio/`
- 核对结果：未提交改动 0 项、残留 `.webp` 0 个、HTML 里残留引用 0 处、
  文件大小全部回到原值（morph_sequence.gif 80.4 MB、emir.jpg 15.8 MB、
  sec4-sobel-steps.jpg 13.7 MB、spruce.JPG 15.4 MB）
- cs180-portfolio 仍是 **759 MB**，与步骤5 提交时完全一致

脚本移到 `tools/parked/shrink_cs180.py.DO-NOT-RUN`，加了警告头，
里面保留了实测的压缩比数据（GIF 省 330 MB / PNG 省 142 MB / JPG 省 86 MB，
合计 559 MB，可把 cs180 从 759 MB 压到约 200 MB）。

**教训给下一个 agent**：
CS180 的 6 个子页对他有特殊意义（是课程作品，不想返工）。
"资源压缩"听起来无害，但**改扩展名就要改 HTML**，而他说过子页一个字都不能改。
这类边界一定要先问，别自己解释。

---

## 7. 实测踩过的坑（这些不查证根本想不到）

### 坑 #1 · `<img width height>` 属性会让 `aspect-ratio` 失效
**现象**：头像在 390px 下变成椭圆（104×200）。
**根因**：我给 `<img>` 加了 `width="200" height="200"`（本意是防布局抖动）。
HTML 的 `height` 属性会被当成 CSS `height`；宽高**都**被指定时，
`aspect-ratio` 直接被忽略。
**修法**：CSS 里显式写 `height:auto`。
另外 `.avatar` 必须 `flex:0 0 auto` —— 窄屏 `aside` 变横向 flex 时它会被压缩。
**已验证**：320 / 390 / 640 / 900 / 1440 五档全部正圆。

### 坑 #2 · `☾` / `☼` 是字体字形，宽度不可控
**现象**：切换明暗时整条导航横移 7.03 px。
**根因**：两个字符的字宽由字体决定。而且它们在 Windows/安卓上可能渲染成
**彩色 emoji 或方框**。绝对定位治不了根，因为根因是尺寸不可控。
**修法**：内联 SVG + `40×40` 写死的按钮 + `flex:0 0 auto`。

**顺带的坑**：想用 `<mask>` 把圆盘"啃"成月牙 —— **不要这么做**。
mask 内容上的 CSS transform 不被可靠支持，暗色下只会渲染成一个实心圆。
现在的实现是太阳和月亮两个独立图标叠在同一块画布上旋转互换。
`transform-box:view-box` 必须显式写，否则旧版 Chrome 旋转中心会跑偏。

### 坑 #3 · 窄屏导航溢出
390px 下 5 个 tab 加起来比屏幕宽 31 px（原来 6 个 tab 时更严重）。
**不做汉堡菜单**（他不喜欢那种"模板感"）。做法是 `overflow-x:auto` +
右边一道 `mask-image` 渐隐提示还有内容，纯 CSS 无 JS。

### 坑 #4 · SVG 图标不等大
见 §3。改 `width` 是治症状，要改 `viewBox`。

### 坑 #5 · Grid 自动排布会把缩略图放到第 2 行
`.pub` 是两列 grid，`.pub-thumb` 在 DOM 里先出现。
只写 `grid-column` 不写 `grid-row`，自动排布会把 body 挤到第 2 行。
**必须两个都显式写 `grid-row:1`。**

### 坑 #6 · Jekyll `exclude` 是前缀匹配
`exclude: gallery/photos` 会把 **`gallery/photos.json` 一起排除**，
导致 Gallery 拿不到 manifest（404）。
**必须写成 `gallery/photos/`（带结尾斜杠）。**

### 坑 #7 · `img.decode()` 在刚从 `hidden` 切出来的元素上可能永不 settle
论文图放大动画会卡在半路，而且 `busy` 标志解不开，**连关闭都点不动**。
**修法**：改用 `load` 事件 + `setTimeout` 兜底，任何情况下都往下走。
（`assets/js/site.js` 里的 `ready()` 函数。）

### 坑 #8 · IntersectionObserver 对 0×0 元素不触发
Gallery 原来靠 IO 做懒加载。图块在 `layout()` 之前尺寸是 0，
IO 不会认为它们进入视口 → 首屏永远卡在模糊占位上。
**修法**：位置我自己算过，直接按 `y/h` 判断离视口多远，不用 IO。

### 坑 #9 · resize 里的"宽度没变就跳过"会把布局卡死
```js
if (grid.clientWidth === lastW) return;   // ← 不要这样
```
首次量到的宽度可能是**滚动条出现前 / 网页字体加载完成前**的。
一旦跳过就再也不会修正。每个图块内部已有 memo，重复调用不产生多余 DOM 写入。
另外补了三次兜底重排：`load` 事件、`document.fonts.ready`、`setTimeout 60ms`。

### 坑 #10 · 双引号字体名会截断 `style` 属性
`<div style="font-family:${stack}">` 里如果 stack 是 `"Helvetica Neue",...`，
双引号会提前结束属性 → 静默回退到衬线体。
**用 JS 设 `el.style.fontFamily` 或改用单引号。**

### 坑 #11 · headless Chrome 的两个测量陷阱
调试时会误导人，记一下：
- `--dump-dom` **忽略 `--window-size`**，`innerWidth` 恒为 500。
  量响应式必须用 iframe 或 `--screenshot`。
- **CSS transition 在 `--virtual-time-budget` 下不推进**，
  `getComputedStyle` 读到的是起始值。验证动画终态要用截图，别读计算样式。
- macOS 没有 `timeout` 命令，别在脚本里用。

---

## 8. 以后 Ziche 怎么自己更新（无 AI）

**已经单独写成 [MAINTAIN.md](MAINTAIN.md)** —— 换头像、改正文、加论文、加照片、
换配色、改导航、上线、回滚，每一项都有可直接复制的命令和踩坑提示。
本节不再重复，改动请同步更新那一份。

## 9. 环境

```
Ruby 3.3.5 · Bundler 2.5.18 · Jekyll 4.2.2（本地）/ 3.9（线上 Pages）
Python 3.11 + PIL 11.3.0        # tools/make_gallery.py 用
ffmpeg / gif2webp / cwebp 都有   # 压缩用（目前暂缓）
没有 PyYAML → 校验 YAML 用 ruby -ryaml
Chrome 在 /Applications/Google Chrome.app/... （截图验收用）
```

**Demo 沙盒**（这次讨论用的，不在仓库里，会随 session 清掉）：
`/private/tmp/claude-501/-Users-archerliu/<session>/scratchpad/lab/`
里面有三个视觉方向的完整 demo、字体对照页、字重梯度页。
如果需要重新给他看对比，这些文件是现成的。

---

## 10. Gallery / Lightbox 的返修记录（2026-08-24）

> Ziche 试用后逐条反馈，来回改了三轮。记在这里是为了**下次他再提起时能立刻接上**，
> 不用重新推一遍。每条的格式是：他的原话 → 根因 → 改法 → 怎么验的。

### 10.1 「不需要 layout/size/filter 那些按钮」

**改法**：参数搬到 `gallery/index.html` 的 front-matter（`tune` / `mode` / `size` / `filter`），
渲染成 `#grid` 的 `data-*`，`gallery.js` 从那里读默认值。
`tune: true` → 按钮回来，调完写回值再改 `false`。按钮的选中态跟着值走，不会对不上。

顺带：分隔线从 `.ctl` 挪到 `.ghead` —— 控件条平时不渲染，线不能挂在它身上。

### 10.2 「键盘翻页会留下全 window 蓝色边框」

**根因**：`#light` 是 `position:fixed;inset:0`，打开时被 `.focus()` 拿走焦点。
鼠标点开时不画环，**一旦按方向键 `:focus-visible` 就命中它**，
浏览器于是沿着整个窗口画了一圈默认焦点环。

**改法**：`#light:focus,#light:focus-visible{outline:none}`。
模态框已占满屏幕，本来就不需要焦点环；里面按钮各自的白色焦点环不受影响。

**⚠️ 第一次报"已修"但他仍然看得到** —— 两个原因叠在一起：
1. 我用**合成** `KeyboardEvent` 验证，而浏览器的 `:focus-visible` 判定**只认真实按键**，
   所以我根本没复现出他的场景。必须用 CDP 的 `Input.dispatchKeyEvent`。
2. 他的浏览器缓存了旧 CSS —— `<link>` 上没有版本号。

**因此加了 `?v={{ site.time | date: '%s' }}`** 到所有 CSS/JS。
同一次部署内不变（缓存正常生效），一 build 就换。这类"改了却看不到"以后不会再有。

### 10.3 「不是所有暗色区域都能点击关闭，很反常识」

他的原话很关键，是个设计原则：
> *"左右的翻页键区域，鼠标一进去就有高亮显示，这是合理的，这是有提示的……
> 但是其他空间并没有提示，我也不希望有，大家也会默认是空白区域，点击即关闭"*

**根因**：关闭判定写成了**白名单** ——
`if (e.target === box || e.target.id === "light-stage" || e.target.id === "light-fig")`。
底部信息栏 `#light-bar` 是独立元素，占满宽、93 px 高，不在名单里 → 看着是暗处却点不动。

**改法**：反过来写成黑名单 ——「除了照片本身和有自己行为的控件，点哪都关」。

### 10.4 「底部那个 2/13 的翻页键冗余」

**改法**：删掉底部 `‹ n/N ›` 胶囊，进度改成**左上角**小徽标，和右上角的 × 对称，
`pointer-events:none` 所以它下面的暗处照样点得着。

同时 `.edge` 的 `bottom` 从写死的 `4.5rem` 改成 `0`，
由 `#light-bar` 用更高的 `z-index` 盖住 —— 标题换行时热区自动让位，不用维护魔法数。

**⚠️ 留下的副作用（他还没反馈）**：窄屏（≤640px）下 `.edge` 本来就 `display:none`，
底部胶囊删掉后**手机上只剩左右滑动翻页**。已用 390×844 触摸模拟验过滑动正常，
而且这也是 iOS 相册/Instagram 的通用手势。如果他之后说手机上少提示，
注意**不能加隐形热区** —— 那正好违反 10.3 里他讲的原则。

### 10.5 「点开和翻页有奇怪的闪动放大，横竖切换尤其明显，切入切出还不一样」

**这条最值得记。** 根因是 `render()` 里有三处「先改可见元素 → 再等加载 → 再改一次」，
等待时间接近 0 时这三步就挤成了闪烁：

1. **`figure.style.aspectRatio = p.ar` 立刻生效，但图还没换** ——
   旧照片被强行塞进新比例的盒子里重新排版。横↔竖形状突变最大。
   **这也解释了为什么切入和切出效果不一样**：横→竖是盒子突然变窄变高，
   竖→横是突然变宽变矮，两种形变方向相反。
2. **`img.src = pre.src` 是硬切像素**，而 opacity 还在 300 ms 淡出途中
   → 「旧图 → 硬切 → 淡入」，看起来像闪过别的照片。
3. **快速连翻没有竞态保护**，几次加载争着上屏。

**改法**：舞台尺寸只由窗口决定、**永不随照片比例变**；两层 `<img>` 各自
`object-fit:contain` 居中；新图在背面层装好并栅格化后才交叉淡入；
加竞态令牌 `seq`，连翻时只有最后一次允许上屏，`close()` 也 `seq++` 作废在飞的加载。

配套三处：

| 改动 | 为什么必须一起改 |
|---|---|
| `box-shadow` → `filter:drop-shadow` | 图层盒子现在比照片大，`box-shadow` 会画在盒子上；`drop-shadow` 贴着照片真实边缘 |
| 关闭命中测试改成按 `object-fit:contain` 反算照片矩形 | 黑边现在属于 `<img>` 元素，不能再靠 `e.target` 判断 |
| 光标随位置变 | 压在照片上是普通箭头，落到黑边才 `zoom-out` |

**验收**：`fig` 盒子在 横→竖→横→横→竖 五次切换中恒为 `902x512`（零形变）；
每次切换后 `in` 类都在新图上；竖幅 2400×4265 → 显示 288×512 居中；
命中扫描确认 `I` 精确覆盖 288 px 宽的照片、四周黑边全部可关闭。

### 10.6 还没验的 / 可能还会回来找的

- **真机**：全部验证都是 headless Chrome + CDP。他手机上实际手感没反馈过。
- **Safari**：一次都没测过。`:focus-visible`、`filter:drop-shadow`、
  `object-fit` 在 Safari 上行为都可能有差异。
- **手机端翻页提示**：见 10.4 的副作用。
- **暗色下的 drop-shadow**：`rgba(0,0,0,.55)` 在深色背景上几乎看不见，
  目前是有意为之（暗色本来也不需要投影），但他没明确表态。

---

## 11. 调试这个站的工具与陷阱（省得下次重踩）

这一节全是**实测**，不查证根本想不到。

### 11.1 合成事件测不出 `:focus-visible`

`new KeyboardEvent(...)` + `dispatchEvent` **不会**让浏览器把"最近一次交互"
标记成键盘，所以 `:focus-visible` 的判定测不出来。
必须走 CDP 的 `Input.dispatchKeyEvent`（真实事件）。
本次调试用的最小 WebSocket + CDP 客户端在
`<scratchpad>/cdp.py`（会随 session 清掉，但只有 40 行，重写很快）。

### 11.2 headless 无 GPU 时，CSS transition 只在产生帧时推进

`getComputedStyle(el).opacity` 会读到**起始值或中间值**，看起来像"过渡没跑"。
**测量前先 `Page.captureScreenshot` 逼它产一帧**，或者干脆连拍十几帧再读。
本次差点因此误判交叉淡入是坏的。

### 11.3 `requestAnimationFrame` 在后台标签页/headless 里可能不推进

只靠 rAF 排下一步会把图卡在 `opacity:0`。
本次给 `nextFrame()` 加了 60 ms `setTimeout` 兜底，谁先到算谁 ——
和 `site.js` 里 `ready()` 同一个思路（见坑 #7）。

### 11.4 macOS 上 Chrome 窗口有最小宽度（约 500 px）

`--window-size=390` 会被**静默夹到 500**，截出来的图不是 390 的布局。
量真手机宽度必须用 CDP 的 `Emulation.setDeviceMetricsOverride`。
（这条是坑 #11 的延伸 —— 之前只知道 `--dump-dom` 有问题，
现在确认 `--screenshot` 也一样不可信。）

### 11.5 `Page.startScreencast` 在 `--disable-gpu` 下不吐帧

想逐帧看动画会直接卡死。改用「连续 `captureScreenshot` + 每次读一遍状态」。

### 11.6 macOS 没有 `setsid`

想让本地服务器脱离进程组不被回收，用 Python 双 fork：

```python
if os.fork()==0:
    os.setsid()
    if os.fork()==0:
        os.execv(sys.executable,[sys.executable,'-m','http.server','4323','--bind','0.0.0.0'])
    os._exit(0)
```

### 11.7 判断"改了却看不到"的第一件事

看 `<link>` 有没有 `?v=`。现在有了（`_includes/head.html` / `_layouts/default.html`），
但如果以后加了新的 CSS/JS 文件，**记得也带上 `?v={{ v }}`**。

### 10.6 「手机横竖屏字号不一样，Publications 那块还会变小」

**他的话**：主页字体大小在手机横竖屏时不一样，publication 区域字体大小没有统一，会变小。

**根因**：不是我们的 CSS —— 实测 390 竖屏和 844 横屏下，authored 字号完全一致
（About 16 / TL;DR 15 两边都一样）。真凶是 **iOS Safari 的文字自动放大**：
`text-size-adjust` 默认 `auto`，而它按【每个块级容器的宽度】各算各的放大系数。
横屏 844px 时 `max-width:640px` 那条单列规则失效，`.pub` 变回 `1fr 30%` 两栏，
`.pub-body` 只剩 **main 宽度的 68%**（竖屏是 100%）——
块窄 ⇒ 系数小 ⇒ Publications 的字比正文小。两个症状同一个根因。

**改法**：`assets/css/base.css` 的 `html{}` 加 `-webkit-text-size-adjust:100%`（含标准写法）。

**怎么验的**：CDP `Emulation.setDeviceMetricsOverride` 量两个方向的 computed
`fontSize` + `.pub-body/main` 宽度比；改完 `text-size-adjust` 从 `auto` → `100%`。
⚠️ Chrome/Firefox **复现不了**这个 bug（它们对带 `width=device-width` 的页面本来就不放大），
只有 iOS Safari 有 —— 所以最终以真机为准。

### 10.7 「gallery 依然有照片切入方向不对的问题」

**他的话**：gallery 依然有照片切入方向不对的问题。

**根因**：`swap()` 把新起点 `translateX(±26px)` 写到一个**过渡还开着**的图层上。
那层身上往往还留着它上次「退场」时写的 `translateX(∓26px)`，于是浏览器把它
**动画过去**而不是**瞬移过去**；两帧后我们一松手，它就从半路（甚至反方向的 -26px）
滑向 0 —— 看上去就是"从反方向飞进来"。
实测连按 5 次「下一张」，浏览器拿到的插值起点是
`+2.8 / -9.4 / +26 / +26 / -26 px` —— **完全看运气，所以时对时错**。

**改法**：`assets/js/gallery.js` 的 `swap()`：
掐掉过渡 → 摆好起点 → `void next.offsetWidth` 强制重排 → 再把过渡放回来。
另外给 `nextFrame` 回调加了 `token !== seq` 竞态检查（`front` 是在回调里才翻的，
不挡住的话连按时两次 swap 会抢同一层）。

**怎么验的**：`el.getAnimations()` 读 CSSTransition 的 `effect.getKeyframes()`，
拿到浏览器真正的插值 **from → to**。修好后 →/← 各 5 次、以及每 120ms 连按 6 次，
起点全部精确是 `+26.0 / -26.0`。
（这招比读 `getComputedStyle` 靠谱：不受"headless 不产帧、过渡不推进"影响 —— 见坑 11.2。）

### 10.8 「手机版没法放大照片，和左右翻页手势冲突」

**他的话**：gallery 手机版，没法放大照片，因为和左右翻页的手势冲突。

**根因**（两个叠一起）：
1. 原来的滑动翻页只读 `touches[0]`，**双指捏合时随便哪根手指先抬起来，
   都会被算成一次横滑** → 一捏就翻页。
2. 就算不翻页也放不大：`#light` 是 `position:fixed` 铺满屏的，
   iOS 原生捏合缩的是「视觉视口」，固定定位层不跟着走 —— 越缩越糊、还没法平移。

**改法**：自己做一套手势状态机（都在 `gallery.js` 的 Light 模块里）：
`#light{touch-action:none}` 先把浏览器的手势夺回来，然后
单指横滑（且未放大）= 翻页 / 双指捏合 = 缩放（锚点跟手）/ 双击 = 2.5× 切换 /
放大后单指拖动 = 平移。换照片和关闭时自动还原 1×。
缩放施加在 `#light-fig` 上（两层图一起缩，不打扰交叉淡入）；
`#light.zoomed #light-stage{overflow:hidden}` 只在放大时裁切，1× 时不裁免得切掉投影。

**怎么验的**：合成 `TouchEvent` 跑了 9 项（捏合不翻页 / 放大后拖动是平移 /
捏回去归位 / 未放大横滑才翻页 / 双击 / 竖滑不误翻页 / 翻页后缩放归零 / touch-action=none）。
⚠️ 两个坑：
- **`Input.dispatchTouchEvent` 在这台机器的 headless 上永远不返回**（单指也一样），
  只能用页内合成 `TouchEvent`。合成事件测不了浏览器的原生手势仲裁，但足够测我们自己的 handler。
- headless 里 `setTimeout(140)` **实测跑了 2000ms**，双击窗口(320ms)必然错过；
  而且 `applyZoom(true)` 走 .3s 过渡、不产帧就冻在起始值 —— 一度误判"双击坏了"。
  改成读**内联 style 的目标值**才测准（同坑 11.2 / 11.3）。

### 10.9 「放大模式不是真的放大，明显模糊」（10.8 的后续）

**他的话**：我怎么感觉你这个放大模式不是真的放大…图是变大了，但是明显模糊，比电脑模糊得多。

**他是对的，而且能量化**：拿「1× 截图数字拉伸 2.5 倍」当"假放大"参照，
量同一块 600×400 设备像素的高频能量（拉普拉斯方差）——
浏览器 2.5× 的结果是参照的 **0.92 倍**，即**比拉伸还差一点，等于完全没放大**。

**根因一：`transform:scale` 不会拿源图重新采样**，只是把已经栅格化好的位图整块拉大。
去掉 `will-change:transform` 也没用（实测仍 0.73×）。
→ 改成两种画法：**手势进行中**用 transform（GPU 合成、跟手），
**手指一松**就把 z/zx/zy 换算成图层的**真实布局尺寸**（`commitZoom`），
这时浏览器才会拿 2400px 源图重采样。两种模式几何完全等价，
实测切换瞬间画面位移 **0.20px**，肉眼无感。

**根因二（真正的元凶）：`base.css` 的全局 `img{max-width:100%}` 把落定按死了。**
`commitZoom` 明明写了 `width:800px`，量出来还是 374px —— 图层根本没变大，
所以第一次修完只从 0.92× 涨到 1.28×，而且那 1.28 还是假的
（裁切窗口里露出了更多画面内容造成的假象，不是细节变多）。
→ `.lb-img{max-width:none;max-height:none}` 解开后：
渲染宽 800 CSS px × dpr3 = **2400 设备像素，和源图 1:1**，
高频能量 **546.78**，而直接裁源图的理论上限是 **546.19** —— 已经顶到天花板。

**顺带**：双击目标从写死的 2.5× 改成 `nativeZoom()`，即"1 源图像素 = 1 屏幕物理像素"那一档
（横幅图约 2.14×，竖图约 1.2×，下限兜到 1.8×）。再往上就是硬拉了。

**已知天花板**：发布的最大档是 2400px（原图 6000px）。
横幅图双击到 2.14× 就是满血；竖图因为 1× 时已经快占满屏，能放大的余量本来就小。
想要更多余量得加一档（比如 3600），代价是多一份派生图，但只在用户真去放大时才下载。

**怎么验的**：`Page.captureScreenshot`(dpr=3) + PIL 拉普拉斯方差，
三方对比「假放大 / 实测 / 直接裁源图」。
⚠️ 又踩一个坑：**headless Chrome 会缓存 `_site` 里的 JS/CSS**，
`?v=` 也挡不住（连 HTML 一起缓存了），一度测的全是旧代码 ——
量之前务必 `Network.setCacheDisabled(true)`。

### 10.10 点开后按需加载 6000px 原图

**他的话**：能不能缩略图现在用这个档的，但是只要用户点击了，就加载那个大图，稍微有一会等待时间是可以的。

**做法**：
- `make_gallery.py` 给每条记录加 `full: {url, w}`，指向 `gallery/photos/` 里的原图。
  **刻意不塞进 `src`** —— `src` 是网格缩略图挑档用的，混进 6000px 会让大屏上的
  缩略图去下载原图。
- `_config.yml` 不再 exclude `gallery/photos/`（13 张合计 19.5MB，都是 WebP）。
- `gallery.js`：lightbox 仍然先上 1600 档（瞬间出图），上屏后在后台把 `full` 换上来。
  **延迟 300ms 再开始下载** —— 连按方向键快速翻页时不该把每张原图都拽下来，
  停下来看的那张才值得花流量。实测每 120ms 连按 5 次，原图下载数 = 0。
- 缩放上限 `MAXZ` 改成动态的 `maxZoom()`：由当前图的真实分辨率算「1 源图像素 =
  1 屏幕物理像素」那一档。原图换上来后这个值会自己变大（横幅图 2.14× → **5.35×**）。
  双击仍去一个舒服的 2.5×，想看更细的用捏合。

**效果**：同样双击到 2.5×，换上原图后细节是只有 2400 档时的 **1.45 倍**。
5.35× 时 374×5.35×3 = 6003 设备像素 ≈ 源图 6000px，正好 1:1。

**容量**：发布体积 768MB → 约 788MB，GitHub Pages 上限 1GB，还剩约 236MB。
以后再加照片要留意这条线（CS180 一家就占 759MB）。

⚠️ **又一个测量坑**：headless 里 `setTimeout` 被节流得厉害，
`close()` 里那个 300ms 的 `box.hidden=true` 实测要 557~1290ms 才落地。
我一度以为"点底部标题栏关不掉"（5 次里错 2 次），
实际 6/6 都关了，只是等 1s 读太早。**判"没关"要看 `.on` 有没有被摘掉，别只看 `hidden`。**

### 10.11 「侧栏那三条不该是块」+ 校徽放大（2026-08-27）

**他的话**：主页最左侧的那三个 scholar 的侧栏，现在每个 item 都是一整条有鼠标反馈的块，
我感觉没必要那么长，就是这些东西甚至本来就不应该是块，而是应该跟正文里那些可点击的链接一样，
鼠标划过去下面就出一条动态蓝色线的那种才对；然后 email 那里，鼠标移过去会出一个局部跟随的小浮窗；
UCSD 和 UCB 的校徽能看出来区别，你可以把三个校徽稍微放大一点点。

**根因（三条链接）**：`.rail-links a` 原来是 `display:flex` + padding + 圆角 + hover 底色，
在 250px 的侧栏里等于三块横贯全栏的色块。**光去掉背景不够** ——
`.rail-links` 是纵向 flex，`align-items` 默认 `stretch`，
不写 `align-items:flex-start` 每个 `<a>` 的**盒子**依旧是整栏宽，
只是你看不见它而已（鼠标划到 200px 处照样命中）。

**改法**：
- `.rail-links{align-items:flex-start}` + `a{display:inline-flex}` ⇒ 宽度只有内容那么宽
  （实测 250px → 85.9 / 80.5 / 69.9px）。
- 下划线复用 base.css 里正文链接那套 `linear-gradient` + `background-size:0→100% 1.5px`，
  但**挂在 `.lbl` 上不挂在 `<a>` 上** —— 挂 `<a>` 上会把图标一起划进去。
  为此 `sidebar.html` 给标签 span 加了 `class="lbl"`。
- hover 颜色由全局 `a:hover{color:var(--accent-hi)}` 接管，和正文链接完全同款。

**根因（Email）**：`.note` 是 `margin-left:auto` 推到侧栏最右边的一段灰字，
"Email" 和地址中间隔着半个侧栏，读起来像两个不相干的东西。

**改法**：改成绝对定位的小浮窗 `.tip`，`opacity` 过渡，`pointer-events:none`。
**开口方向试了三次才对**：
- 往上开 ✗ —— 浮窗 28px + 8px 间距 = 36px，而行距只有 33.6px，实测把 GitHub 整行盖死。
- 往右开 ✗ —— ≤900px 那套横排布局里 Email 是最后一条，浮窗会顶出视口多一条横向滚动条。
- 往下开 ✓ —— Email 本来就是最后一条，下面是空的。实测 1280/1024/900/760/640/390/320
  七个宽度下都 `overlaps: []` 且 `scrollWidth == innerWidth`。
- `@media (hover:none)` 下整个不显示：触屏没有 hover，只会在手指点下去那一瞬闪一下。

**顺手修的无障碍**：`{%- if l.note %}` 后面**故意留一个字面空格**，
不然屏幕阅读器把这条链接念成「Emailzil199@ucsd.edu」。
空格在 flex 容器里不生成匿名 flex item，画面零变化（实测宽度仍是 69.9px）。

**校徽**：`--edu-mark` 32px → **42px**。源图是 192×192，42px@2x=84px 还在源分辨率里面，
不糊。42 是上限附近 —— 一条的内容高度实测 52px，再大就顶边了。
42px 下 UCSD 的「UNIVERSITY OF CALIFORNIA / SAN DIEGO」环字和 Berkeley 的
蓝环 + 1868 已经能一眼分开。

**怎么验的**：CDP 量三条链接的 `getBoundingClientRect`、七个宽度下的浮窗遮挡与横向溢出、
亮/暗两套配色下的 hover 计算值、键盘 Tab 三次的下划线/浮窗/焦点环。
⚠️ 又一个 headless 坑：**不产帧的话 `:hover` 根本不会应用**，
`getComputedStyle` 读出来永远是静止态。派了 `Input.dispatchMouseEvent` 之后
必须 `Page.captureScreenshot` 逼一帧出来再读（同 §11.2）。
⚠️ 另一个：`Emulation.setEmulatedMedia` **不支持覆盖 `hover` 特性**，
`matchMedia('(hover:none)')` 照样是 false —— 触屏那条只能靠读 `document.styleSheets`
确认规则解析进去了，验不了真机行为。

### 10.12 「点开第一张时一堆照片冲到面前又瞬间消失」（2026-08-27）

**他的话**：以电脑为例，现在点开照片第一张时，屏幕上还是会有一堆照片突然冲到面前然后
瞬间又消失了的奇怪 bug，这个问题我之前就报过，但是没解决。

**为什么 §10.5 没修掉它**：§10.5 修的是 **lightbox 那张图**的切入动画。
这一条是**网格本身**在动，两套完全不同的机制 —— 我上次只盯着灯箱，没往身后看。

**根因**（和缩放、动画、滚动条统统无关）：

```js
document.querySelectorAll("[data-filter]").forEach(b => b.onclick = () => {
  ...; build(); layout(true);
});
```

`#grid` 自己就带着 `data-mode` / `data-size` / `data-filter`（展示参数从
`gallery/index.html` 的 front-matter 传进来的）。而那三组按钮在 `.ctl` 里，
**`.ctl` 平时根本不渲染**（`page.tune` 是 false）——
于是线上唯一匹配 `[data-filter]` 的元素就是 `#grid` 本身，
`onclick` 被装到了网格容器上。

点任何一张照片 → 事件冒泡到 `#grid` → 触发那个"切换筛选"的处理器 →
`build()` 把 13 个 `.tile` 全部销毁重建 → `layout(true)` 挂上 `.animating`。
新建的 `.tile` 从 CSS 默认的 `transform:translate3d(0,0,0)`（= 网格左上角）出发，
420ms 缓动滑回各自的位置 —— 而灯箱的淡入只要 260ms。
两段时间一叠，就是"一堆照片从左上角冲出来，然后被灯箱盖住消失"。

三个处理器（mode/size/filter）都装到了同一个 `#grid.onclick` 上，
后赋值的覆盖前面的，所以实际跑的是 filter 那个 —— 这也是它会 `build()` 重建的原因。

**改法**：把选择器限定进控件条。

```js
const ctl = s => document.querySelectorAll(".ctl " + s);
```

**怎么验的**（这个 bug 靠肉眼和截图都抓不住，headless 一秒只给几帧）：
在页面里挂一个 rAF 逐帧记录器 + 一个盯着 `#grid` 的 MutationObserver，然后派真实鼠标事件。
修复前，点击后 t+16ms：

```
#grid childList 变化 14 次、style 写入 39 次，class → "live on animating"
第 2 块 tile 的 x：726 → 60 → 133 → 204 → 272 → 524 → 644 → … → 726
（60 = 网格左边缘 = transform 是 identity；后面那串是 420ms 的缓动回归）
document.contains(旧的 tile 节点) === false   ← 铁证：节点被重建了
```

修复后，三个宽度（1440 / 1024 / 390）× 每个宽度点 5 张（第 1/2/5/8/13 张）：
`childList 变化 = 0`、`#grid class 变化 = 0`、tile 的 x 全程只有一个值、
灯箱正常开、方向键正常翻、Esc 正常关 —— **15/15 通过**。
另外把 `tune: true` 打开单独验了一遍：Layout / Size / Filter 八个按钮全部照常工作
（gridH 1827→2696→609，Origami 筛出 1 张，切回 All 恢复 13 张），
且 tune 模式下点照片同样不再重建网格。

⚠️ **测试坑**：验第 6 张时一度以为"灯箱打不开"，其实是那张图在视口外，
派过去的鼠标坐标 y > 900 根本没落在页面上。派事件前先 `scrollIntoView`。
