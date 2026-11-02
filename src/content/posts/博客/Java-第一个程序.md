---
title: Java 第一个程序：文件名、main、格式化输出与 Scanner
date: 2026-10-29
subject: 博客
category: Java
tags:
  - Java
  - 基础
  - 输入输出
summary: 文件名为什么必须逐字等于 public 类名、main 各修饰符去掉会报什么错、哪种注释能被 javadoc 抽出来、printf 占位符怎么用、nextInt 后接 nextLine 为什么读到空串、Random 边界为什么左闭右开、命名与包结构里哪条是编译器强制的。
---

# Java 第一个程序：文件名、main、格式化输出与 Scanner

从「能跑起来」到「写得像样」，中间隔着一批小规矩。它们单拎出来都不难，但每一条都对应一个新手卡半天的问题：文件名不匹配的报错看不懂、`main` 少个 `static` 报「找不到主方法」、`Scanner` 连着用第二次读到空串、中文输入法打了个全角分号。

这篇把它们按「从编译到运行、从输出到输入」的顺序串一遍。

## 一、文件名必须等于 public 类名

```text
error: class Wrong is public, should be declared in a file named Wrong.java
```

规则完整版：一个 `.java` 文件**可以有多个类，但最多一个 `public` 类**，文件名必须逐字符等于它（含大小写）。没有 `public` 类时文件名可以随便起，但不建议。

为什么？因为 JVM 靠「类名 → 文件名」这条映射去 classpath 找 `.class`。允许乱起就要额外维护一张映射表，编译器干脆把这个自由度收掉。

最坑的场景在大小写：

```text
Windows：hello.java 里写 public class Hello
javac hello.java     → 能过（文件系统不区分大小写）
Linux：同一条命令    → 编译失败
```

**永远让文件名和类名逐字符一致。** 本地能过不代表 CI 能过，而这类错误在提交之后才炸。

## 二、`main` 的四个修饰，各管一件事

```java
public static void main(String[] args)
```

| 修饰 | 作用 | 去掉会怎样 |
| :--- | :--- | :--- |
| `public` | JVM 要能从外部调用 | 「主方法不是 public」 |
| `static` | 不创建对象也能执行 | 「找不到主方法」 |
| `void` | 无返回值 | 签名不匹配 |
| `String[] args` | 接命令行参数 | 签名不匹配 |

`static` 去掉后的报错长这样：

```text
Error: Main method not found in class Hello, please define the main method as:
   public static void main(String[] args)
```

注意它说的是「找不到主方法」，而不是「static 缺失」——这个措辞很容易让人以为方法名写错了。

`static` 是必须的原因：JVM 启动时还没有任何对象，只能调用静态方法。`main` 本身也只是个普通静态方法，别的类可以 `Hello.main(new String[0])` 直接调它——知道这点后，「入口」这个概念的边界就清楚了。

`args` 永远不是 `null`，没传参时长度是 0。所以判空用 `args.length == 0` 就够。

`String args[]`（C 风格）和 `String... args`（可变参数）都能编译，但标准写法是 `String[] args`。

## 三、三种注释，只有一种能生成文档

| 写法 | 名称 | 用途 | 能被 `javadoc` 抽取 |
| :--- | :--- | :--- | :--- |
| `// ...` | 单行注释 | 行尾说明，最常用 | 否 |
| `/* ... */` | 多行注释 | 成段说明 / 临时注释掉一块 | 否 |
| `/** ... */` | 文档注释 | 写在类、方法、字段上方 | **是** |

第三种就是 JDK 官方 API 文档的来源：

```bash
javadoc -d doc -author -version Sum.java
```

参数顺序有讲究：`-d` 紧跟输出目录、开关在前、**源文件放最后**。顺序错了就是「找不到文件」。

两个细节：

- **多行注释不能嵌套**。`/* /* */ */` 在第一个 `*/` 就结束，后面的 `*/` 变成语法错误。调试时整块注释代码很快，但要知道这条。
- **文档注释必须紧贴**被说明的成员，中间隔一个空行就不属于它了。

写什么也有讲究。`// 这里加 1` 等于没写；有用的注释解释**为什么**——「这里必须强转，因为接口只接受 short」，看的人才知道不能改。

## 四、输出三兄弟

| 方法 | 结尾 | 用途 |
| :--- | :--- | :--- |
| `System.out.print(x)` | 不换行 | 拼一行内的连续输出 |
| `System.out.println(x)` | 自动换行 | 日常调试、逐行输出 |
| `System.out.printf(格式, 参数…)` | 不换行（换行写 `%n`） | 对齐、补零、保留小数位 |

```java
System.out.print("a");
System.out.print("b");
System.out.println("c");          // 输出 abc 后换行
```

`printf` 才是排版的主力，常用占位符：

| 占位符 | 含义 |
| :--- | :--- |
| `%d` | 整数 |
| `%5d` | 右对齐，宽 5 |
| `%-5d` | 左对齐，宽 5 |
| `%05d` | 补零到 5 位 |
| `%.2f` | 保留两位小数 |
| `%s` / `%.3s` | 字符串 / 截前三字符 |
| `%c` / `%b` | 字符 / 布尔 |
| `%,d` | 千分位 |

实测：

```java
System.out.printf("%d|%5d|%-5d|%05d%n", 42, 42, 42, 42);
System.out.printf("%.2f|%s|%c|%b%n", 3.14159, "hi", 'A', true);
System.out.printf("%,d%n", 1234567);
System.out.printf("%.3s%n", "abcdef");
```

```text
42|   42|42   |00042
3.14|hi|A|true
1,234,567
abc
```

