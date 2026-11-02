// 全屏应用切换器：Dock 点击 / 滚轮 / 方向键 / 触控切换面板
// 负责 inert 隔离、aria-current、hash 同步与命令面板跳转的联动
export function initSwitcher() {
  const stage = document.getElementById("stage");
  const panels = Array.from(document.querySelectorAll<HTMLElement>(".panel"));
  const dockItems = Array.from(document.querySelectorAll<HTMLElement>(".dock-item[data-app]"));
  const appName = document.getElementById("mb-app");
  const live = document.getElementById("app-live");

  if (!stage || !panels.length) return;

  const BASE = stage.dataset.base || "/";
  const homePath = new URL(BASE, location.origin).pathname;
  const labels: Record<string, string> = {
    home: "桌面", blog: "博客", music: "音乐",
    movies: "电影", books: "图书", gallery: "相册",
  };
  const indexOf = (app: string) => panels.findIndex((p) => p.dataset.app === app);

  let index = 0;
  let cooldown = false;

  // 只让当前面板可用：其余面板 inert，键盘与读屏都进不去
  function setActive(i: number, announce = false) {
    panels.forEach((p, k) => {
      const on = k === i;
      if (on) {
        p.removeAttribute("inert");
        p.removeAttribute("aria-hidden");
      } else {
        p.setAttribute("inert", "");
        p.setAttribute("aria-hidden", "true");
      }
    });
    dockItems.forEach((d) => {
      const on = Number(d.dataset.index) === i;
      d.classList.toggle("active", on);
      if (on) d.setAttribute("aria-current", "page");
      else d.removeAttribute("aria-current");
    });
    const app = panels[i]?.dataset.app;
    if (app && appName) appName.textContent = labels[app] ?? "桌面";
    if (announce && live && app) live.textContent = `已切换到 ${labels[app] ?? app}`;
  }

  function go(i: number, opts: { announce?: boolean; focus?: boolean; hash?: boolean } = {}) {
    index = (i + panels.length) % panels.length;
    stage.style.transform = `translateX(${-index * 100}%)`;
    setActive(index, opts.announce !== false);
    const app = panels[index]?.dataset.app;
    if (app && opts.hash !== false) history.replaceState(null, "", `#${app}`);
    // 广播当前应用，供各面板做进场效果（显影、灯光等）
    if (app) window.dispatchEvent(new CustomEvent("panelchange", { detail: { app } }));
    if (opts.focus) {
      const p = panels[index];
      p.setAttribute("tabindex", "-1");
      p.focus({ preventScroll: true });
    }
  }

  // 初始：读 hash
  const start = indexOf(location.hash.replace("#", ""));
  go(start >= 0 ? start : 0, { announce: false });

  // 命令面板 / 地址栏改 hash 时同步面板，且浏览器前进后退可用
  window.addEventListener("hashchange", () => {
    const i = indexOf(location.hash.replace("#", ""));
    if (i >= 0 && i !== index) go(i);
  });

  // Dock 点击（首页内原地切换；博客为独立页，直接跳转）
  dockItems.forEach((d) => {
    d.addEventListener("click", (e) => {
      const app = d.dataset.app;
      if (!app) return;
      if (location.pathname !== homePath) return; // 在别的页面就正常跳转
      e.preventDefault();
      if (app === "blog") { location.href = BASE + "blog"; return; }
      const i = indexOf(app);
      if (i >= 0) go(i, { focus: true });
    });
  });

  const modalOpen = () => document.body.classList.contains("modal-open");

  function trigger(dir: number, focus = false) {
    if (cooldown) return;
    cooldown = true;
    setTimeout(() => (cooldown = false), 650);
    go(index + dir, { focus });
  }

  // 滚轮：横向意图直接切；纵向在内容边界才切，否则内部滚动
  window.addEventListener("wheel", (e) => {
    if (cooldown || modalOpen()) return;
    const sc = panels[index]?.querySelector<HTMLElement>(".panel-scroll");
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      e.preventDefault();
      trigger(e.deltaX > 0 ? 1 : -1);
      return;
    }
    if (sc) {
      const atTop = sc.scrollTop <= 0;
      const atBottom = sc.scrollTop + sc.clientHeight >= sc.scrollHeight - 1;
      const down = e.deltaY > 0;
      if ((down && !atBottom) || (!down && !atTop)) return; // 交给内部滚动
    }
    e.preventDefault();
    trigger(down ? 1 : -1);
  }, { passive: false });

  // 触控横滑
  let tx = 0;
  window.addEventListener("touchstart", (e) => (tx = e.touches[0].clientX), { passive: true });
  window.addEventListener("touchend", (e) => {
    if (modalOpen()) return;
    const dx = e.changedTouches[0].clientX - tx;
    if (Math.abs(dx) > 45) trigger(dx < 0 ? 1 : -1);
  }, { passive: true });

  // 键盘：不抢输入控件和对话框的按键
  const editable = (t: EventTarget | null) =>
    t instanceof Element && !!t.closest('input, textarea, select, [contenteditable="true"], dialog');

  window.addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (editable(e.target) || modalOpen()) return;
    if (e.key === "ArrowRight") { e.preventDefault(); trigger(1, true); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); trigger(-1, true); }
    else if (e.key === "Home") { e.preventDefault(); go(0, { focus: true }); }
    else if (e.key === "End") { e.preventDefault(); go(panels.length - 1, { focus: true }); }
  });
}
