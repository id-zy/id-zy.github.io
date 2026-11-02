---
title: Java Stream：惰性求值、一次性，以及能翻译 SQL 的 groupingBy
date: 2026-10-29
subject: 博客
category: Java
tags:
  - Java
  - Stream
  - 函数式
summary: Stream 为什么写完不执行、peek 日志怎么证明惰性、为什么复用同一个流会抛异常、map 与 flatMap 只差一件事、短路操作如何让无限流可用、groupingBy 怎么翻译 SQL 的 GROUP BY、性能瓶颈为什么在装箱而非 Stream 本身。
---

# Java Stream：惰性求值、一次性，以及能翻译 SQL 的 groupingBy

第一次用 Stream 的人常有两个困惑：一是「我写完了，怎么什么都没发生」，二是「第二次用同一个流怎么报错了」。这两个困惑指向同一条设计：**Stream 不是集合，是管道**。

管道有三个性质：不存数据、不推不动、走一次就废。理解这三点，后面所有操作都顺。

## 一、三条铁律

| 铁律 | 含义 | 违反的后果 |
| :--- | :--- | :--- |
| 不存数据 | 只是对数据源的视图 | 修改 Stream 不影响源集合 |
| 惰性求值 | 没有终端操作就什么都不做 | 「写了没效果」 |
| 只能消费一次 | 走完就关闭 | `IllegalStateException` |

```text
数据源 → 中间操作链（惰性，可无） → 终端操作（触发执行）
```

一个常被追问的点：`stream()` 对集合是零拷贝的视图，`list.stream()` 不会复制元素；但流本身持有对源的引用，所以**遍历过程中修改源集合**（尤其是 `add` / `remove`）会抛 `ConcurrentModificationException`。

## 二、惰性：用 `peek` 亲眼看一下

```java
List<String> log = new ArrayList<>();
Stream<Integer> st = nums.stream()
        .peek(x -> log.add("peek" + x))   // 中间操作
        .filter(x -> x > 3);              // 中间操作

System.out.println(log);                  // 还没跑
System.out.println(st.count());           // 这里才跑
System.out.println(log);
```

实测（`nums = [1, 2, 2, 3, 4, 5]`）：

```text
[]
2
[peek1, peek2, peek2, peek3, peek4, peek5]
```

三行输出证明了两件事：

1. **没有终端操作时，`peek` 一次都没执行**——中间操作只是「记了个待办」。
2. **执行顺序不是一个操作扫一遍全集**，而是每个元素顺着管道走到底。`filter` 之后的元素不再进 `peek`，所以 `count` 是 2，而 `peek` 记录了全部 5 个（`2` 出现了两次）。

这个顺序在 `findFirst` 上更有意义：找到第一个就停，后面的元素根本不会被处理。

`peek` 只用于调试。用它改业务状态是误用——惰性 + 并行时顺序不保证，副作用会飘。

## 三、中间操作与终端操作

| 中间操作 | 作用 | 备注 |
| :--- | :--- | :--- |
| `filter` | 过滤 | 保留满足条件的 |
| `map` | 一对一映射 | 转换 |
| `flatMap` | 一对多再拍平 | 把多个流合成一个 |
| `distinct` / `sorted` | 去重 / 排序 | 去重靠 `equals` + `hashCode` |
| `limit` / `skip` | 截断 / 跳过 | **短路** |
| `peek` | 窥视 | 只用于调试 |

| 终端操作 | 类别 |
| :--- | :--- |
| `forEach` / `forEachOrdered` | 遍历 |
| `collect` / `toList` / `toArray` | 收集 |
| `reduce` / `count` / `min` / `max` | 归约 |
| `anyMatch` / `allMatch` / `noneMatch` | 匹配，**短路** |
| `findFirst` / `findAny` | 查找，返回 `Optional`，**短路** |

判断一个方法属于哪类，看返回类型：返回 `Stream` 的是中间操作，返回别的（`void`、集合、`Optional`、数字、`boolean`）的是终端操作。

`distinct()` 有个前提：元素的 `equals` / `hashCode` 必须正确。自定义类没重写这两个方法，去重会失效——`distinct` 无从判断「哪些算相同」。

## 四、`map` 与 `flatMap` 只差一件事

`map` 一对一，`flatMap` 一对多再拍平。

```java
List<List<Integer>> nested = Arrays.asList(Arrays.asList(1, 2), Arrays.asList(3));

nested.stream().map(List::size).collect(Collectors.toList());          // [2, 1]
nested.stream().flatMap(List::stream).collect(Collectors.toList());    // [1, 2, 3]
```

实测第二行是 `[1, 2, 3]`：`flatMap` 把每个元素展开成一个流，再把所有流接起来。

选择习惯：

- 先问「要不要保留元素数量」——要 → `map`（数量不变，类型变），不要 → `filter`（数量变，类型不变）。
- 再问「要不要拍平」——要 → `flatMap`。典型场景：`List<Order>` 里每个订单有 `List<Item>`，想要所有 item 的平铺流。

`map` 里返回 `null` 会得到 `[null]`，后面接 `map(String::length)` 就 NPE。`Optional` 相关操作不在流里自动展开，需要自己 `filter(Objects::nonNull)`。

## 五、短路：无限流能用的唯一原因

```java
Stream.iterate(1, x -> x + 1)
      .filter(x -> x % 7 == 0)
      .findFirst()
      .ifPresent(System.out::println);   // 7
```

`Stream.iterate` 生成的是**无限流**。没有短路，这行代码永远不结束。

