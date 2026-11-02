---
title: Simple Pig Latin
date: 2026-10-29
subject: 算法
category: 题目
kyu: 5
topics:
  - 字符串
platform: Codewars
tags:
  - 字符串
summary: Simple Pig Latin（Codewars · 5 kyu）：解题思路与 字符串 方向的代码实现。
---

# Simple Pig Latin

> **难度**：5 kyu | **平台**：Codewars | **链接**：[Simple Pig Latin](https://www.codewars.com/kata/520b9d2ad5c005041100000f) | **数据结构**：字符串

## 🎯 问题描述

**描述**：

把每个单词的**首字母移到末尾**，再在末尾追加 `"ay"`。**标点符号保持原样**，不要跟着字母一起搬。

单词之间以空格分隔，标点可能单独出现（如 `"Hello world !"` 里的 `!`）。

**示例 1**：

```text
pigIt("Pig latin is cool")   -->  "igPay atinlay siay oolcay"
```

**示例 2**：

```text
pigIt("Hello world !")       -->  "elloHay orldway !"
```

**提示**：

- 标点不是单词，不能变成 `!ay`。
- 单个字母的单词也要处理：`"a"` → `"aay"`（首字母 `a` 移到末尾仍是 `a`，再加 `ay`）。
- 空格的数量与位置必须原样保留。

## 💻 解题思路

### 思路 1：一次扫描，按「连续字母段」处理

不要先 `split(" ")` 再拼回去——那样多个空格会被压缩，标点也会被当成单词。**正确做法是把字符串看成两种片段交替出现**：字母段（一个单词）和非字母段（空格 / 标点，原样输出）。

#### 核心逻辑

```text
i 从头扫到尾：
  若 str[i] 是字母：
      记 start = i，一直右移 i 直到不是字母
      输出 str[start+1 .. i-1] + str[start] + "ay"
  否则：
      原样输出 str[i]，i 前进一格
```

关键在 `str[start+1 .. i-1]`：**跳过首字母，把剩下的整段搬过来**，再把首字母接在后面。用 `StringBuilder.append(CharSequence, start, end)` 可以省掉一次 `substring` 的对象创建。

#### 代码实现

```java
public class PigLatin {
    public static String pigIt(String str) {
        StringBuilder ans = new StringBuilder();
        int l = str.length();
        int i = 0;
        while (i < l) {
            if (isLetter(str.charAt(i))) {
                int start = i;
                while (i < l && isLetter(str.charAt(i))) {
                    i++;                        // 找到这个单词的右边界
                }
                ans.append(str, start + 1, i);  // 除首字母外的部分
                ans.append(str.charAt(start));  // 首字母搬到末尾
                ans.append("ay");
            } else {
                ans.append(str.charAt(i));      // 空格 / 标点原样保留
                i++;
            }
        }
        return ans.toString();
    }

    public static boolean isLetter(char c) {
        return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z');
    }
}
```

实测（JDK 22）：

```text
pigIt("Pig latin is cool")     -->  igPay atinlay siay oolcay
pigIt("Hello world !")         -->  elloHay orldway !
pigIt("a b")                   -->  aay bay
pigIt("O tempora o mores !")   -->  Oay emporatay oay oresmay !
```

#### 📊 性能分析

- 时间复杂度：`O(n)`。每个字符恰好被访问一次（内层 `while` 只是把 `i` 往前推，不回退）。
- 空间复杂度：`O(n)`。输出长度约等于 `n + 2 × 单词数`，`StringBuilder` 存的就是结果本身；如果给 `StringBuilder` 预设容量 `new StringBuilder(str.length() * 2)`，能省掉几次扩容复制。

#### 思考

**为什么不能用 `split(" ")`** —— 这是本题唯一真正的坑。`"Hello world !"` 按空格切出来是 `["Hello", "world", "!"]`，第三个 token 是标点，直接套规则会得到 `"!ay"`。补救办法是切完再判每个 token 是不是纯字母，但那时**多个连续空格已经被吃掉了**，空格信息无法还原。一次扫描的方案没有这个问题，因为它从不切分。

**一个正则就够**：`([a-zA-Z])([a-zA-Z]*)` 捕获「首字母 + 剩余字母」，替换成 `$2$1ay`：

```java
public static String pigIt(String str) {
    return str.replaceAll("([a-zA-Z])([a-zA-Z]*)", "$2$1ay");
}
```

实测四种输入与上面的手写版**结果完全一致**（含 `"a"` → `"aay"`）。正则更短，代价是调试时看不见中间状态——面试写这道题建议手写扫描，正则当加分项。

**为什么不用 `Character.isLetter`**：它按 Unicode 判字母，中文、日文也算「字母」，会被一起搬走。题目只要求处理 ASCII，用 `a-z / A-Z` 区间判断最准确，也顺便说清了边界。

## 📝 总结

- 按「字母段 / 非字母段」交替扫描，比 `split` 更保真——空格与标点一个都不丢。
- 单词变换 = 取 `[start+1, end)` + 首字母 + `"ay"`，三段拼一次。
- 单字母单词是边界：`start + 1 == end`，前段为空，结果 `"aay"`。
- `Character.isLetter` 含 Unicode 字母，ASCII 题要用字符区间判断。
- 正则 `([a-zA-Z])([a-zA-Z]*)` → `$2$1ay` 是等价的短解。
