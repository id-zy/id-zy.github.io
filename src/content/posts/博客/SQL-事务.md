---
title: SQL 事务：ACID 各挡什么，隔离级别与 MVCC 怎么配合
date: 2026-10-30
subject: 博客
category: 数据库
tags:
  - SQL
  - 数据库
  - 事务
  - MVCC
summary: 事务的 ACID 四性各靠什么实现、脏读不可重复读幻读三个并发问题怎么区分、四种隔离级别越高越安全越慢、MVCC 用版本链和 ReadView 让读不加锁，以及 RC 和 RR 唯一的差异在于 ReadView 的生成时机。
---

# SQL 事务：ACID 各挡什么，隔离级别与 MVCC 怎么配合

面试问事务，常连着三样一起问：ACID 四性、隔离级别、MVCC。它们不是三个孤立的知识点，而是一条链——ACID 里的「I（隔离性）」要靠隔离级别来落地，隔离级别要靠 MVCC 和锁来实现。这篇把它们串起来，配上 MySQL 实测，讲清每个概念到底「挡」住了什么。

## 一、ACID 四性：一致性是目标，其余三者是手段

ACID 四性不是并列关系。先记住一句：**一致性是目标，原子性、隔离性、持久性是手段**。

| 特性 | 含义 | 常见实现 |
| :--- | :--- | :--- |
| A 原子性 | 事务内操作不可分割，失败全部回滚 | undo log |
| C 一致性 | 事务前后数据满足约束、业务规则 | 由 A/I/D + 业务约束共同保证 |
| I 隔离性 | 并发事务互不干扰 | 锁 + MVCC |
| D 持久性 | 提交后数据永久保存 | redo log + WAL |

所以问「一致性靠什么保证」，不能只答一句，要答「由原子性 / 隔离性 / 持久性共同保证，再加业务约束」。这一节里，「隔离性」正是后面要展开的主角。

## 二、并发会出什么问题：脏读、不可重复读、幻读

多个事务并发，如果不加约束，会出三类问题：

| 问题 | 现象 |
| :--- | :--- |
| 脏读 | 读到其他事务**未提交**的数据 |
| 不可重复读 | 同一事务内，两次读**同一行**，值变了 |
| 幻读 | 同一事务内，两次查**同一范围**，结果集行数变了 |

区分它们的关键是「变了什么」：脏读是「读到还没提交的东西」，不可重复读是「同一行值变了」，幻读是「行数变了（多了行或少行）」。

用两个事务 A、B 示意：

```text
脏读       A 读到 B 改过但还没提交的值，B 回滚后 A 读到的就是「不存在的数据」
不可重复读   A 两次读同一行 id=1，中间 B 提交了修改，A 第二次读到的值变了
幻读       A 两次 SELECT COUNT(*)，中间 B 插入了新行，A 第二次数到的行数多了
```

## 三、四种隔离级别：越高越安全、越慢

隔离级别是「安全」和「性能」的权衡轴——**级别越高问题越少、性能越差**。

| 隔离级别 | 脏读 | 不可重复读 | 幻读 |
| :--- | :--- | :--- | :--- |
| RU（读未提交） | 可能 | 可能 | 可能 |
| RC（读已提交） | 不可能 | 可能 | 可能 |
| RR（可重复读） | 不可能 | 不可能 | 基本避免 |
| Serializable（串行化） | 不可能 | 不可能 | 不可能 |

RU 基本没人用；RC 是 Oracle / PostgreSQL / SQL Server 的默认级别；**RR 是 MySQL InnoDB 的默认级别**；Serializable 最安全但性能最差。RC 与 RR 的唯一核心差异，是下一节要讲的 ReadView 生成时机。

## 四、MVCC：读历史版本、不加锁

MVCC（多版本并发控制）的核心思想一句话：**读操作不加锁，读数据的某个历史版本，实现读写不阻塞**。

InnoDB 里，每行有几个隐藏列：

```text
DB_TRX_ID    最后修改这一行的事务 ID
DB_ROLL_PTR  指向 undo log 里的旧版本
DB_ROW_ID    没有主键时生成的隐藏主键
```

修改数据时，旧版本留在 undo log 里，形成一条**版本链**。读的时候，根据 `ReadView` 判断这条链上哪个版本「对我可见」。

