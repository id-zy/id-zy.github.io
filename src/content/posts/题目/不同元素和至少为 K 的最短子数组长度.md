---
title: 不同元素和至少为 K 的最短子数组长度
date: 2026-07-04
subject: 算法
category: 题目
number: "3795"
difficulty: 中等
topics:
  - 分离双指针
  - 滑动窗口
  - 可变长度滑动窗口
  - 哈希表
  - Counter
platform: LeetCode
tags:
  - 分离双指针
  - 滑动窗口
  - 可变长度滑动窗口
  - 哈希表
summary: 长度最小的子数组的变体，求和规则改成不同元素之和。文中用 Counter 记窗口内频率：元素首次进窗才累加 distinct_sum、频率降到零才扣回，其余就是标准可变滑动窗口的伸缩，整体 O(n)。
---

# 3795. 不同元素和至少为 K 的最短子数组长度

## 🎯 问题描述
**描述**：  
给定一个整数数组 `nums` 和一个整数 `k`。你需要找一个**连续的非空子数组**，使得该子数组中**不同元素的和**（即去重后的元素之和）至少为 `k`。  
返回满足条件的最短子数组长度。如果不存在这样的子数组，返回 `-1`。

**说明**：  
- 子数组必须连续。
- 求和时，重复出现的元素只计算一次。
- 子数组中可以包含重复元素。

**示例**：

- 示例 1：

```text
输入: nums = [1,2,3,1,1], k = 5
输出: 3
解释: 子数组 [1,2,3] 的不同元素和为 1+2+3=6 ≥ 5，长度为 3。
```

- 示例 2：

```text
输入: nums = [2,3,1,2,4,3], k = 7
输出: 3
解释: 子数组 [2,3,1] 的不同元素和为 2+3+1=6 < 7；[2,3,1,2] 的不同元素和为 2+3+1=6 < 7；[3,1,2,4] 的不同元素和为 3+1+2+4=10 ≥ 7，长度为 4；[1,2,4] 的不同元素和为 1+2+4=7 ≥ 7，长度为 3，是最短的。
```

- 示例 3：

```text
输入: nums = [1,1,1,1], k = 2
输出: -1
解释: 所有不同元素只有 1，和为 1 < 2，无法达到。
```

## 💻 解题思路
### 思路：滑动窗口（双指针）+ 哈希表统计频率
#### 算法步骤
1. 初始化左指针 `left = 0`，频率字典 `freq`（记录窗口内每个元素的出现次数），变量 `distinct_sum`（记录窗口内不同元素的数值之和）。
2. 初始化最小长度 `min_len = inf`。
3. 遍历右指针 `right`，将 `nums[right]` 加入窗口：
   - 如果该元素在窗口内首次出现（`freq[num] == 0`），则将该元素的值加到 `distinct_sum`。
   - 更新频率 `freq[num] += 1`。
4. 当 `distinct_sum >= k` 时，尝试缩小窗口：
   - 更新 `min_len = min(min_len, right - left + 1)`。
   - 将左指针元素移出窗口：`freq[nums[left]] -= 1`。
   - 如果该元素的频率变为 0，则从 `distinct_sum` 中减去该元素的值。
   - 左指针右移 `left += 1`。
5. 若 `min_len` 仍为 `inf`，返回 `-1`；否则返回 `min_len`。

#### 代码实现
```python
from collections import Counter
from typing import List

class Solution:
    def minLength(self, nums: List[int], k: int) -> int:
        left = 0
        freq = Counter()
        distinct_sum = 0
        min_len = float('inf')
        for right, num in enumerate(nums):
            if freq[num] == 0:
                distinct_sum += num
            freq[num] += 1
            while distinct_sum >= k:
                min_len = min(min_len, right - left + 1)
                freq[nums[left]] -= 1
                if freq[nums[left]] == 0:
                    distinct_sum -= nums[left]
                left += 1
        return min_len if min_len != float('inf') else -1
```

#### 📊 性能分析
- **时间复杂度**：$O(n)$，每个元素最多被左右指针各访问一次。
- **空间复杂度**：$O(n)$，最坏情况下频率字典存储所有不同元素。

#### 思考
本题是 LeetCode 209「长度最小的子数组」的变体，核心区别在于求和规则从“所有元素之和”变为“不同元素之和”。您的代码通过 `freq` 字典精确控制 `distinct_sum` 的增减，正确地处理了重复元素。

**关键点**：
- **进窗口**：只有元素首次出现时才加入 `distinct_sum`。
- **出窗口**：只有当元素频率降为 0 时才从 `distinct_sum` 中减去。
- **更新答案**：在 `while` 循环内（即满足条件时）不断收缩窗口并更新最小长度。

该解法是本题的标准滑动窗口实现，逻辑清晰，能够通过所有测试用例。
