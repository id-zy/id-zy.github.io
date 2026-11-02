---
title: 前k个高频元素
date: 2026-03-23
subject: 算法
category: 题目
number: "347"
difficulty: 中等
topics:
  - 优先队列
platform: LeetCode
tags:
  - 优先队列
summary: 大小为 k 的小顶堆维护 Top K：哈希统计频率后，堆未满直接压 (freq, num)，满了只有 freq 大于堆顶才替换并弹出。最后取堆中 num 列表。O(n log k) 时间 O(k) 空间，比全排序 O(n log n) 更优，是 Top K 系列的标准姿势。
---

# 前k个高频元素

## 🎯 问题描述
**描述**：
给你一个整数数组 `nums` 和一个整数 `k` ，请你返回其中出现频率前 `k` 高的元素。你可以按 **任意顺序** 返回答案
**说明**：
- `1 <= nums.length <= 105`
- `-104 <= nums[i] <= 104`
- `k` 的取值范围是 `[1, 数组中不相同的元素的个数]`
- 题目数据保证答案唯一，换句话说，数组中前 `k` 个高频元素的集合是唯一的

**示例**：

- 示例 1：

```text
输入：nums = [1,1,1,2,2,3], k = 2
输出：[1,2]
```

- 示例 2：

```text
输入：nums = [1,2,1,2,1,2,3,1,3,2], k = 2
输出：[1,2]
```
## 💻 解题思路
### 思路1：优先队列（通过频率定义优先级）
#### 代码实现
```python
class Solution:
    def topKFrequent(self, nums: List[int], k: int) -> List[int]:
        mapd={}
        for num in nums:
            if num in mapd:
                mapd[num]+=1
            else:
                mapd[num]=1
        result=[]
        for num,freq in mapd.items():
            if len(result)<k:
                heapq.heappush(result,(freq,num))
            elif freq>result[0][0]:
                heapq.heappush(result,(freq,num))
                heapq.heappop(result)
        return [num for freq,num in result]
```
#### 📊 性能分析
##### 提交结果
- **运行时间**：7ms击败40.45%
- **内存消耗**：22.63MB击败33.99%
##### 复杂度验证
- 时间复杂度：$O(nlogk)$
- 空间复杂度：$O(k)$
#### 思考
