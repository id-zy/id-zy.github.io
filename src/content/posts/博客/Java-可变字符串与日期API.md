---
title: Java 可变字符串与日期 API：StringBuilder 为什么快，SimpleDateFormat 为什么不能共享
date: 2026-11-03
subject: 博客
category: Java
tags:
  - Java
  - StringBuilder
  - 字符串
  - 日期
  - java.time
  - 线程安全
summary: 三种字符串容器只差一次加锁，多线程共享 StringBuilder 时数据会少一截、也可能直接越界抛异常；扩容按乘二加二走，加号拼接在 JDK 9 之后也不再建 StringBuilder。日期侧同理：Date 的 1900 偏移与月份从 0 起，共享一个 SimpleDateFormat 七成出错，而 java.time 全部不可变。
---

# Java 可变字符串与日期 API：StringBuilder 为什么快，SimpleDateFormat 为什么不能共享

写业务代码时，「用哪个类」这件事经常被简化成性能问题：`String` 慢就换 `StringBuilder`，`Date` 老就换 `LocalDate`。但真正的分水岭不在性能，在**这个对象会被谁改**。

把两组对照并排放：`String` / `StringBuilder` / `StringBuffer`，以及 `Date` + `SimpleDateFormat` / `java.time`。功能上它们几乎等价，差别全落在同一根轴上——可变性，以及由此决定的线程安全。下面每个结论都有 JDK 22 的实跑输出。

## 一、三种字符串容器，差别只在一次加锁

| 对比项 | `String` | `StringBuilder` | `StringBuffer` |
| :--- | :--- | :--- | :--- |
| 可变性 | 不可变 | 可变 | 可变 |
| 线程安全 | 安全（不可变天然安全） | 不安全 | 安全（方法加了 `synchronized`） |
| 起始版本 | 1.0 | 1.5 | 1.0 |
| 适用场景 | 少量、常量字符串 | 单线程拼接 | 多线程共享同一个缓冲 |

`StringBuilder` 和 `StringBuffer` 都继承 `AbstractStringBuilder`，内部是一个字符数组加一个 `count`，`append` / `insert` / `reverse` 全是就地改。

两者 API 几乎一字不差，唯一的结构性差别是 `StringBuffer` 每个方法都带了 `synchronized`。

多出来的那次加锁值多少钱？同一个拼接任务，10 万次迭代：

```java
String s = "";
for (int i = 0; i < 100_000; i++) s += i;

StringBuilder b = new StringBuilder();
for (int i = 0; i < 100_000; i++) b.append(i);

StringBuffer f = new StringBuffer();
for (int i = 0; i < 100_000; i++) f.append(i);
```

```text
string+=2209.3ms builder=1.5ms buffer=2.9ms
```

`String` 慢了一千四百多倍，原因在「不可变」：每次加号都得造一个新对象再把旧内容搬过去，10 万次就是 10 万个中间对象。`StringBuilder` 与 `StringBuffer` 只差一倍——锁的开销真实存在，但在单线程里它是纯成本。

所以选型只有一句：**单线程一律 `StringBuilder`**；确实有多个线程往同一个缓冲里写，才轮到 `StringBuffer`。而后者在产品代码里极少见，更常见的做法是每个线程各持一个 `StringBuilder`。

## 二、同一段并发代码，`StringBuilder` 丢了近 5 万字符

「不安全」不是理论判断。两个线程各往同一个容器 append 20 万次，理论上结果是 40 万：

```java
static int runConcurrent(Appendable ap) throws Exception {
    Runnable task = () -> {
        for (int i = 0; i < 200_000; i++) {
            try { ap.append('x'); }
            catch (Exception e) { throw new RuntimeException(e); }
        }
    };
    Thread t1 = new Thread(task), t2 = new Thread(task);
    t1.start(); t2.start(); t1.join(); t2.join();
    return ((CharSequence) ap).length();
}
// 同一个 runConcurrent：传 StringBuilder 得 352785，传 StringBuffer 得 400000
```

`StringBuilder` 少了 47215 个字符，`StringBuffer` 一个不差。原因是 `count++` 与数组写入不是原子操作：两个线程同时读到同一个 `count`，后写的把先写的盖掉。

更麻烦的是它的表现形式不固定。同一段代码重复跑十次，大多数时候只是少一截数据，但也会有几次直接抛 `ArrayIndexOutOfBoundsException`——扩容时内部数组被整个换掉，另一个线程手里还是旧数组的引用，写过去就越界了。丢数据时程序不报错，抛异常时线程当场死掉，两种都是并发写同一个 `StringBuilder` 的正常后果。

