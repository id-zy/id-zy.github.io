---
title: SQL 的执行顺序：FROM 先走，WHERE 在 GROUP BY 之前
date: 2026-10-30
subject: 博客
category: 数据库
tags:
  - SQL
  - 数据库
  - JOIN
  - 执行顺序
  - 聚合
summary: SQL 写的顺序为什么不等于执行顺序、别名为什么只有 WHERE 用不了、LEFT JOIN 的条件放 ON 还是 WHERE 结果差在哪、COUNT 三兄弟的 NULL 差异、UNION 去重的真实代价，以及 IF 与 CASE 的三值逻辑陷阱。
---

# SQL 的执行顺序：FROM 先走，WHERE 在 GROUP BY 之前

写 SQL 时按 `SELECT … FROM … WHERE …` 的顺序敲键盘，于是很容易以为数据库也按这个顺序执行。实际上恰恰相反：`FROM` 是最先跑的，`SELECT` 反而是靠后的——这条顺序差，能解释掉一大半「为什么这么写会报错」。

这篇用一个顺序串起四件事：为什么某些语法位置看似不合理、五种 `JOIN` 到底谁的行被保留、`ON` 与 `WHERE` 在左连接里的致命区别、聚合与 `UNION` 的代价，最后收在两个条件表达式的 `NULL` 陷阱上。所有数字和报错原文都在 MySQL 8.0.12 上实测。

## 一、逻辑执行顺序：十个步骤

```text
FROM → ON → JOIN → WHERE → GROUP BY → HAVING → SELECT → DISTINCT → ORDER BY → LIMIT
```

| 步骤 | 此刻手里有什么 | 常见误会 |
| :--- | :--- | :--- |
| `FROM` | 确定基表，形成初始行集 | — |
| `ON` | 按连接条件匹配两边的行 | 以为 `ON` 能过滤 |
| `JOIN` | 生成连接后的行集 | 以为表顺序决定结果 |
| `WHERE` | 对行逐个过滤 | 以为能用 `SELECT` 的别名、能用聚合 |
| `GROUP BY` | 把行折叠成组 | 以为能引用 `SELECT` 里没聚合的列 |
| `HAVING` | 对组过滤 | 以为和 `WHERE` 等价 |
| `SELECT` | 计算表达式、生成别名 | 以为它最先执行 |
| `DISTINCT` | 对结果去重 | 以为去重在 `GROUP BY` 前 |
| `ORDER BY` | 排序，可用别名 | 以为排序在去重前 |
| `LIMIT` | 截断行数 | 以为能按组截断 |

记住「`SELECT` 排在第七位」这一件事，后面三节全是它的推论。

## 二、顺序解释的三个现象

### 现象一：别名在 `WHERE` 里用不了，但在 `GROUP BY`、`HAVING`、`ORDER BY` 里能用

这是最反直觉的一条。实测四种位置：

```sql
-- ① WHERE 用别名：报错
SELECT name AS 名字 FROM demo_users WHERE 名字 = '小明';
```

真实的报错原文：

```text
ERROR 1054 (42S22) at line 1: Unknown column '名字' in 'where clause'
```

```sql
-- ② GROUP BY 用别名：可以
SELECT name AS 名字, COUNT(*) AS c FROM demo_users GROUP BY 名字 ORDER BY 名字;

-- ③ HAVING 用别名：可以
SELECT user_id AS uid, COUNT(*) AS c FROM demo_orders GROUP BY uid HAVING c >= 2;

-- ④ ORDER BY 用别名：可以
SELECT name AS 名字 FROM demo_users ORDER BY 名字 DESC;
```

后三条都跑通了，输出分别是：

```text
名字	c
小刚	1
小明	1
小红	1
小美	1

uid	c
1	4

名字
小美
小红
小明
小刚
```

