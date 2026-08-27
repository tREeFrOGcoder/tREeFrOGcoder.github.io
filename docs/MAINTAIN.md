# 自己改主页 · 操作手册

> 这份是给你（Ziche）自己看的。不需要 AI，也不需要记住任何命令 —— 用到哪一节翻哪一节。
> 原则：**内容在 `_data/`，样子在 `assets/css/tokens.css`，结构在 `_includes/`。**
> 绝大多数改动只碰第一类。

---

## 0. 先会这两条命令

```bash
cd ~/Desktop/code/tREeFrOGcoder.github.io

# 本地预览（会盯着文件改动自动重建，改完存盘刷新浏览器就见效）
bundle exec jekyll serve
#   → http://127.0.0.1:4000

# 想让手机也能看（同一个 Wi-Fi）
bundle exec jekyll serve --host 0.0.0.0
#   → 手机开 http://<你的局域网IP>:4000/     （IP 用 `ipconfig getifaddr en0` 查）
```

改完满意了再上线（见 §11）。

> **改了却看不到？** 先看终端有没有报错。CSS/JS 都带 `?v=构建时间戳`，
> 一重建浏览器就会拿新的，正常不需要硬刷新。

---

## 1. 换头像

文件：`assets/img/me.webp`

直接用新图覆盖它就行。要求：

- **正方形**最好（不是正方形会从中心裁成圆，两侧会被切掉）
- 显示尺寸只有 200px，所以存 **400×400** 就足够（留一倍给高分屏）
- 存成 WebP，控制在 **50 KB 以内**

从一张照片生成：

```bash
cd ~/Desktop/code/tREeFrOGcoder.github.io
cwebp -q 82 -resize 400 400 ~/Desktop/新头像.jpg -o assets/img/me.webp
ls -lh assets/img/me.webp        # 确认体积
```

> 别把原图直接改名放进去。改版前那张是 860px 的 PNG、**1.4 MB**，
> 而页面上只显示 200px —— 每个访客都在白下载 1.4 MB。

想换成方形不裁圆：改 `assets/css/components.css` 里 `.avatar img` 的
`border-radius:50%` → `border-radius:10px`。

---

## 2. 改 About / Fun 里的正文

文件：**`index.html`**（只有 85 行，全是内容，没有样板代码）

打开就能看到 `<section id="about">`、`<section id="fun">` 等等，直接改中间的文字。

加链接：

```html
<a href="https://example.com" target="_blank" rel="noopener">显示的文字</a>
```

加粗：`<b>粗体</b>`　　斜体：`<i>斜体</i>`

那个绿色小方框（"I'm currently applying to CS PhD…"）是：

```html
<div class="callout">
  🌱 你想说的话，可以带 <a href="...">链接</a>。
</div>
```

不需要了就把整个 `<div class="callout">…</div>` 删掉。

> **别用 `<p>&nbsp;</p>` 撑空行**。段落间距是 CSS 管的，
> 想调松紧改 `assets/css/base.css` 里 `p{margin-bottom:...}`。

---

## 3. 加一篇 Publication

**两步。**

### 第一步：把配图放进 `assets/img/paper/`

```bash
cd ~/Desktop/code/tREeFrOGcoder.github.io
cwebp -q 82 -resize 800 0 ~/Desktop/新论文图.png -o assets/img/paper/新论文.webp
```

（`-resize 800 0` = 宽 800、高按比例。显示宽度只占正文的 30%，800 足够了。）

### 第二步：在 `_data/publications.yml` **最上面**加一段

```yaml
- title: "论文标题写在这里"
  authors: "**Ziche Liu**, 张三, 李四"
  note: "*=Equal Contribution"        # 不需要就整行删掉
  venue: NAACL 2026
  image: 新论文.webp
  links:
    - [Paper, "https://..."]
    - [Code, "https://github.com/..."]
    - [Demo, "https://..."]
  tldr: 一句话说清这篇干了什么。
```

**几个必须注意的点：**

| 字段 | 规矩 |
|---|---|
| `title` | 带冒号 `:` 的必须用双引号包起来，否则 YAML 会当成键值对报错 |
| `authors` | `**你的名字**` 会渲染成加粗。**想打出字面的星号 `*`，要写 `\\*`**（两个反斜杠）—— 比如 `"**Ziche Liu\\***, Rui Ke\\*"` |
| `venue` | 就是那个蓝色小药丸，写 `NAACL 2026` 这种 |
| `image` | 只写文件名，不带路径。程序会自己去 `assets/img/paper/` 找 |
| `links` | `[显示文字, 网址]`，按写的顺序排，中间的 `/` 是自动加的。一条都不写就整个 `links:` 删掉 |
| 缩进 | **两个空格，不能用 Tab。** YAML 对缩进极其敏感 |

