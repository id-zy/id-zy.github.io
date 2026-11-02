---
title: Java 流程控制：if 的 boolean 门槛、switch 的穿透，与三种循环
date: 2026-10-29
subject: 博客
category: Java
tags:
  - Java
  - 流程控制
  - 循环
summary: if (1) 为什么编译不过、switch 漏 break 会打出两行、箭头 switch 怎么替代 break、三种循环的判据不是风格而是执行次数、while 里 continue 为什么会死循环，以及标签 break 什么时候比 found 标志位干净。
---

# Java 流程控制：if 的 boolean 门槛、switch 的穿透，与三种循环

分支和循环是最先学会、也最容易写错的两块。写错的方式还特别隐蔽——代码能编译、能运行，只是结果不对，或者转不出来。

这篇把四件事讲清楚：`if` 的条件为什么必须是 `boolean`、`switch` 的 `break` 到底在防什么、三种循环怎么选、以及 `continue` 为什么能写出死循环。

## 一、`if` 的三条硬规则

**第一条：条件必须是 `boolean`。**

```java
if (1) { }        // 编译错误：int cannot be converted to boolean
if (x = 1) { }    // 编译错误：同样的原因
```

Java 不像 C 那样「非零为真」，这条限制顺手挡住了一类经典手误：把 ` ==` 写成 ` =`。在 C 里 `if (x = 1)` 恒为真，在 Java 里直接编译不过——一个语言设计上的防呆。

**第二条：顺序即逻辑。**

```java
if (score >= 60) {
    System.out.println("及格");
} else if (score >= 90) {
    System.out.println("优秀");
}
```

`95` 会命中第一个分支，打印「及格」，「优秀」永远到不了。区间判断必须**从严到宽**或者**从宽到严**统一排列，不能混。这类错误编译器一句话都不会说。

**第三条：单条语句能省 `{}`，但建议永不省。**

```java
if (ok)
    doA();
    doB();       // 这行不在 if 里，但缩进让人以为在
```

省掉花括号之后，第二行看起来还在条件里，实际已经脱离。加上后来有人在中间插入一行，bug 就长出来了。

嵌套超过三层，基本说明该拆方法了——或者该换 `switch`。

## 二、`switch` 的类型限制与穿透

| 要点 | 说明 |
| :--- | :--- |
| 表达式类型 | `byte` / `short` / `char` / `int` / `String` / 枚举 |
| 不支持 | `long` / `float` / `double` / `boolean` |
| `case` 后 | 必须是**常量**，不能是变量 |
| 漏 `break` | 会一直往下执行，直到遇到下一个 `break` |

漏 `break` 的效果值得亲眼看一次。实测：

```java
int day = 3;
switch (day) {
    case 1: case 2: case 3: System.out.println("上旬");
    case 4: System.out.println("四号也执行了");
}
```

输出两行：

```text
上旬
四号也执行了
```

`day = 3` 命中 `case 3`，打印「上旬」之后没有 `break`，于是继续执行 `case 4` 的代码。**穿透不是跳到下一个 `case` 判断，而是直接执行下面的语句**——所以 `case 4` 的条件根本没被检查。

穿透有一个正当用法：多个值走同一段逻辑时，连续写几个空 `case`，只在最后一个写代码。上面 `case 1: case 2: case 3:` 就是这个模式。

`String` 能做 `switch` 是 Java 7 加的，编译器实际是拿 `hashCode` + `equals` 实现，所以 `case` 里写 `null` 会抛 NPE——`switch` 的表达式本身为 `null` 时也会。

## 三、箭头 switch：不穿透、能赋值

Java 14 之后有了箭头形式：

```java
String level = switch (day) {
    case 1, 2, 3 -> "上旬";
    case 4, 5 -> "中旬";
    default -> {
        int rest = day % 3;
        yield "下旬" + rest;
    }
};
```

三个变化：

- **不穿透**，每个分支自带隐式 `break`，不用再写。
- **可以直接当表达式赋值**，`switch` 产出一个值。
- 多行逻辑用代码块包起来，末尾用 `yield` 返回值（`return` 在这里不行）。

`day = 3` 实测输出「上旬」。旧写法要写四行 `case` 加 `break`，新写法一行。新代码没有理由再用旧形式——除非项目还在 Java 8。

## 四、三种循环的判据是执行次数

| 循环 | 判据 | 最少执行次数 |
| :--- | :--- | :--- |
| `for` | 次数已知 | 0 |
| `while` | 次数未知，只知道终止条件 | 0 |
| `do while` | 先做一次再决定 | **1** |

