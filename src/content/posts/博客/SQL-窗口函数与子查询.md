---
title: SQL 窗口函数：不分组也能排名，以及 CTE、子查询与 TopN 怎么配合
date: 2026-10-30
subject: 博客
category: 数据库
tags:
  - SQL
  - 数据库
  - 窗口函数
  - 子查询
  - CTE
summary: 窗口函数为什么不折叠行、三种排名函数在并列值上的分号差异、TopN 为什么必须套子查询、NOT IN 遇 NULL 为什么返回空集、EXISTS 与 IN 到底差在性能还是语义，以及递归 CTE 的锚点写法。
---

# SQL 窗口函数：不分组也能排名，以及 CTE、子查询与 TopN 怎么配合

「每个部门取工资最高的 3 个人」——这句话用 `GROUP BY` 写不出来，因为它必然要把部门折叠成一行，而你需要的却是**每一行的员工，外加一个部门内的名次**。窗口函数就是为这种「保留原行 + 附加计算」的需求存在的。

这篇把四件事串成一条线：窗口函数怎么算、TopN 为什么必须套子查询、子查询的 NULL 陷阱、CTE 怎么把长查询拆开。所有结论都在 MySQL 8.0.12 上实跑过，输出原样贴出。

## 一、窗口函数和 GROUP BY 差在哪

`GROUP BY` 的产物是「一组一行」，组内细节被聚合函数吃掉了；窗口函数的产物是「一行还是一行」，只是每行多了一列「按某个范围算出来的值」。

用 5 行员工数据看这个差别：

```sql
CREATE TABLE demo_emp (id INT PRIMARY KEY, name VARCHAR(10), dept VARCHAR(10), salary INT);
INSERT INTO demo_emp VALUES
(1,'张三','研发',20000),(2,'李四','研发',20000),(3,'王五','研发',15000),
(4,'赵六','市场',12000),(5,'孙七','市场',9000);

SELECT dept, name, salary,
       SUM(salary) OVER (PARTITION BY dept) AS 部门总薪,
       salary * 100 / SUM(salary) OVER (PARTITION BY dept) AS 占比百分比
FROM demo_emp
ORDER BY dept DESC, salary DESC;
```

实测输出：

```text
dept	name	salary	部门总薪	占比百分比
研发	张三	20000	55000	36.3636
研发	李四	20000	55000	36.3636
研发	王五	15000	55000	27.2727
市场	赵六	12000	21000	57.1429
市场	孙七	9000	21000	42.8571
```

5 行进去、5 行出来，每行都带上了「自己部门的总薪」和「自己在部门里的占比」。如果用 `GROUP BY dept` 求总薪，只剩 2 行，占比就无处可放——除非再 `JOIN` 回原表，那正是窗口函数替你省掉的一步。

## 二、语法三段：PARTITION BY、ORDER BY、窗口帧

```sql
函数名() OVER (
  PARTITION BY 分区列   -- 把行分成几组，组内各自独立计算
  ORDER BY 排序列       -- 组内排序，决定名次、累计、上一条/下一条
  窗口帧                 -- 当前行计算时纳入哪些行
)
```

| 部分 | 作用 | 省略时 |
| :--- | :--- | :--- |
| `PARTITION BY` | 分组，类似 `GROUP BY` 但不折叠行 | 整个结果集算一个分区 |
| `ORDER BY` | 组内排序，排名与累计的顺序依据 | 无顺序，`SUM` 变成整组求和 |
| 窗口帧 | 限定参与计算的行范围 | 有 `ORDER BY` 时默认「从分区第一行到当前行」 |

第三段是最容易被忽略的一段。同样是 `SUM(salary) OVER (ORDER BY id)`，加上默认帧就是**累计值**；一旦写成 `OVER (PARTITION BY dept)`（没有 `ORDER BY`），就变成**整组总和**。这两个写法长得像，语义完全不同。

`LAST_VALUE` 是帧的经典坑：默认帧止于当前行，所以 `LAST_VALUE(col) OVER (ORDER BY x)` 每行返回的都是「自己」，而不是分区里最后一个值。要拿真正的末值，必须显式写 `ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING`。

## 三、三类窗口函数：排名、聚合、偏移

日常用得最多的是三类，记住分类比记住函数名有用。

### 1. 排名三兄弟

| 函数 | 并列时的行为 | 名次是否跳号 | 典型口径 |
| :--- | :--- | :--- | :--- |
| `ROW_NUMBER()` | 强行分出先后（1、2、3） | 不跳号 | 要「恰好 N 条」 |
| `RANK()` | 并列同名次（1、1、3） | **跳号** | 要「不低于第 N 名」 |
| `DENSE_RANK()` | 并列同名次（1、1、2） | 不跳号 | 要「N 个档位」 |