`findFirst` 找到第一个就停止拉取；`anyMatch` / `allMatch` / `noneMatch`、`limit` 同理。它们让「无限数据源 + 有限需求」成立——这也是 Stream 相对 `for` 循环的一个真正优势：**把「什么时候停」交给消费方决定**。

另一条实测：

```java
nums.stream().sorted(Comparator.reverseOrder()).limit(3).collect(Collectors.toList());  // [5, 4, 3]
nums.stream().distinct().count();                                                     // 5
```

`sorted` 是**有状态**的中间操作：它必须把所有元素收完才能排出第一个，所以放在无限流上会卡死。`limit` 放在 `sorted` 后面救不了它——顺序很重要。

## 六、`Collectors`：`groupingBy` 就是 `GROUP BY`

```java
List<Integer> nums = Arrays.asList(1, 2, 2, 3, 4, 5);

nums.stream().filter(x -> x % 2 == 0).map(x -> x * 10).collect(Collectors.toList());
// [20, 20, 40]

nums.stream().collect(Collectors.groupingBy(x -> x % 2, Collectors.counting()));
// {0=3, 1=3}
```

第二条输出 `{0=3, 1=3}`：偶数 3 个（2、2、4），奇数 3 个（1、3、5）。`groupingBy` 的第一个参数是**分类函数**，第二个是**下游收集器**。

这个结构和 SQL 几乎一一对应：

| SQL | Stream |
| :--- | :--- |
| `GROUP BY subject` | `groupingBy(Problem::getSubject)` |
| `COUNT(*)` | `Collectors.counting()` |
| `MAX(score)` | `Collectors.maxBy(Comparator.comparing(...))` |
| `SUM(amount)` | `Collectors.summingInt(...)` |
| `SELECT subject, COUNT(*) ... GROUP BY subject` | `groupingBy(Problem::getSubject, counting())` |

写统计类代码时，这条对照能省掉大量手写 `Map` + 循环：

```java
Map<String, Long> bySubject = Stream.of("算法", "算法", "数据库")
        .collect(Collectors.groupingBy(s -> s, Collectors.counting()));
// {算法=2, 数据库=1}
```

几个常用下游收集器，记住名字就够：

- `counting()` / `summingInt()` / `averagingInt()`
- `mapping(fn, downstream)`：分组后先转换再收集
- `toSet()` / `toList()`：分组结果用集合还是列表
- `joining(", ")`：把字符串拼起来（只对 `Stream<String>`）

`groupingBy` 返回的 `Map` 默认是 `HashMap`，键的顺序不保证。要保序传 `LinkedHashMap::new` 作为第三个参数；键可能为 `null` 时 `groupingBy` 会直接抛 NPE，得先 `filter(Objects::nonNull)`。

## 七、性能：瓶颈在装箱，不在 Stream

小数据量（几十到几百）下，Stream 和 `for` 循环的差距可以忽略，**可读性优先**。

大数据量时，问题通常不是「Stream 慢」，而是 `Stream<Integer>` 的装拆箱：

```java
IntStream.rangeClosed(1, 100).sum();     // 5050，全程 int，无装箱
```

原始类型流有三个：`IntStream` / `LongStream` / `DoubleStream`，配 `mapToInt` / `mapToLong` / `mapToDouble` 使用。数值聚合（求和、平均、最大）一律先转原始类型流。

**`parallelStream` 的收益条件很苛刻**：

- 数据量大（几万以上）、单元素操作重、数据源容易切分（数组、`ArrayList` 容易；`LinkedList`、`Stream.iterate` 很难）。
- 它共用全局 `ForkJoinPool`，**共享可变状态写不对，结果会错**——不是变慢，是错。这类 bug 在测试环境几乎撞不到。

默认建议：先别用。真需要并发，先测，再考虑自己指定线程池。

## 八、什么时候不该用 Stream

四种情况，用 `for` 更清楚：

- **需要提前 `return` / `break`**。Stream 没有 `break`，只能用 `anyMatch` 之类的短路硬凑，可读性反而差。
- **频繁修改外部状态**。`forEach` 里 `list.add(...)` 是反模式（有并发问题时尤其），该用 `collect`。
- **下标强相关**。需要 `i` 和 `i-1` 比较、需要写回原数组，用 `for`。
- **lambda 里要 `try-catch` 受检异常**。`Stream` 的函数式接口不声明受检异常，只能包一层 `RuntimeException`，很难看。

还有一条可读性判据：**一条链能一眼看清每一步就用；堆到需要倒着读就退回 `for`**。

```java
// 需要倒着读，不如 for
list.stream().filter(...).map(...).sorted((a, b) -> ...).limit(5).collect(...)
```

## 小结

- Stream 是**管道不是集合**：不存数据、惰性求值、只能消费一次；复用抛 `IllegalStateException: stream has already been operated upon or closed`。
- 没有终端操作，中间操作一次都不执行；执行时每个元素顺着管道走到底（`peek` 日志 5 条、`count` 结果 2 就是证据）。
- `map` 一对一、`flatMap` 一对多再拍平；`filter` 改数量不改类型。
- **短路**（`findFirst` / `anyMatch` / `limit`）让无限流可用；`sorted` 是有状态的，放无限流上会卡死。
- `Collectors.groupingBy` 基本能一条对一条翻译 `GROUP BY` + 聚合函数。
- 性能瓶颈在**装拆箱**，数值聚合先 `mapToInt` 用原始类型流；`parallelStream` 默认别用。
- 需要 `break`、改外部状态、强依赖下标、lambda 里要处理受检异常时，退回 `for`。