写完检查一下语法没写错：

```bash
ruby -ryaml -e 'YAML.load_file("_data/publications.yml"); puts "YAML OK"'
```

---

## 4. 加学历 / 获奖

文件：`_data/education.yml`

```yaml
- school: 某某大学              # 加粗那一行
  degree: PhD Student in ...   # 学校名下面那行
  when: "2026.09 — now"        # 右边的日期
  mark: ucsd.webp              # 校徽文件名，放在 assets/img/edu/ 里
  items:                       # 可选，没有就整段删掉
    - 拿了什么奖，哪一年
```

`when` 那个破折号是 **em dash `—`**（不是减号）。想省事就复制现有那行改数字。

**校徽**：`mark:` 那行删掉 = 这一条不显示徽标（三条都删 = 整个 Education 收成一列，
不会留空轨道）。加新校徽就丢一个方形 PNG/WebP 进 `assets/img/edu/`，
边长 ≥128px 就够（现有三个是 192×192）。

**想调徽标大小**：`assets/css/components.css` 里 `.edu{--edu-mark:42px}`，
全站只有这一个数字管它。上限约 46px —— 再大就顶到那一条的上下边界了
（一条的内容高度实测 52px）。

---

## 5. 改 Research 那四段

文件：`_data/research.yml`

```yaml
- k: 加粗的小标题
  v: 后面跟着的一整段说明文字。
```

想加第五条就照着再写一组 `- k: / v:`。想删就整组删掉。

---

## 6. 改侧栏那三个链接

文件：`_data/links.yml`

```yaml
- label: Scholar
  icon: scholar          # 只能是 scholar / github / mail 三个之一
  href: "https://..."
```

**想加第四个图标**（比如 Twitter/X、LinkedIn）需要多一步：
去 `_includes/icon.html` 里照着现有的格式加一个新的 `{% when "名字" %}` 分支，
把 SVG 路径贴进去，并且**给它算一个贴合图形的 viewBox**（不然它会和另外三个不等大 —— 这是改版前的老问题）。
这一步比较麻烦，可以找 AI 帮忙。

**`note:` 字段**（目前只有 Email 用）：鼠标划上去时，在这条链接**下方**浮出来的
小黑框里显示的文字。任何一条加上 `note:` 都会有这个浮窗。
样式在 `components.css` 的 `.rail-links .tip`；触屏（`@media (hover:none)`）不显示 ——
手指点下去那一瞬闪一下没有意义。

---

## 7. 加照片到 Gallery

**两步，不用写代码。**

```bash
# 1. 把照片丢进去（文件名就是它的 ID，会出现在网址 #锚点 里，用英文别用空格）
cp ~/Desktop/新照片.jpg gallery/photos/MyNewPhoto.jpg

# 2. 跑一次流水线
cd gallery && python3 ../tools/make_gallery.py && cd ..
```

脚本会自动生成 4 档 WebP（400/800/1600/2400）、模糊占位图、以及 `photos.json`。
**幂等**——跑多少次结果都一样，可以放心重复跑。

> **原图也会上线（2026-08-27 起）。**
> 网格缩略图只用那 4 档小图；但访客**点开某张照片后**，灯箱会在后台把
> `gallery/photos/` 里的原图换上来，这样放大才有真细节（放大倍数上限从 2.1× 提到 5.3×）。
> 所以原图别放太夸张的体积 —— 现在 13 张合计 19.5MB。
> 整站发布上限是 1GB，目前约 788MB（CS180 一家占 759MB），还剩约 236MB 余量。

### 改照片的标题 / 日期 / 分类

文件：`gallery/photos.meta.json`

```json
"MyNewPhoto": {
  "title": "显示在灯箱下方的标题",
  "shot": "2026-08-24",
  "tags": ["photo"]          // "photo" 或 "origami"
}
```

**脚本永远不会覆盖你在这里手写的东西。**

### 删照片

从 `gallery/photos/` 删掉，从 `photos.meta.json` 删掉对应那段，
再跑一次流水线。`gallery/derived/` 里的旧文件可以手动删。

---

## 8. 换配色 / 调字号间距

文件：**`assets/css/tokens.css`** —— 全站唯一的来源，改一处四个页面同时生效。

```css
--accent:  #428fb5;   /* 主色。⚠️ 主色 = "这个能点"。不能点的东西不要用它 */
--bg:      #f7fcfc;   /* 页面底色 */
--ink:     #1a2930;   /* 正文颜色 */
--f-base:  1rem;      /* 正文字号 = 16px */
--font:    Arial, Helvetica, sans-serif;
```

