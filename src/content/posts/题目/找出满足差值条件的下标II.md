---
title: 找出满足差值条件的下标II
date: 2026-04-16
subject: 算法
category: 题目
number: "2905"
difficulty: 中等
topics:
  - 枚举算法
  - 枚举右，维护左
  - 可变长度滑动窗口
  - 滑动窗口
  - 贪心
platform: LeetCode
tags:
  - 枚举算法
  - 枚举右，维护左
  - 可变长度滑动窗口
  - 滑动窗口
summary: 找出满足差值条件的下标II（LeetCode 2905 · 中等）：解题思路与 枚举算法/枚举右，维护左/可变长度滑动窗口/滑动窗口/贪心 方向的代码实现。
---

# 2905. 找出满足差值条件的下标II

## 🎯 问题描述

**描述**：
给你一个下标从 0 开始的整数数组 `nums`，另给你两个整数 `indexDifference` 和 `valueDifference`。
你的任务是找出两个下标 `i` 和 `j`，使得满足以下条件：
1.  `|i - j| >= indexDifference`
2.  `|nums[i] - nums[j]| >= valueDifference`

如果存在多个满足条件的下标对，返回任意一个即可。如果不存在这样的下标对，返回 `[-1, -1]`。

**说明**：
-   这是一个**数组遍历**结合**动态维护极值**的问题。
-   **核心策略**：我们不需要双重循环去枚举所有 `(i, j)` 对。
-   我们可以固定右边的下标 `j`，然后在左边合法的范围内（即 `i <= j - indexDifference`）寻找最优的 `i`。
-   为了使差值 `|nums[i] - nums[j]|` 最大，`i` 对应的值应该是左边范围内的**最大值**或**最小值**。

- **示例**：
- **示例 1**：
```text
输入：nums = [5,1,4,1], indexDifference = 2, valueDifference = 4
输出：[0,3]
解释：
- j=2 时，i 可以是 0。
  - 范围 [0, 0] 内的最大/最小值下标都是 0 (值为5)。
  - |5-4|=1 < 4。
- j=3 时，i 可以是 0, 1。
  - 范围 [0, 1] 内：
    - 最小值是 1 (下标1)。|1-1|=0。
    - 最大值是 5 (下标0)。|5-1|=4 >= 4。
  - 满足条件，返回 [0,3]。
```

## 💻 解题思路

### 思路1：单向遍历 + 动态维护极值

#### 核心逻辑
1.  **遍历右端点 `j`**：
    -   我们从 `j = indexDifference` 开始遍历，因为 `i` 最小为 0，所以 `j` 至少要是 `indexDifference` 才能满足距离条件。
2.  **维护左端点 `i` 的极值**：
    -   对于当前的 `j`，合法的 `i` 的范围是 `[0, j - indexDifference]`。
    -   我们不需要每次都重新扫描这个范围。我们可以随着 `j` 的增加，动态地将新的候选 `i`（即 `j - indexDifference`）加入到极值比较中。
    -   维护两个变量：`min_idx`（最小值的下标）和 `max_idx`（最大值的下标）。
3.  **判断条件**：
    -   一旦我们有了当前合法范围内的最大值和最小值，我们只需要检查它们与 `nums[j]` 的差值。
    -   如果 `nums[j] - nums[min_idx] >= valueDifference`，说明找到了（小减大）。
    -   如果 `nums[max_idx] - nums[j] >= valueDifference`，说明找到了（大减小）。
    -   注意：题目要求绝对值差，所以这两种情况涵盖了所有可能。

#### 代码实现

```python
class Solution:
    def findIndices(self, nums: List[int], indexDifference: int, valueDifference: int) -> List[int]:
        # 初始化最小值和最大值的下标为 0
        min_idx = max_idx = 0
        
        # 从 j = indexDifference 开始遍历
        # 因为 i 最小为 0，要满足 |i-j| >= indexDifference，j 至少为 indexDifference
        for j in range(indexDifference, len(nums)):
            # 当前新加入合法范围的左端点下标
            # 当 j 增加 1，合法的 i 范围右边界也增加 1
            i = j - indexDifference
            
            # 1. 更新左侧范围内的最小值和最大值下标
            if nums[i] < nums[min_idx]:
                min_idx = i
            elif nums[i] > nums[max_idx]:
                max_idx = i
            
            # 2. 检查当前 j 与左侧极值的差值
            # 情况 A: nums[j] 比最小值大很多
            if nums[j] - nums[min_idx] >= valueDifference:
                return [min_idx, j]
            
            # 情况 B: 最大值比 nums[j] 大很多
            elif nums[max_idx] - nums[j] >= valueDifference:
                return [j, max_idx]
                
        return [-1, -1]
```

#### 📊 性能分析

-   **时间复杂度**：$O(N)$
    -   其中 $N$ 是 `nums` 的长度。
    -   只需要遍历数组一次。
    -   每次循环内的比较和赋值操作都是 $O(1)$。
-   **空间复杂度**：$O(1)$
    -   只使用了常数个变量 (`min_idx`, `max_idx`, `i`, `j`)。

#### 思考

1.  **为什么只需要维护一个 `min_idx` 和 `max_idx`？**
    -   因为随着 `j` 向右移动，合法的 `i` 的范围是单调扩大的（从 `[0, 0]` 到 `[0, 1]`, `[0, 2]`...）。
    -   我们只需要把新进入范围的 `nums[i]` 与当前的全局最值比较即可。
    -   之前的最值依然有效，因为它们还在合法范围内。

2.  **绝对值的处理**：
    -   题目要求 `|nums[i] - nums[j]| >= valueDifference`。
    -   这等价于 `nums[i] - nums[j] >= valueDifference` 或者 `nums[j] - nums[i] >= valueDifference`。
    -   为了让差值最大，`nums[i]` 应该取最大值或最小值。
    -   所以只需要检查 `nums[max_idx] - nums[j]` 和 `nums[j] - nums[min_idx]` 这两种情况。

3.  **`elif` 的使用**：
    -   在更新极值时，代码使用了 `elif`。
    -   这是安全的，因为一个数不可能同时小于最小值且大于最大值。

4.  **边界情况**：
    -   `indexDifference = 0`：`j` 从 0 开始，`i` 可以是 `j`。此时 `i` 和 `j` 可以重合。
    -   没有满足条件的对：循环结束后返回 `[-1, -1]`。
    -   数组长度为 1：如果 `indexDifference > 0`，循环不会执行，返回 `[-1, -1]`。

5.  **贪心策略**：
    -   我们一旦找到满足条件的对就立即返回。
    -   题目只要求返回任意一个，所以不需要继续查找。