`ReadView` 主要包含 `m_ids`（活跃事务列表）、`min_trx_id`、`max_trx_id`、`creator_trx_id`，判断规则可以简化为：

```text
自己改的                    → 可见
事务 ID 小于 min_trx_id      → 已提交，可见
事务 ID 大于等于 max_trx_id  → 不可见
在 m_ids 里                  → 不可见（还没提交）
否则                         → 可见
```

## 五、RC 与 RR 的 ReadView 时机：不可重复读的根因

RC 和 RR 用同一套 MVCC，唯一差别是 **ReadView 什么时候生成**：

| 级别 | ReadView 生成时机 |
| :--- | :--- |
| READ COMMITTED | 每次 `SELECT` 都生成新的 ReadView |
| REPEATABLE READ | 第一次快照读生成，之后整个事务复用 |

这个差别直接决定了「不可重复读」会不会发生。下面用两个 session 并发验证（session A 第一次读 `val=100`，session B 更新为 `200` 并提交，session A 再读）：

```sql
-- 建表与初始数据
CREATE TABLE t(id INT PRIMARY KEY, val INT);
INSERT INTO t VALUES(1, 100);

-- session A（保持事务不提交）      -- session B（另一个连接）
SET SESSION TRANSACTION            |
  ISOLATION LEVEL REPEATABLE READ; |
START TRANSACTION;                 |
SELECT val FROM t WHERE id=1;      |   -- A 第一次读：100
                                   |   UPDATE t SET val=200 WHERE id=1;
                                   |   -- B 提交（autocommit）
SELECT val FROM t WHERE id=1;      |   -- A 第二次读
COMMIT;                            |
```

把上面 session A 的隔离级别换成 `READ COMMITTED` 再跑一遍，就是 RC 的结果。MySQL 8.0.12 实测（用 `DO SLEEP` 拉开两次读的间隔，避免两个 session 抢跑）：

```text
-- RR：两次读都是 100（复用 ReadView，看不到 B 的更新）
第一次读 → 100
第二次读 → 100

-- RC：第二次读变 200（每次 SELECT 新 ReadView，看到最新已提交）
第一次读 → 100
第二次读 → 200
```

所以 RR 下可重复读、RC 下不可重复读，根子就在「ReadView 复用还是重建」。

## 六、快照读 vs 当前读：幻读为什么「基本解决」

读分两种：

| 类型 | 语句 | 行为 |
| :--- | :--- | :--- |
| 快照读 | 普通 `SELECT` | 读 MVCC 历史版本，不加锁 |
| 当前读 | `SELECT ... FOR UPDATE`、`LOCK IN SHARE MODE`、`UPDATE`、`DELETE`、`INSERT` | 读最新已提交版本，并加锁 |

幻读在 RR 下为什么只是「基本解决」而不是「彻底解决」？要分两种读讲：

1. **快照读**（普通 `SELECT`）：RR 复用同一个 ReadView，看不到别的事务后来插入的行，不会幻读。
2. **当前读**（`FOR UPDATE` / `UPDATE` / `DELETE`）：InnoDB 用 **Next-Key Lock = Record Lock + Gap Lock**，锁住记录和间隙，阻止范围内插入，也避免幻读。

但注意：同一事务里混用快照读和当前读，可能出现「前后看到的不完全一致」的观感——面试追问「RR 真的完全解决幻读了吗」，答案是否定的。

Next-Key Lock 的「间隙」是它解决当前读幻读的关键：

```text
表里 id 有 1、5、10 三行，当前读 WHERE id > 5 时
Record Lock 锁住 id=5、10 两行
Gap Lock   锁住 (5,10) 和 (10,+∞) 两个间隙
→ 别的事务没法在这两个区间插入新行，幻读被挡住
```

## 小结

- ACID 里一致性是目标，原子性 / 隔离性 / 持久性是手段。
- 三个并发问题：脏读是「读到未提交」，不可重复读是「同一行值变了」，幻读是「行数变了」。
- 隔离级别越高越安全越慢，MySQL 默认 RR。
- MVCC 用 undo log 版本链 + ReadView 让读不加锁，读写不阻塞。
- RC 每次 SELECT 新建 ReadView，RR 复用第一次的——这是两者唯一的根差异，实测 RR 两次读一致、RC 第二次读到新值。
- 幻读「基本解决」：快照读靠 MVCC，当前读靠 Next-Key Lock。