原因就是顺序：`WHERE` 在第五步，而别名要到第七步 `SELECT` 才诞生——**引用一个还不存在的东西，只能报错**。`GROUP BY`、`HAVING`、`ORDER BY` 虽然也在 `SELECT` 之前（`GROUP BY` 是第五步、`HAVING` 第六步），但 MySQL 对这三处做了别名解析的扩展，属于方言层面的宽容；`WHERE` 没有任何扩展余地。

（这里有一处必须说清：标准 SQL 并不允许 `GROUP BY`、`HAVING` 用别名，MySQL 允许是它的方言特性。换到 PostgreSQL 上，`GROUP BY 别名` 会报错。所以「别名能不能用」的准确表述是：**只有 `ORDER BY` 是标准行为，其余都是 MySQL 的宽容**。）

### 现象二：聚合条件不能放 `WHERE`

```sql
-- 报错
SELECT user_id, COUNT(*) FROM demo_orders WHERE COUNT(*) >= 2 GROUP BY user_id;
```

```text
ERROR 1111 (HY000) at line 1: Invalid use of group function
```

因为 `WHERE`（第五步）执行时还没分组，聚合函数无从计算；聚合函数要到 `GROUP BY`（第六步）之后才有效，所以它的过滤位置是 `HAVING`：

```sql
SELECT user_id, COUNT(*) AS 单数 FROM demo_orders GROUP BY user_id HAVING COUNT(*) >= 2;
```

```text
user_id	单数
1	4
```

### 现象三：窗口函数不能进 `WHERE`

窗口函数在 `SELECT` 阶段计算，比 `WHERE` 晚了整整三步，所以「组内排名前 N」必须写成「内层算名次、外层过滤」。这条在上篇讲 TopN 时已经踩过，根因就在这里。

## 三、五种 JOIN：关键是谁的行被保留

`JOIN` 的区分标准不是语法，而是「匹配不上时，哪一边的行会留下」。用两张各 3 行的表实测：

```sql
CREATE TABLE demo_a (id INT);  INSERT INTO demo_a VALUES (1),(2),(3);
CREATE TABLE demo_b (id INT);  INSERT INTO demo_b VALUES (2),(3),(4);

SELECT 'INNER' AS 类型, COUNT(*) AS 行数 FROM demo_a a INNER JOIN demo_b b ON a.id=b.id
UNION ALL SELECT 'LEFT',  COUNT(*) FROM demo_a a LEFT  JOIN demo_b b ON a.id=b.id
UNION ALL SELECT 'RIGHT', COUNT(*) FROM demo_a a RIGHT JOIN demo_b b ON a.id=b.id
UNION ALL SELECT 'CROSS', COUNT(*) FROM demo_a a CROSS JOIN demo_b b;
```

```text
类型	行数
INNER	2
LEFT	3
RIGHT	3
CROSS	9
```

具体留下的行：

```text
类型	a_id	b_id
LEFT	1	NULL
LEFT	2	2
LEFT	3	3
RIGHT	NULL	4
RIGHT	2	2
RIGHT	3	3
```

| 类型 | 保留谁 | 匹配不上时 |
| :--- | :--- | :--- |
| `INNER JOIN` | 只保留两边都匹配的行 | 直接丢弃 |
| `LEFT JOIN` | 保留左表全部 | 右表列为 `NULL` |
| `RIGHT JOIN` | 保留右表全部 | 左表列为 `NULL` |
| `CROSS JOIN` | 两表笛卡尔积 | 没有「匹配」概念 |
| `FULL JOIN` | 保留两边全部 | **MySQL 不支持** |

最后一行值得单独说：`FULL OUTER JOIN` 是标准 SQL，但 MySQL 至今没有实现，写了会得到语法错误：

```text
ERROR 1064 (42000) at line 1: You have an error in your SQL syntax; check the manual
that corresponds to your MySQL server version for the right syntax to use near
'FULL JOIN demo_b b ON a.id=b.id' at line 1
```

要模拟全外连接，只能 `LEFT JOIN` 与 `RIGHT JOIN` 各取一次再 `UNION`——这也解释了为什么 `UNION` 不是一个「可选的花活」，而是补 MySQL 短板的手段。

