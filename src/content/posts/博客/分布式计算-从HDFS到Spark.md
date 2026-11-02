---
title: 从 HDFS 到 Spark：一次查询要走完哪几段
date: 2026-11-02
subject: 博客
category: 分布式计算
tags:
  - 博客
  - 分布式计算
  - 大数据
summary: 一条 Hive SQL 过五个角色：HDFS 存、MapReduce 算、YARN 调、Hive 翻译、Spark 替代前者。瓶颈是 Shuffle——既是 MapReduce 的落盘点，也是 Spark 的 Stage 边界，还规定同 key 同分区；轮询分区不是变慢是算错。Combiner 能砍 98% 传输，但 avg 直接套得 5.5，真值 2.8。
---

# 从 HDFS 到 Spark：一次查询要走完哪几段

一条 Hive SQL 提交上去，最后拿到结果，中间要经过五个角色的手。多数资料按「组件」讲——先讲 HDFS 再讲 MapReduce 再讲 YARN，像五本独立说明书。但真正有用的是另一条线：**这份数据此刻在哪、归谁调度、下一步谁接手**。

按这条线走一遍，五个组件的关系就变成一句话：每个人只负责一段，交接点只有两个——磁盘和 Shuffle。

## 一、分工是按「数据落在哪」切的

| 环节 | 回答的问题 | 它管的边界 |
|---|---|---|
| HDFS | 数据长期放哪，坏了怎么恢复 | 磁盘、副本、元数据 |
| MapReduce | 一次计算怎么拆成两个阶段 | 中间结果落盘 |
| YARN | 谁先用 CPU 和内存 | 容器、队列、调度 |
| Hive | SQL 怎么变成作业 | 语义层，不碰数据 |
| Spark | 能不能不落盘 | 内存、DAG、Shuffle |

看清这张表，后面几个反直觉的点就都有了解释：为什么 Hive 自己不存数据也不调度、为什么 Spark 号称「内存计算」却仍是 Shuffle 大户、为什么 YARN 换掉不影响 SQL 写法。

## 二、HDFS：写的时候三个副本怎么排

HDFS 先把文件切 Block，默认 128MB，每个 Block 存三副本。三副本不是随便挑三台机器——机架感知的排法是：一个在本机架，一个在另一个机架，第三个放在第二个副本所在机架的另一个节点。这样单机架断电最多丢一份，跨机架带宽也不会被打满。

写流程里有个细节值得记：**ack 是逆序回来的**。客户端把 Block 切成分组，沿 `Client → DN1 → DN2 → DN3` 这条 pipeline 逐级写下去，但确认信号是从 DN3 一路回传到客户端。原因很直接——最后一个副本落盘了，前面才知道整条链都成功；如果按顺序 ack，客户端会在 DN3 还没写完时就以为成功了。

读的时候相反：NameNode 只返回副本位置清单，客户端自己按拓扑挑最近的 DataNode 直连读取，读到校验失败就换下一个副本。

HDFS 的短板在小文件。每个文件、目录、Block 在 NameNode 内存里都占一份元数据，文件一多，元数据先撑爆，跟数据总量没关系。同时 MapReduce 里一个小文件可能就是一个 split，于是 Map 任务数量暴涨，启动和调度开销压过实际计算。这不是配置能绕过去的，是设计取向。

## 三、MapReduce：中间结果落在磁盘上

MapReduce 只有两个阶段，但阶段之间那道 Shuffle 才是全部复杂度所在。

Map 端不是算完就交出去：输出先写进环形缓冲区（默认 100MB，到 80% 就溢写），溢写之前**按目标分区和 key 排序**，所以每个溢写文件内部是有序的；多次溢写最后 merge 成一个大文件。Reduce 端从各 Map 节点拉取属于自己分区的数据，归并排序、按 key 分组，才进入 Reduce 逻辑。

关键在「落盘」两个字：Mapper 和 Reducer 之间，数据是要写到磁盘的。迭代算法因此特别难受——每轮都得落一次、读一次。这正是 Spark 要换掉的东西，后面第八节接着说。

## 四、Shuffle：同一个 key 必须去同一个分区

Shuffle 的唯一目的是把 key 相同的记录聚到一起。做法是分区函数：

```text
partition = hash(key) % R
```

`R` 是 reduce 分区数。这条式子看起来平淡，但它是个硬约束——用别的分配方式会直接算错：

```python
import hashlib
from collections import defaultdict

def hp(key, r):
    return int(hashlib.md5(key.encode()).hexdigest(), 16) % r

words = ["spark", "hdfs", "spark", "yarn", "hdfs", "spark", "hive", "yarn"]
for name, pick in (("哈希", lambda i, w: hp(w, 4)), ("轮询", lambda i, w: i % 4)):
    parts = defaultdict(list)
    for i, w in enumerate(words):
        parts[pick(i, w)].append(w)
    seen = defaultdict(set)
    for p, ws in parts.items():
        for w in ws:
            seen[w].add(p)
    cross = {k: sorted(v) for k, v in seen.items() if len(v) > 1}
    print(f"{name}分区：跨分区 key = {cross or '无'}")
```

