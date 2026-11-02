---
title: Does my number look big in this
date: 2026-10-27
subject: 算法
category: 题目
kyu: 6
topics:
  - 数学
platform: Codewars
tags:
  - 数学
summary: Does my number look big in this（Codewars · 6 kyu）：解题思路与 数学 方向的代码实现。
---

# Does my number look big in this

> **难度**：6 kyu | **平台**：Codewars | **链接**：[Does my number look big in this?](https://www.codewars.com/kata/5287e858c6b5a9678200083c) | **数据结构**：数学

## 🎯 问题描述

**描述**：

**水仙花数**（Narcissistic Number，又称自恋数 / Armstrong 数）：一个正整数，其**每一位数字的「位数次幂」之和等于它本身**（本题限定十进制）。

- 153（3 位）：`1³ + 5³ + 3³ = 1 + 125 + 27 = 153` ✅
- 1652（4 位）：`1⁴ + 6⁴ + 5⁴ + 2⁴ = 1 + 1296 + 625 + 16 = 1938 ≠ 1652` ❌

要求：给定正整数，返回 `true` / `false` 表示它是否是水仙花数。输入保证是合法正整数，不需要做非法值校验。

**示例**：

```text
narcissistic(7)    → true   （个位数：7¹ = 7）
narcissistic(153)  → true
narcissistic(122)  → false
narcissistic(4887) → false
```

**提示**：
- 先求**位数**，再逐位取出来做幂运算求和，最后与原数比较。
- 逐位提取的固定套路：`% 10` 取个位 + `/= 10` 去掉个位，循环到 0。

## 💻 解题思路

### 思路 1：取位数 → 逐位幂求和 → 比较

#### 核心逻辑

1. `l = String.valueOf(number).length()`——转字符串拿位数（几位数就求几次幂）；
2. `while` 循环里 `num % 10` 取出末位，`Math.pow(num, l)` 累加到 `ans`，`nums /= 10` 去掉末位；
3. 循环结束时 `ans` 即各位的位数次幂之和，`ans == number` 即答案。

#### 代码实现

```java
public class NumberUtils {

    public static boolean isNarcissistic(int number) {
      int l = String.valueOf(number).length();
      int ans = 0;
      int  nums = number;
      while(nums>0){
        int num = nums % 10;
        ans += Math.pow(num,l);
        nums /= 10;
      }
      return ans == number;
}
}
```

#### 📊 性能分析

- 时间复杂度：$O(d)$，`d` 为位数（int 最多 10 位，常数级）。
- 空间复杂度：$O(d)$（`String.valueOf` 的临时字符串；改用纯算术求位数可到 $O(1)$）。

#### 思考

- **`Math.pow` 返回 `double`**：`ans += Math.pow(...)` 里发生隐式窄化——`double` 加进 `int` 时结果截断回 `int`。本题每位结果都是精确整数且远小于 int 上限，不会出错；但「浮点参与整数运算」是个要心里有数的点，严格写法可用 `(int) Math.pow(...)` 或自己写整数幂循环。
- **个位数全是水仙花数**：`d = 1` 时条件退化为 `n¹ = n`，恒成立——所以 0–9（按题面正整数即 1–9）都返回 `true`，`while(nums>0)` 对个位数只转一圈，逻辑自动覆盖。
- **两种「求位数」姿势**：字符串法（`String.valueOf(n).length()`，直观）vs 循环除十法（`while(n>0){d++;n/=10;}`，零临时对象）。顺手复习了 Java-数组length与字符串length方法——字符串长度是 `.length()` 带括号的方法，数组才是无括号的 `.length` 字段。
- 与 Decode the Morse code 同属「逐字符/逐位拆解 + 规则判定」一类：把数拆成位、把串拆成词，剩下的都是纯规则判断。

## 📝 总结

一句话：**水仙花数 = 「位数」决定幂次、「%10 / =10」负责逐位——先取位数再逐位幂求和，最后和原数比**。

这题算法含量低，真正记下的是两个 Java 手感：`String.valueOf(n).length()` 拿位数，以及 `Math.pow` 的 double 陷阱——做整数题时幂运算要么强转要么手写循环。

---
> 💡 补全「相关链接」是把题解织进知识网的关键一步。
