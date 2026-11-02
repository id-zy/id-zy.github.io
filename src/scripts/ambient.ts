// 展示区联动的收尾脚本：暗房显影 + 入夜联动（音乐播放时全站呼吸）
export function initAmbient() {
  const softMotion = matchMedia("(prefers-reduced-motion: no-preference)").matches;
  const photoGridEl = document.querySelector<HTMLElement>(".photo-grid");

  // ── 暗房：进相册时，照片一张一张显影 ──
  const developAll = () => {
    if (!photoGridEl) return;
    photoGridEl.classList.remove("developing");
    void photoGridEl.offsetWidth;
    photoGridEl.classList.add("developing");
  };

  // ── 入夜联动：音乐在放时，全站暗部跟着慢慢呼吸（纯 CSS 动画，JS 只管开关）──
  const rootEl = document.documentElement;
  const nightStart = () => { if (softMotion) rootEl.classList.add("music-on"); };
  const nightStop = () => { rootEl.classList.remove("music-on"); };

  window.addEventListener("musicstate", (e) => {
    const playing = (e as CustomEvent).detail?.playing;
    if (playing) nightStart();
    else nightStop();
  });

  window.addEventListener("panelchange", (e) => {
    if ((e as CustomEvent).detail?.app === "gallery") developAll();
  });

  // 直接用 #gallery 打开时也要显影
  const galleryPanel = document.querySelector('[data-app="gallery"]');
  if (galleryPanel && !galleryPanel.hasAttribute("inert")) developAll();
}
