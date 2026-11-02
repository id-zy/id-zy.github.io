---
title: 好友申请 II ：谁有最多的好友
date: 2026-10-03
subject: 算法
category: 题目
number: "602"
difficulty: 中等
topics:
  - sql
platform: LeetCode
tags:
  - sql
summary: 「双向关系列转行」套路：好友是双向的，UNION ALL 把 requester_id 与 accepter_id 纵向拼成一列（不能用会去重的 UNION），GROUP BY 计数后 ORDER BY DESC LIMIT 1；进阶版用 RANK() 取并列第一。O(n log n)，与 [[SQL-行转列与列转行]] 互相印证。
---

# 602. 好友申请 II ：谁有最多的好友

> **难度**：中等 | **题号**：602 | **链接**：[602. 好友申请 II ：谁有最多的好友 - 力扣（LeetCode）](https://leetcode.cn/problems/friend-requests-ii-who-has-the-most-friends/description/)
>
> 关联：SQL-TopN查询（TopN / 排名）· 项目员工I · 各赛事的注册率 同为分组聚合题。

## 🎯 问题描述

**描述**：找出拥有**最多好友**的人和他拥有的好友数目。

好友是**双向**的：`requester_id` 和 `accepter_id` 都要算进各自的好友数。

**表：RequestAccepted**

```text
+----------------+---------+
| Column Name    | Type    |
+----------------+---------+
| requester_id   | int     |
| accepter_id    | int     |
| accept_date    | date    |
+----------------+---------+
(requester_id, accepter_id) 是这张表的主键。
包含发送好友请求的人的 ID、接收好友请求的人的 ID，以及请求通过的日期。
```

**示例 1**：

```text
输入：
RequestAccepted 表：
+--------------+-------------+-------------+
| requester_id | accepter_id | accept_date |
+--------------+-------------+-------------+
| 1            | 2           | 2016/06/03  |
| 1            | 3           | 2016/06/08  |
| 2            | 3           | 2016/06/08  |
| 3            | 4           | 2016/06/09  |
+--------------+-------------+-------------+
输出：
+----+-----+
| id | num |
+----+-----+
| 3  | 3   |
+----+-----+
解释：编号 3 是 1、2、4 的好友，共 3 个，比其他人都多。
```

**提示**：

- 生成的测试用例保证拥有最多好友数目的只有 1 个人。
- **进阶**：如果有多个人好友数相同且最多，如何找出所有这些人？

## 💻 解题思路

### 思路1：列转行 + GROUP BY + LIMIT（用户解法）

#### 核心逻辑

关键点：**好友关系是双向的** —— `requester_id` 和 `accepter_id` 都是"人"。用 `UNION ALL` 把两列**纵向拼成一列**（列转行），得到一个"每个人出现的每一行"，再 `GROUP BY id` 数出现次数，降序取第一条。

#### 代码实现

```sql
SELECT id, COUNT(*) AS num
FROM (
    SELECT requester_id AS id FROM RequestAccepted
    UNION ALL
    SELECT accepter_id  AS id FROM RequestAccepted
) T
GROUP BY id
ORDER BY num DESC
LIMIT 1;
```

> 这里必须用 `UNION ALL` 而不是 `UNION`：`UNION` 会去重，而"同一对关系/同一人的多条记录"本就是多条，去重会把好友数算少。

### 思路2：进阶版（并列最多全要）

用窗口函数 `RANK()` 代替 `LIMIT 1`，名次为 1 的全部返回：

```sql
SELECT id, num
FROM (
    SELECT id, COUNT(*) AS num,
           RANK() OVER (ORDER BY COUNT(*) DESC) AS rk
    FROM (
        SELECT requester_id AS id FROM RequestAccepted
        UNION ALL
        SELECT accepter_id  AS id FROM RequestAccepted
    ) T
    GROUP BY id
) tmp
WHERE rk = 1;
```

#### 📊 性能分析

- 时间复杂度：$O(n \log n)$（UNION ALL 展开 2N 行 + 分组排序；有索引可优化）。
- 空间复杂度：$O(n)$。

#### 思考

- 题目给的是"好友请求通过"，隐含**无重复申请**；若真实场景存在重复，需先去重。
- 这是典型的 **「两列同权 → 列转行成一行再聚合」** 套路，和 SQL-行转列与列转行 的列转行一致。

## 📝 总结

**双向关系数一列**：`UNION ALL` 两列 → `GROUP BY` 计数 → `ORDER BY DESC LIMIT 1`。并列场景把 `LIMIT` 换成 `RANK() = 1`。
