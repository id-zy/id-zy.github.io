---
title: Java 字符串：为什么它是 final，为什么双等号有时是 true
date: 2026-10-29
subject: 博客
category: Java
tags:
  - Java
  - 字符串
  - 不可变
summary: String 为什么设计成不可变、字面量和 new 出来的字符串差在哪、intern() 做了什么、== 在常量池场景下为什么会「碰巧」为 true、substring 的左闭右开怎么记、循环里拼接为什么慢，以及 equals(null) 为什么返回 false 而不抛异常。
---

# Java 字符串：为什么它是 final，为什么双等号有时是 true

字符串是 Java 里唯一「用起来像基本类型、实际上是对象」的东西。它有无需 `new` 的字面量语法，有 `+` 拼接的语法糖，还有一套缓存机制——这三点加起来，让 ` ==` 在字符串上表现得像是有时对、有时错。

这篇从「为什么不可变」开始，把常量池、` ==` 与 `equals`、常用方法、拼接性能串成一条线。

## 一、不可变：`String` 是 `final` 类

两个 `final`：

- `String` 类本身声明为 `final`，不能被继承。
- 内部存字符的数组也是 `final`，不能被重新赋值。

于是所有看起来像「修改」的方法——`concat`、`substring`、`replace`、`toUpperCase`——实际都**返回新对象**：

```java
String s = "abc";
String t = s.concat("d");
System.out.println(s + " / " + t);    // abc / abcd
```

`s` 仍然是 `abc`，长度还是 3。`t` 是一个全新的 `String`。

这不是限制，而是三个能力的**前提**：

- **常量池可以共享同一个对象**。既然没人能改它，几千个引用指向同一块内存就是安全的。
- **可以当 `HashMap` 的 key**。`hashCode` 只算一次并缓存，对象内容永远不变，桶的位置才稳定。
- **多线程共享不需要加锁**。不可变对象天然线程安全。

反过来看，如果 `String` 可变，上面三件事全都得推翻重做。

## 二、常量池：字面量复用，`new` 另造

```java
String s1 = "abc";
String s2 = "abc";
String s3 = new String("abc");
```

- `"abc"` 这种**字面量**进字符串常量池，第一次用时创建，之后同一个值直接复用。
- `new String("abc")` 强制在**堆**上造一个新对象（虽然它内部还是指向池里那份字符数据）。

实测四行结果：

```java
System.out.println(s1 == s2);              // true   池里同一个对象
System.out.println(s1 == s3);             // false  堆上是另一个
System.out.println(s1 == s3.intern());    // true   intern() 拉回池里
System.out.println(s1.equals(s3));        // true   比内容
```

`intern()` 的作用：池里已有等值字符串就返回池中那个引用，否则把当前串放进池再返回。它是「手动入池」，日常业务代码几乎不用，但在字符串去重、大数据量解析的场景里能省内存。

## 三、` ==` 为什么「有时对」

问题就在这里：`s1 == s2` 返回 `true`。

这会让人产生一个错误的经验——「字符串可以用 ` ==` 比较」。它在常量池场景下确实成立，但一旦字符串来自 `new`、来自拼接、来自用户输入（`Scanner`、HTTP 参数、数据库读取），结果立刻变 `false`：

```java
String a = "ab";
String b = "a" + "b";        // 编译期常量折叠，仍是池里那个 → true
String c = a + "b";          // 运行期拼接，新对象 → false
```

三行里前两行 ` ==` 为 `true`，第三行 `false`。**这种「有时对」的 bug 比稳定错更贵**：本地测试全过，线上偶发不相等。

规则只有一句：**字符串比较，无条件用 `equals()`**。` ==` 在字符串上唯一合理的用途是判 `null`——但那是 `s == null`，不是比内容。

顺带说 `equals(null)`：

```java
System.out.println("abc".equals(null));    // false，不抛异常
```

`String.equals` 内部先做 `instanceof` 判断，`null` 直接返回 `false`。所以「常量在前」的写法 `"abc".equals(s)` 天然防空：即使 `s` 是 `null` 也不会 NPE。反过来 `s.equals("abc")` 在 `s` 为 `null` 时直接炸。

## 四、九个日常够用的方法

实测（`"abcd"`）：

