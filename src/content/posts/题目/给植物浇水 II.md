---
title: 给植物浇水 II
date: 2026-07-09
subject: 算法
category: 题目
number: "2105"
difficulty: 中等
topics:
  - 数组双指针
  - 对撞指针
platform: LeetCode
tags:
  - 数组双指针
  - 对撞指针
summary: 给植物浇水 II（LeetCode 2105 · 中等）：解题思路与 数组双指针/对撞指针 方向的代码实现。
---

# 2105. 给植物浇水 II

## 🎯 问题描述
**描述**：  
Alice 和 Bob 计划给一排植物浇水。植物排成一行，从左到右编号为 `0` 到 `n-1`。  
Alice 从最左边（植物 `0`）开始，Bob 从最右边（植物 `n-1`）开始，他们同时向中间移动。  
- Alice 的水壶容量为 `capacityA`，Bob 的水壶容量为 `capacityB`。
- 当他们到达一株植物时，如果水壶中的水不足以浇灌该植物，他们必须**重新装满**自己的水壶（在当前位置），然后才能浇水。
- 他们各自独立行动，但每次只能浇一株植物。
- 如果两人同时到达同一株植物（即中间只剩一株植物），则水壶中剩余水量较多的人去浇灌（如果两人水量相同，Alice 去浇）。

求他们总共需要重新装满水壶的次数。

**说明**：  
- 初始水壶是满的（容量分别为 `capacityA` 和 `capacityB`）。
- 植物需要的水量由 `plants[i]` 给出。

**示例**：

- 示例 1：

```text
输入: plants = [2,2,3,3], capacityA = 5, capacityB = 5
输出: 1
解释:
  Alice 浇 0 号 (2)，剩 3；Bob 浇 3 号 (3)，剩 2。
  Alice 浇 1 号 (2)，剩 1；Bob 浇 2 号 (3)，水量不够，Bob 重新装满（+1），然后浇 2 号。
  总共 1 次。
```

- 示例 2：

```text
输入: plants = [2,2,3,3], capacityA = 3, capacityB = 4
输出: 2
解释:
  Alice 浇 0 号 (2)，剩 1；Bob 浇 3 号 (3)，剩 1。
  Alice 浇 1 号 (2)，水不够，重新装满（+1），剩 3？实际需先装满再浇，所以重新装满后浇 1 号，剩 1。
  Bob 浇 2 号 (3)，水不够，重新装满（+1），然后浇 2 号。
  总共 2 次。
```

## 💻 解题思路
### 思路：双指针模拟
#### 算法步骤
1. 初始化左右指针 `left = 0`，`right = len(plants) - 1`，Alice 当前水量 `a = capacityA`，Bob 当前水量 `b = capacityB`，答案 `ans = 0`。
2. 当 `left < right` 时：
   - Alice 浇水：
     - 如果 `a < plants[left]`，则需要重新装满（`a = capacityA`，`ans += 1`）。
     - 浇水：`a -= plants[left]`，`left += 1`。
   - Bob 浇水：
     - 如果 `b < plants[right]`，则需要重新装满（`b = capacityB`，`ans += 1`）。
     - 浇水：`b -= plants[right]`，`right -= 1`。
3. 如果 `left == right`（中间只剩一株植物），则由水量较多的人浇灌：
   - 如果 `max(a, b) < plants[left]`，则其中一人需要重新装满（`ans += 1`）。
   - 不需要实际修改水量，因为已经完成所有浇水。
4. 返回 `ans`。

#### 代码实现
```python
from typing import List

class Solution:
    def minimumRefill(self, plants: List[int], capacityA: int, capacityB: int) -> int:
        left, right = 0, len(plants) - 1
        a, b = capacityA, capacityB
        ans = 0
        while left < right:
            if a < plants[left]:
                a = capacityA
                ans += 1
            a -= plants[left]
            left += 1
            
            if b < plants[right]:
                b = capacityB
                ans += 1
            b -= plants[right]
            right -= 1
        
        if left == right:
            if max(a, b) < plants[left]:
                ans += 1
        return ans
```

#### 📊 性能分析
- 时间复杂度：$O(n)$，每个植物访问一次。
- 空间复杂度：$O(1)$，仅使用常数个变量。

#### 思考
您的代码正确模拟了两人同时从两端浇水的过程。关键点：
- 每次浇水前检查当前水量是否足够，若不足则重新装满并计数。
- 对于最后一株植物，由水量较多者负责，只需判断较大水量是否足够，若不够则只需加一次（因为只需一个人去浇）。
- 该解法是本题的标准双指针模拟，逻辑清晰，运行高效。
