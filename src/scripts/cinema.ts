// 放映室：选中哪一部，银幕就亮起来；胶片自动匀速走带
export function initCinema() {
  const filmstripEl = document.getElementById("filmstrip");
  const screenEl = document.getElementById("screen");
  const movieDataEl = document.getElementById("movie-data");
  if (!filmstripEl || !screenEl || !movieDataEl) return;

  const FILMS: any[] = JSON.parse(movieDataEl.textContent || "[]");
  const frames = Array.from(filmstripEl.querySelectorAll<HTMLElement>(".frame"));
  const pick = (id: string) => document.getElementById(id)!;
  let filmCur = 0;

  const setFilm = (i: number) => {
    filmCur = i;
    const m = FILMS[i];
    frames.forEach((f, k) => {
      const on = k === i;
      f.setAttribute("aria-selected", on ? "true" : "false");
      f.tabIndex = on ? 0 : -1;
    });
    screenEl.style.setProperty("--h", String(m.hue));
    screenEl.classList.remove("lit");
    void screenEl.offsetWidth;
    screenEl.classList.add("lit");

    // 幕布上只留片名 + 年份
    pick("tk-title").textContent = m.title;
    pick("tk-year").textContent = String(m.year);
  };

  frames.forEach((f) =>
    f.addEventListener("click", () => setFilm(Number(f.dataset.i)))
  );

  // 胶片内用左右键选片，不能穿透成面板切换
  filmstripEl.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      e.stopPropagation();
      const n = (filmCur + (e.key === "ArrowRight" ? 1 : -1) + FILMS.length) % FILMS.length;
      setFilm(n);
      frames[n].focus();
      frames[n].scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
    } else if (e.key === "Home" || e.key === "End") {
      e.preventDefault();
      e.stopPropagation();
      const n = e.key === "Home" ? 0 : FILMS.length - 1;
      setFilm(n);
      frames[n].focus();
    }
  });

  // ── 自动匀速走带（放映机效果）──
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reduced) {
    // 克隆一组帧拼到末尾，实现无缝循环
    frames.forEach((f) => {
      const clone = f.cloneNode(true) as HTMLElement;
      clone.setAttribute("aria-hidden", "true");
      clone.tabIndex = -1;
      clone.classList.add("frame-ghost");
      filmstripEl.appendChild(clone);
    });

    const setWidth = () => {
      const first = frames[0];
      const gap = 10;
      // 一组宽度 = 帧宽 + 间距（帧是 flex 子项，间隙固定 10px）
      return first ? first.getBoundingClientRect().width + gap : 0;
    };

    let setW = setWidth();
    window.addEventListener("resize", () => { setW = setWidth(); });

    let paused = false;
    const pauseOn = () => { paused = true; };
    const pauseOff = () => { paused = false; };
    filmstripEl.addEventListener("mouseenter", pauseOn);
    filmstripEl.addEventListener("mouseleave", pauseOff);
    filmstripEl.addEventListener("focusin", pauseOn);
    filmstripEl.addEventListener("focusout", (e) => {
      if (!filmstripEl.contains(e.relatedTarget as Node)) pauseOff();
    });

    let raf = 0;
    let last = performance.now();
    const SPEED = 26; // px / 秒，匀速

    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      if (!paused && setW > 0) {
        let x = filmstripEl.scrollLeft + SPEED * dt;
        if (x >= setW) x -= setW; // 无缝回卷到开头
        filmstripEl.scrollLeft = x;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    // 面板隐藏时停掉动画，避免后台空转
    const stopRaf = () => cancelAnimationFrame(raf);
    window.addEventListener("panelchange", (e: any) => {
      const app = e.detail?.app;
      if (app === "movies") {
        last = performance.now();
        if (!paused) raf = requestAnimationFrame(tick);
      } else {
        stopRaf();
      }
    });
  }
}