## 四、`ON` 与 `WHERE`：左连接里最致命的一个坑

这是本篇最值得记住的一节。同一句「查每个用户的金额大于 150 的订单」，条件写在 `ON` 还是 `WHERE`，结果集完全不同。

**条件放 `ON`**：

```sql
SELECT u.name, o.oid, o.amount
FROM demo_users u
LEFT JOIN demo_orders o
  ON o.user_id = u.id AND o.amount > 150;
```

```text
name	oid	amount
小明	106	500
小红	NULL	NULL
小刚	NULL	NULL
小美	NULL	NULL
```

4 行全在。左表的每个用户都保留，只有小明匹配到了 500 那一单，其余三人的订单列是 `NULL`。

**条件放 `WHERE`**：

```sql
SELECT u.name, o.oid, o.amount
FROM demo_users u
LEFT JOIN demo_orders o ON o.user_id = u.id
WHERE o.amount > 150;
```

```text
name	oid	amount
小明	106	500
```

只剩 1 行。因为左连接先产生 4 行（含 3 行订单列为 `NULL` 的），`WHERE` 再把 `o.amount > 150` 不成立的行筛掉——而 `NULL > 150` 是 `UNKNOWN`，同样不成立。**左连接就此退化成了内连接**。

一句话记住：**`ON` 决定「怎么连」，`WHERE` 决定「留哪些」**。左连接想保住左表全部，过滤条件必须进 `ON`。

反过来说，如果你**就是要**过滤掉没匹配的行，那写 `WHERE` 反而是对的——甚至比写 `INNER JOIN` 更能表达「我先连再看」的意图。所以这里没有对错，只有「你想要哪种语义」，而多数线上事故是「想要 `ON`、写成了 `WHERE`」。

## 五、`WHERE` / `GROUP BY` / `HAVING` 的分工

三者的分工是三层过滤：

| 子句 | 作用对象 | 时机 | 能用聚合 |
| :--- | :--- | :--- | :--- |
| `WHERE` | 行 | 分组前 | ❌ |
| `GROUP BY` | 把行折叠成组 | 中间 | ❌ |
| `HAVING` | 组 | 分组后 | ✅ |

判据很简单：**条件是「某一行的属性」就放 `WHERE`，是「整组的统计值」就放 `HAVING`**。`amount > 150` 是行属性，`COUNT(*) >= 2` 是组统计。

顺带把 `COUNT` 的三个形态分清。用 6 行订单、其中 1 行 `amount` 为 `NULL`、两行 `amount` 都是 100 的数据实测：

```sql
SELECT COUNT(*) AS 星号, COUNT(amount) AS 列名, COUNT(DISTINCT amount) AS 去重列 FROM demo_orders;
```

```text
星号	列名	去重列
6	5	4
```

| 写法 | 数什么 | 本例 |
| :--- | :--- | ---: |
| `COUNT(*)` | 行数，包括全 `NULL` 的行 | 6 |
| `COUNT(列)` | 该列非 `NULL` 的行数 | 5 |
| `COUNT(DISTINCT 列)` | 该列非 `NULL` 的不同值个数 | 4 |

三者差在「连不连 `NULL` 一起数」，一旦表里有 `NULL`，混用就会得出不同结论——而这类差异在报表上通常表现为「合计对不上」，最难排查。

## 六、`UNION` 与 `UNION ALL`：去重的真实代价

`UNION` 合并后去重，`UNION ALL` 不去重。规则层面还有五条：列数必须相同、对应列类型兼容、最终列名取第一个 `SELECT`、`ORDER BY` 只能写最后、`LIMIT` 也写在最后。

「必须优先用 `UNION ALL`」是常见建议，理由是去重慢。实测一下这张账到底多大——两张表分别 4.8 万行和 2.4 万行、有 3000 行重叠、列为 `INT`：

