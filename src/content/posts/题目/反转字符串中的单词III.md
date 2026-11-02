---
title: 反转字符串中的单词III
date: 2026-03-25
subject: 算法
category: 题目
number: "557"
difficulty: 简单
topics:
  - 字符串
  - 对撞指针
platform: LeetCode
tags:
  - 字符串
  - 对撞指针
summary: 两解对比：手写版逐词定位（遇空格或末尾就反转 [left, right] 段），切片版一行 ' '.join(w[::-1] for w in s.split(' '))。核心都是「单词顺序不变、单词内部反转」，逐词反转的 O(N) 框架值得手写一遍，切片版适合快速解题。
---

# 反转字符串中的单词III

## 🎯 问题描述
**描述**：
给定一个字符串 `s` ，你需要反转字符串中每个单词的字符顺序，同时仍保留空格和单词的初始顺序。
**说明**：
- `1 <= s.length <= 5 * 104`
- `s` 包含可打印的 **ASCII** 字符。
- `s` 不包含任何开头或结尾空格。
- `s` 里 **至少** 有一个词。
- `s` 中的所有单词都用一个空格隔开。
**示例**：

- 示例 1：

```text
输入：s = "Let's take LeetCode contest"
输出："s'teL ekat edoCteeL tsetnoc"
```

- 示例 2：

```text
输入： s = "Mr Ding"
输出："rM gniD"
```
## 💻 解题思路
### 思路1：遇到一个单词反转一个单词
#### 代码实现
```python
class Solution:
    def reverseString(self, s_list: List[str], left: int, right: int) -> None:
        while left < right:
            s_list[left], s_list[right] = s_list[right], s_list[left]
            left += 1
            right -= 1
    def reverseWords(self, s: str) -> str:
        s_list = list(s)
        n = len(s_list)
        left = 0
        for i in range(n):
            if s_list[i] == ' ' or i == n - 1:
                right = i - 1 if s_list[i] == ' ' else i
                self.reverseString(s_list, left, right)
                left = i + 1
        return ''.join(s_list)
```
#### 📊 性能分析
##### 提交结果
- **运行时间**：55ms击败5.26%
- **内存消耗**：9.57MB击败32.63%
##### 复杂度验证
- 时间复杂度：$O(N)$
- 空间复杂度：$O(N)$
### 思路2：字符串切片
#### 代码实现
```python
class Solution:
    def reverseWords(self, s: str) -> str:
        return ' '.join(word[::-1] for word in s.split(" "))
```
#### 📊 性能分析
##### 提交结果
- **运行时间**：3ms击败62.37%
- **内存消耗**：19.45MB击败61.58%
##### 复杂度验证
- 时间复杂度：$O(N)$
- 空间复杂度：$O(N)$
