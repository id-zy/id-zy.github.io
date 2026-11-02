---
title: Java 从 .java 到运行：JDK、JRE、字节码与 JIT 的一条完整链路
date: 2026-10-29
subject: 博客
category: Java
tags:
  - Java
  - JVM
  - 编译原理
summary: 把 JDK / JRE / JVM 的包含关系、跨平台到底跨的是什么、javac 做了什么、JVM 怎么用解释器加 JIT 分层编译把热点代码变成机器码、类加载为何懒、三个「找不到类」的报错怎么分，串成一条从写下 .java 到程序跑起来的完整链路，末尾附环境变量与三步排查。
---

# Java 从 .java 到运行：JDK、JRE、字节码与 JIT 的一条完整链路

装 Java 的第一步通常是「下载 JDK」，但很少有人能立刻说清：为什么不是装 JRE？`java -version` 和 `javac -version` 为什么输出不一样？JDK 9 之后安装目录里那个 `jre/` 文件夹怎么不见了？以及——「Java 是解释型语言」这句话到底错在哪？

这四个问题其实指向同一条链路：**源码 → 字节码 → 类加载 → 解释执行 → JIT 编译 → 机器码**。把这条链走一遍，环境问题、启动速度、版本报错基本都能自己诊断。

## 一、先理清包含关系：JDK ⊃ JRE ⊃ JVM

这三者是包含关系，不是并列关系。

```text
JDK（Java Development Kit，开发工具包）
 ├── JRE（Java Runtime Environment，运行环境）
 │    ├── JVM（Java Virtual Machine）
 │    └── 核心类库（String、集合、IO、网络…）
 └── 开发工具
      ├── javac   编译：.java → .class
      ├── java    运行：启动 JVM 加载 .class
      ├── javadoc 生成 API 文档
      ├── jar     打包
      └── jdb     调试
```

一句话：**JDK = JRE + 开发工具，JRE = JVM + 核心类库**。

- 只装 JRE：能跑别人的程序，**不能编译**自己的代码——没有 `javac`。
- 装 JDK：既能编译又能运行，开发环境必须装它。

顺带一个历史遗留：`jhat`（堆分析工具）在 **JDK 9 时被移除**，现在做堆分析用 `jmap` 导出 dump 再交给 MAT 或 `jhsdb`。老教程还在教 `jhat`，照做会提示命令不存在。

## 二、跨平台的是字节码，不是 JVM

「一次编写，到处运行」常被误解成「JVM 是跨平台的」。恰恰相反：**JVM 本身是平台相关的**，Windows 版、Linux 版、macOS 版是三套不同的程序。

```text
Hello.java ──javac──> Hello.class（平台无关的字节码）
                          │
              ┌───────────┼───────────┐
        Windows JVM   Linux JVM    macOS JVM
              │           │           │
           Windows      Linux        macOS
```

每个平台上都装了一个「懂字节码」的 JVM，同一份 `.class` 才能在哪儿都跑起来。跨的是字节码这一层。

这也顺手解释了第一个性能疑问：C 的程序是操作系统直接执行的机器码，Java 要先起一个 JVM 进程，再由它解释字节码。**启动慢，是因为多了一整层。**

## 三、javac 到底做了什么

```bash
javac Hello.java     # 产出 Hello.class
java Hello           # 注意：不带 .class，带的是类名
```

`javac` 不是简单地把文本翻成二进制，它做四件事：

1. **词法 / 语法分析**——检查是不是合法 Java（漏分号、括号不匹配在这里报错）。
2. **语义分析**——类型检查、变量是否初始化、方法是否存在（`cannot find symbol` 在这里报）。
3. **生成字节码**——输出 `.class`，里面是 JVM 指令（`aload_0`、`invokevirtual`、`ireturn`…）。
4. **常量池与符号引用**——类和方法引用先以「符号」形式存着，运行时才解析成内存地址。

`.class` 是一个真正的「中间语言」文件：不依赖任何 CPU 指令集，只依赖 JVM 规范。这就是它能跨平台的全部原因。

两个高频命令坑，都是真实报错：

```text
$ java Hello.class
Error: Could not find or load main class Hello.class
Caused by: java.lang.ClassNotFoundException: Hello.class
```

