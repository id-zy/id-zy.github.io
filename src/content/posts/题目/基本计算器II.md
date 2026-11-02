---
title: 基本计算器II
date: 2026-03-18
subject: 算法
category: 题目
number: "227"
difficulty: 中等
topics:
  - 栈
platform: LeetCode
tags:
  - 栈
summary: 栈处理表达式优先级：遍历中暂存当前数字，遇到运算符时按「上一个运算符 op」结算——+/- 压入正负数，*/ 弹栈顶乘除后压回，末尾 s+='+' 保证最后一个数被结算，最终 sum(stack)。整数除法用 int(a/b) 实现向零截断。O(n) 一遍完成。
---

# 基本计算器II

## 🎯 问题描述
**描述**：
给你一个字符串表达式 `s` ，请你实现一个基本计算器来计算并返回它的值。

整数除法仅保留整数部分。

你可以假设给定的表达式总是有效的。所有中间结果将在 `[-231, 231 - 1]` 的范围内。

注意：不允许使用任何将字符串作为数学表达式计算的内置函数，比如 `eval()` 。
**说明**：
- `1 <= s.length <= 3 * 105`
- `s` 由整数和算符 `('+', '-', '*', '/')` 组成，中间由一些空格隔开
- `s` 表示一个 **有效表达式**
- 表达式中的所有整数都是非负整数，且在范围 `[0, 231 - 1]` 内
- 题目数据保证答案是一个 **32-bit 整数**
**示例**：

- 示例 1：

```text
输入：s = "3+2*2"
输出：7
```

- 示例 2：

```text
输入：s = " 3/2 "
输出：1
```
## 💻 解题思路
### 思路1：栈
#### 代码实现
```python
class Solution:
    def calculate(self, s: str) -> int:
        stack=[]
        num=0
        op='+'
        s+='+'
        for x in s:
            if x.isdigit():
                num=num*10+int(x)
            elif x==' ':
                continue
            else:
                if op=='+':
                    stack.append(num)
                elif op=='-':
                    stack.append(-num)
                elif op=='*':
                    stack.append(stack.pop()*num)
                elif op == '/':
                    stack.append(int(stack.pop()/num))
                op=x
                num=0
        return sum(stack)
```
#### 📊 性能分析
##### 提交结果
- **运行时间**：39ms击败98.53%
- **内存消耗**：22.21MB击败21.72%
##### 复杂度验证
- 时间复杂度：$O(N)$
- 空间复杂度：$O(N)$
#### 思考
