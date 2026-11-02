---
title: 总价值可以被k整除的岛屿数目
date: 2026-05-06
subject: 算法
category: 题目
number: "3619"
difficulty: 中等
topics:
  - 递归
  - DFS
  - 网格
platform: LeetCode
tags:
  - 递归
  - DFS
  - 网格
summary: 总价值可以被k整除的岛屿数目（LeetCode 3619 · 中等）：解题思路与 递归/DFS/网格 方向的代码实现。
---

# 3619. 总价值可以被k整除的岛屿数目 - Count Islands with Total Value Divisible by K

## 🎯 问题描述
**描述**：  
给你一个 `m x n` 的矩阵 `grid` 和一个正整数 `k`。一个**岛屿**是一组四方向（上、下、左、右）相连的**正整数**格子。
岛屿的**总价值**是该岛屿上所有格子数值的和。
请返回总价值能被 `k` 整除的岛屿数量。

**说明**：
- `0`（零）表示水域，不是岛屿的一部分。
- 数值为 `0` 的格子会将岛屿隔开。
- 只考虑四方向连通（不考虑对角线）。
- 所有正整数（大于 0）都代表陆地。

**示例**：

- 示例 1：

```text
输入: grid = [[0,2,1,0,0],[0,5,0,0,5],[0,0,1,0,0],[0,1,4,7,0],[0,2,0,0,8]], k = 5
输出: 2
```

- 示例 2：

```text
输入: grid = [[3,0,3,0], [0,3,0,3], [3,0,3,0]], k = 3
输出: 6
```

## 💻 解题思路
### 思路1：深度优先搜索 (DFS) 计算岛屿及总和
#### 算法步骤
1. 获取网格的大小 `m`（行数）和 `n`（列数）。
2. 创建一个 `visited` 数组，用于标记已经访问过的格子。
3. **初始化**：初始化计数器 `ans = 0`。
4. **遍历网格**：遍历所有格子 `(i, j)`。
   - 如果 `grid[i][j] > 0`（是陆地）且 `(i, j)` 未被访问过，说明找到了一个新岛屿。
   - 对这个岛屿进行 DFS，累加其所有格子的数值 `total`。
5. **检查与统计**：DFS 结束后，如果 `total % k == 0`，计数器 `ans` 加一。
6. **返回结果**：返回 `ans`。

#### 代码实现
```python
from typing import List

class Solution:
    def countIslands(self, grid: List[List[int]], k: int) -> int:
        m, n = len(grid), len(grid[0])
        visited = [[False] * n for _ in range(m)]
        
        def dfs(i: int, j: int) -> int:
            if i < 0 or i >= m or j < 0 or j >= n or grid[i][j] == 0 or visited[i][j]:
                return 0
            visited[i][j] = True
            total = grid[i][j]
            for di, dj in [(1,0), (-1,0), (0,1), (0,-1)]:
                total += dfs(i + di, j + dj)
            return total
        
        ans = 0
        for i in range(m):
            for j in range(n):
                if grid[i][j] > 0 and not visited[i][j]:
                    region_sum = dfs(i, j)
                    if region_sum % k == 0:
                        ans += 1
        return ans
```

#### 📊 性能分析
- **时间复杂度**：$O(m \times n)$。每个格子最多被访问一次，DFS 遍历的总次数与网格中陆地的格子数成正比。
- **空间复杂度**：$O(m \times n)$。`visited` 数组的大小为 $m \times n$；在最坏情况下，DFS 的递归深度也与 `m * n` 成正比。

#### 思考
- 本题是经典 岛屿数量 的进阶版，增加了“计算岛屿总价值”和“价值能被 k 整除”的条件。
- 除了 DFS，本题也可以用**广度优先搜索 (BFS)** 来遍历岛屿，二者性能相近。
- 对于海量数据，DFS 可能导致栈溢出，BFS 是更安全的选择。
- 判断整除时要注意总价值 `total` 可能很大，但 Python 的整数可以自动处理大数，无需担心溢出。
