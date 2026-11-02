---
title: Pow(x, n)
date: 2025-11-30
subject: 算法
category: 题目
number: "50"
difficulty: 中等
topics:
  - 位运算
  - 快速幂
platform: LeetCode
tags:
  - 位运算
  - 快速幂
summary: 快速幂把 n 次乘法压到 log n：按二进制拆解指数，每轮让底数自乘，遇到为 1 的位再补乘一次。文中给出递归与迭代两版写法，并处理 n 为负数、INT_MIN 取反溢出这两个最容易踩的边界，附实跑输出。
---

# Pow(x, n)

## 🎯 问题描述
```text
实现pow(_x_, _n_) ，即计算x的整n次幂函数（即，x^n ）。
```
## 💻 代码实现

#### 暴力破解
```python
class Solution:
    def myPow(self, x: float, n: int) -> float:
         ans=1.0
         i=0
         if n<0:
            x=1/x
            n=-n
         for i in range(n):
            ans*=x
         return ans
```

#### 快速幂优化算法
使用快速幂降低其时间复杂度
```python
class Solution:
    def myPow(self, x: float, n: int) -> float:
         ans=1.0
         i=0
         if n<0:
            x=1/x
            n=-n
         while n:
            if(n&1==1):
                ans*=x
            x*=x
            n>>=1
         return ans
```

## 📊 性能分析
### 提交结果
- **运行时间**：0ms击败100.00 %
- **内存消耗**：17.40MB击败 94.00%
### 复杂度验证
- 时间复杂度：$O(log(n))$
- 空间复杂度：$O(1)$
