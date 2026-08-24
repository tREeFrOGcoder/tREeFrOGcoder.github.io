/* ══════════════════════════════════════════════════════════════════
   全站共用脚本。改版前这些逻辑在 4 个 HTML 里各复制了一份。
   主题的"读取并应用"在 _includes/head.html 里同步执行（防首帧闪白），
   这里只负责"点击切换"和其余交互。
   ══════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  const root = document.documentElement;

  /* ── 明暗切换 ────────────────────────────────────────────────
     只翻 data-theme，图标形状交给 CSS。按钮尺寸写死，无布局位移。 */
  const themeBtn = document.querySelector(".theme-btn");
  if (themeBtn) {
    const sync = () => themeBtn.setAttribute("aria-pressed",
      root.dataset.theme === "dark" ? "true" : "false");
    sync();
    themeBtn.addEventListener("click", () => {
      const dark = root.dataset.theme !== "dark";
      root.dataset.theme = dark ? "dark" : "light";
      try { localStorage.setItem("theme", dark ? "dark" : "light"); } catch (e) {}
      sync();
    });
  }

  /* ── 回到顶部 ── */
  const top = document.querySelector(".top-btn");
  if (top) {
    addEventListener("scroll", () => top.classList.toggle("show", scrollY > 240), { passive: true });
    top.addEventListener("click", () => scrollTo({ top: 0, behavior: "smooth" }));
  }

  /* ── 导航跟着滚动高亮 ── */
  const navLinks = [...document.querySelectorAll("nav a[href^='#']")];
  if (navLinks.length) {
    const map = new Map(navLinks.map(a => [a.getAttribute("href").slice(1), a]));
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      navLinks.forEach(a => a.classList.remove("active"));
      map.get(e.target.id)?.classList.add("active");
    }), { rootMargin: "-20% 0px -70% 0px" });
    document.querySelectorAll("main section[id]").forEach(s => io.observe(s));
  }

  /* ── 论文缩略图点开放大 ──────────────────────────────────────
     FLIP：先量首末位置，再用 transform 补差，所以是从原位长出来的。 */
  const zoom = document.getElementById("zoom");
  if (zoom) {
    const zImg = zoom.querySelector("img");
    const EASE = "cubic-bezier(.22,.61,.36,1)";
    let from = null, busy = false;

    const flip = (a, b) =>
      `translate(${a.left - b.left}px,${a.top - b.top}px) scale(${a.width / b.width},${a.height / b.height})`;

    /* 不用 img.decode()：元素刚从 hidden 切出来时它可能永远不 settle，
       动画会卡在半路且 busy 解不开，连关闭都点不动。 */
    const ready = img => (img.complete && img.naturalWidth)
      ? Promise.resolve()
      : new Promise(res => {
          const done = () => res();
          img.addEventListener("load", done, { once: true });
          img.addEventListener("error", done, { once: true });
          setTimeout(done, 400);
        });

    async function open(src) {
      if (busy) return;
      busy = true; from = src;
      zImg.src = src.currentSrc || src.src;
      zoom.hidden = false;
      await ready(zImg);
      const a = src.getBoundingClientRect(), b = zImg.getBoundingClientRect();
      zImg.style.transition = "none";
      zImg.style.transform = flip(a, b);
      document.body.style.overflow = "hidden";
      requestAnimationFrame(() => {
        zImg.style.transition = `transform .34s ${EASE}`;
        zImg.style.transform = "";
        zoom.classList.add("on");
        setTimeout(() => busy = false, 340);
      });
    }

    function close() {
      if (busy || !from) return;
      busy = true;
      const a = from.getBoundingClientRect(), b = zImg.getBoundingClientRect();
      zImg.style.transition = `transform .3s ${EASE}`;
      zImg.style.transform = flip(a, b);
      zoom.classList.remove("on");
      setTimeout(() => {
        zoom.hidden = true;
        zImg.style.transition = "none";
        zImg.style.transform = "";
        zImg.removeAttribute("src");
        document.body.style.overflow = "";
        from = null; busy = false;
      }, 300);
    }

    document.querySelectorAll(".pub-thumb").forEach(t => {
      const img = t.querySelector("img");
      if (img) t.addEventListener("click", () => open(img));
    });
    zoom.addEventListener("click", close);
    addEventListener("keydown", e => { if (e.key === "Escape" && !zoom.hidden) close(); });
  }
})();