```text
哈希分区：跨分区 key = 无
轮询分区：跨分区 key = {'spark': [0, 1, 2], 'hdfs': [0, 1]}
```

轮询（`i % 4`，跟记录顺序走）看着更均匀，但 `spark` 被拆到了三个分区里。每个分区各自算出 `spark` 的部分和，框架却把它们当成三个独立的 key——**结果不是「慢一点」，是错的**。

这就是为什么 reduce 端不能靠「分得均匀」来保证正确性，只能靠「同 key 必同分区」。哈希函数好不好只影响倾斜程度，正不正确由「同 key 同分区」这一条决定。

## 五、Combiner：能省 98% 的网络传输，但 avg 不能这么省

既然数据要跨节点搬，能少搬就少搬。Combiner 就是在 Map 端先做一次局部聚合，把同样的活提前干掉一部分：

```python
N_MAP, N_REC, VOCAB = 20, 10_000, 200
print(f"不用 Combiner: {N_MAP * N_REC:,} 条")
print(f"用 Combiner:   {N_MAP * VOCAB:,} 条")
print(f"减少 {100 * (1 - VOCAB / N_REC):.1f}%")

vals = [[1, 1, 1, 1], [10]]
print("各 map 先平均再平均:", sum(sum(v) / len(v) for v in vals) / len(vals))
print("真实全局平均:      ", sum(sum(v) for v in vals) / sum(len(v) for v in vals))
```

```text
不用 Combiner: 200,000 条
用 Combiner:   4,000 条
减少 98.0%
各 map 先平均再平均: 5.5
真实全局平均:       2.8
```

20 个 map、每个输出 1 万条、词表只有 200 个词——Combiner 之后只剩下 4,000 条，网络传输砍掉 98%。

但最后两行是提醒：**Combiner 不能随便套**。两个分区的平均值再平均得 5.5，而真实全局平均是 2.8，差了一倍。因为平均值的平均不等于总体的平均——样本数不同时权重就错了。

判据是数学上的：Combiner 要求运算满足**结合律和交换律，且不改变语义**。求和满足，求平均不满足（要改成「传 sum 和 count 两个值」，让合并变成可结合的）。WordCount 里 `sum` 能当 Combiner，`avg` 直接套就是错的。

## 六、YARN：作业交上去之后谁在分资源

YARN 三个角色分工很干净：ResourceManager 管全局资源和调度器，NodeManager 管单节点的容器，ApplicationMaster 每个作业一个、负责申请资源、启动任务、监控并汇报。

一次提交大致是这样：客户端向 RM 提交应用 → RM 分配 ApplicationId 并启动 AM → AM 向 RM 注册、申请资源 → RM 的调度器分配容器、NM 在容器里起 Map/Reduce 任务 → 任务向 AM 汇报进度 → 完成后 AM 注销、RM 清理。

值得区分的是三种调度器，它们的差别是「谁先拿到空闲资源」：

|调度器|分配规则|适合场景|
|---|---|---|
|FIFO|先到先服务，单队列|小集群、顺序批处理；容易队头阻塞|
|Capacity|多队列，各自保底容量，空闲可借|多租户、部门共享、有 SLA|
|Fair|动态公平分配，按权重|多用户交互式共享，避免饥饿|

## 七、Hive：SQL 怎么变成一串作业

Hive 自己不算数据、也不调度，它做的是翻译：

```text
HQL → Parser（AST）→ Semantic Analyzer（结合 Metastore 做语义检查）
    → Logical Plan → Optimizer → Physical Plan → 执行引擎（MR / Tez / Spark）
```

翻译完交给 YARN 跑，所以换执行引擎不影响 SQL 写法。语义检查要查表结构、分区、列类型、存储位置，这些都存在 **Metastore** 里——通常是个关系库（比如 MySQL），Hive 通过 Metastore 服务访问它。

几个容易混的设计：

**内部表 vs 外部表**的区别在 `DROP` 时：内部表连元数据带数据一起删，外部表只删元数据、数据留着。原始数据和共享数据一律用外部表，就是防这个。

**分区表 vs 分桶表**是两种切法：分区按列值分目录（`PARTITIONED BY`），用来做分区裁剪、少扫数据；分桶按列哈希取模分文件（`CLUSTERED BY ... INTO n BUCKETS`），用来做采样、Bucket Map Join、缓解倾斜。分区列选错（基数太高）会制造一堆小文件，正好撞上 HDFS 的短板。

**排序四个关键字**经常被当成同义词，其实各管一段：

| 关键字 | 做什么 | 代价 |
|---|---|---|
| `ORDER BY` | 全局有序 | 通常收敛到一个 Reducer，慢 |
| `SORT BY` | 每个 Reducer 内部有序 | 全局不保证有序 |
| `DISTRIBUTE BY` | 控制数据按列分发到哪个 Reducer | 不排序 |
| `CLUSTER BY` | 上面两个同列，默认升序 | 不能单独指定 DESC |

## 八、Spark 换掉的正是「落盘」这一步

Spark 的底子是 RDD，五个特性各有分工：

