---
title: 执行 K 次操作后的最大分数
date: 2026-04-30
subject: 算法
category: 题目
number: "2530"
difficulty: 中等
topics:
  - 堆
  - 优先队列
  - 贪心
platform: LeetCode
tags:
  - 堆
  - 优先队列
  - 贪心
summary: 执行 K 次操作后的最大分数（LeetCode 2530 · 中等）：解题思路与 堆/优先队列/贪心 方向的代码实现。
---

# 执行 K 次操作后的最大分数

## 🎯 问题描述

**描述**： 
给你一个下标从 0 开始的整数数组 `nums` 和一个整数 `k`。你的起始分数为 0。
在一步操作中：
1. 选出一个满足 `0 <= i < nums.length` 的下标 `i`。
2. 将你的分数增加 `nums[i]`。
3. 将 `nums[i]` 替换为 `ceil(nums[i] / 3)`。

返回在**恰好**执行 `k` 次操作后，你可能获得的最大分数。

**说明**： 
- 向上取整函数 `ceil(val)` 的结果是大于或等于 `val` 的最小整数。
- 为了获得最大分数，我们每次都应该贪心地选择当前数组中最大的那个元素。

- **示例**： 

  - **示例 1**：
    ```text
    输入：nums = [10,10,10,10,10], k = 5
    输出：50
    解释：对数组中每个元素执行一次操作。最后分数是 10 + 10 + 10 + 10 + 10 = 50。
    ```
  - **示例 2**：
    ```text
    输入：nums = [1,10,3,3,3], k = 3
    输出：17
    解释：
    第1步：选中10，分数增加10，数组变为 [1, 4, 3, 3, 3]。
    第2步：选中4，分数增加4，数组变为 [1, 2, 3, 3, 3]。
    第3步：选中3，分数增加3，数组变为 [1, 2, 1, 3, 3]。
    总分 = 10 + 4 + 3 = 17。
    ```

## 💻 解题思路

### 思路1：贪心 + 最大堆（Python 取反模拟）

#### 代码实现
```python
import heapq
import math
from typing import List

class Solution:

    def maxKelements(self, nums: List[int], k: int) -> int:
        ans = 0
        heapq.heapify_max(nums)
        while k:
            maxnum=heapq.heappop_max(nums)
            ans += maxnum
            heapq.heappush_max(nums,math.ceil(maxnum / 3))
            k -= 1
        return ans
````

#### 📊 性能分析
- **时间复杂度**：$O(n + k \log n)$。建堆需要 $O(n)$，每次弹出和推入堆的操作需要 $O(\log n)$，共执行 $k$ 次。
- **空间复杂度**：$O(1)$（如果不计算输入数组的修改）或 $O(n)$（取决于堆的实现方式）。

#### 思考

这道题的核心在于**贪心策略**：每次操作都选择当前最大的数，才能保证总分最大。由于每次操作后数字会变小并重新参与下一轮比较，使用堆（优先队列）来动态维护最大值是最高效的方法。在 Python 中，记得利用负数技巧来使用内置的最小堆。