```sql
SELECT 'UNION ALL' AS 写法, COUNT(*) FROM (SELECT id FROM demo_ua UNION ALL SELECT id FROM demo_ub) t
UNION ALL
SELECT 'UNION', COUNT(*) FROM (SELECT id FROM demo_ua UNION SELECT id FROM demo_ub) t;
```

```text
写法	行数
UNION ALL	72000
UNION	69000
```

服务端循环 20 次计时：

| 写法 | 20 次总耗时 | 折合单次 |
| :--- | ---: | ---: |
| `UNION ALL` | 8,059,442 µs | 约 403 ms |
| `UNION` | 9,000,534 µs | 约 450 ms |

去重带来的增量是 **47 ms（约 12%）**，不是数量级差异。这里必须补一句诚实的说明：那 403 ms 的绝对值里，绝大部分是「派生表物化」的开销——同样 4.8 万行单独 `COUNT(*)` 只要 16 µs。所以 **12% 才是去重的净代价**，不要拿这个绝对值去推「UNION 慢得要死」。

执行计划能佐证多出来的那一步：

```text
id  select_type  table        type  rows   Extra
1   PRIMARY      demo_ua      ALL   48000  NULL
2   UNION        demo_ub      ALL   24000  NULL            -- UNION ALL 到此为止

1   PRIMARY      demo_ua      ALL   48000  NULL
2   UNION        demo_ub      ALL   24000  NULL
NULL UNION RESULT <union1,2>  ALL   NULL   Using temporary  -- UNION 多一个临时表
```

所以更准确的结论是：**在 `INT` 列、十万行以内的规模上，去重的性能代价很小；但它是确定的语义变化——行数会变（72000 → 69000）**。选 `UNION ALL` 的首要理由是「我知道这里不需要去重」，而不是「它更快」。如果列是长字符串、或者数据量再上一个量级，去重要走排序或哈希，代价才会明显放大。

## 七、`IF` 与 `CASE WHEN`：两个分支用 `IF`，多分支用 `CASE`

`IF(条件, 真值, 假值)` 是 MySQL 的三元**函数**（参数用逗号），`CASE WHEN … THEN … ELSE … END` 是标准 SQL 的**表达式**。两者不能混写，也各有一处 `NULL` 陷阱。

### 选型判据

| 维度 | `IF(cond, a, b)` | `CASE WHEN` |
| :--- | :--- | :--- |
| 标准性 | MySQL 方言（Hive / Spark 也有 `if()`） | 标准 SQL，全库通用 |
| 分支数 | 2，更多要靠嵌套 | 任意多个 |
| 可读性 | 短，嵌套两层就开始难读 | 长但线性 |
| 迁移风险 | PostgreSQL 无此函数，换库成片报错 | 无 |

一句话：**只在 MySQL 跑就 `IF`，要交付、要迁移、要给别人看就 `CASE`**。

### 陷阱一：`IF` 只认 `TRUE`，`NULL` 走假分支

```sql
SELECT IF(1=1,'真','假')          AS `IF(1=1)`,
       IF(NULL,'真','假')         AS `IF(NULL)`,
       IF(NULL=NULL,'真','假')    AS `IF(NULL=NULL)`,
       IF(1=NULL,'真','假')       AS `IF(1=NULL)`;
```

```text
IF(1=1)	IF(NULL)	IF(NULL=NULL)	IF(1=NULL)
真	假	假	假
```

后三列全是「假」。原因是 SQL 的布尔是三值逻辑：`TRUE` / `FALSE` / `UNKNOWN`，而 `IF` 只在条件为 `TRUE` 时才走真分支。`NULL = NULL` 的结果不是 `TRUE`，是 `UNKNOWN`。

所以判空必须用 `IS NULL`：

```sql
SELECT IF('x'='x','真','假')      AS 正常比较,
       IF(NULL IS NULL,'真','假') AS 正确判空;
```

```text
正常比较	正确判空
真	真
```