字符串拼接尚且看得见，换成计数器、缓存、统计聚合，丢掉的就不是字符了。

## 三、扩容是乘二加二，不是加一

无参构造的初始容量是 16，装不下时新容量按「原容量乘二加二」算：

```java
StringBuilder sb = new StringBuilder();
int last = sb.capacity();
for (int i = 0; i < 2000; i++) {
    sb.append('x');
    if (sb.capacity() != last) {
        System.out.print(last + "->" + sb.capacity() + " ");
        last = sb.capacity();
    }
}
```

```text
capSeries=16->34 34->70 70->142 142->286 286->574 574->1150 1150->2302
```

从 16 到 2302 一共扩了 7 次，而不是 2286 次。这就是倍增策略的作用：扩容等于 `Arrays.copyOf` 搬一次整个数组，次数必须是对数级。

两个细节容易踩：

`new StringBuilder("hello")` 的容量实测是 21 而不是 5——它在字符串长度之外再多留 16 的余量。

预分配也不是一劳永逸：`new StringBuilder(1024)` 装 1500 个字符，容量照样从 1024 扩到 2050。能预估长度就一次给够，`new StringBuilder(1500)` 比 `new StringBuilder(1024)` 少搬一次数组。

## 四、`+` 在 JDK 9 之后不再建 `StringBuilder`

流传最广的一句是「每次加号都会 `new` 一个 `StringBuilder`」。这句话在 JDK 8 及以前成立，现在不成立了：

```java
static String join(int a, int b) { return "" + a + "-" + b; }
```

```text
static java.lang.String join(int, int);
  Code:
     0: iload_0
     1: iload_1
     2: invokedynamic #7,  0    // InvokeDynamic #0:makeConcatWithConstants:(II)Ljava/lang/String;
     7: areturn
```

编译结果里没有 `new StringBuilder`、没有 `append`，只有一条 `invokedynamic`，指向 `StringConcatFactory.makeConcatWithConstants`。字符串拼接从「编译期展开成字节码」变成了「运行期由引导方法生成一个方法句柄」。

但第一条实测里 `s += i` 仍然要 2209 毫秒，为什么？因为**每次执行加号仍然产出一个新 `String`**。变的只是中间环节不再建 `StringBuilder`，变不了「`String` 不可变，改就是造新对象」这条根因。所以在循环里用加号拼接，慢的性质没变，只是慢的机制换了。

## 五、老日期 API 的三个坑：1900、0、共享 `SimpleDateFormat`

`java.util.Date` 有三个先天问题，每一个都能让线上数据悄悄错掉：

```java
Date bad = new Date(2026, 11, 3);
System.out.println(bad.getYear() + "+1900 year, month=" + bad.getMonth());
```

```text
newDate2026_11_3=2026+1900 year, month=11
```

`getYear()` 返回的是「当前年份减 1900」，`getMonth()` 从 0 起算。所以这个构造出来的对象实际是 **3926 年 12 月**——参数写 2026 和 11，得到的是别的日期，而且不报错。

第三个坑更隐蔽，它只在并发时暴露。`SimpleDateFormat` 内部有一个共享的 `Calendar` 字段，多个线程共用一个实例格式化，结果会互相踩：

```java
static final Instant BASE = Instant.parse("2026-11-03T11:14:00Z");
static final ZoneId CN = ZoneId.of("Asia/Shanghai");

static int errors(Object fmt) throws Exception {
    ExecutorService pool = Executors.newFixedThreadPool(8);   // 8 个线程共用一个格式化器
    List<Future<Integer>> fs = new ArrayList<>();
    for (int t = 0; t < 8; t++) {
        fs.add(pool.submit(() -> {
            int bad = 0;
            for (int i = 0; i < 20_000; i++) {
                Date d = Date.from(BASE.plusSeconds(i % 60));
                String want = "2026-11-03 19:14:" + String.format("%02d", i % 60);   // 上海时区、秒补零
                String out = (fmt instanceof SimpleDateFormat s)
                        ? s.format(d)
                        : ((DateTimeFormatter) fmt).format(LocalDateTime.ofInstant(d.toInstant(), CN));
                if (!out.equals(want)) bad++;
            }
            return bad;
        }));
    }
    int total = 0;
    for (Future<Integer> f : fs) total += f.get();
    pool.shutdown();
    return total;
}
```

```text
sdfErrors=118534 dtfErrors=0
```

