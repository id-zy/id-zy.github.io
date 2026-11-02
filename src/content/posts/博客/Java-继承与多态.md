---
title: Java 继承与多态：字段为什么不参与多态
date: 2026-10-29
subject: 博客
category: Java
tags:
  - Java
  - 面向对象
  - 继承
  - 多态
summary: extends 与 super 怎么用、@Override 为什么不是可选、重写的四条约束和三条真实报错原文、哪四类方法根本不能重写、重载与重写的区别到底在绑定时机、Animal a = new Cat() 为什么读字段得 animal 而调方法得 Cat、抽象类与接口怎么选、以及组合优于继承的具体理由。
---

# Java 继承与多态：字段为什么不参与多态

继承是面向对象里最容易被教坏的一课。教材上讲「子类继承父类，可以复用代码」，听起来只有好处；实际项目里，继承是最强的编译期耦合，用错地方的代价远大于省下的几行代码。

这篇把继承、重写、重载、多态、抽象类与接口放在一条线上讲，因为它们本来就互为因果：**继承提供层次，重写提供替换，多态是替换在运行期的兑现方式**。

## 一、`extends` 与 `super`

```java
class Animal {
    String name = "animal";
    void breathe() { System.out.println("Animal.breathe"); }
}

class Cat extends Animal {
    @Override
    void breathe() {
        super.breathe();                  // 先跑父类的
        System.out.println("用肺呼吸");     // 再加自己的
    }
}
```

- **单继承**：`class A extends B, C` 编译不过。额外能力用接口表达。
- `super` 调父类实现，`super(...)` 调父类构造器（必须放子类构造器第一行）。
- 子类构造器里没写 `super(...)` 时，编译器自动插入 `super()`——**所以父类没有无参构造器时，子类必须显式调用带参的那个**，否则编译报错。

继承的语义前提是 **is-a**：`Cat is an Animal` 成立，继承才成立。如果只是「想复用几个方法」，那不该用继承。

## 二、`@Override` 不是可选的装饰

注解在语法上是可选的，在实践上必须写：

```java
class Cat extends Animal {
    void breath() { ... }    // 少了一个 e
}
```

没有 `@Override`，这就是一个**新方法**，编译器一声不响。加上注解，编译器立刻报：

```text
method does not override or implement a method from a supertype
```

方法名拼错、参数类型写错（`int` 写成 `Integer`）、参数顺序反了——这几种错靠肉眼几乎查不出来，靠注解一秒定位。

**这是花一个注解换一类静默 bug 的交易，没有理由不做。**

## 三、重写要守四条约束，三条有原文报错

| 约束 | 内容 | 违反的报错 |
| :--- | :--- | :--- |
| 签名相同 | 方法名 + 参数列表一致 | 不报错，变成重载或新方法 |
| 权限不收窄 | `public` 不能改 `protected` | `attempting to assign weaker access privileges` |
| 返回类型协变 | 相同，或子类返回更具体的类型 | `return type ... is not compatible` |
| 异常不放大 | 父类不抛的受检异常，子类不能新抛 | `overridden method does not throw Exception` |

三条报错原文（实测抓的）：

```text
A.java:2: error: f() in B cannot override f() in A
  attempting to assign weaker access privileges; was public
```

```text
C.java:3: error: g() in D cannot override g() in C
  overridden method does not throw Exception
```

```text
E.java:2: error: h() in F cannot override h() in E
  overridden method is final
```

背这三句比背规则表快——真遇到 `weaker access privileges` 时，脑子里有原文才认得出这是权限问题。

**返回类型协变**值得补一句：父类返回 `Animal`，子类可以返回 `Cat`（更具体），反过来不行。这是唯一允许「改返回类型」的场景。

## 四、四类方法根本不能重写

| 类型 | 原因 | 报错 / 表现 |
| :--- | :--- | :--- |
| `final` 方法 | 明确禁止 | `overridden method is final` |
| `static` 方法 | 属于类不属于对象 | 子类同名只是**隐藏**，不是重写 |
| `private` 方法 | 子类看不见 | 同名是全新方法 |
| 构造方法 | 名字必须与类名一致 | 谈不上继承 |

`static` 的「隐藏」有个具体后果：

```java
Animal a = new Cat();
a.kind();        // Animal.kind
```

调用的是父类的静态方法，因为**静态方法按声明类型绑定**。IDE 会给「通过实例调用静态方法」的警告，就是在提醒这一点。

## 五、重载与重写：差在绑定时机

| 区别点 | 重载 | 重写 |
| :--- | :--- | :--- |
| 发生位置 | 同一个类内（含继承来的） | 父类与子类之间 |
| 参数列表 | **必须不同** | **必须相同** |
| 返回类型 | 随便改 | 相同或协变 |
| 访问权限 | 随便改 | **不能更严** |
| 异常 | 随便改 | **不能更宽** |
| 绑定时机 | **编译期**（看实参类型） | **运行期**（看实际类型） |

三个判据一句话分开：

- **同名不同参 = 重载；同名同参 = 重写。**
- 重载只改「怎么调用」，重写改「调用后跑谁的代码」。
- 重载与多态无关（同类内决议），**重写才是多态的实现方式**。

最后一条最关键。重载在编译期就写死进字节码，所以「父类引用 + 子类对象」不会影响重载的选择：

```java
void feed(Animal a) { }
void feed(Cat c) { }

Animal a = new Cat();
feed(a);        // 走 feed(Animal) —— 编译器只看 a 的声明类型
```

要选到 `feed(Cat)`，得把变量声明成 `Cat`。这就是「重载看声明，重写看实际」。

`@Override` 注解只听重写的，重载没有注解可加——这也是记忆锚点之一。

## 六、多态：方法看对象，字段看引用

