---
title: 删除有序数组中的重复项 II
date: 2026-03-16
subject: 算法
category: 题目
number: "80"
difficulty: 中等
topics:
  - 快慢指针
  - 数组双指针
platform: LeetCode
tags:
  - 快慢指针
  - 数组双指针
summary: 快慢指针保留两次版：与保留一次的区别只在判断对象——nums[slow-2] != nums[fast] 时才写入，天然允许每个值最多出现两次。前三元素直接保留（长度小于 3 直接返回）。O(n) 时间 O(1) 空间，是原地去重通用「保留 k 次」模板的 k=2 特例。
---

# 删除有序数组中的重复项 II

## 🎯 问题描述
**描述**：
给你一个有序数组 `nums` ，请你 **[原地](http://baike.baidu.com/item/%E5%8E%9F%E5%9C%B0%E7%AE%97%E6%B3%95)** 删除重复出现的元素，使得出现次数超过两次的元素**只出现两次** ，返回删除后数组的新长度。
不要使用额外的数组空间，你必须在 **[原地](https://baike.baidu.com/item/%E5%8E%9F%E5%9C%B0%E7%AE%97%E6%B3%95) 修改输入数组** 并在使用 O(1) 额外空间的条件下完成。
**说明**：
- `1 <= nums.length <= 3 * 104`
- `-104 <= nums[i] <= 104`
- `nums` 已按升序排列
**示例**：

- 示例 1：

```text
**输入：**nums = [1,1,1,2,2,3]
**输出：**5, nums = [1,1,2,2,3]
**解释：**函数应返回新长度 length = **`5`**, 并且原数组的前五个元素被修改为 **`1, 1, 2, 2, 3`**。 不需要考虑数组中超出新长度后面的元素。
```

- 示例 2：

```text
**输入：**nums = [0,0,1,1,1,1,2,3,3]
**输出：**7, nums = [0,0,1,1,2,3,3]
**解释：**函数应返回新长度 length = **`7`**, 并且原数组的前七个元素被修改为 **`0, 0, 1, 1, 2, 3, 3`**。不需要考虑数组中超出新长度后面的元素。
```
## 💻 解题思路
### 思路1：
#### 代码实现
```python
class Solution:
    def removeDuplicates(self, nums: List[int]) -> int:
        if len(nums)<3:
            return len(nums)
        slow,fast=2,2
        while fast<len(nums):
            if nums[slow-2]!=nums[fast]:
                nums[slow]=nums[fast]
                slow+=1
            fast+=1
        return slow
```
#### 📊 性能分析
##### 提交结果
- **运行时间**：97ms击败45.35%
- **内存消耗**：21.70MB击败53.56%
##### 复杂度验证
- 时间复杂度：$O(N)$
- 空间复杂度：$O(1)$
#### 思考
