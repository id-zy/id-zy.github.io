---
title: Java 异常：三种出口，谁该吃掉它
date: 2026-11-03
subject: 博客
category: Java
tags:
  - Java
  - 异常
  - try-with-resources
summary: 受检异常、运行时异常、Error 是三条不同的责任线，try、throws、finally 是三种不同的出口。用 JDK 22 实跑拆开讲：受检异常不处理就编译不过，finally 里的 return 会覆盖返回值还会吞掉异常，try-with-resources 逆序关资源并把关闭时的异常降为 suppressed。
---

# Java 异常：三种出口，谁该吃掉它

「加个 try 就行」是业务代码里最容易做出的决定。但异常真正的难点不是语法，是责任划分：这个异常该就地解决、往上抛，还是根本不该出现？选错了不会编译报错，只会在深夜的日志里变成一行没有上下文的堆栈。

`Throwable` 下面先分两支，`Exception` 再分两支，合起来是三条不同的责任线；`try` / `throws` / `finally` 则是三种不同的出口。这篇用 JDK 22 的实跑结果，把「谁该吃掉异常」这件事拆开。

## 一、`Throwable` 分两支，只有一支该管

`Throwable` 是根，往下第一层就分家：

- `Error`：JVM 层面的问题，`StackOverflowError`、`OutOfMemoryError`。程序里通常不处理，因为能做的动作几乎没有——栈已经满了，你连打日志的方法调用都可能再压一层栈。
- `Exception`：业务该关心的部分，再分 `RuntimeException`（非受检）和其他（受检）。

`Error` 不是不能捕获，是不该指望靠捕获救回来。递归写飞了就是这样：

```java
static int depth = 0;
static void down() { depth++; down(); }

public static void main(String[] args) {
    try { down(); }
    catch (Throwable t) { System.out.println("type=" + t.getClass().getSimpleName() + " depth=" + depth); }
}
// 输出: type=StackOverflowError depth=22668
```

两万两千多层就到底了（这个数随栈帧大小和 JIT 状态浮动，重跑会有出入）。捕获它只是为了让程序不静默退出，拿到的 `depth` 是个事后读数，不是可恢复的错误。

## 二、受检异常是编译器的契约：不处理就别想编译

受检（checked）异常代表「可预期、可恢复」的外部状况：文件不在、网线断了、端口被占。编译器的态度很硬——要么就地处理，要么在签名里声明。

```java
import java.nio.file.*;

public class CheckedCall {
    public static void main(String[] args) {
        Files.readAllLines(Path.of("a.txt"));
    }
}
```

```text
CheckedCall.java:5: error: unreported exception IOException; must be caught or declared to be thrown
        Files.readAllLines(Path.of("a.txt"));
                          ^
1 error
```

报错把两个选项都点明了：`caught` 或 `declared`。对应两种写法——

```java
// 就地处理
try {
    var lines = Files.readAllLines(Path.of("a.txt"));
} catch (IOException e) {
    // 读不到就退回默认值
}

// 甩给调用方
void readConfig() throws IOException {
    Files.readAllLines(Path.of("a.txt"));
}
```

选哪个的判据不是「哪个短」，而是**这一层有没有能力做决定**。DAO 层读不到文件，它不知道该返回空配置还是让请求失败，那就 `throws` 上去；Service 层知道业务上「配置缺失就走默认值」，才轮到它 `catch`。

## 三、运行时异常编译器不管，写错了才知道

`NullPointerException`、`ArrayIndexOutOfBoundsException`、`NumberFormatException` 都属于 `RuntimeException`，编译器一个字都不会提醒：

```java
try { Integer.parseInt("abc"); }
catch (NumberFormatException e) { System.out.println(e.getClass().getSimpleName()); }
// 输出: NumberFormatException
```

这类异常的共性是「代码写错了」，不是「外部环境变了」。所以处理手段不是 catch，是判空、边界检查、入参校验。反过来，用 `catch (Exception e)` 兜住它们，等于把 bug 变成静默的数据错误——解析失败被 catch 之后当成 0 继续算，下游得出一个看起来很正常的错数。

## 四、`throw` 抛对象，`throws` 声明类型

两个词只差一个字母，作用完全不同：

| 关键字 | 位置 | 作用 |
| :--- | :--- | :--- |
| `throw` | 方法体 | 抛出一个异常**对象**，执行流立即中断 |
| `throws` | 方法签名 | 声明可能抛出的**类型**，只是告知，不做处理 |

```java
void checkAge(int age) {
    if (age < 0) throw new IllegalArgumentException("age < 0");   // 抛对象
}

void load() throws IOException {                                   // 声明类型
    Files.readAllLines(Path.of("a.txt"));
}
```

一个方法可以 `throws` 多个类型，用逗号分隔；`throw` 一次只抛一个。`throws` 写在签名上不带执行动作，方法正常跑完也完全可能一个异常都没抛。

## 五、`finally` 有两个怪癖：覆盖返回值、吞掉异常

`finally` 的语义是「无论如何都执行」，这句话在 `return` 面前会被推到极端：