写成 `IF(col = NULL, …)` 是一类特别讨厌的 bug：**不报错、不警告，只是永远走假分支**。

### 陷阱二：`CASE WHEN col = NULL` 永不成立

`CASE WHEN` 里的条件同样是三值逻辑，`col = NULL` 永远不是 `TRUE`，那个分支永远进不去。要判断空值，`CASE` 里也得写 `WHEN col IS NULL`。

### 条件计数的三种写法

同一个需求（数出满足条件的行数）有三种写法，结果等价：

```sql
SELECT subject,
       COUNT(*)                                  AS total,
       SUM(IF(is_correct = 1, 1, 0))              AS correct_cnt,
       COUNT(CASE WHEN is_correct = 1 THEN 1 END) AS correct_cnt2
FROM v_answer_detail
GROUP BY subject;
```

第三种省掉了 `ELSE`：不满足条件时表达式是 `NULL`，而 `COUNT` 天然跳过 `NULL`，语义正好是「数满足条件的行」。这也是为什么 `COUNT(IF(x=1, 1, NULL))` 里那个 `NULL` 不能省——写成 `0` 就变成「数所有行」了。

还有一点容易被忽略：条件计数**不能用 `WHERE` 代替**。`WHERE is_correct = 1` 会把不满足的行整行扔掉，`COUNT(*)` 只剩满足条件的行数，「总数」那一列就没了。`SUM` / `COUNT` 加条件表达式，才能在一行里同时算出总数和分子。

## 八、把顺序当工具用

顺序表不只是背概念，它是一把诊断尺子。遇到报错时按步骤倒推，通常几秒就能定位：

| 症状 | 位置 | 原因 |
| :--- | :--- | :--- |
| `Unknown column` 报别名 | `WHERE` | 别名在 `SELECT`（第七步）才生成 |
| `Invalid use of group function` | `WHERE` | 聚合在 `GROUP BY` 之后才有效 |
| 窗口函数写不进 `WHERE` | `WHERE` | 窗口函数在 `SELECT` 阶段算 |
| 左连接结果变少 | `WHERE` 过滤了右表列 | `WHERE` 会把 `NULL` 行筛掉，语义退化为内连接 |
| 合计列对不上 | `COUNT(*)` 与 `COUNT(列)` 混用 | 后者跳过 `NULL` |
| 明明有数据却查不出来 | `NOT IN` / `= NULL` | 三值逻辑，`UNKNOWN` 不为真 |

## 小结

- 执行顺序是 `FROM → ON → JOIN → WHERE → GROUP BY → HAVING → SELECT → DISTINCT → ORDER BY → LIMIT`，`SELECT` 排在第七位，所有「为什么这里报错」都是它造成的。
- 别名只有 `ORDER BY` 是标准可用；`GROUP BY`/`HAVING` 能用是 MySQL 方言，`WHERE` 永远不行（实测报 `ERROR 1054`）。
- 聚合条件放 `WHERE` 报 `ERROR 1111 Invalid use of group function`，必须放 `HAVING`。
- `JOIN` 的判据是「谁的行被保留」；MySQL 没有 `FULL OUTER JOIN`，写了报 `ERROR 1064`，只能 `LEFT UNION RIGHT` 模拟。
- 左连接里条件放 `ON` 保住左表全部（实测 4 行），放 `WHERE` 退化为内连接（实测 1 行）——**`ON` 管怎么连，`WHERE` 管留哪些**。
- `COUNT(*)` / `COUNT(列)` / `COUNT(DISTINCT 列)` 在含 `NULL` 的表上分别是 6 / 5 / 4，混用就是「合计对不上」的根源。
- `UNION` 的去重代价在 7.2 万行 `INT` 列上只有约 12%（450 ms vs 403 ms），真正的理由是行数语义会变（72000 → 69000），不是性能。
- `IF` 与 `CASE` 都受三值逻辑约束：`NULL` 条件走假分支、`= NULL` 永不成立，判空只能用 `IS NULL`。
