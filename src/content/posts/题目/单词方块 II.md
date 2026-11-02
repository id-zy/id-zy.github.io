---
title: 单词方块 II
date: 2026-05-17
subject: 算法
category: 题目
number: "3799"
difficulty: 中等
topics:
  - 回溯
  - DFS
  - 枚举算法
  - 递归
platform: LeetCode
tags:
  - 回溯
  - DFS
  - 枚举算法
  - 递归
summary: 回溯枚举排列 + 角条件验证：dfs(i) 依次选 top/left/right/bottom 四个互不相同的词（selected 数组标记），选满后只检查四个角的字符相等关系，满足则收集。结果最后字典序排序。数据规模小时暴力可行，注意 path 预分配与回溯恢复。
---

# 3799. 单词方块 II - Word Squares II

## 🎯 问题描述
**描述**：  
给定一个字符串数组 `words`，每个单词长度固定为 4，且都由小写字母组成。  
从 `words` 中选出 **4 个互不相同** 的单词，分别作为 top、left、right、bottom，并将它们排列成一个 2×2 的单词方块。  
方块必须满足四个角上的字符对应相等：
- `top[0] == left[0]` （左上角）
- `top[3] == right[0]` （右上角）
- `bottom[0] == left[3]` （左下角）
- `bottom[3] == right[3]` （右下角）

返回所有满足条件的 4‑元组（top, left, right, bottom），结果按字典序升序排列。

**说明**：  
- 每个单词只能使用一次。
- 单词列表中的单词互不相同。

**示例**：

```text
输入: words = ["area","lead","wall","lady","ball"]
输出: [("wall","area","lead","lady"), ("ball","area","lead","lady")]
```

## 💻 解题思路
### 思路：回溯法枚举所有排列并检查角条件
#### 算法步骤
1. 获取单词列表长度 `n`，初始化结果列表 `ans`、路径列表 `path`（长度为4）以及 `selected` 布尔数组标记单词是否被使用。
2. 定义递归函数 `dfs(i)`，表示当前正在选择第 `i` 个位置的单词（0‑indexed）：
   - 如果 `i == 4`，表示已经选满了 4 个单词。此时取出 `path` 中的四个单词 `top, left, right, bottom`，检查四个角条件是否成立：
     - `top[0] == left[0]`
     - `top[3] == right[0]`
     - `bottom[0] == left[3]`
     - `bottom[3] == right[3]`
     若全部满足，则将 `path` 的副本加入 `ans`。
   - 否则，遍历所有单词下标 `j`，如果 `selected[j]` 为 `False`，则执行：
     - 将 `words[j]` 放入 `path[i]`。
     - 标记 `selected[j] = True`。
     - 递归 `dfs(i+1)`。
     - 回溯：`selected[j] = False`。
3. 从 `dfs(0)` 开始搜索。
4. 对结果列表 `ans` 进行字典序排序（因为 `path` 中单词顺序固定为 (top, left, right, bottom)，直接对元组列表排序即可）。
5. 返回 `ans`。

#### 代码实现
```python
from typing import List

class Solution:
    def wordSquares(self, words: List[str]) -> List[List[str]]:
        n = len(words)
        ans = []
        path = [""] * 4
        selected = [False] * n

        def dfs(i):
            if i == 4:
                top, left, right, bottom = path
                # 检查四个角条件
                if (top[0] == left[0] and top[3] == right[0] and
                    bottom[0] == left[3] and bottom[3] == right[3]):
                    ans.append(tuple(path[:]))
                return
            for j, select in enumerate(selected):
                if not select:
                    path[i] = words[j]
                    selected[j] = True
                    dfs(i+1)
                    selected[j] = False

        dfs(0)
        ans.sort()
        return ans
```

#### 📊 性能分析
- **时间复杂度**：$O(P(n,4))$，即 $n \cdot (n-1) \cdot (n-2) \cdot (n-3)$，最坏情况下 $n=500$ 时约为 $6 \times 10^{10}$，但实际数据范围较小，且在检查角条件前已通过回溯剪枝（每次递归只探索未使用的单词），对于 $n \leq 20$ 可以接受。
- **空间复杂度**：$O(n)$，存储标记数组、路径和结果。

#### 思考
该解法直接枚举所有长度为4的排列（有序选择），然后验证四个角条件。由于单词长度固定为4且只需检查四个角，条件简单，因此暴力枚举在数据规模不大时是可行的。  
**优点**：逻辑直观，代码简短，利用了回溯的经典框架。  
**注意事项**：
- 题目要求输出的是4‑元组（top, left, right, bottom），代码中使用 `tuple(path[:])` 满足要求。
- 结果排序是必须的，因为生成顺序不一定有序。
- 如果单词列表很大（例如 $n>20$），此方法会超时，但 LeetCode 原题数据范围通常较小，可以接受。