选哪个不是风格问题，是语义问题。看实测：

```java
int n = 10;
while (n < 5) { System.out.println("while 执行了"); }        // 一次都不执行
do { System.out.println("do-while 执行一次, n=" + n); } while (n < 5);
```

```text
do-while 执行一次, n=10
```

条件一开始就是假的，`while` 直接跳过，`do while` 仍然跑一次。这就是「菜单至少显示一次」用 `do while`、「读到文件结尾」用 `while` 的原因。

**`for` 的三段式**：初始化 / 条件 / 更新。循环变量作用域只在循环体内，出了循环就 `cannot find symbol`。

**增强 for** 只适合只读遍历：

```java
for (String s : list) { ... }
```

三个限制：拿不到索引、不能改集合结构（`remove` 会抛 `ConcurrentModificationException`）、遍历时改元素对基本类型无效。要索引用普通 `for`，要删元素用 `Iterator`。

`do while` 末尾的分号最常漏，报错还指向下一行：

```text
';' expected
```

看到这个报错先回头看上一行的 `while (...)` 后面有没有分号。

## 五、`continue` 为什么能写出死循环

```java
int i = 0;
while (i < n) {
    if (skip(i)) continue;   // 跳过 i++
    i++;
}
```

`continue` 跳过**本次剩余的循环体**，而 `i++` 正好在剩余部分里。一旦 `skip(i)` 为真，`i` 永远不前进，条件永远成立——死循环。

`for` 没有这个问题，因为更新语句写在循环头里，不受 `continue` 影响：

```java
for (int i = 0; i < n; i++) {
    if (skip(i)) continue;   // i++ 照常执行
}
```

这就是「`for` 比 `while` 更安全」的具体含义：**能被 `continue` 跳过的更新语句，迟早会被跳过**。

另外两个边界习惯：

- 数组遍历统一写 `i < a.length`。写成 `i <= a.length` 多一个等号，`i` 走到 `length` 时必然 `ArrayIndexOutOfBoundsException`。
- 循环里读输入、做 IO 的，注意异常路径也会跳过更新——`try` 包住循环体的写法尤其危险。

## 六、`break` 只跳一层，标签才能跳多层

| 关键字 | 作用 | 典型场景 |
| :--- | :--- | :--- |
| `break` | 跳出**当前这层**循环或 `switch` | 找到答案就收工 |
| `continue` | 跳过本次剩余，进入下一次判断 | 过滤不满足条件的元素 |
| 标签 + `break` | 跳出多层循环 | 双重循环找到就整体退出 |

```java
for (int k = 0; k < 10; k++) {
    if (k == 3) continue;
    if (k == 7) break;
    System.out.print(k + " ");
}
```

实测输出：

```text
0 1 2 4 5 6
```

`3` 被 `continue` 跳过，到 `7` 直接终止。这两个语义差别很大：一个是「这次不算」，一个是「不干了」。

嵌套循环里 `break` 只跳内层：

```java
outer:
for (int p = 0; p < 3; p++)
    for (int q = 0; q < 3; q++)
        if (p * q == 2) { System.out.println("break outer at " + p + "," + q); break outer; }
```

```text
break outer at 1,2
```

`break outer` 一次跳出两层。标签是「合法的 goto」，能不用就不用——多数场景把内层循环抽成方法 + `return` 更清楚。但矩阵搜索这类「找到目标立刻整体返回」的场景，标签比设一个 `found` 标志位再层层判断要干净。

## 小结

- `if` 的条件必须是 `boolean`（`if (1)` 编译不过，顺带挡住 ` =` 手误）；**顺序即逻辑**，区间判断不能混排；花括号永不省。
- `switch` 只接受 `byte` / `short` / `char` / `int` / `String` / 枚举，`case` 后必须是常量；**漏 `break` 会穿透**，`case 4` 的条件不会被检查。
- 连续空 `case` 是穿透的正当用法；Java 14+ 的箭头 `switch` 不穿透、可赋值，多行用 `yield`。
- `for` 次数已知、`while` 只有终止条件、`do while` 至少执行一次——判据是**执行次数**，不是风格。
- `while` 里 `if (...) continue;` 跳过 `i++` 就是死循环；`for` 的更新语句不受 `continue` 影响。
- `break` 只跳一层，`break 标签` 才跳多层；标签能不用就不用，抽方法 + `return` 通常更清楚。