| 调用 | 结果 | 注意 |
| :--- | :--- | :--- |
| `length()` | 4 | 方法，不是字段 |
| `charAt(0)` | `a` | 越界抛 `StringIndexOutOfBoundsException` |
| `concat("xyz")` | `abcdxyz` | 返回新对象 |
| `substring(1, 3)` | `bc` | **左闭右开** |
| `indexOf("c")` | 2 | 找不到返回 `-1` |
| `replace("a", "A")` | `Abcd` | 返回新串，原串不动 |
| `equals("abcd")` | `true` | 比内容 |
| `" ab ".trim()` | `ab` | 只去首尾空白 |
| `"a,b".split(",")` | `[a, b]` | 返回数组，参数是正则 |

三个细节值得单独说：

- **`substring` 左闭右开**：`substring(0, 3)` 是前**三**个字符，不是前四个。这个「含头不含尾」的约定和数组、`for` 循环一致，但第一次用时几乎人人错一次。
- **`indexOf` 找不到返回 `-1`**，不是 0 也不是抛异常。所以判断「包含」要写 `s.indexOf(x) >= 0` 或 `s.contains(x)`，写成 `> 0` 会漏掉开头就命中的情况。
- **`split` 的参数是正则**。按 `.` 切分要写 `split("\\.")`，直接写 `split(".")` 会得到空数组——因为 `.` 在正则里表示任意字符。按 `|` 切分同理。

`trim()` 只去 ASCII 空白（`<= ' '`），`strip()`（Java 11+）才按 Unicode 定义去空白，处理全角空格要用后者。

## 五、循环里拼接为什么慢

```java
String s = "";
for (int i = 0; i < 10000; i++) {
    s += i;
}
```

这行在每次迭代都会做三件事：`new StringBuilder()`、`append(s)`、`append(i)`、`toString()`。一万次循环就是一万个中间 `String` 对象和一万个 `StringBuilder`——大部分创建出来就等着被 GC。

正确写法：

```java
StringBuilder sb = new StringBuilder();
for (int i = 0; i < 10000; i++) {
    sb.append(i);
}
String s = sb.toString();
```

实测 `StringBuilder` 的拼接结果 `01234`，`append` 直接改自己，不产生新对象。

两个选择：

- `StringBuilder`：可变、**非线程安全**、快。单线程首选。
- `StringBuffer`：可变、方法加了 `synchronized`、慢。只在真的多线程共享时用，而这种场景本身很少见。

顺带一个反直觉的点：`StringBuilder` 是引用类型，传给方法后**方法内的修改外面看得到**——

```java
static void append(StringBuilder sb) { sb.append("!"); }

StringBuilder sb = new StringBuilder("x");
append(sb);
System.out.println(sb);    // x!
```

这看起来像「Java 是引用传递」，其实不是。传的是引用的副本，副本和原变量指向同一个对象，所以改对象内容可见；但如果方法里 `sb = new StringBuilder(...)`，外面就看不到——这就是「改内容看得到，改指向看不到」，和数组、对象完全一致。

## 六、`length()` 与 `.length`：那一对括号

| 类型 | 取长度 | 是什么 |
| :--- | :--- | :--- |
| 数组 | `a.length` | `public final` 字段 |
| `String` | `s.length()` | 方法 |
| 集合 | `c.size()` | 接口方法 |
| `StringBuilder` | `sb.length()` | 方法 |

为什么不一样？`String` 的底层表示变过一次：Java 8 是 `char[]`，Java 9 之后改成 `byte[]` + 一个 `coder` 字段（Compact Strings，纯拉丁字符省一半内存）。如果 `length` 是公开字段，这次改动就是破坏性变更；正因为它是方法，外部代码一行都不用改。**封装的价值在这里是具体的：它买到了修改内部实现的自由。**

另一个坑：`length()` 返回的是 **UTF-16 code unit 数**，不是人眼看到的字符数。`"😀".length()` 是 2（代理对），`codePointCount` 才是 1，按 UTF-8 字节算是 4。做字数限制、截断时踩这个坑，emoji 会被切成半个。

## 小结

- `String` 是 `final` 类、内部数组也是 `final`，所有「修改」方法都返回新对象——这是常量池共享、`HashMap` key、线程安全的前提。
- 字面量进常量池复用，`new String(...)` 在堆上另造，`intern()` 手动入池；` ==` 的结果取决于对象来源。
- **字符串比较无条件用 `equals()`**；`"常量".equals(s)` 天然防 NPE，`s.equals(...)` 会炸。
- `substring` 左闭右开、`indexOf` 找不到返回 `-1`、`split` 参数是正则（切 `.` 要 `\\.`）。
- 循环拼接用 `StringBuilder`（单线程）或 `StringBuffer`（多线程），`+` 每次都在造对象。
- `length()` 是方法、`.length` 是字段，差别来自「能不能改内部表示」；`length()` 数的是 UTF-16 码元，不是字符。
