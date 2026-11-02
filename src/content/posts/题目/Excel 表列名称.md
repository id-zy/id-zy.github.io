---
title: Excel 表列名称
date: 2025-12-02
subject: 算法
category: 题目
number: "168"
difficulty: 简单
topics:
  - 数学
platform: LeetCode
tags:
  - 数学
summary: 十进制转 26 进制的变体坑点：Excel 列名没有零位，Z 就是 26，所以余 0 时要借位当 26 处理，再减去余数整除推进。文中给出完整写法并附 0ms 的提交结果，复杂度 O(log n)。
---

# Excel 表列名称

## 🎯 问题描述
```text
给你一个整数 columnNumber，返回它在 Excel 表中相对应的列名称。
例如：
A -> 1
B -> 2
C -> 3
...
Z -> 26
AA -> 27
AB -> 28 
...
```
## 💻 代码实现
```python
class Solution:
    def convertToTitle(self, columnNumber: int) -> str:
        n=columnNumber
        s=''
        while (n > 0):
           m = n % 26
           if (m == 0): m = 26
           s = chr(m + 64) + s
           n = (n - m) // 26
        return s
```
## 📊 性能分析
### 提交结果
- **运行时间**：0ms击败100.00%
- **内存消耗**：17.38MB击败93.22%
### 复杂度验证
- 时间复杂度：$O(log(n))$
- 空间复杂度：$O(1)$
