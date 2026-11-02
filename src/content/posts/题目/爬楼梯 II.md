---
title: 爬楼梯 II
date: 2026-05-21
subject: 算法
category: 题目
number: "3693"
difficulty: 中等
topics:
  - 递归
  - DFS
  - 动态规划
platform: LeetCode
tags:
  - 递归
  - DFS
  - 动态规划
summary: 爬楼梯 II（LeetCode 3693 · 中等）：解题思路与 递归/DFS/动态规划 方向的代码实现。
---

# 3693. 爬楼梯 II - Climbing Stairs II

## 🎯 问题描述
**描述**：  
你正在爬一个楼梯，需要 `n` 阶才能到达楼顶。但是这次的楼梯有点特别，你不仅要支付每级台阶的成本 `costs[i]`，而且每次移动的代价和步数的平方成正比（即步数的平方）。题目的核心是求出从第 0 级台阶到第 `n` 级台阶的最小总成本。

**说明**：  
- `costs` 数组的长度为 `n`，`costs[i-1]` 是第 `i` 级台阶的成本。
- 你一次可以向上爬 1、2 或 3 个台阶。
- 如果在一次移动中爬了 `k` 个台阶，除了到达的目标台阶成本外，还需要额外支付 `k²` 的步数成本。
- 起始点为第 0 级台阶，到达该点的初始成本为 `0`。

**示例**：

- 示例 1：

```text
输入: n = 3, costs = [1, 2, 3]
输出: 9
解释: 从0开始：
- 1步到1级：总成本 = 0 + 1² + costs[0] = 1 + 1 = 2
- 1步到1级，再从1到3（2步）：总成本 = 2 + 2² + costs[2] = 2 + 4 + 3 = 9
```

- 示例 2：

```text
输入: n = 5, costs = [5, 1, 6, 4, 2]
输出: 14
```

## 💻 解题思路
### 思路：动态规划 / 记忆化搜索（DFS + @cache）
#### 算法步骤
1. 定义递归函数 `dp(i)` 表示从起点到达第 `i` 级台阶所需的最小总成本。
2. 递归基：`dp(0) = 0`，起点成本为 0。
3. 对于 `i >= 1`，考虑最后一步是从 `i-1`、`i-2` 或 `i-3` 级台阶跳过来的（如果这些台阶存在），状态转移方程是：
   ```text
   dp(i) = min(
       dp(i-1) + 1² + costs[i-1],
       dp(i-2) + 2² + costs[i-1],
       dp(i-3) + 3² + costs[i-1]
   )
   ```
   其中 `costs[i-1]` 是第 `i` 级台阶的成本。
4. 使用 `@cache` 装饰器进行记忆化，避免重复计算。
5. 最终返回 `dp(n)`，即到达第 `n` 级的最小总成本。

#### 代码实现
```python
from functools import cache
from typing import List

class Solution:
    def climbStairs(self, n: int, costs: List[int]) -> int:
        # costs[i-1] 是第 i 级台阶的成本
        @cache
        def dp(i: int) -> int:
            if i == 0:
                return 0
            # 枚举最后一次跳跃的步数
            best = float('inf')
            # j 表示最后一次跳跃是从第 i-1, i-2, i-3 级台阶来的
            for j in range(1, 4):
                if i - j >= 0:
                    step_cost = j * j
                    total = dp(i - j) + step_cost + costs[i - 1]
                    if total < best:
                        best = total
            return best
        return dp(n)
```

#### 📊 性能分析
- 时间复杂度：$O(n)$，因为每个状态 `dp(i)` 最多计算一次。
- 空间复杂度：$O(n)$，递归栈深度为 $n$，加上缓存存储 $n+1$ 个状态。

#### 思考
这是一个标准的一维动态规划问题，核心在于准确理解“步数平方成本”和“台阶成本”这两个独立的成本项。代码中的记忆化搜索非常直观，但也可以转化为迭代DP，将空间优化到 $O(1)$，适用于 `n` 很大的情况。你的解法逻辑清晰，是这道题的标准写法。
