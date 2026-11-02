export function initArt(root: ParentNode = document): void {
  const page = root.querySelector<HTMLElement>("[data-art-page]");
  if (!page || page.dataset.ready) return;
  page.dataset.ready = "true";

  page.addEventListener("pointermove", (event) => {
    page.style.setProperty("--mx", `${event.clientX}px`);
    page.style.setProperty("--my", `${event.clientY}px`);
  }, { passive: true });

  root.querySelectorAll<HTMLElement>("[data-select-group]").forEach((group) => {
    const choices = Array.from(group.querySelectorAll<HTMLElement>("[data-choice]"));
    const targets = Array.from(root.querySelectorAll<HTMLElement>("[data-target]"));
    choices.forEach((choice, index) => choice.addEventListener("click", () => {
      choices.forEach((item) => item.classList.remove("is-active"));
      choice.classList.add("is-active");
      targets.forEach((target) => target.classList.toggle("is-active", Number(target.dataset.target) === index));
      const title = choice.dataset.title;
      const subtitle = choice.dataset.subtitle;
      const note = choice.dataset.note;
      root.querySelectorAll<HTMLElement>("[data-live-title]").forEach((el) => { if (title) el.textContent = title; });
      root.querySelectorAll<HTMLElement>("[data-live-subtitle]").forEach((el) => { if (subtitle) el.textContent = subtitle; });
      root.querySelectorAll<HTMLElement>("[data-live-note]").forEach((el) => { if (note) el.textContent = note; });
    }));
  });

  root.querySelectorAll<HTMLElement>("[data-horizontal]").forEach((rail) => {
    rail.addEventListener("wheel", (event) => {
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      event.preventDefault();
      rail.scrollBy({ left: event.deltaY * 1.5, behavior: "smooth" });
    }, { passive: false });
  });
}