| 特性 | 作用 |
|---|---|
| Partitions | 分区列表，决定并行度，一个分区一个 Task |
| Compute | 每个分区的计算函数，描述怎么从父 RDD 算出来 |
| Dependencies | 依赖列表，记录血缘，分窄依赖和宽依赖 |
| Partitioner | 分区器（KV RDD 才有），决定 Shuffle 后去哪 |
| Preferred Locations | 首选位置，决定数据本地性 |

一句话：**分区定并行，compute 定怎么算，依赖定血缘和 Stage，partitioner 定 Shuffle 分区，首选位置定本地性。**

真正带来性能差别的是「依赖」这一项。窄依赖（`map`、`filter`、`flatMap`、`union`）父分区到子分区是一对一或部分一对多，可以流水线执行、数据不用落盘；宽依赖（`reduceByKey`、`groupByKey`、`join`、`repartition`）父分区被多个子分区依赖，必须 Shuffle。

DAGScheduler 从最终 RDD 反向遍历，遇到宽依赖就切一刀：

```python
lineage = [("textFile", None), ("flatMap", "narrow"), ("map", "narrow"),
           ("reduceByKey", "wide"), ("filter", "narrow"), ("saveAsTextFile", "narrow")]
stages, cur = [], []
for name, dep in lineage:
    if dep == "wide":
        stages.append(cur)
        cur = [name]
    else:
        cur.append(name)
stages.append(cur)
for i, st in enumerate(stages, 1):
    kind = "ShuffleMapStage" if i < len(stages) else "ResultStage"
    print(f"Stage {i} ({kind}): {' -> '.join(st)}")
```

```text
Stage 1 (ShuffleMapStage): textFile -> flatMap -> map
Stage 2 (ResultStage): reduceByKey -> filter -> saveAsTextFile
```

注意 `filter` 和 `saveAsTextFile` 被划进了第二个 Stage：`filter` 是窄依赖，但它跟在宽依赖后面，只能等 Shuffle 数据到位才能执行。**Stage 边界只看宽依赖，不看算子类型。**

还有一个反直觉的点：Spark 快的主因不是「数据放内存」，而是**窄依赖链上的算子可以合并成一次遍历、中间结果不落地**。内存只是让这件事做得更彻底。反过来说，一条全是宽依赖的链，Spark 也快不到哪去——它照样要 Shuffle、照样落盘。

## 九、省下来的都要还：Shuffle 与数据倾斜

Shuffle 是宽依赖的代价，也是 Spark 的性能瓶颈。数据倾斜则是它最恶性的表现：某几个 key 的数据量远大于其他 key，少数 Task 扛住大部分数据，其余 Task 秒完，整个 Stage 被最慢的那个拖住——表现是大部分 Task 几十秒结束，个别 Task 卡几十分钟或者 OOM。

五种解法，按适用条件排：

1. **加盐**：给倾斜 key 加随机前缀打散到多个分区，先局部聚合，再去掉前缀做全局聚合。适合 `groupByKey`、`reduceByKey` 这类聚合。
2. **两阶段聚合**：本质就是加盐的工程化写法，第一阶段局部聚合、第二阶段去盐全局聚合。
3. **Broadcast Join**：小表广播到每个 Executor，大表不参与 Shuffle。前提是小表放得进内存。
4. **调并行度**：增大 `spark.sql.shuffle.partitions` 或 `spark.default.parallelism`。能缓解「分区过大」，但**单 key 倾斜治不了**——一个 key 的数据再多也只能在一个分区里。
5. **大 key 单独处理**：采样找出热点 key，单独抽出来加盐或广播，其余正常处理最后 `union`。适合 join 场景的热点 key。

看下来本质只有两条路：**把大 key 拆开**（加盐、两阶段、单独处理），或者**让它根本不参与 Shuffle**（广播）。调并行度不在这两条路上，所以它只能缓解不能根治。

Spark 3 的 AQE 能自动做一部分（自动合并小分区、自动 Skew Join），但它是兜底不是替代——倾斜的根因通常在数据分布和 join 条件上。

## 十、小结

- **五个角色按「数据落在哪」分工**：HDFS 管持久、MapReduce 管算、YARN 管资源、Hive 管语义、Spark 管不落盘。换掉其中任何一个，SQL 写法可以不变。
- **Shuffle 是整条链的枢纽**：它是 MapReduce 的瓶颈、Spark 的 Stage 边界，也是「同一个 key 必须去同一个分区」这条硬约束的来源。轮询分区的例子说明，破坏这条约束不是变慢，是算错。
- **Combiner 省 98% 传输，但只对满足结合律交换律的运算成立**：`sum` 可以，`avg` 直接套会得到 5.5 而不是 2.8。
- **Stage 边界只看宽依赖**：`filter` 是窄依赖，跟在宽依赖后面照样进下一个 Stage。
- **Spark 快的不是内存**，是窄依赖链可以合并成一次遍历、中间结果不落盘；全是宽依赖的链照样慢。
- **数据倾斜的解法本质两条**：拆开大 key，或让它不参与 Shuffle。调并行度两个都不算。