研发部门有两个 20000 的并列值，实测能直接看出三者的分歧：

```text
dept	name	salary	rn	rk	drk
研发	李四	20000	2	1	1
研发	张三	20000	1	1	1
研发	王五	15000	3	3	2
市场	赵六	12000	1	1	1
市场	孙七	9000	2	2	2
```

同一份数据：`ROW_NUMBER` 把张三、李四强行排成 1 和 2（谁在前取决于内部顺序，不稳定）；`RANK` 两人都是 1，下一个人直接跳到 3；`DENSE_RANK` 两人都是 1，下一个人是 2。

### 2. 聚合窗口

`SUM` / `AVG` / `COUNT` / `MAX` / `MIN` 加上 `OVER` 就是聚合窗口。配 `ORDER BY` 得到累计值，配 `PARTITION BY` 得到组内值：

```sql
SELECT ym, revenue,
       SUM(revenue) OVER (ORDER BY ym) AS 累计,
       LAG(revenue, 1) OVER (ORDER BY ym) AS 上月,
       revenue - LAG(revenue, 1) OVER (ORDER BY ym) AS 环比增量
FROM demo_month ORDER BY ym;
```

```text
ym	revenue	累计	上月	环比增量
2026-07	100	100	NULL	NULL
2026-08	130	230	100	30
2026-09	120	350	130	-10
2026-10	180	530	120	60
```

第一行 `上月` 是 `NULL`、环比自然也是 `NULL`——这是「第一个月没有环比」的正确表达，不是数据缺失。

### 3. 偏移函数

`LAG(col, n, default)` 往回取第 n 行、`LEAD` 往后取。环比用 `LAG(…, 1)`、同比用 `LAG(…, 12)`（按月数据）。第三个参数给默认值，可以避免第一行出现 `NULL`，但对「上月」这种确实不存在的场景，保留 `NULL` 比塞 0 更诚实。

## 四、TopN：为什么必须套一层子查询

窗口函数有一个硬限制：**不能写在 `WHERE` 里**。因为 `WHERE` 的执行阶段早于窗口函数的计算阶段，此时名次列还不存在。所以 TopN 的标准形态固定为「内层算名次、外层过滤」：

```sql
SELECT * FROM (
  SELECT dept, name, salary,
         ROW_NUMBER() OVER (PARTITION BY dept ORDER BY salary DESC) AS rn
  FROM demo_emp
) t WHERE rn <= 1 ORDER BY dept DESC;
```

```text
dept	name	salary	rn
研发	张三	20000	1
市场	赵六	12000	1
```

研发只出 1 个人。同样的需求把 `ROW_NUMBER` 换成 `RANK`：

```text
dept	name	salary	rk
研发	张三	20000	1
研发	李四	20000	1
市场	赵六	12000	1
```

研发出了 2 个人。**同一句「前 1 名」，两个函数给出两种人数**——这不是谁对谁错，是业务口径问题：HR 要「每个部门提 1 个名额」就用 `ROW_NUMBER`；要「工资不低于部门第一名的都算」就用 `RANK`。

四种 TopN 写法的差别：

| 写法 | 组内取 N | 并列处理 | 适用 |
| :--- | :---: | :--- | :--- |
| 子查询 + `ROW_NUMBER` | ✅ | 硬性截断到 N 条 | 名额制 |
| 子查询 + `RANK` | ✅ | 并列一起入围，可能超 N | 名单制 |
| 子查询 + `DENSE_RANK` | ✅ | 按档位算，可能超 N | 档位制 |
| `ORDER BY … LIMIT n` | ❌ | — | 只能取全局 TopN，组内取不了 |

第四种是最常见的误用：`LIMIT` 作用在整个结果集上，不是每个分组上。想组内取 N，只能走前三种。

## 五、子查询四型：标量、IN、EXISTS、相关

子查询按「返回什么」分四类，判断标准很清楚：

```sql
-- ① 标量子查询：单行单列，当一个值用
SELECT name, salary,
       (SELECT AVG(salary) FROM demo_emp e2 WHERE e2.dept_id = e1.dept_id) AS 部门均值
FROM demo_emp e1;

-- ② IN 子查询：一列多行，当一个集合用
SELECT * FROM demo_users
WHERE id IN (SELECT user_id FROM demo_orders);

-- ③ EXISTS 子查询：只判断有没有行，返回布尔
SELECT * FROM demo_users u
WHERE EXISTS (SELECT 1 FROM demo_orders o WHERE o.user_id = u.id);

-- ④ 相关子查询：引用了外层列，不能独立执行
SELECT * FROM demo_emp e1
WHERE salary > (SELECT AVG(salary) FROM demo_emp e2 WHERE e2.dept = e1.dept);
```

