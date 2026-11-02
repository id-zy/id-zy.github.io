---
title: 数据流中的第 K 大元素
date: 2026-04-30
subject: 算法
category: 题目
number: "703"
difficulty: 简单
topics:
  - 堆
  - Top K
platform: LeetCode
tags:
  - 堆
  - Top K
summary: 数据流中的第 K 大元素（LeetCode 703 · 简单）：解题思路与 堆/Top K 方向的代码实现。
---

# 703.数据流中的第 K 大元素

## 🎯 问题描述

**描述**： 
设计一个找到数据流中第 `k` 大元素的类（class）。注意是排序后的第 `k` 大元素，而不是第 `k` 个不同的元素。

请实现 `KthLargest` 类：
- `KthLargest(int k, int[] nums)`：使用整数 `k` 和整数流 `nums` 初始化对象。
- `int add(int val)`：将 `val` 插入数据流 `nums` 后，返回当前数据流中第 `k` 大的元素。

**说明**： 
- 我们不需要保存所有的历史数据，只需要时刻保留当前最大的 `k` 个元素即可。
- 这 `k` 个元素中最小的那个（即堆顶），就是我们要找的第 `k` 大元素。

- **示例**： 

  - **示例 1**：
    ```text
    输入：
    ["KthLargest", "add", "add", "add", "add", "add"]
    [[3, [4, 5, 8, 2]], [3], [5], [10], [9], [4]]
    输出：[null, 4, 5, 5, 8, 8]
    解释：
    KthLargest kthLargest = new KthLargest(3, [4, 5, 8, 2]);
    kthLargest.add(3); // 返回 4
    kthLargest.add(5); // 返回 5
    kthLargest.add(10); // 返回 5
    kthLargest.add(9); // 返回 8
    kthLargest.add(4); // 返回 8
    ```

## 💻 解题思路

### 思路1：小顶堆（优先队列）

#### 代码实现
```python
import heapq
from typing import List

class KthLargest:
    def __init__(self, k: int, nums: List[int]):
        self.heap = []
        self.idx = k
        # 遍历初始数组，复用 add 的逻辑来入堆，防止初始 nums 为空或长度不足 k
        for num in nums:
            self.add(num)

    def add(self, val: int) -> int:
        heapq.heappush(self.heap, val)
        # 保持堆的大小不超过 k，淘汰掉较小的元素
        while len(self.heap) > self.idx:
            heapq.heappop(self.heap)
        # 堆顶即为当前第 k 大的元素
        return self.heap[0] if self.heap else -1
````

#### 📊 性能分析

- **时间复杂度**：初始化 $O(n \log k)$，每次 `add` 操作 $O(\log k)$。因为堆的大小始终保持在 $k$。
- **空间复杂度**：O(k)$。只需要维护一个大小为 $k 的堆。

#### 思考

这道题是经典的“Top K”问题在数据流场景下的应用。使用**小顶堆**是解决此类问题的最优解：

1. 堆中始终保留当前最大的 `k` 个元素。
2. 当新元素加入时，如果堆的大小超过 `k`，就弹出堆顶（即这 `k+1` 个元素中最小的那个）。
3. 这样，堆顶永远指向第 `k` 大的元素。
