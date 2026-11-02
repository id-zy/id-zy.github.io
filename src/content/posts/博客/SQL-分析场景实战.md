---
title: SQL 分析实战：漏斗、留存、连续 N 天与同环比
date: 2026-10-30
subject: 博客
category: 数据库
tags:
  - SQL
  - 数据库
  - 数据分析
  - 漏斗
  - 留存
summary: 漏斗的宽松与严格口径为什么差 20 倍、留存为什么必须精确到第 N 天、连续登录怎么用日期减行号分组、同环比忘写 PARTITION BY 为什么会串数据、行转列为什么用 SUM 不用 MAX、列转行为什么必须是 UNION ALL，以及五段可默写的骨架。
---

# SQL 分析实战：漏斗、留存、连续 N 天与同环比

业务分析的 SQL 题，八成的命中率集中在五类：漏斗、留存、连续 N 天、TopN、同环比。它们看起来各不相关，其实是**两个套路的变体**——想清这一点，就不用背五份答案。

这篇用 `sprint_sql` 里的三张真实业务表（1349 条事件、369 条登录记录、54 条月度收入）把五类场景全部跑一遍。所有输出都是真实结果，不编数据。

## 一、五类问题其实是两个套路

分界线是「同一实体在时间上多次出现」还是「同一指标在不同维度上对齐」：

| 套路 | 问题形态 | 涉及题型 | 核心技术 |
| :--- | :--- | :--- | :--- |
| **时间轴上的多事件** | 同一个用户在不同时间点做了多件事 | 漏斗、留存、连续 N 天 | 按用户聚合时间 + 时间差 + 排名 |
| **维度上的单指标** | 同一个指标要在不同期间 / 类别间比较 | 同环比、行列转换、TopN | 窗口函数 + 条件聚合 |

第一类要解决的是「**时间关系**」：谁在什么时候做了什么，顺序对不对、间隔多少天、连续了几天。第二类要解决的是「**位置关系**」：当前这一行该跟哪一行比、该放到哪一列。

## 二、漏斗：先定口径，再算转化率

「注册 → 激活 → 首次答题 → 提交作业 → 付费」是典型的五步漏斗。同样的数据，两种口径算出来的付费人数差了近 20 倍。

### 口径一：到达率（宽松）

只要用户**曾经**触发过这个事件就算。一行 SQL 出五列：

```sql
SELECT COUNT(DISTINCT CASE WHEN event_name='register'        THEN user_id END) AS 注册,
       COUNT(DISTINCT CASE WHEN event_name='activate'        THEN user_id END) AS 激活,
       COUNT(DISTINCT CASE WHEN event_name='first_answer'    THEN user_id END) AS 首次答题,
       COUNT(DISTINCT CASE WHEN event_name='submit_homework' THEN user_id END) AS 提交作业,
       COUNT(DISTINCT CASE WHEN event_name='pay'             THEN user_id END) AS 付费
FROM funnel_event;
```

```text
注册	激活	首次答题	提交作业	付费
500	356	262	152	79
```

### 口径二：严格漏斗（必须按顺序走到）

先把每个用户每一步的**最早时间**压成一行，再检查时间是否严格递增：

```sql
WITH step_times AS (
  SELECT user_id,
         MIN(CASE WHEN event_name='register'        THEN event_time END) AS t1,
         MIN(CASE WHEN event_name='activate'        THEN event_time END) AS t2,
         MIN(CASE WHEN event_name='first_answer'    THEN event_time END) AS t3,
         MIN(CASE WHEN event_name='submit_homework' THEN event_time END) AS t4,
         MIN(CASE WHEN event_name='pay'             THEN event_time END) AS t5
  FROM funnel_event GROUP BY user_id
)
SELECT COUNT(t1) AS 注册,
       COUNT(CASE WHEN t2 > t1 THEN 1 END) AS 激活,
       COUNT(CASE WHEN t2 > t1 AND t3 > t2 THEN 1 END) AS 首次答题,
       COUNT(CASE WHEN t2 > t1 AND t3 > t2 AND t4 > t3 THEN 1 END) AS 提交作业,
       COUNT(CASE WHEN t2 > t1 AND t3 > t2 AND t4 > t3 AND t5 > t4 THEN 1 END) AS 付费
FROM step_times;
```

```text
注册	激活	首次答题	提交作业	付费
500	356	189	50	4
```

### 两种口径的差距

