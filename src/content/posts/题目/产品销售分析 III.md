---
title: 产品销售分析 III
date: 2026-10-23
subject: 算法
category: 题目
number: "1070"
difficulty: 中等
topics:
  - sql
platform: LeetCode
tags:
  - sql
summary: 取每个产品第一年的全部销售条目：用 RANK() OVER (PARTITION BY product_id ORDER BY year) 打排名后取 rn=1。关键坑是必须用 RANK 而非 ROW_NUMBER——同一年可能有多条记录要全保留；另附行构造器 (product_id, year) IN 子查询的 MySQL 5.7 兼容写法。
---

# 产品销售分析 III

> **难度**：中等 | **题号**：1070 | **链接**：[1070. 产品销售分析 III](https://leetcode.cn/problems/product-sales-analysis-iii/) | **数据结构**：sql

## 🎯 问题描述

**描述**：

销售表 `Sales`：

```text
+-------------+-------+
| Column Name | Type  |
+-------------+-------+
| sale_id     | int   |
| product_id  | int   |
| year        | int   |
| quantity    | int   |
| price       | int   |
+-------------+-------+
```

- `(sale_id, year)` 是这张表的主键。
- 每一行表示：编号 `product_id` 的产品在某一年的销售额（价格按每单位计）。

编写解决方案，选出每个售出过的产品 **第一年** 销售的 **产品 id、年份、数量 和 价格**。对每个 `product_id`，找到其在 `Sales` 表中首次出现的最早年份，返回该产品在该年度的 **所有** 销售条目。

**示例 1**：

```text
输入：
Sales 表：
+---------+------------+------+----------+-------+
| sale_id | product_id | year | quantity | price |
+---------+------------+------+----------+-------+
| 1       | 100        | 2008 | 10       | 5000  |
| 2       | 100        | 2009 | 12       | 5000  |
| 7       | 200        | 2011 | 15       | 9000  |
+---------+------------+------+----------+-------+
输出：
+------------+------------+----------+-------+
| product_id | first_year | quantity | price |
+------------+------------+----------+-------+
| 100        | 2008       | 10       | 5000  |
| 200        | 2011       | 15       | 9000  |
+------------+------------+----------+-------+
```

**提示**：
- 题面要求返回「该产品在第一年的所有销售条目」——不是只返回一行。

## 💻 解题思路

### 思路 1：窗口函数 RANK 取每组最早年份（我的解法）

#### 核心逻辑

- 用 `RANK() OVER (PARTITION BY product_id ORDER BY year)` 给每个产品按年份升序打排名；
- 取 `rn = 1` 的行，即为每个产品的第一年销售条目。

#### 代码实现

```sql
WITH t1 AS (
    SELECT
        product_id,
        RANK() OVER (PARTITION BY product_id ORDER BY year ASC) AS rn,
        quantity,
        price,
        year
    FROM Sales
)
SELECT product_id, year AS first_year, quantity, price
FROM t1
WHERE rn = 1
```

### 思路 2：行构造器 + MIN 子查询

```sql
SELECT product_id, year AS first_year, quantity, price
FROM Sales
WHERE (product_id, year) IN (
    SELECT product_id, MIN(year) AS year
    FROM Sales
    GROUP BY product_id
)
```

#### 📊 性能分析

- 时间复杂度：$O(n \log n)$（窗口函数按分区排序）
- 空间复杂度：$O(n)$

#### 思考

- **关键坑：必须用 `RANK` 而不是 `ROW_NUMBER`**。题面明确「一个产品可能在同一年内有多个销售条目」，第一年可能有多行；`RANK` 对同年并列都给 `rn = 1`（全保留），`ROW_NUMBER` 只会保留一行（同年第 2 条会被丢掉）。
- 不能用 `GROUP BY product_id` + `MIN(year)` 直接取行——聚合后 `quantity/price` 不在分组语义里，要么取到任意值（ONLY_FULL_GROUP_BY 直接报错），要么丢条目。
- MySQL 8 才支持窗口函数（本机 3307 的 8.0.12 可跑）；MySQL 5.7 只能写思路 2 的关联子查询形式。

## 📝 总结

「取每组最早/最新一批记录」优先想窗口函数；但要先审题——**并列条目是全取还是取一条**，决定用 `RANK` 还是 `ROW_NUMBER`。这道题的并列陷阱与 体育馆的人流量 的连续段分组一样，都是「先审数据形态再选函数」。

---
> 💡 补全「相关链接」是把题解织进知识网的关键一步。
