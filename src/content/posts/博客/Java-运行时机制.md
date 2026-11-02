---
title: Java 运行时：类加载、JAVA_HOME 与 JIT 分层编译
date: 2026-10-29
subject: 博客
category: Java
tags:
  - Java
  - JVM
  - 环境
summary: 类加载为什么是懒的、五个阶段哪一步才执行静态代码块、ClassNotFoundException 与 NoClassDefFoundError 各指向什么、JAVA_HOME 与 PATH 各给谁看、三步排查法怎么定位版本问题、jlink 怎么裁出最小运行时，以及 JIT 分层编译带来的可见性坑。
---

# Java 运行时：类加载、JAVA_HOME 与 JIT 分层编译

前面几篇讲的是「代码怎么写」，这篇讲「代码怎么跑起来」。三个话题看着分散，其实都在回答同一个问题：**从 `.class` 文件到机器跑出结果，中间发生了什么。**

- 类加载：`.class` 什么时候进内存。
- 环境变量：`java` 命令和 Maven 这类工具怎么找到 JDK。
- JIT：字节码怎么变成机器码、为什么「跑一会儿会变快」。

## 一、类加载是懒的，静态代码块不是启动就执行

`.class` 不会在程序启动时全部加载。JVM 在**第一次主动使用**某个类时才加载它，加载过程分五步：

```text
加载 → 验证 → 准备 → 解析 → 初始化
```

- **加载**：找到 `.class` 文件，读进内存，生成 `Class` 对象。
- **验证**：检查字节码格式、语义合法性（防止手写坏字节码搞崩 JVM）。
- **准备**：给静态变量分配内存并赋**零值**（`int` 是 0，引用是 `null`），不是代码里写的初始值。
- **解析**：把常量池里的符号引用替换成直接引用（可以延迟到首次使用时）。
- **初始化**：执行静态变量赋值和静态代码块——**这一步才跑你写的 `static { }`**。

「准备阶段赋零值」这条能解释一个常见困惑：

```java
static int a = 5;
```

在准备阶段 `a` 是 0，到初始化阶段才变成 5。所以静态代码块里如果读到「另一个还没初始化的静态变量」，拿到的可能是 0——取决于声明顺序。

类的初始化时机（「主动使用」）包括：`new`、访问静态字段、调用静态方法、反射 `Class.forName`、初始化子类（父类会先初始化）、作为启动类。

**为什么懒加载**：只加载用到的类，启动快、内存省。代价是「类找不到」的错误被推迟到运行期——编译能过，跑起来才炸。

## 二、三个「找不到类」，分属不同阶段

| 报错 | 阶段 | 真正原因 |
| :--- | :--- | :--- |
| `ClassNotFoundException` | 运行期，**显式**加载 | `Class.forName(...)` 或类加载器找不到，通常是 classpath 缺 jar |
| `NoClassDefFoundError` | 运行期，**隐式**加载 | 编译时在、运行时不在；**或该类的静态初始化块抛了异常** |
| `UnsupportedClassVersionError` | 运行期，加载字节码时 | 编译用的 JDK 比运行时新 |

第一条和第二条的区别在「谁发起的」：`Class.forName` 是代码显式要求加载，找不到抛 `ClassNotFoundException`（受检异常）；`new Foo()` 是 JVM 隐式加载，找不到抛 `NoClassDefFoundError`（`Error`，不受检）。

**`NoClassDefFoundError` 最容易误判**：它经常不是「真没这个类」，而是**这个类的静态初始化挂了**。只看报错名会往 classpath 上找，真正该看的是 `Caused by` 那一行——那里才写着「`ExceptionInInitializerError`」或者真正的异常。

第三条是版本问题：

```text
java.lang.UnsupportedClassVersionError:
  Hello has been compiled by a more recent version of the Java Runtime
  (class file version 66.0), this version ... only recognizes ... 61.0
```

`66.0` 对应 Java 22，`61.0` 对应 Java 17。字节码**向下兼容**：新 JVM 能跑旧字节码，反过来不行。老服务器跑新编译的包必撞这条，解法是编译时降级：

```bash
javac --release 17 Hello.java
```

用 `--release` 而不是 `-source/-target`，因为它会连 JDK 的 API 一起按目标版本校验（避免用了 Java 22 才有的方法却在 17 上跑）。

## 三、`JAVA_HOME` 与 `PATH` 是两条独立的路

| 变量 | 作用 | 典型值 |
| :--- | :--- | :--- |
| `JAVA_HOME` | 给**其他工具**看，定位 JDK 根目录 | `C:\Program Files\Java\jdk-22` |
| `PATH` | 给**命令行**看，定位可执行文件 | `%JAVA_HOME%\bin` |

为什么两个都要配：

- 只配 `JAVA_HOME` 不配 `PATH` → 命令行敲 `java` 报「不是内部或外部命令」。
- 只配 `PATH` 不配 `JAVA_HOME` → 命令行能跑，Maven / Gradle / Tomcat 报 `JAVA_HOME not found`。

它们是两条独立路径：命令行按 `PATH` 找 `java.exe`，工具按 `JAVA_HOME` 拼 classpath 和工具链。缺一条就有一类工具坏掉。

配置技巧：`PATH` 里写 `%JAVA_HOME%\bin` 而不是 `C:\...\jdk-22\bin`。换 JDK 版本时只改一处，配一次省三年。

## 四、三步排查法

按顺序走，能定位九成环境问题：