换行用 `%n` 而不是 `\n`：`%n` 会跟随平台（Windows 是 `\r\n`，Unix 是 `\n`），`\n` 是写死的。

转义字符是反斜杠的两副面孔：

- **普通变特殊**：`\n` 换行、`\t` 制表。
- **特殊变普通**：`\"`、`\'`、`\\`。

Windows 路径里每个 `\` 都要写成 `\\`，`D:\note` 会变成 `D:` + 换行 + `ote`。

还有一个中文环境专属的坑：输入法下打出全角分号 `；`，编译报

```text
illegal character: '\uff1b'
```

`\uff1b` 就是全角分号的码点。看着吓人，实际只是标点错了。全角括号、全角逗号同理。

## 五、`Scanner` 三步走与那个换行符

```java
import java.util.Scanner;                  // ① 导包
Scanner sc = new Scanner(System.in);       // ② 创建
int num = sc.nextInt();                    // ③ 调方法
sc.close();                                // 用完关掉
```

| 方法 | 读什么 |
| :--- | :--- |
| `nextInt()` / `nextDouble()` | 一个数字，跳过前导空白 |
| `next()` | 一个 token，以空白为界（**读不到空格**） |
| `nextLine()` | **整行**（不含换行符） |

**连用坑**：`nextInt()` 只吃掉数字，行尾的换行符留在缓冲区；接着调 `nextLine()`，它一上来就遇到这个换行符，立刻返回空串。

```java
int age = sc.nextInt();      // 输入 22 回车
sc.nextLine();               // 吃掉残留换行（关键一行）
String name = sc.nextLine(); // 这才读到姓名
```

实测（输入 `22\n张三`）：加那一行 `nextLine()` 后，`age` 是 22、`name` 是「张三」；不加的话 `name` 是空串，而且程序不会报错，只是后续逻辑莫名其妙。

根因：`Scanner` 按分隔符切 token，`nextXxx()` 读到分隔符就停且**不消费**它，`nextLine()` 则消费到换行为止。混用就得自己清理。

另一个坑：类型不匹配抛 `InputMismatchException`，程序直接崩，不会返回默认值。线上受理输入必须自己校验，不能指望 `Scanner`。

## 六、`Random` 的边界是左闭右开

```java
Random r = new Random();
int dice = r.nextInt(6) + 1;      // 1~6
int percent = r.nextInt(100) + 1; // 1~100
```

`nextInt(n)` 返回 `[0, n)`。所以「1 到 100」写 `nextInt(100) + 1`，写成 `nextInt(101)` 会多出一个 0——概率只差 1%，肉眼几乎发现不了，压测时才会有人质疑。

`new Random(42)` 指定种子，序列可复现，做随机测试和复现 bug 很方便。实测两次 `new Random(42).nextInt(100) + 1` 都得到 `31`。

需要「不可预测」时（令牌、验证码）用 `SecureRandom`，`Random` 是可预测的线性同余生成器。

## 七、命名与包结构：哪条是强制的

| 对象 | 规则 | 例子 |
| :--- | :--- | :--- |
| 类 / 接口 | 大驼峰 | `MorseCodeDecoder` |
| 方法 | 小驼峰，动词开头 | `decode`、`getStudentName` |
| 变量 | 小驼峰 | `morseCode`、`studentList` |
| 常量 | 全大写 + 下划线 | `MAX_SIZE` |
| 包 | 全小写，域名倒序 | `com.example.demo` |

**这些都不是编译器强制的**（只有「文件名 = public 类名」那条是）。但框架全依赖它们：Spring 按 `setXxx` 找注入点，Jackson 按 `getXxx` 序列化 JSON，JPA 按类名映射表名。命名错了程序不一定报错，**行为会莫名其妙**。

几个具体建议：

- `i` / `j` / `k` 只留给循环变量。
- 布尔值用 `is` / `has` / `can` 开头，`isValid` 比 `valid` 清楚一个量级。
- 类名首字母小写不会报错，但反射 / 序列化时容易出现「字段名对不上」的怪问题。

包与目录是**一一对应**的：

```text
package com.example.demo;   →   src/com/example/demo/Xxx.java
```

- `package` 必须是文件第一行（注释除外）。写在 `import` 之后报 `class, interface, or enum expected`。
- **没写 `package` 的类属于「默认包」**，默认包里的类不能被其他包引用——这是「明明在同一个项目里却 import 不到」最常见的原因。
- `import java.util.*` 不会真的导入什么，只是省了写全限定名，只影响编译期，不影响运行时。

文件内的顺序也建议固定：包声明 → 导包 → 类注释 → 类声明 → 常量 → 字段 → 构造器 → 方法。看代码的人不用找。

## 小结

- **文件名必须逐字符等于 `public` 类名**；Windows 不区分大小写能过，Linux 会失败。
- `main` 的 `public` / `static` / `void` / `String[]` 各管一件事，缺 `static` 的报错是「找不到主方法」。
- 注释三种，只有 `/** */` 能被 `javadoc` 抽取；多行注释不能嵌套；注释解释**为什么**。
- `printf` 管排版（`%5d` / `%-5d` / `%05d` / `%.2f` / `%,d`），换行用 `%n` 不用 `\n`；全角标点报 `illegal character: '\uff1b'`。
- `Scanner` 三步走；`nextInt()` 后面接 `nextLine()` 必须先吃掉换行符，否则读到空串；类型不匹配抛 `InputMismatchException`。
- `Random.nextInt(n)` 是 `[0, n)`，要「1 到 n」写 `nextInt(n) + 1`；可复现用种子，要安全用 `SecureRandom`。
- 命名规则是约定（框架依赖它），只有「文件名 = 类名」是编译器强制；包名与目录一一对应，默认包不能被引用。
