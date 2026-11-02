// 相册：拍立得可甩动、可翻面
export function initGallery() {
  const soft = matchMedia("(prefers-reduced-motion: no-preference)").matches;
  document.querySelectorAll<HTMLElement>("[data-photo]").forEach((el) => {
    let down = false;
    let sx = 0, sy = 0, dx = 0, dy = 0, lx = 0, ly = 0, vx = 0, vy = 0;
    let moved = false;
    let raf = 0;

    const paint = (x: number, y: number) => {
      el.style.setProperty("--dx", `${x.toFixed(1)}px`);
      el.style.setProperty("--dy", `${y.toFixed(1)}px`);
      el.style.setProperty("--rot", `${(x * 0.07).toFixed(2)}deg`);
    };

    const flip = () => {
      const on = el.classList.toggle("flipped");
      el.setAttribute("aria-expanded", on ? "true" : "false");
    };

    el.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      down = true;
      moved = false;
      sx = lx = e.clientX;
      sy = ly = e.clientY;
      vx = vy = 0;
      el.setPointerCapture(e.pointerId);
      el.classList.add("dragging");
    });

    el.addEventListener("pointermove", (e) => {
      if (!down) return;
      dx = e.clientX - sx;
      dy = e.clientY - sy;
      if (Math.abs(dx) + Math.abs(dy) > 6) moved = true;
      vx = e.clientX - lx;
      vy = e.clientY - ly;
      lx = e.clientX;
      ly = e.clientY;
      paint(dx, dy);
    });

    const release = () => {
      if (!down) return;
      down = false;
      el.classList.remove("dragging");
      cancelAnimationFrame(raf);
      if (!soft) {
        paint(0, 0);
        dx = dy = 0;
        return;
      }
      let x = dx, y = dy;
      let ax = vx, ay = vy;
      const spring = () => {
        ax += -x * 0.15;
        ay += -y * 0.15;
        ax *= 0.88;
        ay *= 0.88;
        x += ax;
        y += ay;
        paint(x, y);
        if (Math.abs(x) < 0.4 && Math.abs(y) < 0.4 && Math.abs(ax) < 0.2) {
          paint(0, 0);
          dx = dy = 0;
          return;
        }
        raf = requestAnimationFrame(spring);
      };
      spring();
    };
    el.addEventListener("pointerup", release);
    el.addEventListener("pointercancel", release);

    el.addEventListener("click", () => { if (!moved) flip(); });
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        flip();
      }
    });
  });
}
