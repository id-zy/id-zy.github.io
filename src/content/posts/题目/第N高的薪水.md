---
title: 第N高的薪水
date: 2026-10-02
subject: 算法
category: 题目
number: "177"
difficulty: 中等
topics:
  - sql
platform: LeetCode
tags:
  - sql
summary: 第N高的薪水（LeetCode 177 · 中等）：解题思路与 SQL 方向的代码实现。
---

# 177. 第N高的薪水

> **难度**：中等 | **题号**：177 | **链接**：[177. 第N高的薪水 - 力扣（LeetCode）](https://leetcode.cn/problems/nth-highest-salary/description/)

## 🎯 问题描述

**描述**：编写 MySQL 函数，查询 Employee 表中第 N 高的不同薪水；不存在时返回 `null`。

**表：Employee**

```text
+-------------+------+
| 列名         | 类型 |
+-------------+------+
| id          | int  |
| salary      | int  |
+-------------+------+
```

**示例 1**：

```text
输入：
getNthHighestSalary(2)
Employee 表:
+----+--------+
| id | salary |
+----+--------+
| 1  | 100    |
| 2  | 200    |
| 3  | 300    |
+----+--------+
输出：
+------------------------+
| getNthHighestSalary(2) |
+------------------------+
| 200                    |
+------------------------+
```

**提示**：

- `LIMIT` 的偏移量不能用表达式（如 `N-1`），必须先算进变量。
- 注意 N 非法的边界（N <= 0 返回 NULL）。

## 💻 解题思路

### 思路1：存储函数 + LIMIT M,1

#### 核心逻辑

把 `N-1` 先算到变量 `M`（LIMIT 不接受表达式），`LIMIT M,1` 取去重排序后的第 N 行；N 非法时提前返回 NULL。

#### 代码实现

```sql
CREATE FUNCTION getNthHighestSalary(N INT) RETURNS INT
BEGIN
  DECLARE M INT;
  IF N <= 0 THEN
    RETURN NULL;
  END IF;
  SET M = N - 1;
  RETURN (
    SELECT DISTINCT salary
    FROM Employee
    ORDER BY salary DESC
    LIMIT M, 1
  );
END;
```

#### 📊 性能分析

- 时间复杂度：$O(n \log n)$
- 空间复杂度：$O(n)$

#### 思考

- 8.0 也可用窗口函数：`DENSE_RANK() OVER (ORDER BY salary DESC)` 后取 `rk = N`，见 分数排名。

## 📝 总结

「第 N 高」与「第二高」同源：DISTINCT + DESC + LIMIT n-1,1；函数版要多处理边界与变量。