| 步骤 | 宽松到达率 | 严格顺序 | 差值 |
| :--- | ---: | ---: | ---: |
| 注册 | 500 | 500 | 0 |
| 激活 | 356 | 356 | 0 |
| 首次答题 | 262 | 189 | 73 |
| 提交作业 | 152 | 50 | 102 |
| 付费 | 79 | 4 | **75** |

前两步两者完全一致，因为「激活」几乎总在「注册」之后；从第三步开始分叉，越往后差得越多，**付费环节 79 人 vs 4 人**。

原因很直白：宽松口径只问「这个事件发生过吗」，严格口径问「这个事件发生过、而且时间在前一步之后」。样本里大量用户是先答题后补激活、或者注册完直接付费再回头激活——宽松口径把他们全算成转化，严格口径全不算。

**所以「漏斗转化率」必须先问清口径**：产品周报上的「付费转化率 15.8%」（79/500）和严格漏斗的「0.8%」（4/500）都对，但它们回答的是不同问题——前者是「有多少人碰过付费」，后者是「有多少人按设计路径走完」。搞混了就会得出「漏斗没问题」的错结论。

### 那个 `COUNT(CASE … END)` 为什么不写 `ELSE`

`COUNT` 只数非 `NULL`，而 `CASE` 不写 `ELSE` 时默认返回 `NULL`。所以 `COUNT(CASE WHEN 条件 THEN 1 END)` 的语义正好是「满足条件的行数」。写成 `ELSE 0` 就变成「数所有行」，条件失效。这个写法的原理在讲条件表达式那篇里详细说过，这里是它最经典的用法。

## 三、留存：第 N 天 ≠ N 天内

留存的标准定义是「某天新增的用户，在之后的**第 N 天**还有活跃」。注意是「第 N 天」这一天，不是「N 天之内」。

```sql
WITH f AS (
  SELECT student_id, MIN(login_date) AS first_date FROM daily_login GROUP BY student_id
),
stats AS (
  SELECT f.first_date,
         COUNT(DISTINCT f.student_id) AS 新增,
         COUNT(DISTINCT CASE WHEN DATEDIFF(d.login_date, f.first_date) = 1 THEN d.student_id END) AS 次日回访,
         COUNT(DISTINCT CASE WHEN DATEDIFF(d.login_date, f.first_date) = 7 THEN d.student_id END) AS 第7日回访
  FROM f LEFT JOIN daily_login d ON f.student_id = d.student_id
  GROUP BY f.first_date
)
SELECT first_date AS 首次登录日, 新增, 次日回访, 第7日回访,
       ROUND(次日回访 / 新增, 2) AS 次日留存率
FROM stats ORDER BY 首次登录日;
```

部分输出：

```text
首次登录日	新增	次日回访	第7日回访	次日留存率
2026-09-01	13	5	6	0.38
2026-09-02	8	0	2	0.00
2026-09-06	6	3	3	0.50
2026-09-08	1	1	0	1.00
```

三个细节值得注意。

**第一，第 7 日回访可以多于次日回访。** 9-01 那批新增用户，次日回访 5 人、第 7 日回访 6 人。留存曲线在「精确第 N 天」口径下**不必单调递减**——有人在第 7 天才回来，中间几天没登录。如果指标要求单调递减，那用的是「N 天内至少回访一次」的滚动留存，不是这个。

**第二，分子分母都要 `COUNT(DISTINCT …)`。** 分母是当日新增人数，分子是第 N 天回访人数，中间 `LEFT JOIN` 会让一个用户产生多行，不去重必然重复计数。

**第三，`DATEDIFF` 而不是「加一天再比较」。** `DATEDIFF(d.login_date, f.first_date) = 1` 精确锁定「相差 1 天」，跨月、跨年、闰年都由函数处理。手写 `login_date = first_date + 1` 在跨月时会错，而且 `date + 1` 这种写法在 MySQL 里本身也不成立。

## 四、连续 N 天：日期减行号

这是五类题型里最「巧」的一个，套路只有一句：**日期减行号，连续的行会得到同一个值**。

推导很简单：连续日期是 `d, d+1, d+2`，行号是 `1, 2, 3`，两者相减恒等于 `d-1`。一旦断档，日期跳了但行号只加 1，差值就变了，自然分到新组。

```sql
WITH t AS (
  SELECT DISTINCT student_id, login_date,
         ROW_NUMBER() OVER (PARTITION BY student_id ORDER BY login_date) AS rn
  FROM daily_login
),
t2 AS (
  SELECT student_id, login_date, DATE_SUB(login_date, INTERVAL rn DAY) AS grp FROM t
)
SELECT student_id AS 学号, MIN(login_date) AS 起始日, MAX(login_date) AS 结束日, COUNT(*) AS 连续天数
FROM t2 GROUP BY student_id, grp HAVING COUNT(*) >= 3
ORDER BY 连续天数 DESC, 学号 LIMIT 8;
```