```java
Animal an = new Cat();
an.breathe();
System.out.println(an.name);
System.out.println(an.getName());
System.out.println(an.kind());
```

实测输出：

```text
Cat.breathe
animal
cat
Animal.kind
```

四行输出把规则摊开了：

| 成员 | 绑定时机 | 依据 | 实测 |
| :--- | :--- | :--- | :--- |
| 方法 | 运行期（动态绑定） | 实际类型 | `Cat.breathe` |
| 字段 | 编译期（静态绑定） | 声明类型 | `animal` |
| getter 方法 | 运行期 | 实际类型 | `cat` |
| `static` 方法 | 编译期 | 声明类型 | `Animal.kind` |

**字段不参与多态**——这是最反直觉的一条。`Cat` 里重新声明了 `name`，并不「覆盖」父类的字段，而是子类对象上同时存在两个 `name`：一个属于 `Animal` 部分，一个属于 `Cat` 部分。通过 `Animal` 类型的引用访问，拿到的是父类那份。

想从父类引用拿到子类状态，正规做法是 **getter 方法**（`an.getName()` 返回 `cat`），而不是公开字段。这条不是风格建议，是语言机制决定的。

**多态的价值在调用方**：

```java
void feedAll(List<Animal> animals) {
    for (Animal a : animals) a.eat();
}
```

传 `Cat`、`Dog`、以后新增的任何子类都能跑，这个方法一行都不用改。这就是「对扩展开放、对修改关闭」的具体形态——不是口号，是能省下的一次次改动。

转型规则：

- **向上转型自动**：`Animal a = new Cat();`
- **向下转型要判断**：`if (a instanceof Cat c) { ... }`（Java 16 的模式匹配），转错抛 `ClassCastException`。

## 七、抽象类与接口：「是不是」与「能不能」

| 维度 | 抽象类 | 接口 |
| :--- | :--- | :--- |
| 状态 | **能有**实例字段 | 只能有常量 |
| 构造器 | 有（给子类用） | 无 |
| 方法实现 | 可有具体方法 | 默认全抽象，Java 8+ 有 `default` / `static` |
| 数量 | 只能继承一个 | 可多个 |
| 语义 | **is-a**「是什么」 | **can-do**「能做什么」 |
| 典型 | 模板方法、共享公共状态 | 能力契约、解耦 |

口诀：`Cat is an Animal` → 抽象类；`Bird can fly` → 接口。

两句话都成立时（`ArrayList is a List`、`List can be iterated`）**优先接口**——Java 集合框架就是这么设计的，`List` 是接口，`ArrayList` / `LinkedList` 是两种实现，调用方只依赖 `List`。

接口的三个细节：

```java
interface Flyable {
    void fly();                                  // 默认 public abstract
    default String tag() { return "flyable"; }   // Java 8+ 默认实现
}

class Bird extends Animal implements Flyable {
    public void fly() { System.out.println("扇翅膀"); }   // 必须写 public
}
```

- 接口方法默认 `public abstract`，实现时**必须写 `public`**，否则报 `attempting to assign weaker access privileges`——看着像权限问题，实际是接口方法默认公开。
- 一个类可以实现多个接口：`implements Flyable, Swimmable`，这是单继承在表达力上的补充。
- 接口没有实例字段，只能有 `public static final` 常量。

**`default` 为什么存在**：Java 8 想给 `Collection` 加 `stream()`，直接加抽象方法会让全世界所有实现类编译失败。`default` 提供默认实现，老代码不改继续跑。代价是菱形问题回来了——两个接口有同名同参的 `default` 时，实现类必须显式重写，并用 `A.super.m()` 指定。

设计判断只有一句：**需要共享状态或模板流程 → 抽象类；只是约定能力 → 接口。**

## 八、组合优于继承

这是 Effective Java 里的经典结论，理由是具体的：**继承让子类依赖父类的实现细节**。

经典反例：继承 `ArrayList` 并重写 `add()` 来计数。

```java
class CountingList<E> extends ArrayList<E> {
    int count = 0;
    @Override public boolean add(E e) { count++; return super.add(e); }
}
```

看起来没问题，直到有人调 `addAll(...)`——父类的 `addAll` 内部可能直接操作数组，不走 `add()`，计数就漏了。这不是父类的 bug，是「继承把实现细节变成了契约」。

组合只依赖接口：

```java
class MyList<E> {
    private final List<E> inner = new ArrayList<>();
    public boolean add(E e) { inner.add(e); count++; return true; }
}
```

判据：**只有确认 is-a 关系、且父类是为继承设计的（有文档、有钩子方法）才用继承**。抽象类里的 `protected` 钩子方法就是「为继承设计」的标志；没有钩子、只有一堆 `public` 方法的类，继承它只是在赌它以后不改。

## 小结

- `extends` 单继承，`super` 调父类实现；父类没有无参构造器时，子类必须显式 `super(...)`。
- **`@Override` 必须写**——它把「方法名拼错」从静默 bug 变成编译错误。
- 重写四条约束：签名相同、权限不收窄、返回协变、异常不放大；三条报错原文比规则表更好记。
- `final` / `static` / `private` / 构造方法**不能重写**，`static` 同名只是隐藏，调用按声明类型。
- 重载**编译期**看实参，重写**运行期**看实际类型；`@Override` 只听重写。
- **方法看对象、字段看引用**：`Animal a = new Cat()` 调方法得 `Cat` 的行为，读字段得 `animal`；要拿子类状态用 getter。
- 抽象类管「是不是」（有状态、单继承），接口管「能不能」（无状态、可多实现）；两者都成立时优先接口。
- 继承是最强的编译期耦合，**组合优于继承**——除非父类明确为继承设计。