**第二个命令要的是类名，不是文件名。** 另一条更隐蔽：`javac` 只检查语法和类型，**不做优化**——内联、逃逸分析、循环展开全在运行期的 JIT 里。这是 Java 与 C 的一个根本差别，也是后面「跑久了变快」的伏笔。

## 四、JVM 怎么跑字节码：解释器 + JIT 分层编译

JVM 启动时是**纯解释执行**：逐条读字节码，翻译成机器指令再执行。慢，但启动快。

同时它在后台统计每个方法的调用次数（以及循环回边次数）。某个方法「热」到阈值，就把它**编译成本地机器码**缓存下来，下次直接跑机器码。这就是 JIT（Just-In-Time）。

HotSpot 采用**分层编译（Tiered Compilation）**，五个层级可以简化成三层理解：

| 层级 | 编译器 | 特点 | 适用 |
| :--- | :--- | :--- | :--- |
| 0 | 解释器 | 不优化，启动最快 | 只跑一两次的代码 |
| 1–3 | C1（Client） | 快速编译，轻度优化，带 profiling | 温热代码 |
| 4 | C2（Server） | 慢速编译，激进优化（内联、逃逸分析、向量化） | 真热点 |

所以一个方法可能先被解释、再被 C1 编译、最后被 C2 重编译。**「跑一会儿变快」不是错觉，是编译层级在往上爬。**

几个能直接改变行为的参数：

```bash
java -Xint  Hello     # 纯解释，禁用 JIT（调试用，慢十几倍）
java -Xcomp Hello     # 尽量全编译（启动慢，测峰值性能用）
java -XX:TieredStopAtLevel=1 Hello   # 只到 C1，缩短预热（适合短命进程/CLI 工具）
```

最后一条在实践里很有用：跑几秒就退出的命令行工具，等 C2 编译完程序早结束了，限制在 C1 反而总耗时更短。

### JIT 的一个副作用：它能让「错的代码」看起来对

JIT 假设单线程语义成立。如果多线程共享变量没加 `volatile` / `synchronized`，JIT 可能把它缓存进寄存器，于是另一个线程改了它、本线程永远看不到——这是**可见性问题**。`-Xint` 下跑得好好的程序，开了 JIT 就挂，八成栽在这。

## 五、类加载：字节码怎么进内存

`.class` 不会一次性全加载。JVM 是**懒加载**：第一次用到某个类才去加载，走「加载 → 验证 → 准备 → 解析 → 初始化」五步。

这个机制带来三个现实后果：

- **启动快**：只加载用到的类。
- **`ClassNotFoundException` 常出现在运行时**：编译时类在 classpath 上，运行时不在（打 jar 漏依赖、`-cp` 写错）。
- **静态代码块在「第一次主动使用」时才执行**，不是程序启动时。

## 六、三个「找不到类」的报错，别搞混

| 报错 | 什么阶段 | 真正原因 |
| :--- | :--- | :--- |
| `ClassNotFoundException` | 运行期，**显式加载**时 | `Class.forName("...")` 或类加载器找不到指定类，通常是 classpath 缺 jar |
| `NoClassDefFoundError` | 运行期，**隐式加载**时 | 编译时存在、运行时找不到；或该类的静态初始化块抛了异常（首次加载失败后，后续都报这个） |
| `UnsupportedClassVersionError` | 运行期，加载字节码时 | 编译用的 JDK 比运行时的 JRE 新（`class file version 66.0` = Java 22） |

第二个最容易误判：`NoClassDefFoundError` 往往不是「真的没有这个类」，而是**这个类的静态初始化挂了**。看 `Caused by` 那行才找得到真凶。

第三个的版本号换算值得背：字节码是向下兼容的，新 JVM 能跑旧字节码，反过来不行。所以老服务器上跑新编译的包，就会撞上这条。

## 七、`java -version` 的三行输出与消失的 `jre/` 目录

```text
java version "22" 2024-03-19
Java(TM) SE Runtime Environment (build 22+36-2370)
Java HotSpot(TM) 64-Bit Server VM (build 22+36-2370, mixed mode, sharing)
```

三行分别是：语言版本、**运行时环境**（JRE）版本、**虚拟机**（HotSpot）版本。第二三行分开报——这正是「JRE 和 JVM 是两个东西」的直接体现。

