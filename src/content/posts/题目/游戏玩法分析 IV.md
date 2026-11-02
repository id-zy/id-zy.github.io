---
title: 游戏玩法分析 IV
date: 2026-10-03
subject: 算法
category: 题目
number: "550"
difficulty: 中等
topics:
  - sql
platform: LeetCode
tags:
  - sql
summary: 550. 游戏玩法分析 IV（LeetCode 550 · 中等）：解题思路与 SQL 方向的代码实现。
---

# 550. 游戏玩法分析 IV

> **难度**：中等 | **题号**：550 | **链接**：[550. 游戏玩法分析 IV - 力扣（LeetCode）](https://leetcode.cn/problems/game-play-analysis-iv/description/)
>
> 关联：游戏玩法分析I · SQL-留存分析（次日留存的标准套路）· 上升的温度 同为 `DATEDIFF` 日期比较。

## 🎯 问题描述

**描述**：报告在**首次登录的第二天再次登录**的玩家**比率**，四舍五入到小数点后两位。

即：`首次登录次日又登录的玩家数 ÷ 总玩家数`。

**表：Activity**

```text
+--------------+---------+
| Column Name  | Type    |
+--------------+---------+
| player_id    | int     |
| device_id    | int     |
| event_date   | date    |
| games_played | int     |
+--------------+---------+
(player_id, event_date) 是主键。
```

**示例 1**：

```text
输入：
+-----------+-----------+------------+--------------+
| player_id | device_id | event_date | games_played |
+-----------+-----------+------------+--------------+
| 1         | 2         | 2016-03-01 | 5            |
| 1         | 2         | 2016-03-02 | 6            |
| 2         | 3         | 2017-06-25 | 1            |
| 3         | 1         | 2016-03-02 | 0            |
| 3         | 4         | 2018-07-03 | 5            |
+-----------+-----------+------------+--------------+
输出：
+----------+
| fraction |
+----------+
| 0.33     |
+----------+
解释：只有玩家 1 在首登次日又登录，1/3 = 0.33。
```

## 💻 解题思路

### 思路1：首次登录 + 次日登录计数（用户解法）

#### 核心逻辑

① `f`：按 `player_id` 求**首次登录日期** `first_date`（这是"新增用户"的基准日）；
② `x`：`f` 左连 `Activity`，用 `COUNT(DISTINCT f.player_id)` 数新增用户总数，用 `COUNT(DISTINCT CASE WHEN DATEDIFF(a.event_date, f.first_date) = 1 THEN f.player_id END)` 数**次日回访**人数；
③ 两者相除，`ROUND(...,2)`。

> ⚠️ 原文变量名 `stain_1d` 是 `retained_1d`（留存）的笔误，已统一改为 `retained_1d`。

#### 代码实现

```sql
WITH f AS (
    SELECT
        player_id,
        MIN(event_date) AS first_date
    FROM Activity
    GROUP BY player_id
),
x AS (
    SELECT
        COUNT(DISTINCT f.player_id) AS new_user,
        COUNT(DISTINCT CASE
            WHEN DATEDIFF(a.event_date, f.first_date) = 1
            THEN f.player_id
        END) AS retained_1d
    FROM f
    LEFT JOIN Activity a
      ON f.player_id = a.player_id
)
SELECT ROUND(retained_1d / new_user, 2) AS fraction
FROM x;
```

### 思路2：元组 `IN` 匹配（更短）

用 `(player_id, event_date)` 元组直接匹配"`player_id` 配上（首登日 + 1 天）"的记录：

```sql
SELECT ROUND(
    COUNT(*) / (SELECT COUNT(DISTINCT player_id) FROM Activity),
    2
) AS fraction
FROM Activity
WHERE (player_id, event_date) IN (
    SELECT player_id, DATE_ADD(MIN(event_date), INTERVAL 1 DAY)
    FROM Activity
    GROUP BY player_id
);
```

#### 📊 性能分析

- 时间复杂度：$O(n)$ ~ $O(n \log n)$（分组 + 连接/去重）。
- 空间复杂度：$O(n)$。

#### 思考

- 分母必须是**所有**玩家（`COUNT(DISTINCT player_id)`），不是"首日登录的玩家"，注意别漏。
- 这其实就是最简版的**次日留存率**：分子 = 次日回访，分母 = 当日新增。可对照 SQL-留存分析 的 `retained_1d / new_user`。
- 边界：若某玩家首登次日无记录，`LEFT JOIN` 下 `CASE` 为 `NULL`，`COUNT(DISTINCT ...)` 不计入，逻辑正确。

## 📝 总结

**次日留存率 = 次日回访人数 / 新增人数**。套路：先求每人 `MIN(event_date)` 作首日 → 用 `DATEDIFF = 1` 的 `COUNT(DISTINCT CASE WHEN)` 数回访 → 相除四舍五入。