`①` 返回多行会直接报错；`③` 里写 `SELECT 1` 还是 `SELECT *` 没有区别，因为优化器只关心行数是否存在；`④` 的特殊之处是它必须逐行依赖外层，逻辑上执行 N 次，外层大且无索引时最慢，优化器也常把它改写成 `JOIN` 或半连接。

## 六、NOT IN 的 NULL 陷阱：一行都查不出来

「找出从没下过单的用户」，直觉写法是 `NOT IN`。但只要子查询结果里出现一个 `NULL`，这条 SQL 就会**静默返回空集**——不报错，就是没数据，最容易在生产上误判成「业务上确实没有」。

构造一个只有 4 行订单、其中 1 行 `user_id` 为 `NULL` 的表：

```sql
INSERT INTO demo_orders VALUES (101,1),(102,1),(103,2),(104,NULL);

-- ① 直觉写法：返回 0 行
SELECT * FROM demo_users WHERE id NOT IN (SELECT user_id FROM demo_orders);

-- ② 正确写法：返回 小刚、小美
SELECT * FROM demo_users u
WHERE NOT EXISTS (SELECT 1 FROM demo_orders o WHERE o.user_id = u.id);
```

实测输出，`NOT IN` 一行都没有：

```text
（空结果集）

id	name
3	小刚
4	小美
```

原因是一行布尔代数推导：`id NOT IN (1, 2, NULL)` 展开成 `id <> 1 AND id <> 2 AND id <> NULL`，而任何值与 `NULL` 比较的结果是 `UNKNOWN` 而不是 `FALSE`，`UNKNOWN AND …` 永远不为真，整个条件就塌了。实测验证这一点：

```text
1不等于NULL	结果是NULL
NULL	1
```

`1 <> NULL` 返回 `NULL`，`IS NULL` 判断为 1（真）。**所以「找不存在」一律用 `NOT EXISTS`**，它按行是否存在判断，不做 `NULL` 比较，天然没有这个坑。

顺带说一个容易被误用的「补救」：`WHERE id NOT IN (SELECT user_id FROM orders WHERE user_id IS NOT NULL)` 确实能跑出正确结果，但它把「数据里有脏 NULL」这件事实悄悄藏起来了——`NULL` 的 `user_id` 本身就是数据质量问题，值得单独排查，而不是在查询里抹平。

## 七、EXISTS 和 IN 到底差在哪：实测推翻了「EXISTS 更快」

面试标准答案是「EXISTS 常比 IN 快，因为找到即停、不用去重、能利用索引」。在 MySQL 8 上实测，这个说法**只在语义上成立，性能上已经不成立**。

小表、无索引时，两者的执行计划确实不同：

```text
-- EXISTS：依赖子查询，外层每行执行一次
id  select_type        table  type  key          rows  Extra
1   PRIMARY            u      ALL   NULL         4     Using where
2   DEPENDENT SUBQUERY o      ALL   NULL         4     Using where

-- IN：先物化子查询再等值匹配
id  select_type   table         type     key      ref                  Extra
1   SIMPLE        <subquery2>   ALL      NULL     NULL
2   MATERIALIZED  demo_orders   ALL      NULL     NULL
```

给小表加上 `user_id` 索引、数据涨到 1 万行之后，`IN` 被优化器改写成了半连接：

```text
id  select_type  table        type  key          rows  Extra
1   SIMPLE       demo_users   ALL   NULL         7     NULL
1   SIMPLE       demo_orders  ref   idx_user_id  116   Using index; FirstMatch(demo_users)
```

`FirstMatch` 就是「找到第一条匹配就停」——和 `EXISTS` 的语义优化做的是同一件事。在服务端循环 200 次计时（避开客户端启动开销）：

| 写法 | 200 次总耗时 | 折合单次 |
| :--- | ---: | ---: |
| `EXISTS` | 4658 µs | 约 23 µs |
| `IN` | 5185 µs | 约 26 µs |
| `NOT EXISTS` | 13401 µs | 约 67 µs |
| `NOT IN` | 13430 µs | 约 67 µs |

