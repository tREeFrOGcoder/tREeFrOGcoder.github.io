/* ══════════════════════════════════════════════════════════════════
   Gallery 引擎 —— 完全重写

   和你现在这版的四个本质区别：
   1. 断行用「线性划分动态规划」全局最优，不是贪心先加后判断
   2. 绝对定位 + transform 渲染，算出来的布局 = 渲染出的布局（原来靠
      flex-wrap 二次换行，两者可能不一致，那个 ensureMinimumImages
      补丁就是为此打的）
   3. resize 走 ResizeObserver + rAF，拖动时逐帧无过渡 → 1:1 跟手；
      只有「重排」（换模式/筛选）才用 FLIP 做动画
   4. 分档 srcset + LQIP 模糊占位 + 按位置计算的懒加载，
      首屏从 19.5MB 降到 8KB(manifest) + 按需
   ══════════════════════════════════════════════════════════════════ */

const Gallery = (() => {
  const $ = s => document.querySelector(s);
  const grid = $("#grid");

  let PHOTOS = [];      // manifest
  let items = [];       // 当前可见的 {photo, el, imgEl, ar}
  /* 展示参数来自 gallery/index.html 的 front-matter（渲染成 #grid 的 data-*）。
     页面平时不放按钮；把那边的 tune 改成 true 就会出现三组按钮供现场调。 */
  let mode    = grid.dataset.mode   || "justified";
  let targetH = +grid.dataset.size  || 320;
  let filter  = grid.dataset.filter || "all";
  let gap = 10;
  let lastW = 0;

  /* ─────────────────── 1. 布局算法 ─────────────────── */

  /* 线性划分：把 n 张图切成若干行，使每行高度尽量接近 targetH。
     badness 用 log(h/target)² —— 让"太高"和"太矮"的惩罚对称。   */
  function partition(ars, W, gap, target) {
    const n = ars.length;
    if (!n) return [];
    const cost = new Float64Array(n + 1).fill(Infinity);
    const prev = new Int32Array(n + 1).fill(0);
    cost[0] = 0;

    for (let j = 1; j <= n; j++) {
      let sum = 0;
      for (let i = j - 1; i >= 0; i--) {
        sum += ars[i];
        const k = j - i;                              // 这一行放 k 张
        const h = (W - (k - 1) * gap) / sum;          // 撑满宽度所需行高
        if (h < target * 0.35 && k > 1) break;        // 再加只会更矮，剪枝
        // 代价 = log(实际行高/目标行高)²，对"太高"和"太矮"惩罚对称。
        // 试过 ×k / +常数 等变体，在 12 张和 36 张两种规模下都是这个最好。
        const c = cost[i] + Math.pow(Math.log(h / target), 2);
        if (c < cost[j]) { cost[j] = c; prev[j] = i; }
      }
    }
    const rows = [];
    for (let j = n; j > 0; j = prev[j]) rows.unshift([prev[j], j]);
    return rows;
  }

  /* 窄容器下把目标行高按比例收一点，否则一行只塞得下一张、节奏会散 */
  const effTarget = W => Math.max(120, Math.min(targetH, W * 0.62));

  function computeJustified(W) {
    const t = effTarget(W);
    const ars = items.map(it => it.ar);
    const rows = partition(ars, W, gap, t);
    const boxes = [];
    let y = 0;
    rows.forEach(([s, e], ri) => {
      const isLast = ri === rows.length - 1;
      const slice = ars.slice(s, e);
      const sum = slice.reduce((a, b) => a + b, 0);
      const raw = (W - (slice.length - 1) * gap) / sum;
      // 末行若只剩一两张会被撑得巨大 —— 封顶后左对齐，不拉伸铺满
      const capped = isLast && raw > t * 1.28;
      const h = Math.round(capped ? t * 1.28 : raw);
      const stretch = !capped;                       // 是否要吃掉舍入误差铺满整宽
      let x = 0;
      for (let i = s; i < e; i++) {
        const w = (stretch && i === e - 1) ? Math.round(W - x) : Math.round(ars[i] * h);
        boxes.push({ x, y, w, h });
        x += w + gap;
      }
      y += h + gap;
    });
    return { boxes, height: Math.max(0, y - gap) };
  }

  function computeMasonry(W) {
    const min = 240;
    const cols = Math.max(1, Math.floor((W + gap) / (min + gap)));
    const cw = Math.floor((W - (cols - 1) * gap) / cols);
    const tops = new Array(cols).fill(0);
    const boxes = items.map(it => {
      let c = 0;
      for (let i = 1; i < cols; i++) if (tops[i] < tops[c] - 0.5) c = i;
      const h = Math.round(cw / it.ar);
      const b = { x: c * (cw + gap), y: tops[c], w: cw, h };
      tops[c] += h + gap;
      return b;
    });
    return { boxes, height: Math.max(0, Math.max(...tops) - gap) };
  }

  /* ─────────────────── 2. 渲染 ─────────────────── */

  /* animate=false → 逐帧瞬时（resize 拖动时用，跟手）
     animate=true  → FLIP 过渡（切模式 / 筛选时用）          */
  function layout(animate = false) {
    const W = grid.clientWidth;
    if (!W || !items.length) return;
    lastW = W;

    const { boxes, height } = mode === "justified" ? computeJustified(W) : computeMasonry(W);

    grid.classList.toggle("animating", animate);
    grid.style.height = height + "px";

    items.forEach((it, i) => {
      const b = boxes[i];
      if (!b) return;
      const el = it.el;
      if (el._b && el._b.x === b.x && el._b.y === b.y && el._b.w === b.w && el._b.h === b.h) return;
      el._b = b;
      el.style.width = b.w + "px";
      el.style.height = b.h + "px";
      el.style.transform = `translate3d(${b.x}px,${b.y}px,0)`;
      pickSrc(it, b.w);
    });

    if (animate) {
      clearTimeout(layout._t);
      layout._t = setTimeout(() => grid.classList.remove("animating"), 480);
    }
    schedulePump();
  }

  /* 按实际显示宽度挑档位（考虑 DPR），只升不降，避免抖动时反复下载 */
  function pickSrc(it, cssW) {
    const need = cssW * Math.min(devicePixelRatio || 1, 2);
    const tiers = Object.keys(it.photo.src).map(Number).sort((a, b) => a - b);
    const want = tiers.find(t => t >= need) || tiers[tiers.length - 1];
    if (want > it.wantTier) it.wantTier = want;
  }

  /* 每张图的位置我自己算过，所以直接判断"离视口多远"来决定加载，
     不依赖 IntersectionObserver —— 后者在图块尺寸还是 0 时不会触发，
     首屏就会卡在模糊占位上。 */
  let pumpRaf = 0;
  function pump() {
    const top = grid.getBoundingClientRect().top;
    const lo = -innerHeight * 1.5, hi = innerHeight * 2.5;
    for (const it of items) {
      const b = it.el._b;
      if (!b) continue;
      const y0 = top + b.y, y1 = y0 + b.h;
      if (y1 > lo && y0 < hi) load(it);
    }
  }
  function schedulePump() {
    if (pumpRaf) return;
    pumpRaf = requestAnimationFrame(() => { pumpRaf = 0; pump(); });
  }

  function load(it) {
    const tier = it.wantTier;
    if (!tier || it.loadedTier >= tier || it.loadingTier === tier) return;
    it.loadingTier = tier;
    const img = new Image();
    img.decoding = "async";
    img.src = it.photo.src[String(tier)];
    img.decode().catch(() => {}).then(() => {
      if (it.loadedTier >= tier) return;
      it.loadedTier = tier;
      it.loadingTier = 0;
      it.imgEl.src = img.src;
      it.el.classList.add("ready");
    });
  }

  /* ─────────────────── 3. 建 DOM ─────────────────── */

  function build() {
    grid.innerHTML = "";
    items = PHOTOS
      .filter(p => filter === "all" || (p.tags || []).includes(filter))
      .map((p, i) => {
        const el = document.createElement("figure");
        el.className = "tile";
        el.tabIndex = 0;
        el.setAttribute("role", "button");
        el.setAttribute("aria-label", p.title || p.id);
        el.innerHTML = `
          <span class="ph" style="background-image:url(${p.lqip})"></span>
          <img alt="${(p.title || p.id).replace(/"/g, "&quot;")}" draggable="false">
          <figcaption>
            <span class="t">${p.title || p.id}</span>
            ${p.shot ? `<span class="d">${p.shot}</span>` : ""}
          </figcaption>`;
        grid.appendChild(el);
        const it = { photo: p, el, imgEl: el.querySelector("img"), ar: p.ar,
                     loadedTier: 0, loadingTier: 0, wantTier: 0, idx: i };
        el.addEventListener("click", () => Light.show(it.idx));
        el.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); Light.show(it.idx); } });
        return it;
      });
  }

  /* ─────────────────── 4. Lightbox ─────────────────── */

  const Light = (() => {
    const box = $("#light"), figure = $("#light-fig");
    const layers = [...figure.querySelectorAll(".lb-img")];
    const cap = $("#light-cap"), cnt = $("#light-cnt");
    let idx = -1, open = false, lastFocus = null;
    let front = 0;     // 当前在前面的那一层
    let seq = 0;       // 竞态令牌：连着快翻时，只有最后一次允许上屏

    /* 不用 img.decode()：见 site.js 里同名注释，它在某些状态下永不 settle。
       统一走 load 事件 + 兜底超时 —— 任何情况下都往下走，不会把弹窗卡死。 */
    const ready = im => (im.complete && im.naturalWidth)
      ? Promise.resolve()
      : new Promise(res => {
          const done = () => res();
          im.addEventListener("load", done, { once: true });
          im.addEventListener("error", done, { once: true });
          setTimeout(done, 2500);
        });

    /* 等新图真的栅格化完再开始过渡。正常走双 rAF（约一两帧）；
       但 rAF 在后台标签页/无头浏览器里可能根本不推进，会把图卡在 opacity:0，
       所以加一条 60ms 的兜底，谁先到算谁 —— 和 site.js 里 ready() 同一个思路。 */
    const nextFrame = fn => {
      let done = false;
      const run = () => { if (done) return; done = true; fn(); };
      requestAnimationFrame(() => requestAnimationFrame(run));
      setTimeout(run, 60);
    };

    const pick = p => {
      const t = Object.keys(p.src).map(Number).sort((a, b) => a - b);
      const best = t[t.length - 1];
      return { url: p.src[String(Math.min(best, 1600))], best };
    };

    /* 交叉淡入淡出。新图先在背面层装好、等它真正栅格化（双 rAF），
       才同时开始"新的淡入 / 旧的淡出"。全程没有任何一次硬切 src。 */
    function swap(url, alt, dir, token, after) {
      const cur = layers[front], next = layers[1 - front];
      next.src = url;
      next.alt = alt;

      /* ⚠️ 这里必须掐过渡，别删。
         这一层身上八成还留着它【上一次退场】时写下的 translateX(∓26px)，
         而 .lb-img 的 transition 一直开着 —— 直接赋新起点，浏览器会把它
         「动画过去」而不是「瞬移过去」。两帧后我们一松手，它就从半路
         （甚至反方向的 -26px）滑向 0，看上去就是"照片从反方向飞进来"。
         实测连按 5 次「下一张」，浏览器拿到的插值起点是
         +2.8 / -9.4 / +26 / +26 / -26 px —— 完全看运气，所以时对时错。
         正确姿势：掐掉过渡 → 摆好起点 → 强制重排 → 再把过渡放回来。 */
      next.classList.remove("in");
      next.style.transition = "none";
      next.style.transform = dir ? `translateX(${dir * 26}px)` : "";
      void next.offsetWidth;              // 强制重排，让上面两行立刻落地
      next.style.transition = "";

      nextFrame(() => {
        /* nextFrame 要等两帧，这期间可能又翻页了。front 是在这里面才翻的，
           不挡住的话两次 swap 会抢同一层，淡入淡出直接打架。 */
        if (token !== seq) return;
        next.style.transform = "";
        next.classList.add("in");
        cur.classList.remove("in");
        cur.style.transform = dir ? `translateX(${-dir * 26}px)` : "";
        cur.setAttribute("aria-hidden", "true");
        next.removeAttribute("aria-hidden");
        front = 1 - front;
        after && after();
      });
    }

    function render(i, dir = 0) {
      const it = items[i]; if (!it) return;
      const p = it.photo;
      const token = ++seq;
      idx = i;
      resetZoom(false);          // 换一张就回到 1×，否则新图会顶着上一张的缩放上屏

      /* 文字不参与动画，立刻更新，不会闪 */
      cap.innerHTML = `<span class="t">${p.title || p.id}</span>` +
        (p.shot ? `<span class="d">${p.shot}</span>` : "") +
        (p.settings ? `<span class="s">${p.settings}</span>` : "");
      cnt.textContent = `${i + 1} / ${items.length}`;
      history.replaceState(null, "", "#" + encodeURIComponent(p.id));

      const { url, best } = pick(p);
      const pre = new Image();
      pre.decoding = "async";
      pre.src = url;
      ready(pre).then(() => {
        if (token !== seq) return;                 // 已经被更新的一次取代
        swap(url, p.title || p.id, dir, token, () => {
          /* 上屏之后在后台悄悄换成能拿到的最高清版本：优先 6000px 原图，
             没有 full 就退回 src 里的最高档。换的是同一个 <img> 的 src，
             画面尺寸不变，用户只会觉得"越看越清楚"。
             等 300ms 再开始：连着按方向键快速翻页时不该把每张原图都拽下来，
             停下来看的那张才值得花这个流量。 */
          const hiUrl = (p.full && p.full.url) || (best > 1600 ? p.src[String(best)] : null);
          if (!hiUrl) return;
          setTimeout(() => {
            if (token !== seq) return;
            const hi = new Image();
            hi.src = hiUrl;
            ready(hi).then(() => { if (token === seq) layers[front].src = hi.src; });
          }, 300);
        });
      });

      /* 预取左右邻居 */
      [i - 1, i + 1].forEach(n => {
        const t = items[(n + items.length) % items.length];
        if (t) new Image().src = pick(t.photo).url;
      });
    }

    /* 命中测试：图层填满整个舞台，照片周围的透明黑边也属于 <img> 元素，
       所以不能再靠 e.target 判断"点没点到照片"。按 object-fit:contain
       的规则把照片的真实矩形算出来。 */
    function onPhoto(e) {
      const im = layers[front];
      if (!im || !im.naturalWidth) return false;
      const r = im.getBoundingClientRect();
      const s = Math.min(r.width / im.naturalWidth, r.height / im.naturalHeight);
      return Math.abs(e.clientX - (r.left + r.width / 2)) <= im.naturalWidth * s / 2
          && Math.abs(e.clientY - (r.top + r.height / 2)) <= im.naturalHeight * s / 2;
    }

    /* ── 缩放与手势（手机端）─────────────────────────────────────────
       为什么要自己写一套，而不是用系统自带的捏合：
       #light 是 position:fixed 铺满整屏的，iOS 原生捏合缩的是「视觉视口」，
       固定定位层并不跟着走 —— 结果是越缩越糊、而且没法平移到照片的另一角，
       用起来就是"照片根本放不大"。
       另一半原因是手势打架：原来的滑动翻页只读 touches[0]，双指捏合时
       随便哪根手指先抬起来，都会被当成一次横滑 —— 一捏就翻页。

       现在的分工：
         单指横滑（且未放大）→ 翻页
         双指捏合            → 缩放，绝不翻页
         双击                → 2.5× / 还原
         放大后单指拖动      → 平移，此时不翻页
       换照片或关闭时自动还原到 1×。 */
    const MAXZ_HARD = 6;          // 再高就没意义了，纯粹晃眼
    let z = 1, zx = 0, zy = 0;
    let committed = false, settleT = 0;

    /* ── 为什么缩放要分「手势中」和「落定后」两种画法 ───────────────
       transform:scale 只是把【已经栅格化好的位图】整块拉大，并不会拿源图
       重新采样。实测手机尺寸下 2.5× 时，画面的高频细节只有
       「把 1× 截图数字拉伸 2.5 倍」的 0.92 倍 —— 等于根本没放大，纯糊。
       （去掉 will-change 也没用，实测仍是 0.73 倍。）
       所以：手势进行中用 transform（GPU 合成，跟手不掉帧），
       手指一松就把缩放「落定」成真实布局尺寸 —— 这时浏览器才会拿
       2400px 的源图重新采样，细节是真的出来。 */
    function applyZoom(anim) {
      if (committed) { layers.forEach(clearBox); committed = false; }
      figure.style.transition = anim ? "transform .3s var(--ease)" : "none";
      figure.style.transform =
        (z === 1 && !zx && !zy) ? "" : `translate(${zx}px,${zy}px) scale(${z})`;
      // 放大后照片会溢出舞台压到标题栏上，这时才裁切；1× 时不裁，免得切掉投影
      box.classList.toggle("zoomed", z > 1);
    }

    const clearBox = l => {
      l.style.width = l.style.height = l.style.left = l.style.top =
        l.style.right = l.style.bottom = "";
    };

    /* 把当前的 z/zx/zy 换算成图层的真实布局尺寸，几何上和 transform 完全等价：
       transform 是绕中心缩放，所以左上角要往回挪 (尺寸增量/2)。 */
    function commitZoom() {
      const bw = figure.offsetWidth, bh = figure.offsetHeight;
      figure.style.transition = "none";
      figure.style.transform = "";
      if (z === 1 && !zx && !zy) { layers.forEach(clearBox); committed = false; return; }
      const w = bw * z, h = bh * z;
      const left = zx - (w - bw) / 2, top = zy - (h - bh) / 2;
      layers.forEach(l => {
        l.style.right = "auto"; l.style.bottom = "auto";   // inset:0 里的 right/bottom 要让开
        l.style.width = w + "px";  l.style.height = h + "px";
        l.style.left  = left + "px"; l.style.top  = top + "px";
      });
      committed = true;
    }
    const scheduleCommit = d => { clearTimeout(settleT); settleT = setTimeout(commitZoom, d); };

    /* 能放到多大，由「1 源图像素 = 1 屏幕物理像素」决定 —— 到这一档为止都是
       真细节，再往上才是硬拉。注意它会随着后台把 6000px 原图换上来而自动变大：
       只有 2400px 档时横幅图约 2.1×，原图到位后能到 5× 以上。 */
    function maxZoom() {
      const im = layers[front];
      const bw = figure.offsetWidth, bh = figure.offsetHeight;
      if (!im || !im.naturalWidth) return 3;
      const s = Math.min(bw / im.naturalWidth, bh / im.naturalHeight);
      const dpr = Math.min(devicePixelRatio || 1, 3);
      return Math.max(2, Math.min(MAXZ_HARD, 1 / (s * dpr)));
    }
    /* 双击给一个舒服的档位就行；想看更细的用捏合，最高能到 maxZoom() */
    const dblZoom = () => Math.min(2.5, maxZoom());

    /* 照片在舞台里的真实显示尺寸（object-fit:contain 之后，未缩放时） */
    function photoBox() {
      const bw = figure.offsetWidth, bh = figure.offsetHeight;
      const im = layers[front];
      if (!im || !im.naturalWidth) return { w: bw, h: bh, bw, bh };
      const s = Math.min(bw / im.naturalWidth, bh / im.naturalHeight);
      return { w: im.naturalWidth * s, h: im.naturalHeight * s, bw, bh };
    }

    /* 只允许把「超出舞台的那部分」拖进视野，拖不出一片空白 */
    function clampPan() {
      const { w, h, bw, bh } = photoBox();
      const mx = Math.max(0, (w * z - bw) / 2);
      const my = Math.max(0, (h * z - bh) / 2);
      zx = Math.min(mx, Math.max(-mx, zx));
      zy = Math.min(my, Math.max(-my, zy));
    }

    function resetZoom(anim) { clearTimeout(settleT); z = 1; zx = 0; zy = 0; applyZoom(anim); }

    /* 舞台「没有变换时」的中心（视口坐标）。变换绕中心做，减掉平移即可。 */
    function stageCenter() {
      const r = figure.getBoundingClientRect();
      return { x: r.left + r.width / 2 - zx, y: r.top + r.height / 2 - zy };
    }

    /* 以 (vx,vy) 为锚点缩放到 nz —— 锚点底下的画面内容保持不动 */
    function zoomAt(nz, vx, vy, anim) {
      nz = Math.max(1, Math.min(maxZoom(), nz));
      const c = stageCenter(), k = nz / z;
      zx = vx - c.x - k * (vx - c.x - zx);
      zy = vy - c.y - k * (vy - c.y - zy);
      z = nz;
      if (z === 1) { zx = 0; zy = 0; }
      clampPan();
      applyZoom(anim);
    }

    let g = null;                                  // 当前手势
    let lastTap = 0, lastTapX = 0, lastTapY = 0;
    let swallowClick = 0;                          // 拖动/捏合后紧跟的那个 click 要吞掉

    box.addEventListener("touchstart", e => {
      clearTimeout(settleT);
      if (committed) applyZoom(false);   // 落定状态换回 transform，手势才跟得动
      if (e.touches.length === 1) {
        const t = e.touches[0];
        g = { multi: false, moved: false, x: t.clientX, y: t.clientY, szx: zx, szy: zy };
      } else if (e.touches.length === 2) {
        const [a, b] = e.touches;
        g = { multi: true, moved: true,
              d0: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) || 1,
              m0x: (a.clientX + b.clientX) / 2, m0y: (a.clientY + b.clientY) / 2,
              sz: z, szx: zx, szy: zy, c: stageCenter() };
      }
    }, { passive: true });

    box.addEventListener("touchmove", e => {
      if (!g) return;
      if (g.multi && e.touches.length === 2) {
        e.preventDefault();                        // 别让浏览器同时去缩整个页面
        const [a, b] = e.touches;
        const d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
        const mx = (a.clientX + b.clientX) / 2, my = (a.clientY + b.clientY) / 2;
        const nz = Math.max(1, Math.min(maxZoom(), g.sz * (d / g.d0)));
        // 起手时两指中点压住的那块画面，缩放后仍要待在当前中点底下
        const ux = (g.m0x - g.c.x - g.szx) / g.sz;
        const uy = (g.m0y - g.c.y - g.szy) / g.sz;
        z = nz;
        zx = mx - g.c.x - nz * ux;
        zy = my - g.c.y - nz * uy;
        if (z === 1) { zx = 0; zy = 0; }
        clampPan(); applyZoom(false);
      } else if (!g.multi && e.touches.length === 1) {
        const t = e.touches[0];
        const dx = t.clientX - g.x, dy = t.clientY - g.y;
        if (!g.moved && Math.hypot(dx, dy) > 8) g.moved = true;
        if (z > 1) {                               // 已放大 → 单指拖动 = 平移
          e.preventDefault();
          zx = g.szx + dx; zy = g.szy + dy;
          clampPan(); applyZoom(false);
        }
      }
    }, { passive: false });

    box.addEventListener("touchend", e => {
      if (!g) return;
      const fin = e.touches.length === 0;          // 所有手指都抬起来了才算一次手势结束
      if (g.moved) swallowClick = Date.now() + 500;

      if (!g.multi && fin) {
        const t = e.changedTouches[0];
        const dx = t.clientX - g.x, dy = t.clientY - g.y;
        if (!g.moved) {
          const now = Date.now();
          if (now - lastTap < 320 &&
              Math.hypot(t.clientX - lastTapX, t.clientY - lastTapY) < 32) {
            zoomAt(z > 1 ? 1 : dblZoom(), t.clientX, t.clientY, true);   // 双击
            swallowClick = now + 500;
            lastTap = 0;
            scheduleCommit(340);          // 等 .3s 的缩放动画跑完再落定成布局尺寸
          } else {
            lastTap = now; lastTapX = t.clientX; lastTapY = t.clientY;
          }
        } else if (z === 1 && Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.2) {
          go(dx < 0 ? 1 : -1);                     // 只有「未放大 + 单指 + 明显横向」才翻页
        }
      }
      if (fin) {
        if (z <= 1.02) resetZoom(true);            // 捏回来了就彻底归位
        else scheduleCommit(0);                    // 还在放大 → 立刻落定，把清晰度找回来
        g = null;
      }
    }, { passive: true });

    function go(d) {
      if (!open) return;
      render((idx + d + items.length) % items.length, d);
    }

    return {
      show(i) {
        lastFocus = document.activeElement;
        open = true;
        box.hidden = false;
        requestAnimationFrame(() => box.classList.add("on"));
        document.body.style.overflow = "hidden";
        render(i);
        box.focus();
      },
      close() {
        open = false;
        seq++;                     // 作废还在飞的加载，免得关了之后又闪一下
        box.classList.remove("on");
        resetZoom(false);
        setTimeout(() => {
          box.hidden = true;
          layers.forEach(l => {
            l.classList.remove("in");
            l.style.transform = "";
            l.removeAttribute("src");
          });
        }, 300);
        document.body.style.overflow = "";
        history.replaceState(null, "", location.pathname + location.search);
        lastFocus?.focus();
      },
      go,
      onPhoto,
      get isOpen() { return open; },
      get isZoomed() { return z > 1; },
      /* 拖动/捏合之后浏览器还会补发一个 click，别让它把弹窗关掉 */
      get eatClick() { return Date.now() < swallowClick; }
    };
  })();

  /* ─────────────────── 5. 接线 ─────────────────── */

  async function init() {
    PHOTOS = await (await fetch(grid.dataset.manifest || "photos.json")).json();
    build();
    layout(false);
    requestAnimationFrame(() => grid.classList.add("live"));

    /* resize：ResizeObserver + rAF，拖动过程逐帧无过渡。
       注意不要用 "宽度没变就跳过" 这种提前返回 —— 首次量到的宽度可能
       是滚动条出现前 / 网页字体加载完成前的，一旦跳过就再也不会修正。
       每个图块内部已有 memo，重复调用不会产生多余的 DOM 写入。 */
    let raf = 0, settle = 0;
    new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => layout(false));
      clearTimeout(settle);
      settle = setTimeout(() => layout(false), 120);   // 收尾一次，修舍入
    }).observe(grid);
    addEventListener("scroll", schedulePump, { passive: true });
    addEventListener("load", () => layout(false));
    document.fonts?.ready.then(() => layout(false));   // 字体到位后宽度可能变
    setTimeout(() => layout(false), 60);               // 滚动条出现后的兜底

    /* 控件
       ⚠️ 选择器必须**限定在 .ctl 里面**，不能写成 document.querySelectorAll("[data-mode]")。
       #grid 自己就带着 data-mode / data-size / data-filter（展示参数从 front-matter
       传进来的，见 gallery/index.html），所以那种写法会把 onclick 装到 #grid 身上。
       而 .ctl 平时根本不渲染（page.tune 为 false），于是线上唯一匹配到的元素就是 #grid ——
       点任何一张照片，事件冒泡到 #grid，触发 filter 那个处理器：build() 把 13 个
       .tile 全部销毁重建，layout(true) 再挂上 .animating。新建的 .tile 从 CSS 默认的
       translate3d(0,0,0)（= 网格左上角）出发，420ms 滑回各自的位置 ——
       正好在灯箱淡入的那 260ms 里，看起来就是"一堆照片冲到眼前又瞬间消失"。
       实测：点第一张后 t+16ms，#grid 收到 14 次 childList、39 次 style 写入，
       class 变成 "live on animating"，第 2 块的 x 从 726 掉回 60 再滑回 726。 */
    const ctl = s => document.querySelectorAll(".ctl " + s);
    ctl("[data-mode]").forEach(b => b.onclick = () => {
      ctl("[data-mode]").forEach(x => x.classList.remove("on"));
      b.classList.add("on"); mode = b.dataset.mode; layout(true);
    });
    ctl("[data-size]").forEach(b => b.onclick = () => {
      ctl("[data-size]").forEach(x => x.classList.remove("on"));
      b.classList.add("on"); targetH = +b.dataset.size; layout(true);
    });
    ctl("[data-filter]").forEach(b => b.onclick = () => {
      ctl("[data-filter]").forEach(x => x.classList.remove("on"));
      b.classList.add("on"); filter = b.dataset.filter; build(); layout(true);
    });

    /* 键盘 / 点击暗处 / 触摸滑动 —— 你现在这版一个都没有 */
    const box = $("#light");
    addEventListener("keydown", e => {
      if (!Light.isOpen) return;
      if (e.key === "Escape") Light.close();
      else if (e.key === "ArrowRight") Light.go(1);
      else if (e.key === "ArrowLeft") Light.go(-1);
    });
    box.addEventListener("click", e => {
      /* 反过来写成黑名单：除了「照片本身」和「有自己行为的控件」，点哪都关。
         原来是白名单（只认 #light / #light-stage / #light-fig），底部信息栏
         那一整条占满宽、上百 px 高，却不在名单里 —— 看起来就是"暗处点了没反应"。
         左右翻页热区是 <button>，会被 closest 拦住，所以照旧翻页不关闭；
         它们 hover 有高亮，用户看得出那是控件。 */
      if (Light.eatClick) return;      // 刚拖/捏完，浏览器补发的那个 click
      if (Light.isZoomed) return;      // 放大状态下点画面不关闭，交给 × 或捏回去
      if (e.target.closest("button, a") || Light.onPhoto(e)) return;
      Light.close();
    });
    /* 光标要说实话：压在照片上时是普通箭头，落到四周黑边才变 zoom-out */
    $("#light-stage").addEventListener("mousemove", e => {
      e.currentTarget.style.cursor = Light.onPhoto(e) ? "default" : "zoom-out";
    }, { passive: true });

    $("#light-x").onclick = e => { e.stopPropagation(); Light.close(); };
    // 边缘热区和底部控件用同一组 class，行为完全一致
    document.querySelectorAll(".nav-prev").forEach(b => b.onclick = e => { e.stopPropagation(); Light.go(-1); });
    document.querySelectorAll(".nav-next").forEach(b => b.onclick = e => { e.stopPropagation(); Light.go(1); });
    /* 触摸手势（滑动翻页 / 捏合缩放 / 双击 / 平移）统一在 Light 模块里，
       因为它们要和缩放状态联动 —— 放大时就不能再翻页了。 */

    /* 深链：#PhotoId 直接打开 */
    if (location.hash) {
      const id = decodeURIComponent(location.hash.slice(1));
      const i = items.findIndex(x => x.photo.id === id);
      if (i >= 0) Light.show(i);
    }
  }

  return { init };
})();

Gallery.init();
