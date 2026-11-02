/**
 * 单屏舞台的通用交互：切换代替滚动。
 * 一个页面一份数据：舞台面板 [data-stage-panel] 与索引按钮 [data-stage-index] 一一对应。
 * 可选能力按 data 属性探测：筛选条、全屏浮层、八秒合成氛围音。
 */

interface StageTrack {
  title: string;
  frequencies: [number, number, number];
}

const readTracks = (scope: ParentNode): StageTrack[] => {
  const holder = scope.querySelector<HTMLScriptElement>("#stage-audio");
  if (!holder?.textContent) return [];
  try {
    const parsed: unknown = JSON.parse(holder.textContent);
    return Array.isArray(parsed) ? (parsed as StageTrack[]) : [];
  } catch {
    return [];
  }
};

export function initStage(root: ParentNode = document): void {
  const page = root.querySelector<HTMLElement>("[data-stage]");
  if (!page || page.dataset.stageReady === "true") return;
  page.dataset.stageReady = "true";

  // 外链图片不可用时转为片场色块，避免浏览器破图图标打断画面。
  page.querySelectorAll<HTMLImageElement>("img").forEach((image) => {
    const markBroken = () => image.classList.add("is-broken");
    if (image.complete && image.naturalWidth === 0) markBroken();
    else image.addEventListener("error", markBroken, { once: true });
  });

  const panels = Array.from(page.querySelectorAll<HTMLElement>("[data-stage-panel]"));
  const buttons = Array.from(page.querySelectorAll<HTMLButtonElement>("[data-stage-index]"));
  const items = Array.from(page.querySelectorAll<HTMLElement>("[data-stage-item]"));
  const count = page.querySelector<HTMLElement>("[data-stage-count]");
  const total = page.querySelector<HTMLElement>("[data-stage-total]");
  const status = page.querySelector<HTMLElement>("[data-stage-status]");
  // 浮层可能写在舞台容器之外（博客全文、作品案例），因此按 document 范围查找
  const sheets = Array.from(root.querySelectorAll<HTMLDialogElement>("dialog[data-sheet]"));
  if (!buttons.length) return;
  // 星图模式：封面即索引，主角「点亮」而不是切换隐藏面板，筛选改为熄灭
  const constellation = page.dataset.stageMode === "constellation";

  let index = 0;
  let audioTimer: number | null = null;
  let audioContext: AudioContext | null = null;
  let soundSources: AudioScheduledSourceNode[] = [];
  let audioSession = 0;
  let wheelLocked = false;

  const sectionNames: Record<string, string> = {
    curation: "CURATED MEMORY / THINKING EDITION",
    music: "SONIC CONSTELLATION / LISTENING ROOM",
    movie: "PRIVATE CINEMA / NOW SCREENING",
    gallery: "CONTACT SHEET / LIGHT STUDIES",
    blog: "FIELD NOTES / EDITORIAL ARCHIVE",
    works: "SELECTED WORK / CREATIVE PRACTICE",
  };
  const body = page.querySelector<HTMLElement>(".stage-body");
  if (body) body.dataset.scene = sectionNames[page.dataset.section ?? ""] ?? "PERSONAL ARCHIVE";

  // 指针追光与轻微镜头倾斜。只改变 CSS 变量，避免持续读写布局。
  if (matchMedia("(pointer:fine) and (prefers-reduced-motion:no-preference)").matches) {
    page.addEventListener("pointermove", (event) => {
      const x = event.clientX / window.innerWidth;
      const y = event.clientY / window.innerHeight;
      page.style.setProperty("--stage-x", `${(x * 100).toFixed(2)}%`);
      page.style.setProperty("--stage-y", `${(y * 100).toFixed(2)}%`);
      page.style.setProperty("--tilt-x", `${((x - 0.5) * 2.2).toFixed(2)}deg`);
      page.style.setProperty("--tilt-y", `${((0.5 - y) * 1.6).toFixed(2)}deg`);
    }, { passive: true });
    page.addEventListener("pointerleave", () => {
      page.style.setProperty("--tilt-x", "0deg");
      page.style.setProperty("--tilt-y", "0deg");
    });
  }

  const tracks = readTracks(root);
  const audioToggle = page.querySelector<HTMLButtonElement>("[data-audio-toggle]");
  const audioLabel = page.querySelector<HTMLElement>("[data-audio-label]");
  const audioStatus = page.querySelector<HTMLElement>("[data-audio-status]");
  const audioPlayer = page.querySelector<HTMLElement>("[data-audio-player]");

  const visibleIndexes = () =>
    buttons
      .filter((button) =>
        constellation ? !button.classList.contains("is-dim") : !button.hidden,
      )
      .map((button) => Number(button.dataset.stageIndex));

  // 星图模式的信息卡：数据挂在每个封面按钮的 data-sky-* 属性上
  const skyCard = page.querySelector<HTMLElement>("[data-sky-card]");
  const skyText = (selector: string, value?: string) => {
    const element = skyCard?.querySelector<HTMLElement>(selector);
    if (element && value !== undefined) element.textContent = value;
  };
  const updateSkyCard = (cardIndex: number) => {
    const button = buttons[cardIndex];
    if (!button || !skyCard) return;
    skyText("[data-sky-title]", button.dataset.skyTitle);
    skyText("[data-sky-sub]", button.dataset.skySub);
    skyText("[data-sky-meta]", button.dataset.skyMeta);
    skyText("[data-sky-note]", button.dataset.skyNote);
  };

  const stopSound = (message?: string) => {
    audioSession += 1;
    if (audioTimer !== null) window.clearInterval(audioTimer);
    audioTimer = null;
    soundSources.forEach((source) => {
      try {
        source.stop();
      } catch {
        // 已结束的音源无需再次停止
      }
    });
    soundSources = [];
    const context = audioContext;
    audioContext = null;
    if (context && context.state !== "closed") void context.close().catch(() => undefined);

    if (audioPlayer) {
      audioPlayer.dataset.playing = "false";
      audioPlayer.style.setProperty("--stage-progress", "0");
    }
    audioToggle?.setAttribute("aria-pressed", "false");
    if (audioLabel) audioLabel.textContent = "聆听 8 秒氛围";
    if (message && audioStatus) audioStatus.textContent = message;
  };

  const idleSoundMessage = () => {
    const track = tracks[index];
    return track
      ? `已选择《${track.title}》· 点击后生成八秒氛围音，不是原曲录音，也不会自动播放。`
      : "点击后生成八秒合成氛围音。";
  };

  const openSheet = (target: number) => {
    sheets.forEach((dialog) => {
      if (dialog.open && Number(dialog.dataset.sheetIndex) !== target) dialog.close();
    });
    const sheet = sheets.find((dialog) => Number(dialog.dataset.sheetIndex) === target);
    if (!sheet || sheet.open) return;
    sheet.showModal();
    const scroller = sheet.querySelector<HTMLElement>(".sheet-scroll");
    if (scroller) scroller.scrollTop = 0;
  };

  const select = (next: number, announce = true) => {
    const size = panels.length;
    index = ((next % size) + size) % size;

    panels.forEach((panel, panelIndex) => {
      const active = panelIndex === index;
      panel.hidden = !active;
      panel.classList.toggle("is-active", active);
    });
    if (constellation) updateSkyCard(index);
    buttons.forEach((button, buttonIndex) => {
      const active = buttonIndex === index;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    if (count) count.textContent = `${index + 1} / ${size}`;
    page.style.setProperty("--scene-number", `"${String(index + 1).padStart(2, "0")}"`);

    stopSound();
    if (audioStatus) audioStatus.textContent = idleSoundMessage();

    if (announce && status) {
      const label = buttons[index]?.dataset.stageLabel ?? "";
      status.textContent = `第 ${index + 1} 项，共 ${size} 项：${label}`;
    }
    const open = sheets.find((dialog) => dialog.open);
    if (open) openSheet(index);
  };

  const step = (direction: number, focus = false) => {
    const visible = visibleIndexes();
    if (!visible.length) return;
    const position = visible.indexOf(index);
    const nextPosition = position === -1 ? 0 : (position + direction + visible.length) % visible.length;
    const nextIndex = visible[nextPosition];
    select(nextIndex);
    if (focus) buttons[nextIndex]?.focus({ preventScroll: true });
  };

  buttons.forEach((button) => {
    button.addEventListener("click", () => select(Number(button.dataset.stageIndex)));
  });

  page.querySelectorAll<HTMLButtonElement>("[data-stage-prev]").forEach((button) => {
    button.addEventListener("click", () => step(-1));
  });
  page.querySelectorAll<HTMLButtonElement>("[data-stage-next]").forEach((button) => {
    button.addEventListener("click", () => step(1));
  });

  // 在主舞台滚轮切片，索引列表与浮层仍保留原生滚动。
  page.addEventListener("wheel", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.closest(".stage-list, .sheet, input, textarea") || Math.abs(event.deltaY) < 26) return;
    if (wheelLocked) return;
    event.preventDefault();
    wheelLocked = true;
    step(event.deltaY > 0 ? 1 : -1);
    window.setTimeout(() => { wheelLocked = false; }, 620);
  }, { passive: false });

  // ── 索引内方向键：↑↓ / ←→ 切换，Home、End 跳首尾 ──
  page.addEventListener("keydown", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.closest("dialog")) return;
    if (!target.closest(".stage-index") && !target.closest("[data-stage-index]")) return;

    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      event.preventDefault();
      step(1, true);
    } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      event.preventDefault();
      step(-1, true);
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      const visible = visibleIndexes();
      if (!visible.length) return;
      const nextIndex = event.key === "Home" ? visible[0] : visible[visible.length - 1];
      select(nextIndex);
      buttons[nextIndex]?.focus({ preventScroll: true });
    }
  });

  // ── 筛选与关键词搜索：隐藏不匹配项，若当前项被隐藏则跳到第一个可见项 ──
  const filterButtons = Array.from(page.querySelectorAll<HTMLButtonElement>("[data-stage-filter]"));
  const searchInput = page.querySelector<HTMLInputElement>("[data-stage-search]");
  if ((filterButtons.length || searchInput) && items.length) {
    let currentFilter = "全部";
    let currentQuery = "";

    const applyView = () => {
      filterButtons.forEach((button) => {
        button.setAttribute("aria-pressed", String((button.dataset.stageFilter ?? "") === currentFilter));
      });

      let shown = 0;
      items.forEach((item, itemIndex) => {
        const tags = (item.dataset.stageTag ?? "").split(/\s+/).filter(Boolean);
        const hay = `${item.dataset.stageHay ?? ""} ${item.textContent ?? ""}`.toLowerCase();
        const match =
          (currentFilter === "全部" || tags.includes(currentFilter)) &&
          (!currentQuery || hay.includes(currentQuery));
        if (constellation) {
          item.classList.toggle("is-dim", !match);
        } else {
          item.hidden = !match;
          const button = buttons[itemIndex];
          if (button) button.hidden = !match;
        }
        if (match) shown += 1;
      });

      if (total) total.textContent = `${shown} 条`;
      const visible = visibleIndexes();
      if (visible.length && !visible.includes(index)) select(visible[0]);
      if (!visible.length && status) status.textContent = "没有匹配的内容，换个关键词或分类看看。";
    };

    filterButtons.forEach((button) => {
      button.addEventListener("click", () => {
        currentFilter = button.dataset.stageFilter ?? "全部";
        applyView();
      });
    });
    searchInput?.addEventListener("input", () => {
      currentQuery = searchInput.value.trim().toLowerCase();
      applyView();
    });
  }

  // ── 全屏浮层：阅读幕与案例幕，Esc 由原生 dialog 提供 ──
  page.querySelectorAll<HTMLButtonElement>("[data-sheet-open]").forEach((button) => {
    button.addEventListener("click", () => {
      const raw = button.dataset.sheetOpen;
      openSheet(raw === undefined || raw === "" ? index : Number(raw));
    });
  });
  sheets.forEach((sheet) => {
    const sheetIndex = Number(sheet.dataset.sheetIndex);
    sheet.querySelector("[data-sheet-close]")?.addEventListener("click", () => sheet.close());
    sheet.querySelector("[data-sheet-prev]")?.addEventListener("click", () => {
      step(-1);
      openSheet(index);
    });
    sheet.querySelector("[data-sheet-next]")?.addEventListener("click", () => {
      step(1);
      openSheet(index);
    });
    sheet.addEventListener("click", (event) => {
      if (event.target === sheet) sheet.close();
    });
    void sheetIndex;
  });

  // ── 八秒合成氛围音：只在点击后生成，切歌即停 ──
  audioToggle?.addEventListener("click", async () => {
    if (audioToggle.getAttribute("aria-pressed") === "true") {
      stopSound("氛围音已停止。再次点击可重新生成。");
      return;
    }
    const AudioContextConstructor = window.AudioContext;
    if (!AudioContextConstructor) {
      if (audioStatus) audioStatus.textContent = "当前浏览器无法生成声音，请换用支持 Web Audio 的浏览器。";
      return;
    }

    const track = tracks[index];
    if (!track) {
      if (audioStatus) audioStatus.textContent = "这一项没有可生成的声音。";
      return;
    }

    stopSound();
    const session = audioSession;
    const duration = 8;

    try {
      const context = new AudioContextConstructor();
      audioContext = context;
      await context.resume();
      if (session !== audioSession) {
        void context.close().catch(() => undefined);
        return;
      }

      const now = context.currentTime;
      const master = context.createGain();
      master.gain.setValueAtTime(0.0001, now);
      master.gain.exponentialRampToValueAtTime(0.12, now + 0.7);
      master.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      master.connect(context.destination);

      const oscillators = track.frequencies.map((frequency, voice) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(frequency, now);
        oscillator.detune.setValueAtTime((voice - 1) * 4, now);
        gain.gain.setValueAtTime(0.24 / (voice + 1), now);
        oscillator.connect(gain);
        gain.connect(master);
        oscillator.start(now);
        oscillator.stop(now + duration);
        return oscillator;
      });

      const noiseBuffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
      const noiseData = noiseBuffer.getChannelData(0);
      let previous = 0;
      for (let sample = 0; sample < noiseData.length; sample += 1) {
        previous = (previous + Math.random() * 0.04 - 0.02) / 1.02;
        noiseData[sample] = previous * 3.2;
      }
      const noise = context.createBufferSource();
      const noiseFilter = context.createBiquadFilter();
      const noiseGain = context.createGain();
      noise.buffer = noiseBuffer;
      noise.loop = true;
      noiseFilter.type = "lowpass";
      noiseFilter.frequency.setValueAtTime(520, now);
      noiseGain.gain.setValueAtTime(0.07, now);
      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(master);
      noise.start(now);
      noise.stop(now + duration);
      soundSources = [...oscillators, noise];

      if (audioPlayer) audioPlayer.dataset.playing = "true";
      audioToggle.setAttribute("aria-pressed", "true");
      if (audioLabel) audioLabel.textContent = "停止氛围音";
      const endsAt = performance.now() + duration * 1000;

      const updateProgress = () => {
        if (session !== audioSession) return;
        const remaining = Math.max(0, (endsAt - performance.now()) / 1000);
        audioPlayer?.style.setProperty("--stage-progress", (1 - remaining / duration).toFixed(3));
        if (audioStatus) {
          audioStatus.textContent = `正在播放算法氛围音 · 约剩 ${Math.ceil(remaining)} 秒（非原曲录音）`;
        }
      };
      updateProgress();
      audioTimer = window.setInterval(updateProgress, 100);

      oscillators[0].addEventListener("ended", () => {
        if (session === audioSession) stopSound("八秒氛围音已结束。点击可再听一次，不会自动续播。");
      });
    } catch {
      if (session === audioSession) stopSound("声音生成失败，请检查浏览器声音权限后再试。");
    }
  });

  window.addEventListener("pagehide", () => stopSound());

  select(0, false);
  if (audioStatus) audioStatus.textContent = idleSoundMessage();
}
