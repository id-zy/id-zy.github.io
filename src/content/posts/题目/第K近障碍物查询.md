---
title: 第K近障碍物查询
date: 2026-05-01
subject: 算法
category: 题目
number: "3275"
difficulty: 中等
topics:
  - Top K
  - 堆
platform: LeetCode
tags:
  - Top K
  - 堆
summary: 第K近障碍物查询（LeetCode 3275 · 中等）：解题思路与 Top K/堆 方向的代码实现。
---

# 3275.第K近障碍物查询

## 🎯 问题描述

有一个无限大的二维平面。
给你一个正整数 `k` ，同时给你一个二维数组 `queries` ，包含一系列查询：
- `queries[i] = [x, y]` ：在平面上坐标 `(x, y)` 处建一个障碍物，数据保证之前的查询 **不会** 在这个坐标处建立任何障碍物。
每次查询后，你需要找到离原点第 `k` **近** 障碍物到原点的 **距离** 。
请你返回一个整数数组 `results` ，其中 `results[i]` 表示建立第 `i` 个障碍物以后，离原地第 `k` 近障碍物距离原点的距离。如果少于 `k` 个障碍物，`results[i] == -1` 。
**注意**，一开始 **没有** 任何障碍物。
坐标在 `(x, y)` 处的点距离原点的距离定义为 `|x| + |y|` 
- **示例**： 

  - **示例 1**：
    ```text
    输入：queries = [[1,2],[3,4],[2,3],[-3,0]], k = 2
    输出：[-1,7,5,3]
    解释：
    - 第0次查询：距离为 3，不足2个点，返回 -1。
    - 第1次查询：距离为 3, 7。第2小的距离是 7，返回 7。
    - 第2次查询：距离为 3, 7, 5。第2小的距离是 5，返回 5。
    - 第3次查询：距离为 3, 7, 5, 3。第2小的距离是 3，返回 3。
    ```

## 💻 解题思路

### 思路1：最大堆

#### 代码实现
```python
import heapq
from typing import List
class Solution:
    def resultsArray(self, queries: List[List[int]], k: int) -> List[int]:
        result = [-1]*len(queries)
        location = []
        for i, (x, y) in enumerate(queries):
            d = abs(x)+abs(y)
            heapq.heappush_max(location,d)
            if len(location) > k:
                heappop_max(location)
            if len(location) == k:
                result[i] = location[0]
        return result

```

#### 📊 性能分析

- **时间复杂度**：$O(n \log k)$。遍历 `n` 个查询，每次堆操作（插入和弹出）的时间复杂度为 $O(\log k)$，因为堆的大小始终保持在 `k`。
- **空间复杂度**：$O(k)$。只需要维护一个大小为 `k` 的堆。

#### 思考

这道题是经典的“Top K”问题在数据流场景下的应用。使用**最大堆**是解决此类问题的最优解：

1. 堆中始终保留当前最小的 `k` 个距离。
2. 当新距离加入时，如果堆的大小超过 `k`，就弹出堆顶（即这 `k+1` 个距离中最大的那个）。
3. 这样，堆顶永远指向第 `k` 小的距离。
