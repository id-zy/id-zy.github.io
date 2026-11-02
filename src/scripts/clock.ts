// 时钟：数字直接切换（静态版，不做翻动），装饰性，读屏不播报
export function initClock() {
  const clockEl = document.getElementById("flip-clock");
  if (!clockEl) return;

  const digits = Array.from(clockEl.querySelectorAll<HTMLElement>(".fdigit"));
  const pad = (n: number) => String(n).padStart(2, "0");
  const timeStr = () => {
    const d = new Date();
    return pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds());
  };

  const render = () => {
    const str = timeStr();
    digits.forEach((el, i) => {
      if (el.dataset.cur === str[i]) return;
      el.dataset.cur = str[i];
      // 上下两半一起换，无动画
      el.querySelectorAll("span").forEach((s) => (s.textContent = str[i]));
    });
  };

  render();

  // 对齐到整秒，避免累积漂移
  const tick = () => {
    render();
    window.setTimeout(tick, 1000 - (Date.now() % 1000));
  };
  window.setTimeout(tick, 1000 - (Date.now() % 1000));
}
