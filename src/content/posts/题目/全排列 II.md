---
title: 全排列 II
date: 2026-05-17
subject: 算法
category: 题目
number: "47"
difficulty: 中等
topics:
  - 递归
  - DFS
  - 回溯
  - 枚举算法
platform: LeetCode
tags:
  - 递归
  - DFS
  - 回溯
  - 枚举算法
summary: 含重复元素的全排列模板：回溯时每层新建一个 used 集合，同层内相同数值只允许尝试一次，即可去重且无需先排序。path 预分配长度 n、按下标赋值，省去频繁 append/pop。与排序剪枝法相比每层多一个集合但代码更直观，O(n·n!)。
---

# 47. 全排列 II - Permutations II

## 🎯 问题描述
**描述**：  
给定一个可包含重复数字的序列 `nums`，按任意顺序返回所有不重复的全排列。

**说明**：  
- 序列中可能包含重复数字。
- 结果中不能有重复的排列。

**示例**：

- 示例 1：

```text
输入: nums = [1,1,2]
输出: [[1,1,2],[1,2,1],[2,1,1]]
```

- 示例 2：

```text
输入: nums = [1,2,3]
输出: [[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]]
```

## 💻 解题思路
### 思路：回溯法（DFS） + 同一层去重
#### 算法步骤
1. 获取数组长度 `n`，初始化结果列表 `ans`、路径列表 `path`（长度为 `n`，预先分配空间）和 `selected` 布尔数组（标记元素是否已被使用）。
2. 定义递归函数 `dfs(i)`，表示当前正在填充第 `i` 个位置（0‑indexed）：
   - 如果 `i == n`，说明已填满所有位置，将 `path` 的副本加入 `ans` 并返回。
   - 否则，使用一个集合 `used` 记录在当前递归层已经尝试过的元素值（用于去重）。
   - 遍历每个下标 `j`：
     - 如果 `nums[j]` 已经在 `used` 中，跳过（避免同一层重复使用相同数值）。
     - 如果 `selected[j]` 为 `False`（该元素未被使用），则：
       - 将 `nums[j]` 加入 `used`。
       - 将 `path[i]` 设为 `nums[j]`。
       - 标记 `selected[j] = True`。
       - 递归 `dfs(i+1)`。
       - 回溯：`selected[j] = False`。
3. 从 `dfs(0)` 开始搜索。
4. 返回 `ans`。

#### 代码实现
```python
from typing import List

class Solution:
    def permuteUnique(self, nums: List[int]) -> List[List[int]]:
        ans = []
        n = len(nums)
        path = [0] * n
        selected = [False] * n

        def dfs(i):
            if i == n:
                ans.append(path[:])
                return
            used = set()
            for j, select in enumerate(selected):
                if nums[j] in used:
                    continue
                if not select:
                    used.add(nums[j])
                    path[i] = nums[j]
                    selected[j] = True
                    dfs(i+1)
                    selected[j] = False

        dfs(0)
        return ans
```

#### 📊 性能分析
- **时间复杂度**：$O(n \times n!)$，共有 $n!$ 个排列，每个排列需要 $O(n)$ 时间复制到结果。实际由于去重，会略少于 $n!$。
- **空间复杂度**：$O(n)$，递归栈深度为 $n$，加上标记数组和路径存储。

#### 思考
该解法是生成不重复全排列的标准回溯模板。相比全排列 I，这里增加了同一层的 `used` 集合来避免重复数值在同一位置被多次尝试，从而去除重复排列。  
**优点**：
- 逻辑清晰，去重高效，不需要先排序再剪枝（尽管排序后也可用 `if j > 0 and nums[j] == nums[j-1] and not selected[j-1]` 等方式）。
- 利用 `path` 的预分配和索引赋值，避免了频繁的列表追加和弹出，性能较好。

**注意事项**：
- 必须保证在进入递归前，`used` 集合只用于当前递归层，每个递归层独立，因此每次调用 `dfs` 都会新建一个空集合。
- 该方法依赖于原始数组 `nums` 的顺序，但由于 `used` 去重，即使相同数值出现在不同下标，也只会被选取一次，因此正确。
- 与排序剪枝的方法相比，此方法空间稍高（每层创建 `used` 集合），但代码更直观。