```text
学号	起始日	结束日	连续天数
1009	2026-09-05	2026-09-11	7
1012	2026-09-13	2026-09-18	6
1001	2026-09-06	2026-09-10	5
1011	2026-09-09	2026-09-13	5
1036	2026-09-19	2026-09-23	5
1001	2026-09-19	2026-09-22	4
1022	2026-09-16	2026-09-19	4
1025	2026-09-23	2026-09-26	4
```

学号 1001 出现了两段（5 天 + 4 天），说明中间断过——这正是分组键的价值：**它把「一个人」拆成「若干段连续区间」**，而不是把整段历史当一个数字。

两个前提不能漏：

- **必须先 `DISTINCT`**。同一用户同一天有两条记录时，行号会被重复日期污染，分组键算错，区间被切碎。
- **必须 `PARTITION BY` 用户**。少了这个，所有用户混在一起排队，行号跨用户连续，分组键全乱。

要拿「每人最长连续天数」，把上面的结果再套一层取 `MAX`：

```sql
WITH t AS (
  SELECT DISTINCT student_id, login_date,
         ROW_NUMBER() OVER (PARTITION BY student_id ORDER BY login_date) AS rn
  FROM daily_login
),
t2 AS (SELECT student_id, login_date, DATE_SUB(login_date, INTERVAL rn DAY) AS grp FROM t),
t3 AS (SELECT student_id, COUNT(*) AS 段长 FROM t2 GROUP BY student_id, grp)
SELECT student_id AS 学号, MAX(段长) AS 最长连续天数 FROM t3 GROUP BY student_id ORDER BY 最长连续天数 DESC LIMIT 5;
```

```text
学号	最长连续天数
1009	7
1012	6
1011	5
1036	5
1001	5
```

这里有一个必须绕开的坑：**不能写成 `MAX(COUNT(*)) OVER ()` 之类的「在 `SELECT` 里直接引用别名」**，MySQL 会报 `ERROR 1054`——别名是 `SELECT` 阶段的产物，同一个 `SELECT` 列表里后面的窗口函数读不到它。正解就是「再套一层子查询，让别名变成真实列」，也就是上面 `t3` 那一层的作用。

## 五、同环比：`LAG` 与「必须分区」

同环比的本质是「错位取上一期」，环比 `LAG(x, 1)`、同比 `LAG(x, 12)`（按月粒度）。

```sql
WITH m AS (SELECT month, SUM(amount) AS 收入 FROM monthly_revenue GROUP BY month)
SELECT month AS 月份, 收入,
       LAG(收入,1) OVER (ORDER BY month) AS 上月,
       ROUND((收入 - LAG(收入,1) OVER (ORDER BY month))
             / NULLIF(LAG(收入,1) OVER (ORDER BY month),0) * 100, 2) AS 环比百分比,
       LAG(收入,12) OVER (ORDER BY month) AS 去年同月
FROM m ORDER BY month;
```

```text
月份	收入	上月	环比百分比	去年同月
2026-01	193180.17	NULL	NULL	NULL
2026-02	180817.69	193180.17	-6.40	NULL
2026-03	199325.13	180817.69	10.24	NULL
2026-04	224972.51	199325.13	12.87	NULL
2026-05	223944.21	224972.51	-0.46	NULL
2026-06	220957.26	223944.21	-1.33	NULL
2026-07	184878.10	220957.26	-16.33	NULL
2026-08	179462.76	184878.10	-2.93	NULL
2026-09	214434.21	179462.76	19.49	NULL
```

**去年同月整列都是 `NULL`**，不是写错了——库里的数据只有 2026-01 到 2026-09 共 9 个月，`LAG(x, 12)` 要求往前数 12 期，样本里根本不存在。这条正好说明 `LAG` 的一个性质：**它按「行」错位，不按「日期」错位**。前 12 行没数据就是 `NULL`，哪怕日期上明明有去年同月（如果表里真有的话）。

由此推出同环比最容易踩的两个坑：

**坑一：月份缺失时 `LAG(1)` 会取错期次。** 如果 3 月缺数据，4 月的 `LAG(1)` 取到的是 2 月，算出来的「环比」其实是「隔月比」。正解是先把时间维度补全（`LEFT JOIN` 一张连续月份表），再 `LAG`。

