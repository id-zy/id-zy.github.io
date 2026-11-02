---
title: 使用唯一标识码替换员工ID
date: 2025-11-25
subject: 算法
category: 题目
number: "1378"
difficulty: 简单
topics:
  - sql
platform: LeetCode
tags:
  - sql
summary: SQL 联表入门题：展示每位员工的 unique_id，没有的填 NULL——这正是 LEFT JOIN 的定义场景。若用 INNER JOIN，没有标识码的员工会被整行丢掉，不符合题意。与「从不订购的用户」对照，一题保留「没有的」，一题过滤「没有的」，方向相反。
---

# 使用唯一标识码替换员工ID
## 🎯 问题描述
`Employees` 表：
+---------------+---------+
| Column Name   | Type    |
+---------------+---------+
| id            | int     |
| name          | varchar |
+---------------+---------+
在 SQL 中，id 是这张表的主键。
这张表的每一行分别代表了某公司其中一位员工的名字和 ID 。
`EmployeeUNI` 表：
+---------------+---------+
| Column Name   | Type    |
+---------------+---------+
| id            | int     |
| unique_id     | int     |
+---------------+---------+
在 SQL 中，(id, unique_id) 是这张表的主键。
这张表的每一行包含了该公司某位员工的 ID 和他的唯一标识码（unique ID）。
展示每位用户的 **唯一标识码（unique ID ）**；如果某位员工没有唯一标识码，使用 null 填充即可。
你可以以 **任意** 顺序返回结果表。
## 💻 代码实现
```sql
# Write your MySQL query statement below
SELECT t2.unique_id, t1.name
FROM Employees t1
LEFT JOIN EmployeeUNI t2 
ON t1.id = t2.id;
```
