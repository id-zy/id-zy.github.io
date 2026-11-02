---
title: Java 数据类型：8 种基本类型、(byte) 200 与 Integer 的缓存
date: 2026-10-29
subject: 博客
category: Java
tags:
  - Java
  - 类型
  - 基本类型
summary: Java 的 8 种基本类型各占几个字节、为什么 double d = 10 不用强转而 int i = 3.99 编译不过、(byte) 200 为什么得到 -56、3.14 默认是 double 还是 float、局部变量为什么没有默认值、Integer 的 == 为什么在 127 和 128 上给出不同答案。
---

# Java 数据类型：8 种基本类型、(byte) 200 与 Integer 的缓存

Java 是强类型语言，但「强」的具体表现常常被低估：字面量有默认类型，赋值有宽窄之分，装箱有缓存，强转会静默丢数据。每一条都能让一段看起来正确的代码输出一个意外的数字。

这篇从类型出发，把「存什么、转什么、比什么」三件事一次讲完。

## 一、8 种基本类型，其余都是引用

```text
基本类型（8 种）
├── 整型：byte(1B) short(2B) int(4B) long(8B)
├── 浮点：float(4B) double(8B)
├── 字符：char(2B，Unicode)
└── 布尔：boolean（规范不保证 1 字节）

引用类型：类 · 数组 · 接口 · 枚举 · 注解 · record
```

范围记两个就够用：

| 类型 | 字节 | 范围 | 备注 |
| :--- | :--- | :--- | :--- |
| `byte` | 1 | -128 ~ 127 | 文件流、网络包常用 |
| `short` | 2 | -32768 ~ 32767 | 少见 |
| `int` | 4 | ±21 亿 | 默认整型 |
| `long` | 8 | 很大 | 字面量加 `L` |
| `float` | 4 | 约 7 位有效数字 | 字面量加 `f` |
| `double` | 8 | 约 15 位有效数字 | 默认浮点 |
| `char` | 2 | 0 ~ 65535 | Unicode 码元，不是字节 |
| `boolean` | — | `true` / `false` | 只有两个值 |

**`String` 不在这张表里。** 它是类，走引用语义——所以比内容要用 `equals()`，不能用 ` ==`。这一点是后面很多坑的总源头。

`char` 占 2 字节，因为它是 Unicode 码元（UTF-16 code unit），不是 ASCII 字节。`'中'` 是一个 `char`，但一个 emoji 往往是两个 `char`——这个细节在字符串长度那节还会出现。

## 二、宽化自动，窄化必须写括号

```java
double d = 10;          // 自动：int → double
int i = (int) 3.99;     // 强制：double → int
int j = 3.99;           // 编译错误：incompatible types
```

自动转换链：

```text
byte → short → int → long → float → double
                 ↑
               char
```

方向是「小 → 大」，编译器认为安全，自动完成。反过来（大 → 小）必须显式强转，**不写括号就是编译错误**——注意不是警告，是编译不过。这是 Java 比 C 严格的地方。

强转的行为是**截断**，不是四舍五入：

```java
System.out.println((int) 3.99);    // 3
System.out.println((int) -3.99);   // -3
```

负数也是往零的方向截。要四舍五入得用 `Math.round()`。

## 三、`(byte) 200` 为什么是 `-56`

```java
System.out.println((byte) 200);    // -56
```

`200` 是 `int`，二进制是 `00000000 00000000 00000000 11001000`。强转成 `byte` 只保留低 8 位：`11001000`。最高位是 1，按补码读就是负数：取反加一得 `00111000` = 56，所以是 `-56`。

这就是「超范围按补码回绕」：**强转不报错、不提示丢数据**。所以它危险——`(byte) 200` 和 `(byte) 100` 在代码里长得一样，结果一个正常一个变成负数。

同一类回绕在加法溢出时也会出现：

```java
int max = Integer.MAX_VALUE;
System.out.println(max + 1);    // -2147483648
```

Java 的整数溢出不抛异常（这点和 C# 的 `checked` 不同）。金额、计数器、时间戳这类不能回绕的值，用 `long` 或者 `Math.addExact()`。

`char` 参与运算时先升 `int`，这条也很容易看错：

```java
System.out.println('A' + 1);    // 66
System.out.println((char) ('A' + 1));   // B
```

## 四、字面量的默认类型：`3.14` 是 `double`

| 类型 | 例子 | 默认类型 | 备注 |
| :--- | :--- | :--- | :--- |
| 整数常量 | `100`、`-7` | `int` | 超范围加 `L` |
| 小数常量 | `3.14` | `double` | 要 `float` 必须加 `f` |
| 字符常量 | `'1'`、`'中'` | `char` | 单引号内有且只有一个字符 |
| 字符串常量 | `"hello"`、`""` | `String` | 双引号，可为空串 |
| 布尔常量 | `true`、`false` | `boolean` | 只有两个值 |
| 空常量 | `null` | — | 只能赋给引用类型 |

