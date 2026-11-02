---
title: Decode the Morse code
date: 2026-10-25
subject: 算法
category: 题目
kyu: 6
topics:
  - 字符串
  - 哈希表
platform: Codewars
tags:
  - 字符串
  - 哈希表
summary: 摩尔斯解码的关键是分清两层分隔：单个空格切字符、三个空格切单词。文中用两级 split 自顶向下切开，配一张反查表，并列出空串、连续空格、结尾多余空格这几个最容易漏的边界，以及为什么不能先按空格全切再拼回去。
---

# Decode the Morse code

> **难度**：6 kyu | **平台**：Codewars | **链接**：[Decode the Morse code](https://www.codewars.com/kata/54b724efac3d5402db00065e) | **数据结构**：字符串、哈希表

## 🎯 问题描述

**描述**：

摩尔斯电码把每个字符编码成一段「点（`.`）」与「划（`-`）」的序列——例如 `A` = `.-`，`Q` = `--.-`，数字 `1` = `.----`。

编码规则只有三条：

1. **单个空格**分隔同一单词内的字符码；
2. **三个空格**分隔单词；
3. **首尾多余的空格没有意义，须忽略**。

此外还有若干「服务码」（如国际求救信号 `SOS` = `...---...`），它们被当作**单个特殊字符**、通常独立成一个单词传输。

任务：实现 `decode(morseCode)`，把摩尔斯串还原成人类可读的字符串。

**示例 1**：

```text
输入：decode(".... . -.--   .--- ..- -.. .")
输出："HEY JUDE"
```

**示例 2**（特殊服务码单独成词）：

```text
输入：decode("...---...")
输出："SOS"
```

**提示**：
- Java 环境预置了查表工具 `MorseCode.get(morse)`——传入一段摩尔斯码，返回对应字符。
- 分隔符是关键：**先按 3 空格切单词，再按 1 空格切字母**，顺序不能反。
- 输出不允许出现首尾空格，单词之间只保留 1 个空格。

## 💻 解题思路

### 思路 1：两级 split（自顶向下切分）

#### 核心逻辑

摩尔斯串的层次结构是「**单词 → 字母 → 查表**」，正好对应字符串的两级切分：

1. `trim()` 先把首尾空白去掉（题目明写「没有意义」）；
2. `split("\\s{3}")` 按 **3 个空白**切出单词数组；
3. 每个单词再 `split(" ")` 切成字母数组；
4. 逐个字母 `MorseCode.get()` 查表拼回，单词之间补 1 个空格；
5. 最后整体 `trim()` 收尾。

「先单词后字母」的顺序不可颠倒——若先按 1 空格切，3 个空格会被切成 3 个空串，单词边界就丢失了。

#### 代码实现

```java
public class MorseCodeDecoder {
    public static String decode(String morseCode) {
        // you can use the preloaded MorseCode:
        // char letter = MorseCode.get(morse)
        StringBuilder s = new StringBuilder();
        String[] words = morseCode.trim().split("\\s{3}");

        for (String word : words) {
            for (String letter : word.split(" ")) {
                s.append(MorseCode.get(letter));
            }
            s.append(" ");
        }

        return s.toString().trim(); // your brilliant code here
    }
}
```

#### 📊 性能分析

- 时间复杂度：$O(n)$，$n$ 为摩尔斯串长度——每个字符只被扫过常数次（切分 + 查表都是线性）。
- 空间复杂度：$O(n)$，`words`/`letter` 数组与 `StringBuilder` 均为线性规模。

#### 思考

- **`\\s{3}` 的边界坑**：正则 `{3}` 是「恰好 3 个」，若原文出现 **4 个及以上**连续空格，`split` 会产生**空串片段**；空串再 `split(" ")` 得到 `[""]`，`MorseCode.get("")` 返回 `null`，拼进结果就是字符串 `"null"`。题面样例不会踩到，但更稳的写法是 `split("\\s{3,}")` 或 `split("   ")` 后再过滤空段。
- **`trim()` 两次的必要性**：入口 `trim()` 去掉首尾多余空格（否则首个/末个「单词」是空串）；出口 `trim()` 去掉循环里每个单词末尾多加的那 1 个空格。
- **`StringBuilder` 而非 `String +=`**：循环内拼接用 `StringBuilder`，避免每次 `+=` 新建字符串对象——这是 Java 字符串拼接的标准写法。
- 同族题（Codewars 系列下一步）是 **Encode**，方向相反：字母 → 摩尔斯，单词之间要**主动补 3 个空格**，正好把本题的分隔符规则反过来验证一遍。

## 📝 总结

一句话：**摩尔斯解码 = 两次 split 定层级 + 一次查表**。

真正值得记住的不是代码，而是**分隔符语义**：1 空格 = 字符间，3 空格 = 词间。任何「多层分隔」的题（CSV 引号内逗号、日志多空格对齐、Markdown 空行分段）都是同一个思路——**先切大块、再切小块，顺序错了信息就丢了**。

---
> 💡 补全「相关链接」是把题解织进知识网的关键一步。
