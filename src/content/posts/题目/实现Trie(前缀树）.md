---
title: 实现Trie(前缀树）
date: 2026-04-01
subject: 算法
category: 题目
number: "208"
difficulty: 中等
topics:
  - 树
  - 字典树
platform: LeetCode
tags:
  - 树
  - 字典树
summary: 字典树的教科书实现：TrieNode 持 children 字典与 is_end 标记；insert 逐字建链后置 is_end；search 与 startsWith 走同样的下探，区别只在结尾返回 is_end 还是 True。insert/search/startsWith 均为 O(L)，是自动补全、拼写检查类需求的地基。
---

# 实现Trie(前缀树）

## 🎯 问题描述
**描述**：
**Trie**（发音类似 "try"）或者说 **前缀树** 是一种树形数据结构，用于高效地存储和检索字符串数据集中的键。这一数据结构有相当多的应用情景，例如自动补全和拼写检查。
请你实现 Trie 类：
- `Trie()` 初始化前缀树对象。
- `void insert(String word)` 向前缀树中插入字符串 `word` 。
- `boolean search(String word)` 如果字符串 `word` 在前缀树中，返回 `true`（即，在检索之前已经插入）；否则，返回 `false` 。
- `boolean startsWith(String prefix)` 如果之前已经插入的字符串 `word` 的前缀之一为 `prefix` ，返回 `true` ；否则，返回 `false` 。
**说明**：
- `1 <= word.length, prefix.length <= 2000`
- `word` 和 `prefix` 仅由小写英文字母组成
- `insert`、`search` 和 `startsWith` 调用次数 **总计** 不超过 `3 * 104` 次

**示例**：

- 示例 1：

```text
输入
["Trie", "insert", "search", "search", "startsWith", "insert", "search"]
[[], ["apple"], ["apple"], ["app"], ["app"], ["app"], ["app"]]
输出
[null, null, true, false, true, null, true]
解释
Trie trie = new Trie();
trie.insert("apple");
trie.search("apple");   // 返回 True
trie.search("app");     // 返回 False
trie.startsWith("app"); // 返回 True
trie.insert("app");
trie.search("app");     // 返回 True
```
## 💻 解题思路
### 思路1：字典存储
#### 代码实现
```python
class TrieNode:
    def __init__(self):
        self.children = dict()   # 子节点映射
        self.is_end = False      # 是否为单词结尾
class Trie:

    def __init__(self):
        self.root = TrieNode()
    def insert(self, word: str) -> None:
        current = self.root
        for char in word:
            if char not in current.children:
                current.children[char] = TrieNode()
            current = current.children[char]
        current.is_end = True        
    def search(self, word: str) -> bool:
        current = self.root
        for char in word:
            if char not in current.children:
                return False
            current = current.children[char]
        return current.is_end        
    def startsWith(self, prefix: str) -> bool:
        current = self.root
        for char in prefix:
            if char not in current.children:
                return False
            current = current.children[char]
        return True
# Your Trie object will be instantiated and called as such:
# obj = Trie()
# obj.insert(word)
# param_2 = obj.search(word)
# param_3 = obj.startsWith(prefix)
```
#### 📊 性能分析
##### 提交结果
- **运行时间**：53ms击败48.80%
- **内存消耗**：33.46MB击败56.89%
