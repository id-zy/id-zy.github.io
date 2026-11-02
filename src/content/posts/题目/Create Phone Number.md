---
title: Create Phone Number
date: 2026-10-26
subject: 算法
category: 题目
kyu: 7
topics:
  - 字符串
platform: Codewars
tags:
  - 字符串
summary: Create Phone Number（Codewars · 7 kyu）：解题思路与 字符串 方向的代码实现。
---

# Create Phone Number

> **难度**：7 kyu | **平台**：Codewars | **链接**：[Create Phone Number](https://www.codewars.com/kata/525f50e3b73515a6db000b83) | **数据结构**：字符串

## 🎯 问题描述

**描述**：

输入一个 **恰好 10 个整数** 的数组（每个都在 `0~9` 之间），把它拼成一个标准格式的电话号码字符串：

- 前 3 位 → 括号包起来，如 `(123)`
- 中间 3 位 → 跟一个空格，如 `(123) 456`
- 后 4 位 → 跟一个横杠，如 `(123) 456-7890`

**示例 1**：

```text
输入：createPhoneNumber(new int[]{1, 2, 3, 4, 5, 6, 7, 8, 9, 0})
输出："(123) 456-7890"
```

**提示**：
- 输出是**格式化字符串**，不是数值——前导 0、括号、空格、横杠都必须原样保留。
- 这是纯粹的「按位置切片 + 拼接」题，不涉及任何数值运算。

## 💻 解题思路

### 思路 1：三段循环拼接（StringBuilder）

#### 核心逻辑

格式固定为 `3 + 3 + 4` 三段、两个分隔符，正好对应三段循环：

1. `append("(")` 开头；
2. 下标 `0~2` 逐个 append，再 `append(") ")`；
3. 下标 `3~5` 逐个 append，再 `append("-")`；
4. 下标 `6~9` 逐个 append；
5. `toString()` 返回。

数字 `int` 直接 `append` 会按字符形式拼入（`StringBuilder.append(int)` 就是十进制文本），不需要手动转字符串。

#### 代码实现

```java
public class Kata {
  public static String createPhoneNumber(int[] numbers) {
    StringBuilder s = new StringBuilder();
      s.append("(");
      for(int i = 0;i<3;i++){
        s.append(numbers[i]);
      }
      s.append(") ");
      for(int i = 3;i<6;i++){
        s.append(numbers[i]);
      }
      s.append("-");
      for(int i = 6;i<10;i++){
        s.append(numbers[i]);
      }
      return s.toString();
  }
}
```

#### 📊 性能分析

- 时间复杂度：$O(n)$，$n = 10$（严格说常数级，遍历一遍数组）。
- 空间复杂度：$O(n)$，`StringBuilder` 与最终字符串均为线性规模。

#### 思考

- **格式化题的通用思路**：把「格式」翻译成「分段规则 + 分隔符」，逐段拼装。本题格式硬编码，循环边界写死即可；若段数不定，就要换成参数化的分段数组。
- **更「声明式」的写法**：`String.format("(%d%d%d) %d%d%d-%d%d%d%d", ...)` 一行搞定——把「怎么拼」交给格式串。两种写法各有取舍：循环版逻辑直白、无格式串转义心智；format 版短，但占位符与参数个数要对齐。
- **与 Decode the Morse code 的呼应**：上一题是「切分」（字符串 → 段），这一题是「拼装」（段 → 字符串），正好是字符串处理的正反两个方向。

## 📝 总结

一句话：**固定格式 = 分段规则 + 分隔符，逐段拼装**。

值得记住的是 `StringBuilder.append(int)` 会按十进制文本拼入数字，以及这类题还有 `String.format` 的声明式捷径——做题时按位置切片练的是手感，写业务代码时记得 format 更省事。

---
> 💡 补全「相关链接」是把题解织进知识网的关键一步。
