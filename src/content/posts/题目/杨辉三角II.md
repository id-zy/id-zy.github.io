---
title: 杨辉三角II
date: 2025-12-08
subject: 算法
category: 题目
number: "119"
difficulty: 简单
topics:
  - 二维数组
platform: LeetCode
tags:
  - 二维数组
summary: 杨辉三角II（LeetCode 119 · 简单）：解题思路与 二维数组 方向的代码实现。
---

# 杨辉三角II

## 🎯 问题描述
给定一个非负索引 `rowIndex`，返回「杨辉三角」的第 `rowIndex` 行。
## 💻 代码实现
```python
class Solution:
    def getRow(self, rowIndex: int) -> List[int]:
        n=rowIndex
        L = [] 
        line=[]
        for i in range(n+1):
            line=[]
            for j in range(i+1):
                if j==0 or i==j:
                    line.append(1)
                else :
                    a=L[i-1][j-1]+L[i-1][j]
                    line.append(a)
            L.append(line)
        return line
```
## 📊 性能分析
### 提交结果
- **运行时间**：0ms击败100.00%
- **内存消耗**：17.31MB击败96.96%
### 复杂度验证
- 时间复杂度：$O(N^2)$
- 空间复杂度：$O(N^2)$