`EXISTS` 只快 3 µs，在 1 万行规模上基本是噪声。**结论应该修正成**：性能不该作为二选一的理由，选型看语义——`IN` 适合「值在集合里」，`EXISTS` 适合「存在关联行」；而涉及否定时，`NOT IN` 有 `NULL` 陷阱，必须用 `NOT EXISTS`。这条才是有实际后果的差别。

（要强调的是：这个结论依赖 MySQL 8 的半连接优化。5.7 及更早、或其他数据库的优化器行为可能不同，换环境要重新看 `EXPLAIN`。）

## 八、CTE 与递归 CTE：给中间结果起名字

CTE 就是「临时起个名字的中间结果集」，只在当前查询存活。它比子查询多三件事：**能起名字、能被多次引用、能递归**。

```sql
WITH dept_total AS (
    SELECT dept, SUM(salary) AS total FROM demo_emp GROUP BY dept
),
dept_rank AS (
    SELECT dept, total,
           RANK() OVER (ORDER BY total DESC) AS rk
    FROM dept_total
)
SELECT * FROM dept_rank WHERE rk <= 2;
```

多个 CTE 用逗号连接，后面的可以引用前面的——这让「一个查询拆成几步」变得可读，而不是嵌套三层子查询。

递归 CTE 处理层级结构，结构是固定三段：**锚点成员 + `UNION ALL` + 递归成员**。用组织架构表实测：

```sql
WITH RECURSIVE org_tree AS (
    SELECT id, name, manager_id, 1 AS lvl, CAST(name AS CHAR(100)) AS path
    FROM demo_org WHERE manager_id IS NULL            -- 锚点：从根开始
    UNION ALL
    SELECT e.id, e.name, e.manager_id, t.lvl + 1, CONCAT(t.path, ' > ', e.name)
    FROM demo_org e JOIN org_tree t ON e.manager_id = t.id   -- 递归：挂到上一层下面
)
SELECT lvl, name, path FROM org_tree ORDER BY path;
```

```text
lvl	name	path
1	CEO	CEO
2	CFO	CEO > CFO
2	CTO	CEO > CTO
3	前端组长	CEO > CTO > 前端组长
4	开发工程师	CEO > CTO > 前端组长 > 开发工程师
```

每一轮递归都把「上一层的节点」当父节点去找子节点，找不到新行时自动停止。三个注意点：必须有终止条件（否则受 `cte_max_recursion_depth` 默认 1000 层限制后报错）；递归成员里不能用 `ORDER BY`、`GROUP BY` 或聚合函数；`CAST` 那一步是必要的，路径列的宽度要一开始就定够，否则 `CONCAT` 会被截断。

## 九、选型判据：先问「行要不要保留」

这四类工具容易混用，判据其实只有一条主线：

| 需求 | 用什么 | 理由 |
| :--- | :--- | :--- |
| 每行保留，附加组内计算 | 窗口函数 | 不折叠行 |
| 每组只要一行汇总 | `GROUP BY` + 聚合 | 折叠是目的 |
| 组内取前 N | 子查询 + 排名函数 | 窗口函数不能进 `WHERE` |
| 全局取前 N | `ORDER BY` + `LIMIT` | 不需要分组 |
| 判断「有没有关联行」 | `EXISTS` | 存在性判断 |
| 判断「不在集合里」 | `NOT EXISTS` | 避开 `NULL` 陷阱 |
| 同一逻辑要用两次 | CTE | 起名字、可复用 |
| 层级、树、连续序列 | 递归 CTE | 锚点 + 递归 |

## 小结

- 窗口函数的核心是**不折叠行**：N 行进、N 行出，每行多一列组内计算值。
- 语法三段里最容易错的是**窗口帧**：有 `ORDER BY` 时默认「到当前行」，所以 `SUM` 是累计；`LAST_VALUE` 必须显式指帧。
- 排名三兄弟按业务口径选：要名额用 `ROW_NUMBER`，要名单用 `RANK`，要档位用 `DENSE_RANK`。
- TopN 必须「内层排名 + 外层过滤」，因为窗口函数不能写在 `WHERE` 里；`LIMIT` 只能取全局。
- `NOT IN` 遇 `NULL` 返回空集是**语义塌陷**，不是性能问题，否定一律用 `NOT EXISTS`。
- `EXISTS` 与 `IN` 在 MySQL 8 上执行计划已趋同（半连接 `FirstMatch`），实测差 3 µs——选型看语义，不看速度。
- 递归 CTE 记三件套：锚点、`UNION ALL`、递归引用自身；没有终止条件会被 `cte_max_recursion_depth` 拦住。
