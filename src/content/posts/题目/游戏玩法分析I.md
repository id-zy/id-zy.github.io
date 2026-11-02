---
title: 游戏玩法分析I
date: 2026-10-02
subject: 算法
category: 题目
number: "511"
difficulty: 简单
topics:
  - sql
platform: LeetCode
tags:
  - sql
summary: 游戏玩法分析I（LeetCode 511 · 简单）：解题思路与 SQL 方向的代码实现。
---

# 511. 游戏玩法分析I

> **难度**：简单 | **题号**：511 | **链接**：[511. 游戏玩法分析 I - 力扣（LeetCode）](https://leetcode.cn/problems/game-play-analysis-i/description/)

## 🎯 问题描述

**描述**：查询每位玩家**首次登录**的日期（Activity 表中每个 player_id 最早的事件日期）。

**表：Activity**

```text
+--------------+---------+
| 列名          | 类型    |
+--------------+---------+
| player_id    | int     |
| device_id    | int     |
| event_date   | date    |
| games_played | int     |
+--------------+---------+
```

**示例 1**：

```text
输入：
Activity 表:
+-----------+-----------+------------+--------------+
| player_id | device_id | event_date | games_played |
+-----------+-----------+------------+--------------+
| 1         | 2         | 2016-03-01 | 5            |
| 1         | 2         | 2016-05-02 | 6            |
| 2         | 3         | 2017-06-25 | 1            |
| 3         | 1         | 2016-03-02 | 0            |
| 3         | 4         | 2018-07-03 | 5            |
+-----------+-----------+------------+--------------+
输出：
+-----------+-------------+
| player_id | first_login |
+-----------+-------------+
| 1         | 2016-03-01  |
| 2         | 2017-06-25  |
| 3         | 2016-03-02  |
+-----------+-------------+
```

**提示**：

- 每组取最小值 → GROUP BY + MIN，最基础的分组聚合。

## 💻 解题思路

### 思路1：GROUP BY + MIN

#### 核心逻辑

按 player_id 分组，`MIN(event_date)` 即首次登录日期。是留存分析（Day 1 留存 = 首登次日仍活跃）的第一步，见 SQL分析场景模板 留存场景。

#### 代码实现

```sql
# Write your MySQL query statement below
SELECT
  A.player_id,
  MIN(A.event_date) AS first_login
FROM
  Activity A
GROUP BY
  A.player_id;
```

#### 📊 性能分析

- 时间复杂度：$O(n \log n)$，按 player_id 分组
- 空间复杂度：$O(n)$

#### 思考

- 后续玩法分析 II/IV 会在此基础上用自连接 / MIN+JOIN 组合算留存率，本题为地基。

## 📝 总结

分组内取极值的最简形态：GROUP BY + MIN/MAX。