16 万次格式化，`SimpleDateFormat` 错了 118534 次（74.1%），换成同样模式串的 `DateTimeFormatter`、共享同一个实例，0 次错误。具体错多少次每跑一次都不同：同一段代码重跑十八次，错误率落在 68.8% 到 80.5% 之间，而 `DateTimeFormatter` 十八次全是 0。踩踏是概率事件，不确定的是次数，确定的是它一定发生。

这个对比说明的不是「新 API 更好用」，是「老 API 在多线程下根本不能用」——除非每次都 new 一个，或者用 `ThreadLocal` 兜着。

## 六、`java.time` 按「有没有时区」分工，差值分两种量

`java.time` 不是一个类，是一套按维度切开的类型：

| 需求 | 用哪个 | 备注 |
| :--- | :--- | :--- |
| 只要年月日 | `LocalDate` | 生日、账单日 |
| 要时分秒不要时区 | `LocalTime` / `LocalDateTime` | 营业时间、排班 |
| 跨时区、要夏令时正确 | `ZonedDateTime` | 订机票、跨区会议 |
| 存库、传接口 | `Instant` | UTC 时间戳，精确到纳秒 |
| 格式化与解析 | `DateTimeFormatter` | 不可变，可安全共享 |
| 算两个时间差多少 | `ChronoUnit` / `Duration` / `Period` | `Period` 给年月日，`Duration` 给秒 |

全部类型都是不可变的，`plusDays` 返回新对象：

```java
LocalDate d = LocalDate.of(2026, 11, 3);
LocalDate d2 = d.plusDays(10);
System.out.println("d=" + d + " d2=" + d2 + " same=" + (d == d2) + " days=" + ChronoUnit.DAYS.between(d, d2));
```

```text
d=2026-11-03 d2=2026-11-13 same=false days=10
```

`d` 一动没动。这也意味着 `d.plusDays(10);` 单独写一行等于什么都没做——必须 `d = d.plusDays(10)`。

算差值时分两种量，选错了直接抛异常：

```java
Duration.between(d, d2);        // 抛出 UnsupportedTemporalTypeException
Period.between(d, d2);          // 10 天
ChronoUnit.DAYS.between(d, d2); // 10
```

`LocalDate` 没有「时」和「秒」，所以 `Duration`（秒级量）无从下手，实跑确实抛了 `UnsupportedTemporalTypeException`。日期之间用 `Period` 或 `ChronoUnit`，时间点之间才用 `Duration`。

## 七、存 `Instant`、显示时再转时区

跨时区是日期问题里最容易出错的地方，`java.time` 给的答案很干脆：**存储用绝对时刻，显示用当地时区**。

```java
Instant ins = Instant.parse("2026-11-03T11:14:00Z");
System.out.println(ins.atZone(ZoneId.of("Asia/Shanghai")));

Date legacy = Date.from(ins);
System.out.println(legacy.toInstant().equals(ins));
```

```text
zoned=2026-11-03T19:14+08:00[Asia/Shanghai]
dateRoundTrip=true
```

同一个时刻，UTC 是 11:14，上海是 19:14。存进数据库的是前者，页面上按用户时区渲染——只有这样，「服务器在哪个机房」才不会影响业务时间。

`Date.from(instant)` 与 `date.toInstant()` 是双向桥，老代码不用一次性全改。反过来，把两个时区的时刻各自转成 `LocalDateTime` 再比大小是错的——`LocalDateTime` 本身不带时区，比出来的是两个「墙上时间」，不是两个时刻。要比时刻就统一转 `Instant`，或直接比 `ZonedDateTime`。

## 八、小结

- 三组对照共用一条判据：**这个对象会被谁改**。不可变 → 天然线程安全；可变 → 要么单线程独占，要么加锁。
- `StringBuilder` 与 `StringBuffer` 只差一次加锁。单线程差一倍，多线程共享时前者会丢数据，甚至直接抛越界异常。
- 扩容是 ×2+2：16 → 34 → 70 → 142，能预估长度就一次 `new StringBuilder(n)` 给够。
- `+` 在 JDK 9 之后走 `invokedynamic`，不再建 `StringBuilder`，但每次仍产出新 `String`，循环里照样慢。
- 老日期 API 靠「记得」防不住：1900 偏移、月份从 0 起、共享 `SimpleDateFormat` 在八线程下七成以上出错。存 `Instant`、显示转 `ZonedDateTime`，日期差用 `Period` / `ChronoUnit`，时间点差才用 `Duration`。
