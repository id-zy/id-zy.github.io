---
title: 单词拆分 II
date: 2026-05-13
subject: 算法
category: 题目
number: "140"
difficulty: 困难
topics:
  - 动态规划
platform: LeetCode
tags:
  - 动态规划
summary: 回溯枚举切割点：dfs(i, cur) 中 cur 累积当前单词，每步两个分支——继续延长（cur+s[i]）或当 cur 在字典集合中时切分入 path。扫到末尾时按 cur 是否剩余分别结算。最坏 O(2ⁿ)，靠字典剪枝实际可控；与 DP 版单词拆分 I 的区别是要输出全部方案而非判可行性。
---

# 140. 单词拆分 II - Word Break II

## 🎯 问题描述
**描述**：  
给定一个字符串 `s` 和一个字符串列表 `wordDict`，将 `s` 拆分成一个或多个在字典中出现的单词，返回所有可能的句子。  
单词可以重复使用，且拆分后的单词按原顺序组成句子，单词之间用空格分隔。

**说明**：  
- 字典中的单词互不相同。
- 同一个单词可以在拆分中多次使用。

**示例**：

- 示例 1：

```text
输入: s = "catsanddog", wordDict = ["cat","cats","and","sand","dog"]
输出: ["cats and dog","cat sand dog"]
```

- 示例 2：

```text
输入: s = "pineapplepenapple", wordDict = ["apple","pen","applepen","pine","pineapple"]
输出: ["pine apple pen apple","pineapple pen apple","pine applepen apple"]
```

- 示例 3：

```text
输入: s = "catsandog", wordDict = ["cats","dog","sand","and","cat"]
输出: []
```

## 💻 解题思路
### 思路：回溯法（DFS）枚举单词分割
#### 算法步骤
1. 将 `wordDict` 转换为集合 `st`，便于快速判断单词是否存在。
2. 获取字符串长度 `n`，初始化结果列表 `ans` 和路径列表 `path`。
3. 定义递归函数 `dfs(i, cur)`，其中 `i` 表示当前扫描到的下标，`cur` 表示当前正在累积的字符（可能构成一个单词）：
   - 如果 `i == n`（扫描完所有字符）：
     - 如果 `cur` 非空，且 `cur` 在字典中，则将其加入 `path`，然后将 `path` 用空格连接成句子加入 `ans`，最后回溯弹出 `cur`。
     - 如果 `cur` 为空（即最后一段已经切分），则直接将 `path` 连接成句子加入 `ans`。
     - 返回。
   - 否则：
     - **不切分**：继续累积当前字符，递归 `dfs(i+1, cur + s[i])`。
     - **切分**：如果 `cur` 非空且 `cur` 在字典中，则将 `cur` 加入 `path`，然后从下一个字符开始新的累积，递归 `dfs(i+1, s[i])`，最后回溯弹出 `path`。
4. 从 `dfs(0, "")` 开始搜索。
5. 返回 `ans`。

#### 代码实现
```python
from typing import List

class Solution:
    def wordBreak(self, s: str, wordDict: List[str]) -> List[str]:
        st = set(wordDict)
        ans = []
        path = []
        n = len(s)

        def dfs(i, cur):
            if i == n:
                if cur:
                    if cur in st:
                        path.append(cur)
                        ans.append(" ".join(path))
                        path.pop()
                else:
                    ans.append(" ".join(path))
                return
            
            dfs(i+1, cur + s[i])

            if cur and cur in st:
                path.append(cur)
                dfs(i+1, s[i])
                path.pop()
        
        dfs(0, "")
        return ans
```

#### 📊 性能分析
- **时间复杂度**：最坏情况下为 $O(2^n)$，但由于字典剪枝，实际运行较快。对于 `n ≤ 20` 的输入，该解法可通过。
- **空间复杂度**：$O(n)$，递归栈深度和路径存储。

#### 思考
该解法模拟了回溯构造句子的过程，通过 `cur` 累积当前单词，在每次递归中决定是继续延长单词还是切分（如果当前累积的单词在字典中）。  
**优点**：
- 代码结构清晰，直接模拟了人类构造句子的思维。
- 使用了 `set` 快速判断单词是否存在。
