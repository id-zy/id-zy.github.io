---
title: Pete, the baker
date: 2026-10-30
subject: 算法
category: 题目
kyu: 5
topics:
  - 哈希表
  - 遍历
platform: Codewars
tags:
  - 哈希表
  - 遍历
summary: Pete, the baker（Codewars · 5 kyu）：解题思路与 哈希表/遍历 方向的代码实现。
---

# Pete, the baker

> **难度**：5 kyu | **平台**：Codewars | **链接**：[Pete, the baker](https://www.codewars.com/kata/525c65e51bf619685c000059) | **数据结构**：哈希表 / 遍历

## 🎯 问题描述

**描述**：

Pete 喜欢烤蛋糕，他有一份配方（recipe）和手头的原料（available）。请帮他算一算，按配方最多能烤出几个蛋糕。

实现函数 `cakes(recipe, available)`，两个参数都是以「原料名 → 数量」为键值的映射，返回一个整数表示最多能烤的蛋糕数。

- 原料数量没有单位，`1` 就是 1 份、`200` 就是 200 份；
- **配方里有、但手头没有的原料，数量视为 0**；
- 任一种原料不够做 1 个蛋糕，答案就是 0。

**示例 1**：

```text
输入：recipe    = {flour: 500, sugar: 200, eggs: 1}
      available = {flour: 1200, sugar: 1200, eggs: 5, milk: 200}
输出：2
解释：flour 够 2 份，sugar 够 6 份，eggs 够 5 份，取最小 → 2。
```

**示例 2**：

```text
输入：recipe    = {apples: 3, flour: 300, sugar: 150, milk: 100, oil: 100}
      available = {sugar: 500, flour: 2000, milk: 2000}
输出：0
解释：没有 apples 也没有 oil，视为 0，直接做不出蛋糕。
```

**提示**：
- 答案由**最紧缺的那一种原料**决定，是「各原料可做份数」的最小值；
- 缺失的键不能当异常抛掉，要按 0 处理。

## 💻 解题思路

### 思路 1：逐项整除取最小值

#### 核心逻辑

1. 遍历**配方**（不是手头原料）——配方决定要做几种原料，手头多出来的（示例里的 `milk`）与答案无关；
2. 对每种原料算「手头数量 / 配方数量」的**整数除法**结果；
3. 全程维护最小值，遍历结束即答案。

配方为空时没有可除的项，`Integer.MAX_VALUE` 原样返回会是错的——补一个兜底返回 0。

#### 代码实现

```java
import java.util.Map;

public class PeteBaker {
    public static int cakes(Map<String, Integer> recipe, Map<String, Integer> available) {
        int result = Integer.MAX_VALUE;

        for (Map.Entry<String, Integer> entry : recipe.entrySet()) {
            int required = entry.getValue();
            int have = available.getOrDefault(entry.getKey(), 0);   // 缺失按 0
            result = Math.min(result, have / required);             // 整数除法，向下取整
            if (result == 0) {
                return 0;                                           // 提前剪枝
            }
        }

        return result == Integer.MAX_VALUE ? 0 : result;
    }
}
```

#### 📊 性能分析

- 时间复杂度：$O(r)$，$r$ = 配方里的原料种类数；哈希查找均摊 $O(1)$，所以一趟遍历结束。
- 空间复杂度：$O(1)$，只用一个累加变量（不计入参本身）。

#### 思考

- **遍历配方而不是遍历手头原料**，是本题的分水岭。反着写要先判断「手头这个原料配方里要不要」，还得额外处理「配方要但手头没有」的漏项，代码立刻变长。
- **缺失键用 `getOrDefault` 而不是 `get`**：`get` 返回 `null`，装箱拆箱立刻 `NullPointerException`——这是本题最常见的崩溃方式。
- **整数除法天然向下取整**，正好是「能做几个完整的」。如果先转 `double` 再 `Math.floor`，在数量很大时会踩浮点精度，属于自找麻烦。
- `Integer.MAX_VALUE` 的兜底值得写：配方为空的输入在真实调用里不常见，但「返回 2147483647 个蛋糕」这种输出会让人查半小时。
- 剪枝 `result == 0` 提前返回只是微优化，5 kyu 的数据量用不上；写它的理由是可读性——读到这行就知道「0 是不可逆的下界」。

## 📝 总结

1. 答案是**各原料可做份数的最小值**，取 min 就对了，不需要任何排序或聚合。
2. 遍历配方、`getOrDefault` 兜底缺失键，这两点是代码短不短的关键。
3. 用一个「哨兵值 + 事后判断」处理空配方，比在循环外单独写 `if` 更省一行。