最常撞的一条：

```java
float f = 3.14;      // 编译错误：possible lossy conversion from double to float
float f = 3.14f;     // 正确
```

`3.14` 是 `double`，赋给 `float` 属于窄化，编译器不干。加个 `f` 就好——这个错误信息里 `lossy conversion` 这个词值得记住，它几乎总是指「大转小没写括号」。

`null` 只能给引用类型：

```java
int a = null;        // 编译错误
String s = null;     // 合法
```

这条限制挡住了一类「空值当 0」的误判——`int` 永远有值（默认 0），`Integer` 才可能是 `null`。两者混用是后面拆箱 NPE 的伏笔。

另外两种写法会遇到：`1_000_000`（下划线分隔，编译器忽略）、`0x1F` / `0b1010` / `017`（十六 / 二 / 八进制）。

## 五、`final` 与标识符：一条强制、一条只是约定

```java
final int MAX_SIZE = 100;
MAX_SIZE = 200;      // 编译错误：cannot assign a value to final variable
```

`final` 修饰的变量只能赋值一次。Java 没有 C 的 `const`，`final` 是它的对应物。常量习惯全大写 + 下划线——但这**只是约定**。

区分「编译器强制」和「只是约定」很重要：

- **强制**：标识符由字母、数字、`_`、`$` 组成，不能以数字开头，不能是关键字，**大小写敏感**。
- **约定**：类名大驼峰、方法名小驼峰、常量全大写。违反不报错，但可读性断崖。

`Hello` 和 `hello` 是两个不同的标识符，这在文件名上会要命（见后面「第一个程序」那篇）。

## 六、包装类与 -128 ~ 127 的缓存

每个基本类型都有包装类：`int` → `Integer`、`char` → `Character`、`double` → `Double`。存在的理由是泛型和集合：`List<Integer>` 合法，`List<int>` 不合法——泛型的类型参数只能是引用类型。

自动装箱和拆箱由编译器插入 `valueOf` / `intValue`：

```java
Integer i = 1;      // Integer.valueOf(1)
int n = i;          // i.intValue()
```

于是有了这个经典结果：

```java
System.out.println(Integer.valueOf(127) == Integer.valueOf(127));   // true
System.out.println(Integer.valueOf(128) == Integer.valueOf(128));   // false
```

原因：`Integer.valueOf()` 对 **-128 ~ 127** 返回缓存里的同一个对象，超出范围就 `new` 一个。` ==` 比的是引用，所以 127 命中缓存、128 各自新建。

这个设计是为了省内存——小整数（循环计数、状态码）被大量使用。代价是制造了一类**「有时对有时错」**的 bug：测试用小数字全过，生产上 128 以上就翻车。

结论一句话：**只要类型是包装类，比较就用 `equals()`**，不用想区间。

拆箱还有一个坑：

```java
Integer boxed = null;
int un = boxed;      // NullPointerException
```

```text
NullPointerException
```

编译器在 `int un = boxed` 处插入了 `boxed.intValue()`，对象是 `null` 就炸。三元表达式混用 `Integer` 和 `int` 时也会触发隐式拆箱，`map.get(key)` 返回 `null` 时最容易撞上。

## 七、浮点数不进 `double`，金额不进浮点

`float` / `double` 用二进制表示小数，`0.1` 这类十进制小数在二进制里是无限循环。所以：

```java
System.out.println(0.1 + 0.2);          // 0.30000000000000004
System.out.println(0.1 + 0.2 == 0.3);   // false
```

比较浮点用误差范围，金额用 `BigDecimal`（**字符串构造**）或以「分」为单位的 `long`：

```java
System.out.println(new java.math.BigDecimal("0.1")
        .add(new java.math.BigDecimal("0.2")));    // 0.3
```

`new BigDecimal(0.1)` 会把 `double` 的误差一起带进来，这是 `BigDecimal` 用法里最容易错的一步。

## 小结

- 8 种基本类型直接存值，其余都是引用；`String` 是类，比内容用 `equals()`。
- 宽化自动、**窄化必须显式强转**；强转是截断不是四舍五入，且静默丢数据（`(byte) 200` 是 `-56`）。
- 字面量有默认类型：`100` 是 `int`、`3.14` 是 `double`，所以 `float f = 3.14;` 编译不过。
- 局部变量**没有默认值**，成员变量有（`0` / `0.0` / `false` / `null`）；`null` 只能给引用类型。
- `final` 只能赋值一次，命名全大写是约定不是强制；标识符规则才是强制。
- `Integer` 缓存 **-128 ~ 127**，` ==` 的结果随数值变——包装类一律 `equals()`；拆箱遇 `null` 抛 NPE。
- 浮点永不比相等，金额用 `BigDecimal`（字符串构造）或以「分」为单位的 `long`。
