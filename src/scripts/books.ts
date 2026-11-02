// 书架：抽一本下来，翻到划线那页
export function initBooks() {
  const shelfEl = document.getElementById("shelf");
  const bookOpenEl = document.getElementById("book-open");
  const bookDataEl = document.getElementById("book-data");
  if (!shelfEl || !bookOpenEl || !bookDataEl) return;

  const BOOKS: any[] = JSON.parse(bookDataEl.textContent || "[]");
  const spines = Array.from(shelfEl.querySelectorAll<HTMLElement>(".spine"));
  const q = (id: string) => document.getElementById(id)!;
  let bookCur = 0;

  const openBook = (i: number) => {
    bookCur = i;
    const b = BOOKS[i];
    spines.forEach((s, k) => {
      const on = k === i;
      s.setAttribute("aria-selected", on ? "true" : "false");
      s.tabIndex = on ? 0 : -1;
    });
    q("bk-title").textContent = b.title;
    q("bk-author").textContent = b.author;
    q("bk-stars").textContent = `★ ${b.rating}`;
    q("bk-status").textContent = b.status;
    q("bk-date").textContent = b.date;
    q("bk-quote").textContent = b.quote;
    q("bk-pct").textContent = `${b.progress}%`;
    q("bk-fill").style.width = `${b.progress}%`;

    bookOpenEl.classList.remove("turn");
    void bookOpenEl.offsetWidth;
    bookOpenEl.classList.add("turn");
  };

  spines.forEach((s) =>
    s.addEventListener("click", () => openBook(Number(s.dataset.i)))
  );

  shelfEl.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      e.stopPropagation();
      const n = (bookCur + (e.key === "ArrowRight" ? 1 : -1) + BOOKS.length) % BOOKS.length;
      openBook(n);
      spines[n].focus();
    }
  });
}