**坑二：按维度算必须 `PARTITION BY`。** 这一条后果最严重，因为它**不报错，只是结果全错**。实测按学科算环比，同一张表两种写法对比：

```sql
SELECT subject_id AS 学科, month AS 月份, amount AS 收入,
       LAG(amount,1) OVER (PARTITION BY subject_id ORDER BY month) AS 按学科取上月,
       LAG(amount,1) OVER (ORDER BY month) AS 不分区取上一行
FROM monthly_revenue
WHERE subject_id IN (1,2) AND month <= '2026-03'
ORDER BY subject_id, month;
```

```text
学科	月份	收入	按学科取上月	不分区取上一行
1	2026-01	21958.74	NULL	NULL
1	2026-02	22772.02	21958.74	29571.91
1	2026-03	26971.17	22772.02	25212.98
2	2026-01	29571.91	NULL	21958.74
2	2026-02	25212.98	29571.91	22772.02
2	2026-03	28471.51	25212.98	26971.17
```

看第三列与第四列：不分区时，学科 1 的 2 月「上月」取到了 **29571.91**——那是学科 2 的 1 月收入。数据串了，但 SQL 一声不响。

判据：**只要指标按某个维度分开算，`PARTITION BY` 就必须带上那个维度**。忘写不会报错，只会在报表上表现为「某个月环比异常大」，而且极难查。

另外 `NULLIF(分母, 0)` 别省：上一期为 0 时，除零在 MySQL 里返回 `NULL` 而不是报错，静默变成空值；显式写 `NULLIF` 至少让意图清楚。

## 六、行列转换：条件聚合与 `UNION ALL`

MySQL 没有 `PIVOT`，行列转换全靠手搓。

**行转列 = 条件聚合**：用 `CASE` 把每个类别的值单独挑出来，再 `GROUP BY` 收拢。

```sql
SELECT month AS 月份,
       SUM(CASE WHEN subject_id=1 THEN amount END) AS 数据结构,
       SUM(CASE WHEN subject_id=2 THEN amount END) AS 算法设计,
       SUM(CASE WHEN subject_id=3 THEN amount END) AS 数据库,
       SUM(CASE WHEN subject_id=4 THEN amount END) AS 计算机网络,
       SUM(CASE WHEN subject_id=5 THEN amount END) AS 操作系统,
       SUM(CASE WHEN subject_id=6 THEN amount END) AS 数据挖掘,
       SUM(amount) AS 合计
FROM monthly_revenue GROUP BY month ORDER BY month;
```

```text
月份	数据结构	算法设计	数据库	计算机网络	操作系统	数据挖掘	合计
2026-01	21958.74	29571.91	28378.21	38033.28	37262.55	37975.48	193180.17
2026-02	22772.02	25212.98	31578.15	31190.73	33570.71	36493.10	180817.69
2026-03	26971.17	28471.51	29505.87	36889.94	36858.18	40628.46	199325.13
2026-04	26380.94	31585.58	38304.43	37878.17	44071.66	46751.73	224972.51
2026-05	30256.64	29393.99	32125.64	36859.70	45348.81	49959.43	223944.21
2026-06	24753.95	28445.63	31451.60	41395.65	46604.50	48305.93	220957.26
2026-07	23096.78	22851.18	27875.23	35310.13	33510.11	42234.67	184878.10
2026-08	21722.80	24929.13	31103.79	30610.13	32788.89	38308.02	179462.76
2026-09	23574.02	30260.67	33826.16	38522.34	41857.27	46393.75	214434.21
```

`CASE` 不写 `ELSE` 就会返回 `NULL`，而 `SUM` 跳过 `NULL`，正好是「这一类有值就加，没有就不影响」——比写 `ELSE 0` 干净。**注意这里必须用 `SUM` 而不是 `MAX`**：同一类别在一个月里若有多行（比如同一学科多笔收入），`MAX` 只取最大那一笔，会漏账。

**列转行 = `UNION ALL` 拆列**：每个要拍平的列写一条 `SELECT`，纵向拼起来。

```sql
WITH wide AS (
  SELECT month,
         SUM(CASE WHEN subject_id=1 THEN amount END) AS s1,
         SUM(CASE WHEN subject_id=2 THEN amount END) AS s2,
         SUM(CASE WHEN subject_id=3 THEN amount END) AS s3
  FROM monthly_revenue WHERE month <= '2026-02' GROUP BY month
)
SELECT month AS 月份, '数据结构' AS 学科, s1 AS 收入 FROM wide
UNION ALL SELECT month, '算法设计', s2 FROM wide
UNION ALL SELECT month, '数据库',   s3 FROM wide
ORDER BY 月份, 学科;
```

