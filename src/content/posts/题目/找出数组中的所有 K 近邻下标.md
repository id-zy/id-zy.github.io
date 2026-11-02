---
title: 找出数组中的所有 K 近邻下标
date: 2026-07-10
subject: 算法
category: 题目
number: "2200"
difficulty: 简单
topics:
  - 数组双指针
  - 快慢指针
platform: LeetCode
tags:
  - 数组双指针
  - 快慢指针
summary: 找出数组中的所有 K 近邻下标（LeetCode 2200 · 简单）：解题思路与 数组双指针/快慢指针 方向的代码实现。
---

# 2200. 找出数组中的所有 K 近邻下标

## 🎯 问题描述
**描述**：  
给你一个下标从 **0** 开始的整数数组 `nums` 和两个整数 `key` 和 `k`。  
**K 近邻下标** 定义为 `nums` 中某个下标 `i`，满足至少存在一个下标 `j` 使得 `|i - j| <= k` 且 `nums[j] == key`。  
以列表形式返回所有 K 近邻下标，按 **递增顺序** 排序。

**说明**：  
- 一个下标可能对应多个 `key` 位置，但只计入一次。

**示例**：

- 示例 1：

```text
输入: nums = [3,4,9,1,3,3], key = 3, k = 2
输出: [0,1,2,3,4,5]
解释: key 出现在下标 0、4、5，扩展区间 [0,2]、[2,6]、[3,7]，覆盖 [0,5]。
```

- 示例 2：

```text
输入: nums = [1,2,3,4,5], key = 2, k = 1
输出: [0,1,2]
解释: key 在索引 1，区间 [0,2]，因此 0、1、2 都是近邻。
```

## 💻 解题思路
### 思路：快慢指针扫描（一次遍历，线性时间）
- **快指针 `fast`**：遍历数组，寻找值为 `key` 的位置。
- **慢指针 `slow`**：始终指向下一个尚未被检查的下标，初始为 0。  
  当 `fast` 指向 `key` 时，从 `slow` 和 `fast - k` 的较大值开始，依次检查所有满足 `|slow - fast| <= k` 的下标，并将它们加入结果列表，同时 `slow` 递增。  
  由于 `slow` 永不回退，且只向前移动，每个下标最多被访问一次，保证了线性时间复杂度。

#### 算法步骤
1. 初始化 `slow = 0`，结果列表 `ans = []`，数组长度 `l`。
2. 遍历 `fast` 从 0 到 `l-1`：
   - 若 `nums[fast] == key`：
     - 将 `slow` 更新为 `max(slow, fast - k)`，确保不会遗漏之前未扫描的下标。
     - 当 `slow <= fast + k` 且 `slow < l` 时：
       - 由于已经保证 `slow >= fast - k`，此时一定有 `abs(slow - fast) <= k`，直接将 `slow` 加入 `ans`。
       - `slow += 1`。
   - 继续下一个 `fast`。
3. 返回 `ans`（已自动升序且无重复）。

#### 代码实现（您的优化代码）
```python
from typing import List

class Solution:
    def findKDistantIndices(self, nums: List[int], key: int, k: int) -> List[int]:
        slow = 0
        ans = []
        l = len(nums)
        for fast, num in enumerate(nums):
            slow = max(slow, fast - k)
            while num == key and slow <= fast + k and slow < l:
                ans.append(slow)
                slow += 1
        return ans
```

#### 📊 性能分析
- 时间复杂度：$O(n)$，每个下标最多被 `slow` 访问一次，外层循环 $O(n)$。
- 空间复杂度：$O(n)$，用于存储结果列表。

#### 思考
相比最初的版本，你通过**维护 `slow` 指针不重置**，并利用 `max(slow, fast - k)` 跳过已经处理过的下标，将算法从可能的 $O(n^2)$ 优化为严格的 $O(n)$。同时，由于 `slow` 递增，结果自动保持升序，无需额外排序或去重。这是本题非常优雅的线性解法。

**关键点**：
- 只有当 `nums[fast] == key` 时才触发添加，但 `slow` 的推进不受 `key` 位置影响，确保覆盖所有可能的下标。
- 由于 `slow` 始终指向下一个可能合法的下标，每个下标只被考虑一次，不会重复。
