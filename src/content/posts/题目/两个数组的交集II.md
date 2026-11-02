---
title: 两个数组的交集II
date: 2026-03-24
subject: 算法
category: 题目
number: "350"
difficulty: 简单
topics:
  - 字典
  - 栈
platform: LeetCode
tags:
  - 字典
  - 栈
summary: 交集要保留重复次数：第一个数组用字典计数，第二个数组命中且计数未耗尽才收进结果并减一，保证每个元素出现次数取两边的较小值。文中顺带留了三个进阶思考：已排序怎么优化、两数组大小悬殊谁做哈希、内存装不下怎么办。
---

# 两个数组的交集II

## 🎯 问题描述
**描述**：
给你两个整数数组 `nums1` 和 `nums2` ，请你以数组形式返回两数组的交集。返回结果中每个元素出现的次数，应与元素在两个数组中都出现的次数一致（如果出现次数不一致，则考虑取较小值）。可以不考虑输出结果的顺序。
**说明**：
- `1 <= nums1.length, nums2.length <= 1000`
- `0 <= nums1[i], nums2[i] <= 1000`
**示例**：

- 示例 1：

```text
输入：nums1 = [1,2,2,1], nums2 = [2,2]
输出：[2,2]
```

- 示例 2：

```text
输入：nums1 = [4,9,5], nums2 = [9,4,9,8,4]
输出：[4,9]
```
## 💻 解题思路
### 思路1：哈希表
#### 代码实现
```python
class Solution:
    def intersect(self, nums1: List[int], nums2: List[int]) -> List[int]:
        mapd={}
        result=[]
        for num in nums1:
            if num in mapd:
                mapd[num]+=1
            else:
                mapd[num]=1
        for num in nums2:
            if num in mapd and mapd[num]!=0:
                mapd[num]-=1
                result.append(num)
        return result
```
#### 📊 性能分析
##### 提交结果
- **运行时间**：0ms击败100.00%
- **内存消耗**：19.24MB击败30.05%
##### 复杂度验证
- 时间复杂度：$O(N)$
- 空间复杂度：$O(N)$
#### 思考
- 如果给定的数组已经排好序呢？你将如何优化你的算法？

- 如果 `nums1` 的大小比 `nums2` 小，哪种方法更优？
- 如果 `nums2` 的元素存储在磁盘上，内存是有限的，并且你不能一次加载所有的元素到内存中，你该怎么办？