```text
月份	学科	收入
2026-01	数据库	28378.21
2026-01	数据结构	21958.74
2026-01	算法设计	29571.91
2026-02	数据库	31578.15
2026-02	数据结构	22772.02
2026-02	算法设计	25212.98
```

这里是 `UNION ALL` 而不是 `UNION` 的少数「必须」场景之一：三段的结果天然不重复，加去重纯属浪费（还要多一次临时表）。上一篇文章实测过去重的代价在十万行以内不大，但这里连语义上都不需要它。

## 七、五段骨架速查

面试和日常都能直接套的写法：

| 题型 | 一句话骨架 | 关键函数 |
| :--- | :--- | :--- |
| 漏斗 | 每用户每步取最早时间，再比较时间先后 | `MIN(CASE WHEN…)` + `COUNT(CASE WHEN t2>t1…)` |
| 留存 | 首次日期定基准，第二个「日期差 = N」 | `MIN(login_date)` + `DATEDIFF` + `COUNT(DISTINCT)` |
| 连续 N 天 | 日期减行号得分组键，按组数行数 | `ROW_NUMBER()` + `DATE_SUB` + `HAVING COUNT(*) >= N` |
| 同环比 | 错位取上一期，按维度分区 | `LAG(x,1)` / `LAG(x,12)` + `PARTITION BY` + `NULLIF` |
| 行列转换 | 行转列条件聚合，列转行 `UNION ALL` | `SUM(CASE WHEN…)` / `UNION ALL` |

五句话里出现频率最高的是三件事：**按谁分区（`PARTITION BY`）、跟谁比（`LAG` 的偏移量）、怎么分组（差值分组键）**。这三件事想清了，剩下的都是填空。

## 八、面试会追问什么

这类题的区分度不在「写得出」，而在「答得清」。五类各准备两个追问：

| 题型 | 追问 | 答法要点 |
| :--- | :--- | :--- |
| 漏斗 | 严格漏斗和宽松到达率怎么选？ | 看问题问「路径依从」还是「触点覆盖」；严格要加时间递增校验 |
| 漏斗 | 为什么要 `COUNT(DISTINCT)`？ | 同一用户可能多次触发，不去重会虚高 |
| 留存 | 次日留存和第 7 日留存为什么不必单调？ | 精确第 N 天口径下，中间回访不计入；要单调改用滚动留存 |
| 留存 | 新用户留存 vs 活跃用户留存怎么分？ | 前者用「首次登录日」做基准，后者用「当日登录」做基准 |
| 连续 N 天 | 除了「日期减行号」还有别的解法吗？ | 有：`LAG` 判断相邻日期差是否为 1，再累加打标；能说出两种是加分项 |
| 连续 N 天 | 重复日期会怎样？ | 行号被污染，区间被切碎，必须先 `DISTINCT` |
| 同环比 | 月份缺失怎么办？ | 先补全连续月份再 `LAG`，否则「环比」变成「隔期比」 |
| 同环比 | 同比为什么是 `LAG(12)`？ | 按月粒度 12 期；季度表是 `LAG(4)`，看粒度不看名字 |
| 行列转换 | 没有 `PIVOT` 怎么行转列？ | `SUM(CASE WHEN…)` 条件聚合；列转列用 `UNION ALL` |

## 小结

- 五类题型归成两个套路：**时间轴上的多事件**（漏斗 / 留存 / 连续 N 天）与**维度上的单指标**（同环比 / 行列转换 / TopN）。
- 漏斗必须先定口径：同一份数据，宽松到达率付费 79 人、严格顺序漏斗 4 人，差 20 倍。报「转化率」时不说口径就是耍流氓。
- 留存是「精确第 N 天」，不是「N 天内」；因此**第 7 日回访可以多于次日**，曲线不必单调。
- 连续 N 天的核心是**日期减行号得恒定分组键**；两个前提是先去重、按用户分区。
- 同环比的两个坑：月份缺失会让 `LAG(1)` 取错期次；**忘写 `PARTITION BY` 不会报错，只会让数据串行**（实测学科 1 的「上月」取到了学科 2 的数值）。
- 行列转换没有 `PIVOT` 也能做：行转列用条件聚合（记得 `SUM` 不是 `MAX`），列转行用 `UNION ALL`。
- 别在同一个 `SELECT` 列表里引用刚定义的别名（`MAX(…别名…)` 会报 `ERROR 1054`），套一层子查询把它变成真实列。
