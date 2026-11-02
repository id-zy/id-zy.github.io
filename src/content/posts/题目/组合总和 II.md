---
title: 组合总和 II
date: 2026-05-17
subject: 算法
category: 题目
number: "40"
difficulty: 中等
topics:
  - 回溯
  - 递归
  - DFS
  - 选或不选
platform: LeetCode
tags:
  - 回溯
  - 递归
  - DFS
  - 选或不选
summary: 组合总和 II（LeetCode 40 · 中等）：解题思路与 回溯/递归/DFS/选或不选 方向的代码实现。
---

# 40. 组合总和 II - Combination Sum II

## 🎯 问题描述
**描述**：  
给定一个数组 `candidates` 和一个目标数 `target`，找出 `candidates` 中所有可以使数字和为 `target` 的组合。  
`candidates` 中的每个数字在每个组合中只能使用一次。  
解集不能包含重复的组合。

**说明**：  
- 所有数字（包括目标数）都是正整数。
- 数组中可能包含重复数字。
- 组合中的数字可以按任意顺序排列，但解集中不能有重复组合。

**示例**：

- 示例 1：

```text
输入: candidates = [10,1,2,7,6,1,5], target = 8
输出: [[1,1,6],[1,2,5],[1,7],[2,6]]
```

- 示例 2：

```text
输入: candidates = [2,5,2,1,2], target = 5
输出: [[1,2,2],[5]]
```

## 💻 解题思路
### 思路：回溯法（DFS） + 排序剪枝 + 提前终止
#### 算法步骤
1. 将 `candidates` 排序，方便跳过重复元素以及提前剪枝。
2. 初始化结果列表 `ans`、当前路径列表 `path` 和数组长度 `n`。
3. 定义递归函数 `dfs(i, target)`，其中 `i` 表示当前考虑的下标，`target` 表示剩余需要凑的和：
   - 如果 `target == 0`，将 `path` 的副本加入 `ans` 并返回。
   - 如果 `target < 0` 或 `i >= n` 或 `candidates[i] > target`，返回（其中 `candidates[i] > target` 是剪枝，因为数组已排序，后续元素更大，无需继续）。
   - 否则，先尝试**选**当前数字：将 `candidates[i]` 加入 `path`，递归 `dfs(i+1, target - candidates[i])`，然后回溯弹出。
   - 然后**跳过所有与当前数字相同的元素**：`i += 1`，循环直到遇到不同数字，递归 `dfs(i, target)`。
4. 从 `dfs(0, target)` 开始搜索。
5. 返回 `ans`。

#### 代码实现
```python
from typing import List

class Solution:
    def combinationSum2(self, candidates: List[int], target: int) -> List[List[int]]:
        candidates.sort()
        ans = []
        path = []
        n = len(candidates)

        def dfs(i, target):
            if target == 0:
                ans.append(path[:])
                return
            if target < 0 or i >= n or candidates[i] > target:
                return
            num = candidates[i]
            path.append(num)
            dfs(i+1, target - num)
            path.pop()

            i += 1
            while i < n and candidates[i] == num:
                i += 1
            dfs(i, target)
        
        dfs(0, target)
        return ans
```

#### 📊 性能分析
- **时间复杂度**：$O(2^n)$，但通过排序、跳过重复和 `candidates[i] > target` 剪枝，实际运行远快于朴素回溯。
- **空间复杂度**：$O(n)$，递归栈深度和路径存储。

#### 思考
该解法在上一版基础上增加了 `candidates[i] > target` 剪枝条件，由于数组已排序，若当前数字已经大于剩余目标值，则后续所有数字都更大，不可能凑出结果，因此可以提前返回，避免不必要的递归。  
**优点**：
- 逻辑完整，正确处理了重复元素和元素只能用一次的限制。
- 剪枝充分，效率较高，是 LeetCode 40 的标准解法之一。
- 代码结构清晰，易于理解和复用。

**注意事项**：
- 递归中的“跳过重复”分支使用了 `while` 循环移动下标，注意此处的 `i` 是局部变量，不影响外层调用，因此正确。
- 终止条件 `target < 0` 实际上可以被 `candidates[i] > target` 部分覆盖，但保留也无妨。