```bash
java -version      # 有输出 → JVM 在，且能看到版本
javac -version     # 报「不是内部命令」→ 只装了 JRE，或 PATH 没配 bin
echo %JAVA_HOME%   # 为空或指向不存在的目录 → 其他工具会连锁报错
```

| 现象 | 原因 | 修法 |
| :--- | :--- | :--- |
| `java` 能用、`javac` 不能用 | 装的是 JRE | 装 JDK，或把 JDK 的 `bin` 加进 `PATH` |
| 版本号与刚装的不一致 | `PATH` 里有多个 Java（常见 Oracle 的 `javapath` 转发目录） | 把新 JDK 的 `bin` 提到最前 |
| Maven / IDEA 找不到 JDK | 只配了 `PATH` | 补 `JAVA_HOME` |

「版本不对」先看 `PATH` 顺序，别急着重装——重装完之后如果旧路径还在前面，问题原样存在。

## 五、JDK 9 之后，`jre/` 目录去哪了

JDK 8 及之前，安装目录里 `jdk/` 和 `jre/` 并排放着，同一套类库装两遍，白占几百 MB。

JDK 9 用**模块化（JPMS，Jigsaw 项目）**替掉了这个结构：只剩一套模块（`java.base`、`java.sql`、`java.desktop`…），「JRE」从目录变成了**由模块拼出来的运行时镜像**。

于是有了 `jlink`：

```bash
jlink --add-modules java.base --output myjre
```

产出一个几十 MB 的独立运行时，只含 `java.base`。`jpackage` 更进一步，直接打成带运行时的安装包（exe / dmg / deb）。

两个可见后果：

- **「JDK 包含 JRE」依然成立**，只是物理形态从目录变成了模块集合。
- 老教程里的 `jhat`（堆分析工具）在 JDK 9 已被移除，照做会提示命令不存在。现在用 `jmap` 导出 dump 再交给 MAT 或 `jhsdb`。

部署方式也变了：以前「把 JRE 拷到目标机器就能跑」，现在更常见 `jlink` / `jpackage` 打自带运行时的镜像——容器镜像能因此小一个量级。

## 六、JIT：跑一会儿变快不是错觉

JVM 启动时**纯解释执行**字节码，同时统计方法调用次数和循环回边次数；某个方法「热」到阈值，就被编译成本地机器码缓存下来。这就是 JIT（Just-In-Time）。

纯解释太慢，全预编译又太耗时（还要承担「编译了却只跑一次」的浪费），HotSpot 的答案是**分层编译**：

| 层级 | 编译器 | 特点 | 适用 |
| :--- | :--- | :--- | :--- |
| 0 | 解释器 | 不优化，启动最快 | 只跑一两次的代码 |
| 1–3 | C1 | 快速编译、轻度优化、带 profiling | 温热代码 |
| 4 | C2 | 慢速编译、激进优化（内联、逃逸分析、向量化） | 真热点 |

一个方法可能先被解释，再被 C1 编译，最后被 C2 重编译——所以**同一段代码跑第一万次和第一亿次的速度可以差十倍**。压测时「预热」就是在等编译层级爬上去。

三个开关，动手时用得上：

```bash
java -Xint  Hello                        # 纯解释，禁用 JIT（慢十几倍）
java -Xcomp Hello                        # 尽量全编译（启动慢，测峰值）
java -XX:TieredStopAtLevel=1 Hello       # 只到 C1，缩短预热
```

`-XX:TieredStopAtLevel=1` 对「跑几秒就退出」的 CLI 工具是实操技巧：等 C2 编译完程序早结束了，限制在 C1 总耗时反而更短。

## 七、JIT 的副作用：可见性问题

JIT 的优化假设之一是「单线程语义」：如果一个变量在循环里没被本线程修改，它就可以被缓存进寄存器，不必每次回内存读。

这在单线程下永远正确，在多线程下会出人命：

```java
boolean running = true;

// 线程 A
while (running) { /* 干活 */ }

// 线程 B
running = false;    // 线程 A 可能永远看不到
```

线程 A 可能把 `running` 读进寄存器后一直用缓存值，循环永不退出。`volatile` 的作用就是禁止这种缓存（保证可见性），`synchronized` 顺带也保证。

一个实用的排查经验：**`-Xint` 下跑得好、开 JIT 就出问题，八成是可见性问题**——因为关掉 JIT 就没有寄存器缓存了，bug 自动「消失」。这类 bug 极难复现，也极难在测试环境抓到。

## 小结

- `.class` **懒加载**，第一次主动使用时才走「加载 → 验证 → 准备 → 解析 → 初始化」；静态代码块在**初始化**阶段执行，准备阶段只赋零值。
- `ClassNotFoundException`（显式 `Class.forName`）/ `NoClassDefFoundError`（隐式加载，**也可能是静态初始化挂了**，要看 `Caused by`）/ `UnsupportedClassVersionError`（编译比运行新，用 `--release` 降级）。
- `JAVA_HOME` 给工具看、`PATH` 给命令行看，两个都要配；`PATH` 引用 `%JAVA_HOME%\bin`，换版本只改一处。
- 排查三步：`java -version` → `javac -version` → `echo %JAVA_HOME%`；版本不对先看 `PATH` 顺序。
- JDK 9 起 `jre/` 目录消失，改成模块集合；`jlink` / `jpackage` 按需裁运行时，「JDK 包含 JRE」依然成立。
- JIT 分层编译：解释器 → C1 → C2，**「跑一会儿变快」是编译层级在爬**。
- JIT 会缓存变量到寄存器，多线程共享变量必须 `volatile` / `synchronized`——`-Xint` 正常、开 JIT 出错的，先怀疑可见性。
