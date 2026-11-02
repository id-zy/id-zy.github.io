---
title: Excel 表列序号
date: 2025-12-02
subject: 算法
category: 题目
number: "171"
difficulty: 简单
topics:
  - 数学
platform: LeetCode
tags:
  - 数学
summary: 列名转数字的逆向题：按位展开成 26 进制求和。文中实现逐位取字母表下标、乘 26 的幂再累加，并附提交耗时；同一思路也可写成一遍遍历的 acc 乘 26 加当前值的滚动形式。
---

#  Excel 表列序号

## 🎯 问题描述
```text
给你一个字符串columnTitle，表示 Excel 表格中的列名称。返回 _该列名称对应的列序号_ 。
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
    def titleToNumber(self, columnTitle: str) -> int:
          s=columnTitle
          a = list(map(lambda x: chr(x), range(ord('A'), ord('Z') + 1)))
          l = len(s)
          sum = 0
          if l > 1:
              for i in range(l - 1):
                  index =a.index(s[i])
                  num = pow(26, l - 1) * (index + 1)
                  l = l - 1
                  sum = sum + num
              sum = sum+a.index(s[-1])
          else:
              sum = sum + a.index(s[-1])
```
## 📊 性能分析
### 提交结果
- **运行时间**：3ms击败20.74%
- **内存消耗**：17.43MB击败59.26%
### 复杂度验证
- 时间复杂度：$O(n)$
- 空间复杂度：$O(1)$
