---
title: 产品销售分析 I
date: 2025-11-26
subject: 算法
category: 题目
number: "1068"
difficulty: 简单
topics:
  - sql
platform: LeetCode
tags:
  - sql
summary: SQL 基础联表题：Sales 表有 sale_id、product_id、year、price，Product 表存 product_name，要求列出所有销售的名称、年份和单价。直接 INNER JOIN 两表按 product_id 关联即可，是练「SELECT + JOIN」的最小模板。
---

# 产品销售分析 I
## 🎯 问题描述
销售表 `Sales`：

+-------------+-------+
| Column Name | Type  |
+-------------+-------+
| sale_id     | int   |
| product_id  | int   |
| year        | int   |
| quantity    | int   |
| price       | int   |
+-------------+-------+
(sale_id, year) 是销售表 Sales 的主键（具有唯一值的列的组合）。
product_id 是关联到产品表 Product 的外键（reference 列）。
该表的每一行显示 product_id 在某一年的销售情况。
注意: price 表示每单位价格。

产品表 `Product`：

+--------------+---------+
| Column Name  | Type    |
+--------------+---------+
| product_id   | int     |
| product_name | varchar |
+--------------+---------+
product_id 是表的主键（具有唯一值的列）。
该表的每一行表示每种产品的产品名称。

编写解决方案，以获取 `Sales` 表中所有 `sale_id` 对应的 `product_name` 以及该产品的所有 `year` 和 `price` 。

返回结果表 **无顺序要求** 。
## 💻 代码实现
```sql
# Write your MySQL query statement below
SELECT t2.product_name,t1.year,t1.price
FROM Sales t1
JOIN Product t2 ON t1.product_id =t2.product_id
```