文件下半部分 `:root[data-theme=dark]{...}` 是暗色模式，**只覆盖颜色**，
字号间距完全复用上面那套。改配色记得两边都改。

---

## 9. 改导航栏的 tab

文件：`index.html` **最上面**的 front-matter：

```yaml
---
layout: home
nav:
  - [About, "#about"]
  - [Research, "#research"]
  - [Publications, "#publications"]
  - [Education, "#education"]
  - [Fun, "#fun"]
---
```

改这里的文字 = 改 tab 名。`#about` 要和正文里 `<section id="about">` 对上。
删一行 = 少一个 tab（正文那一段还在，只是导航不指过去了）。

> 窄屏放不下时导航会**横向滑动**（右边有一道渐隐提示还有内容），不是汉堡菜单。

### 恢复首页的 CS180 链接

`_data/projects.yml` 里最上面那三行被注释掉了，**把 `#` 去掉**就回来了。

---

## 10. 调 Gallery 的排布手感

平时页面上没有按钮。想现场调：打开 `gallery/index.html` 最上面：

```yaml
tune:   false   # ← 改成 true，页面顶部就出现三组按钮
mode:   justified   # justified（对齐行） | masonry（瀑布流）
size:   320         # 目标行高 px。220 紧凑 / 320 舒适 / 440 大图
filter: all         # all | photo | origami
```

`tune: true` → 刷新 → 点着试 → 把满意的值写回 `mode/size/filter` → `tune` 改回 `false`。

---

## 11. 上线

```bash
git add -A
git commit -m "说清楚改了什么"
git push
```

推上去大约 **1 分钟**后 https://zicheliu.com 就更新了。
GitHub Pages 自带 Jekyll 构建，**没有 CI，没有中间层会坏**。

上线前建议本地跑一次完整构建确认没报错：

```bash
bundle exec jekyll build && echo "构建 OK"
```

---

## 12. 改坏了怎么办

```bash
# 还没 commit —— 丢掉所有改动，回到上一次提交
git checkout -- .

# 只想撤某一个文件
git checkout -- _data/publications.yml

# 已经 commit 但还没 push —— 退回上一次提交（保留改动在工作区）
git reset --soft HEAD~1

# 想看看改了什么再决定
git diff
```

**核弹级回滚点**（回到 2026-08 改版之前的老站）：

```bash
git reset --hard pre-redesign-2026-08-23
```

备份分支 `backup/pre-redesign-2026-08-23` 也指着同一个地方。

---

## 13. 三条不要做的事

1. **不要动 `cs180-portfolio/`。** 那 6 个子页你说过一个字都不能改。
   它 757 MB，也是发布体积的 99%（详见 [HANDOFF.md](HANDOFF.md) §5）。
2. **不要提交 `_site/`。** 那是 Jekyll 每次构建都会重新生成的产物，已经在 `.gitignore` 里了。
3. **不要在 `_config.yml` 的 `exclude` 里写不带斜杠的目录名。**
   `gallery/photos` 是前缀匹配，会把 `gallery/photos.json` 一起排除掉，
   Gallery 就拿不到数据了。必须写 `gallery/photos/`。

---

## 附：文件在哪

```
index.html                    首页正文（About / Research / Fun 的文字）
gallery/index.html            Gallery 页 + 灯箱结构 + 排布参数

_data/publications.yml        论文列表
_data/education.yml           学历 + 获奖
_data/research.yml            Research 那四段
_data/links.yml               侧栏三个外链
_data/projects.yml            Fun 里的项目列表

assets/css/tokens.css         ← 颜色 / 字号 / 间距，改配色只动这个
assets/css/base.css           排版基础（段落间距、链接样式）
assets/css/layout.css         页面骨架 + 响应式断点
assets/css/components.css     导航 / 论文卡 / 头像 / 按钮 / 页脚
assets/css/gallery.css        Gallery + 灯箱

assets/js/site.js             主题切换 / 回顶 / 论文图放大
assets/js/gallery.js          拼图引擎 + 灯箱

assets/img/me.webp            头像
assets/img/paper/             论文配图
gallery/photos/               照片原图（不发布，只做生成源）
gallery/derived/              生成的多档 WebP（发布）
gallery/photos.meta.json      你手写的照片标题/日期（脚本永不覆盖）

_includes/                    可复用组件（改一处全站生效）
_layouts/                     页面骨架
tools/make_gallery.py         照片流水线
```