`mixed mode` 表示解释执行与 JIT 混合（默认），`sharing` 表示开启了 CDS 类数据共享（加快启动）。哪天看到 `interpreted mode`，说明被 `-Xint` 强制成纯解释了，性能会掉一个量级。

再说 JDK 9 那个消失的目录。JDK 8 及之前，安装目录下并排放着 `jdk/` 和 `jre/`，等于同一套类库装了两遍，白占几百 MB。JDK 9 引入**模块化（JPMS，Jigsaw 项目）**后换了思路：

- 运行环境不再全量打包——东西越多，占空间越大、启动越慢。
- 开发者可以用 `jlink` **按应用实际用到的模块裁出最小运行时**。

```bash
# 只打包 java.base 模块，产出一个几十 MB 的独立运行时
jlink --add-modules java.base --output myjre
```

所以 `jre/` 目录消失了，但「JRE」这个概念还在——它变成了「由模块拼出来的运行时镜像」。**「JDK 包含 JRE」在 JDK 9 之后依然成立，只是物理形态从目录变成了模块集合。**

实践上的变化：以前可以「把 JRE 拷到目标机器就能跑」，现在更常见的是 `jlink` 或 `jpackage` 打一个自带运行时的镜像。容器镜像能做小，也是这条路线的直接收益。

## 八、环境变量：`JAVA_HOME` 与 `PATH` 分工不同

| 变量 | 作用 | 典型值 |
| :--- | :--- | :--- |
| `JAVA_HOME` | 告诉**其他工具**（Maven、Gradle、Tomcat、IDEA）JDK 装在哪 | `C:\Program Files\Java\jdk-22` |
| `PATH` | 告诉**命令行**去哪找 `java` / `javac` 可执行文件 | `%JAVA_HOME%\bin` |

只配 `JAVA_HOME` 不配 `PATH`，命令行敲 `java` 会说「不是内部或外部命令」；只配 `PATH` 不配 `JAVA_HOME`，命令行能跑但 Maven 报 `JAVA_HOME not found`。两个都要配，且 `PATH` 应该引用 `JAVA_HOME` 而不是写死路径——换版本时只改一处。

排查按这个顺序走，能定位九成问题：

```bash
java -version      # 有输出 → JVM/JRE 在，能看到具体版本
javac -version     # 报「不是内部命令」→ 只装了 JRE，或 PATH 没配 bin
echo %JAVA_HOME%   # 为空或指向不存在的目录 → 其他工具会连锁报错
```

| 现象 | 原因 | 修法 |
| :--- | :--- | :--- |
| `java` 能用，`javac` 不能用 | 装的是 JRE 不是 JDK | 装 JDK，或把 JDK 的 `bin` 加进 `PATH` |
| 版本号和刚装的不一致 | `PATH` 里有多个 Java（常见于 Oracle 的 `javapath` 转发目录） | 把新 JDK 的 `bin` 提到 `PATH` 最前面 |
| Maven / IDEA 报找不到 JDK | 只配了 `PATH`，没配 `JAVA_HOME` | 补 `JAVA_HOME` |
| `UnsupportedClassVersionError` | 编译用的 JDK 版本高于运行时的 JRE | 用同一版本，或编译时加 `--release 17` 降级 |

## 小结

- **JVM 运行字节码，JRE = JVM + 类库，JDK = JRE + 工具**，三层是包含关系，不是并列。
- 跨平台的是**字节码**，JVM 本身平台相关——每个平台一个 JVM，才是「一次编写到处运行」的全部秘密。
- 执行模型分三段：`javac` 编译成字节码 → JVM 解释 → 热点代码被 JIT 编译成机器码。启动慢和峰值不慢，是同一件事的两面。
- 分层编译让「第一次慢、后面快」成为常态；`javac` 不做优化，优化全在运行期。
- 三个「找不到类」的报错分属不同阶段：`NoClassDefFoundError` 常常是静态初始化失败，务必看 `Caused by`。
- JDK 9 用模块化替掉了 `jre/` 目录，`jlink` 可按需裁最小运行时；`JAVA_HOME` 给工具看，`PATH` 给命令行看。
