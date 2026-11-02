// 题解笔记的标题常带刷题站来源后缀（「132模式-LeetCode」「Pete, the baker-Codewars」），
// 列表与详情统一去掉这两个来源；其他标题原样保留。
const SOURCE_SUFFIX = /[\s\-—－_]+(?:LeetCode|Codewars)\s*$/i;

export const cleanProblemTitle = (title: string): string =>
  title.replace(SOURCE_SUFFIX, "").trim() || title;
