---
title: 子数组最大平均数I
date: 2026-03-17
subject: 算法
category: 题目
number: "643"
difficulty: 简单
topics:
  - 数组滑动窗口
  - 固定长度滑动窗口
platform: LeetCode
tags:
  - 数组滑动窗口
  - 固定长度滑动窗口
summary: 定长滑动窗口的最小模板：窗口和 waa 增量更新，窗口满 k 时先更新最大和再移出最左元素，最后除以 k。O(n) 时间 O(1) 空间，是「定长窗口求最大均值/和」系列（元音数目、阈值子数组）的第一题。
---

# 子数组最大平均数I

## 🎯 问题描述
**描述**：
给你一个由 `n` 个元素组成的整数数组 `nums` 和一个整数 `k` 。
请你找出平均数最大且 **长度为 `k`** 的连续子数组，并输出该最大平均数。
任何误差小于 `10-5` 的答案都将被视为正确答案。
**说明**：
- `n == nums.length`
- `1 <= k <= n <= 105`
- `-104 <= nums[i] <= 104`

**示例**：

- 示例 1：

```text
输入：nums = [1,12,-5,-6,50,3], k = 4
输出：12.75
解释：最大平均数 (12-5-6+50)/4 = 51/4 = 12.75
```

- 示例 2：

```text
输入：nums = [5], k = 1
输出：5.00000
```
## 💻 解题思路
### 思路1：固定长度滑动窗口
#### 代码实现
```python
class Solution:
    def findMaxAverage(self, nums: List[int], k: int) -> float:
        left,right=0,0
        max_waa=float('-inf')
        waa=0
        while right < len(nums):
            waa+=nums[right]
            if right-left+1>=k:
                if waa>max_waa:
                    max_waa=waa
                waa-=nums[left]
                left+=1
            right+=1
        return max_waa/k
```
#### 📊 性能分析
##### 提交结果
- **运行时间**：111ms击败33.40%
- **内存消耗**：28.84MB击败27.58%
##### 复杂度验证
- 时间复杂度：$O(N)$
- 空间复杂度：$O(1)$
#### 思考