```java
static int finallyReturn() { try { return 1; } finally { return 2; } }
static int finallyLocal()  { int x = 1; try { return x; } finally { x = 9; } }
static int swallow()       { try { throw new RuntimeException("boom"); } finally { return 3; } }
```

```text
finallyReturn=2
finallyLocal=1
swallow=3
```

三行输出对应三件事：

- `finally` 里的 `return` **覆盖**了 `try` 的返回值，1 变成 2。
- `finally` 改局部变量**不影响**返回值——`return x` 时值先被复制到返回槽，后面改的是栈帧里的变量，不是那个副本。
- `finally` 里的 `return` 会把正在传播的异常**吞掉**：`boom` 没有抛出去，方法正常返回 3。

第三条最危险。日志里既没有异常也没有返回值异常，只有结果不对。所以规矩很干脆：`finally` 里只做清理，不写 `return`、不写 `break`、不写可能抛异常的代码。

## 六、关资源别写 `finally`：`try-with-resources` 逆序关

手写 `finally` 关资源有两个难看的点：要先判空，`close()` 自己还会抛异常，而这个异常会盖掉 `try` 里真正的原因。

`try-with-resources` 把这两件事一起解决了：实现 `AutoCloseable` 的资源写在括号里，自动关，且按**声明的逆序**关。

```java
static class R implements AutoCloseable {
    final String n;
    R(String n) { this.n = n; }
    public void close() throws IOException {
        System.out.println("close " + n);
        if (n.equals("A")) throw new IOException("close-A-failed");
    }
}

void twr() throws IOException {
    try (R a = new R("A"); R b = new R("B")) {
        System.out.println("body");
    }
}
```

```text
body
close B
close A
caught=close-A-failed suppressed=0 first=-
```

先声明 A 后声明 B，关闭顺序是 B 再 A——后开的先关，符合资源的依赖方向。这一次 `body` 没出事，所以 `close-A-failed` 就是主异常。

真正体现设计意图的是两个异常同时发生的情况：只留一个资源 `A`，让 `body` 自己抛 `throw new IOException("body-failed")`，`close()` 也抛，重跑得到：

```text
close A
bothCaught=body-failed suppressed=1 first=close-A-failed
```

主异常仍是 `body-failed`，`close()` 抛的 `close-A-failed` 挂在 `getSuppressed()` 里，一个都不丢。手写 `finally` 做不到这件事，它只会让后抛的那个覆盖先抛的。

## 七、catch 从子类排到父类，顺序错了编译器直接拦

`catch` 按类型匹配，从前往后第一个命中就进。所以父类必须写在子类后面：

```java
try {
    throw new IOException("x");
} catch (Exception e) {
    System.out.println("exception");
} catch (IOException e) {          // 永远到不了
    System.out.println("io");
}
```

```text
CatchOrder.java:9: error: exception IOException has already been caught
        } catch (IOException e) {
          ^
1 error
```

（代码块是节选，报错里的行号对应完整文件。）

编译器比运行时更早知道「这个分支是死代码」，于是直接拒绝编译。多态在这一层也有直接后果：`IOException` 是 `Exception` 的子类，先写父类就把所有子类都吃掉了。

比顺序更常见的问题是空 `catch`：

```java
try { doSomething(); } catch (Exception e) { }   // 等于把错误静音
```

出问题时连堆栈都没有，排查只能靠猜。要么 `e.printStackTrace()`，要么转成日志加业务异常再抛出去——但至少要让信息活下来。

## 八、往上抛时带上 cause，别把链条剪断

分层架构里异常必然要跨层：DAO 的 `IOException` 到 Service 应该变成业务语义的异常，但底层原因不能丢。做法是把原异常塞进 `cause`：

```java
static class BizException extends RuntimeException {
    final String code;
    BizException(String code, String msg, Throwable cause) { super(msg, cause); this.code = code; }
}

void load() {
    try { Integer.parseInt("abc"); }
    catch (NumberFormatException e) { throw new BizException("E4001", "bad config", e); }
}
```

```text
code=E4001 msg=bad config cause=NumberFormatException
chainDepth=2
```

调用方拿到的是「E4001 / bad config」，排错时顺着 `getCause()` 一路能看到 `NumberFormatException`。如果写成 `throw new BizException("E4001", "bad config")`，链条就断在 Service 层——日志里只剩一句业务错误，根因凭空消失。

`printStackTrace()` 打印整条链，`getMessage()` 只给最外层的一句话。这也是为什么日志里只打 `e.getMessage()` 往往等于没打。

## 九、小结

- `Error` 不是业务该管的，`Exception` 才是；`Exception` 里受检的代表可恢复的外部状况，`RuntimeException` 代表代码写错了。
- 受检异常的处理位置只有一个判据：**这一层有没有能力做决定**。没能力就 `throws`，别为了消掉编译错误写空 `catch`。
- `finally` 只做清理。它的 `return` 会覆盖返回值、会吞掉异常，两个后果都不会在日志里留下痕迹。
- 关资源用 `try-with-resources`：逆序关闭，`close()` 的异常降为 `suppressed` 而不是覆盖主异常。
- 跨层转换异常时带上 `cause`，否则根因会在日志里消失。
