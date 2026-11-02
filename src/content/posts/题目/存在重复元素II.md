---
title: 存在重复元素II
date: 2026-03-24
subject: 算法
category: 题目
number: "219"
difficulty: 简单
topics:
  - 哈希表
platform: LeetCode
tags:
  - 哈希表
summary: 在判重上加下标距离约束：哈希表存「值 → 最近一次下标」，再遇同值时先算 |i−last| <= k，成立即 true；无论成立与否都更新 last（更近的下标对后续更优）。O(n) 一遍，与 217 的区别就是那张 value→index 的表。
---

# 存在重复元素II

## 🎯 问题描述
**描述**：
给你一个整数数组 `nums` 和一个整数 `k` ，判断数组中是否存在两个 **不同的索引** `i` 和 `j` ，满足 `nums[i] == nums[j]` 且 `abs(i - j) <= k` 。如果存在，返回 `true` ；否则，返回 `false` 。
**说明**：
- `1 <= nums.length <= 105`
- `-109 <= nums[i] <= 109`
- `0 <= k <= 105`

**示例**：

- 示例 1：

```text
输入：nums = [1,2,3,1], k = 3
输出：true
```

- 示例 2：

```text
输入：nums = [1,2,3,1,2,3], k = 2
输出：false
```
## 💻 解题思路
### 思路1：哈希表
#### 代码实现
```python
class Solution:
    def containsNearbyDuplicate(self, nums: List[int], k: int) -> bool:
        result={}
        n=len(nums)
        for i in range(n):
            if nums[i] in result:
                x=abs(i-result[nums[i]])
                if x<=k:
                    return True
                result[nums[i]]=i
            else:
                result[nums[i]]=i
        return False
```
#### 📊 性能分析
##### 提交结果
- **运行时间**：27ms击败90.35%
- **内存消耗**：36.09MB击败26.59%
##### 复杂度验证
- 时间复杂度：$O(N)$
- 空间复杂度：$O(N)$
#### 思考
