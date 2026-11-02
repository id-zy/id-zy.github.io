---
title: 每月交易 I
date: 2026-10-12
subject: 算法
category: 题目
number: "1193"
difficulty: 中等
topics:
  - sql
platform: LeetCode
tags:
  - sql
summary: 1193. 每月交易 I（LeetCode 1193 · 中等）：解题思路与 SQL 方向的代码实现。
---

# 1193. 每月交易 I

> **难度**：中等 | **题号**：1193 | **链接**：[1193. 每月交易 I - 力扣（LeetCode）](https://leetcode.cn/problems/monthly-transactions-i/) | **数据结构**：SQL
>
> 关联：查询近30天活跃用户数（同为日期函数 + 分组聚合）· 订单最多的用户（分组计数）· 可对照 SQL-聚合分组与UNION（日期格式化 / 条件聚合）。

## 🎯 问题描述

**描述**：写一条 SQL 查询，找出**每个月、每个国家/地区**的：① 交易总数；② 交易总金额；③ **已批准**（`state = 'approved'`）的交易数；④ **已批准**交易的总额。结果以**任意顺序**返回。

**表：Transactions**

```text
+---------------+---------+
| Column Name   | Type    |
+---------------+---------+
| id            | int     |
| country       | varchar |
| state         | enum    |
| amount        | int     |
| trans_date    | date    |
+---------------+---------+
id 是该表的主键（具有唯一值的列）。
state 列类型为 ENUM ['approved', 'declined'] 之一。
该表包含有关传入交易的信息。
```

**示例 1**：

```text
输入：
Transactions table:
+------+---------+----------+--------+------------+
| id   | country | state    | amount | trans_date |
+------+---------+----------+--------+------------+
| 121  | US      | approved | 1000   | 2018-12-18 |
| 122  | US      | declined | 2000   | 2018-12-19 |
| 123  | US      | approved | 2000   | 2019-01-01 |
| 124  | DE      | approved | 2000   | 2019-01-07 |
+------+---------+----------+--------+------------+
输出：
+----------+---------+-------------+----------------+--------------------+-----------------------+
| month    | country | trans_count | approved_count | trans_total_amount | approved_total_amount |
+----------+---------+-------------+----------------+--------------------+-----------------------+
| 2018-12  | US      | 2           | 1              | 3000               | 1000                  |
| 2019-01  | US      | 1           | 1              | 2000               | 2000                  |
| 2019-01  | DE      | 1           | 1              | 2000               | 2000                  |
+----------+---------+-------------+----------------+--------------------+-----------------------+
```

**提示**：

- **先按月 + 国家分组**，再在组内同时计算「总计数 / 条件计数 / 总金额 / 条件金额」——典型**条件聚合（Conditional Aggregation）**。
- 月份要从 `trans_date` 抽出来：`DATE_FORMAT(trans_date, '%Y-%m')`（或 `SUBSTRING(trans_date, 1, 7)`）。
- 条件计数有两种写法：`SUM(state = 'approved')` 直接对布尔求和（MySQL 中真值 = 1）；或 `COUNT(IF(state = 'approved', 1, NULL))`（只数非 NULL，更通用）。
- 结果列名必须与要求完全一致。

## 💻 解题思路

### 思路1：DATE_FORMAT + 条件聚合（用户解法）

#### 核心逻辑

用 `DATE_FORMAT(trans_date, '%Y-%m')` 造出月份列并按 `(month, country)` 分组；组内分别用 `COUNT(*)`、`SUM(布尔)`、`SUM(amount)`、`SUM(IF(...))` 算出四个指标。

#### 代码实现

```sql
# Write your MySQL query statement below
SELECT DATE_FORMAT(trans_date, '%Y-%m') AS month,
       country,
       COUNT(*) AS trans_count,
       COUNT(IF(state = 'approved', 1, NULL)) AS approved_count,
       SUM(amount) AS trans_total_amount,
       SUM(IF(state = 'approved', amount, 0)) AS approved_total_amount
FROM Transactions
GROUP BY month, country;
```

> 💡 更简洁的等价写法（利用 MySQL 布尔转 0/1）：
> ```sql
> SELECT DATE_FORMAT(trans_date, '%Y-%m') AS month, country,
>        COUNT(*) AS trans_count,
>        SUM(state = 'approved') AS approved_count,
>        SUM(amount) AS trans_total_amount,
>        SUM(IF(state = 'approved', amount, 0)) AS approved_total_amount
> FROM Transactions
> GROUP BY 1, 2;
> ```

#### 📊 性能分析

- 时间复杂度：$O(n)$（全表扫描 + 哈希分组聚合；`(trans_date, country)` 有索引时可加速）。
- 空间复杂度：$O(g)$，$g$ 为 `(月, 国家)` 组合数。

#### 思考

- **`GROUP BY month` 合法吗？** MySQL 允许按 `SELECT` 里的**别名**分组（`GROUP BY month` / `GROUP BY 1`），但**标准 SQL 不支持**，跨库迁移时建议写完整的 `DATE_FORMAT(...)`。
- **`COUNT(IF(...))` vs `SUM(IF(...))`**：计数用 `COUNT(IF(cond, 1, NULL))`（`COUNT` 忽略 NULL）；求和用 `SUM(IF(cond, amount, 0))`（补 0 避免 NULL 污染、也避免少加行）。用 `SUM(state = 'approved')` 最省，但依赖 MySQL 的布尔→整数转换。
- **NULL 陷阱**：`SUM` 遇到全 NULL 组会返回 `NULL` 而非 0，所以条件求和务必显式补 `0`。
- 进阶：LeetCode 1194「每月交易 II」在此基础上要额外处理**退款（chargeback）**与原交易的配平，会用到自连接 / 窗口函数。

## 📝 总结

「**条件聚合（Pivot 式多指标聚合）**」模板：

- 先派生时间维度列（`DATE_FORMAT` / `SUBSTRING`）→ 按维度 `GROUP BY` → 组内用 `COUNT / COUNT(IF()) / SUM / SUM(IF())` 一次算出多个指标。
- 三个关键点：① 月份抽取用日期函数，别手写 `SUBSTRING` 更稳；② 条件计数用 `COUNT(IF(cond,1,NULL))`、条件求和用 `SUM(IF(cond,val,0))`；③ `SUM` 对全 NULL 组返回 NULL，补 `0` 最安全。

---

> 📎 同类题：查询近30天活跃用户数 · 订单最多的用户 ｜ 概念：SQL-聚合分组与UNION
