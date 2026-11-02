// 文章 id 是相对 posts 目录的路径（含子目录与中文书名号），URL 只用文件名。
// 例：创作/《魅影缝匠》 -> 魅影缝匠；博客/Java-Stream -> Java-Stream
const UNSAFE = /[\\/:*?"<>|#%&{}$!'@+`=\s]+/g;
const BRACKETS = /[《》〈〉「」『』]/g;

export const slugOf = (id: string): string => {
  const base = id.split("/").pop() ?? id;
  return base
    .replace(/\.md$/i, "")
    .replace(BRACKETS, "")
    .replace(UNSAFE, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "");
};
