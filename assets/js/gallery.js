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
  let mode = "justified";
  let targetH = 320;
  let gap = 10;
  let filter = "all";
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
    const box = $("#light"), figure = $("#light-fig"), img = $("#light-img");
    const cap = $("#light-cap"), cnt = $("#light-cnt");
    let idx = -1, open = false, lastFocus = null;

    function render(i, dir = 0) {
      const it = items[i]; if (!it) return;
      const p = it.photo;
      const tiers = Object.keys(p.src).map(Number).sort((a, b) => a - b);
      const best = tiers[tiers.length - 1];

      figure.style.aspectRatio = p.ar;
      img.classList.remove("in");
      if (dir) { figure.style.transform = `translateX(${dir * 26}px)`; figure.style.opacity = ".35"; }

      const pre = new Image();
      pre.decoding = "async";
      pre.src = p.src[String(Math.min(best, 1600))];
      pre.decode().catch(() => {}).then(() => {
        img.src = pre.src;
        img.classList.add("in");
        figure.style.transform = "";
        figure.style.opacity = "";
        // 再悄悄换上最高档
        if (best > 1600) { const hi = new Image(); hi.src = p.src[String(best)];
          hi.decode().catch(()=>{}).then(() => { if (idx === i) img.src = hi.src; }); }
      });

      cap.innerHTML = `<span class="t">${p.title || p.id}</span>` +
        (p.shot ? `<span class="d">${p.shot}</span>` : "") +
        (p.settings ? `<span class="s">${p.settings}</span>` : "");
      cnt.textContent = `${i + 1} / ${items.length}`;
      idx = i;
      // 预取左右邻居
      [i - 1, i + 1].forEach(n => { const t = items[(n + items.length) % items.length];
        if (t) new Image().src = t.photo.src[String(Math.min(best, 1600))]; });
      history.replaceState(null, "", "#" + encodeURIComponent(p.id));
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
        box.classList.remove("on");
        setTimeout(() => { box.hidden = true; img.removeAttribute("src"); }, 260);
        document.body.style.overflow = "";
        history.replaceState(null, "", location.pathname + location.search);
        lastFocus?.focus();
      },
      go(d) { if (!open) return; render((idx + d + items.length) % items.length, d); },
      get isOpen() { return open; }
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

    /* 控件 */
    document.querySelectorAll("[data-mode]").forEach(b => b.onclick = () => {
      document.querySelectorAll("[data-mode]").forEach(x => x.classList.remove("on"));
      b.classList.add("on"); mode = b.dataset.mode; layout(true);
    });
    document.querySelectorAll("[data-size]").forEach(b => b.onclick = () => {
      document.querySelectorAll("[data-size]").forEach(x => x.classList.remove("on"));
      b.classList.add("on"); targetH = +b.dataset.size; layout(true);
    });
    document.querySelectorAll("[data-filter]").forEach(b => b.onclick = () => {
      document.querySelectorAll("[data-filter]").forEach(x => x.classList.remove("on"));
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
      // 点背景 / 舞台留白 / 图片周围的空白都算关闭；点按钮和图片本身不算
      if (e.target === box || e.target.id === "light-stage" || e.target.id === "light-fig") Light.close();
    });
    $("#light-x").onclick = e => { e.stopPropagation(); Light.close(); };
    // 边缘热区和底部控件用同一组 class，行为完全一致
    document.querySelectorAll(".nav-prev").forEach(b => b.onclick = e => { e.stopPropagation(); Light.go(-1); });
    document.querySelectorAll(".nav-next").forEach(b => b.onclick = e => { e.stopPropagation(); Light.go(1); });
    let sx = 0;
    box.addEventListener("touchstart", e => sx = e.touches[0].clientX, { passive: true });
    box.addEventListener("touchend", e => {
      const dx = e.changedTouches[0].clientX - sx;
      if (Math.abs(dx) > 55) Light.go(dx < 0 ? 1 : -1);
    }, { passive: true });

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
