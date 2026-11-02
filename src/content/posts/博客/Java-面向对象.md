---
title: Java 面向对象：类、封装与 this 的九个零件
date: 2026-10-29
subject: 博客
category: Java
tags:
  - Java
  - 面向对象
  - 封装
summary: 从「洗衣服」看面向对象到底在解决什么、类和对象在栈堆上分别是什么、构造器为什么会「突然消失」、static 属于类不属于对象、封装挡住的到底是什么、this 的三种用法、JavaBean 那四条硬规矩为什么框架离不开、匿名对象只能用一次、以及 println(对象) 打出 Cat@1a6c5a9e 的原因。
---

# Java 面向对象：类、封装与 this 的九个零件

面向对象的第一课通常是「类是模板、对象是实例」，但真正让人卡住的是后面那些细节：为什么加了有参构造之后 `new Person()` 就编译不过了？`static` 到底属于谁？`this` 和 `this(...)` 是同一个东西吗？`println(对象)` 打出来的 `Cat@1a6c5a9e` 又是什么？

这篇把类、对象、构造器、static、封装、this、JavaBean、匿名对象、toString 九个零件依次装一遍。

## 一、面向对象到底在解决什么

拿洗衣服对比：

| 思路 | 写法 | 问题 |
| :--- | :--- | :--- |
| 面向过程 | `放水()` → `放衣服()` → `放洗衣粉()` → `搅动()` → `排水()` 五个函数，参数是一堆变量 | 加一步要在调用处插一行；状态散在变量里 |
| 面向对象 | 造一个 `WashingMachine` 对象，字段 `water` / `clothes`，方法 `wash()` 内部编排 | 加一步只改 `wash()` 内部，调用方不变 |

区别不在「有没有函数」，而在**数据和行为有没有绑在一起**：水、衣服是数据，搅动、排水是行为，它们住在同一个对象里，外部只需要说「洗」。

判断一个东西该不该是对象，一句话就够：**需要「记住状态」的东西才是对象**；算一次就丢的，写成方法。

初学者还会混一件事——类的两种角色：

- **测试类**：带 `main`，只负责造对象、调方法、看输出，不该有业务逻辑。
- **实体类（JavaBean）**：只描述数据与操作，不含 `main`。

两个角色塞进一个类，是最常见的结构问题。

## 二、类是模板，对象是实例

| 概念 | 是什么 | 关键点 |
| :--- | :--- | :--- |
| 类 | 行为与状态的**模板** | 本身不占对象内存 |
| 对象 | 类的一个**实例**，`new` 出来 | 每个对象有独立状态 |
| 方法 | 类中定义的行为 | 实例方法能访问本对象状态 |
| 实例变量 | 每个对象各一份 | 决定对象「现在是什么状态」 |

```text
栈                         堆
xiaoMiao ───────────>  [ Cat 对象 ] name="小喵" age=0
daJu ───────────────>  [ Cat 对象 ] name="大橘" age=0
```

引用在栈、对象在堆。`Cat b = a;` 只是多了一个引用指向同一块堆内存，`b.name = "x"` 会改到 `a`；没有任何引用指向对象时，它才可能被 GC 回收。

**比较对象要看比什么**。`new Cat() == new Cat()` 实测是 `false`，`equals` 也是 `false`——因为 `Object.equals` 的默认实现就是 `x == y` 这一句。想按内容比较，必须自己重写 `equals()` 并**同时重写 `hashCode()`**，否则放进 `HashSet` / `HashMap` 会出现「明明相等却查不到」。

还有一条容易忽视的：**字段不参与多态**。`Animal a = new Cat()` 时，`a.name` 拿到的是 `Animal` 声明的字段（编译期决定），而方法调用看实际类型。这是「方法多态、字段静态绑定」的分水岭。

## 三、构造器：那个「赠品」会消失

```java
class Person {
    private int age;

    Person() {
        this(0);                 // 调用另一个构造器，必须是第一行
        System.out.println("no-arg ctor");
    }

    Person(int age) {
        this.age = age;          // this 区分字段与形参
    }
}
```

三条必须记住：

1. **没写任何构造器时，编译器送一个无参空构造器；一旦自己写了有参构造，这个赠品就没了。**
2. **`this(...)` 必须是构造器的第一行。**
3. **构造器没有返回值，也不能写 `void`**，名字必须与类名一致。

第 1 条是最容易浪费半小时的坑：先写了 `Person p = new Person();` 一切正常，后来加了个 `Person(String name)`，第二天 `new Person()` 突然编译不过——不是环境坏了，是赠品被顶掉了。两个都要用，就把无参那个显式写出来。

另外别把 `this(...)` 和 `this.` 混起来：前者调兄弟构造器，后者区分同名字段，两者只能出现在不同的位置。

## 四、static 属于类，不属于对象

```java
class Counter {
    static int count = 0;      // 类变量：所有对象共享
    { count++; }               // 初始化块：每次 new 都执行
}

new Counter(); new Counter();
// Counter.count == 2
```

只有一份内存，所以「通过实例改静态字段」会污染全类：

```java
class Cat { static String name; }

Cat a = new Cat(); a.name = "小喵";
Cat b = new Cat(); b.name = "大橘";
// a.name 也是 "大橘"
```

实测 `c1.name` 与 `c2.name` 都是 `大橘`，而且 `c1.name == c2.name` 是 `true`——同一个引用。这就是理解「状态属于对象」最直观的反例。

加载时间线解释了三件事：

```text
① 类加载：.class 进方法区，static 字段分配内存、赋默认值
② 类初始化：static 块、static 赋值语句按顺序执行
③ new：堆上创建实例，实例字段这时才有内存
```

推论一：静态成员优先于对象存在，`Counter.count` 在 `new` 之前就能读到 `0`。推论二：标准写法是 `类名.字段`，用 `p.count` 会得到「通过实例访问静态成员」的警告。推论三：静态方法里不能直接用实例字段——`non-static variable age cannot be referenced from a static context`，因为静态方法执行时可能一个对象都没有，自然也没有 `this`。

什么时候该 `static`？问一句就够：**这个值属于「这个对象」，还是属于「这一类对象」**。`name` 属于某个人，`classroom` 属于某个班。

## 五、封装：把「什么值合法」关进类里

```java
class Person {
    private int age;

    public int getAge() { return age; }

    public void setAge(int age) {
        if (age >= 0) this.age = age;   // 校验只写这一处
    }
}
```

```java
Person q = new Person();
q.setAge(-5);
// q.getAge() == 0  —— 非法值被挡住了
```

如果字段是 `public`，`q.age = -5` 谁也拦不住。封装的三个收益：

- **校验集中一处**，不用在每个调用点重复写 `if`。
- **内部表示可以改**：`age` 换成 `LocalDate birth`，只要 getter / setter 签名不变，调用方一行都不用动。
- **只读字段**只给 getter 不给 setter，编译器帮你守住。

动作只有两个：`private` 藏字段、`getter/setter` 开通道。IDEA 里 `Alt+Insert` 一键生成，成本几乎为零。

## 六、this 的三种用法

```java
class Student {
    private String name;

    Student() { this("无名"); }            // ③ 调兄弟构造器，必须第一行

    Student(String name) {
        this.name = name;                  // ① 字段与形参同名时唯一的区分手段
    }

    Student rename(String n) {
        this.name = n;
        return this;                       // ② 返回 this 实现链式调用
    }
}
```

- **①** 最常用：`this.age = age`，左边不带 `this` 就是自己赋给自己。
- **②** 链式调用：方法返回 `this` 而不是 `void`，于是 `new Student().rename("小红").rename("小蓝")` 成立，实测最后打印 `name=小蓝`。
- **③** 构造器互调：`this(...)` 只能在第一行，且不能循环调用。

`this` 不能出现在静态方法里——原因和静态方法不能用实例字段一样：没有「当前对象」可言。

## 七、JavaBean：四条硬规矩

```java
public class Student {              // ① 类是 public
    private String name;            // ② 字段 private
    private int age;

    public Student() { }            // ③ 有无参构造（框架反射要用）

    public String getName() { return name; }                 // ④ getter
    public void setName(String name) { this.name = name; }   //    setter
    public boolean isAdult() { return age >= 18; }           //   布尔用 is
}
```

这四条不是风格偏好，是**框架的契约**：

- **为什么必须有无参构造**：Spring、Jackson、MyBatis 都靠反射 `newInstance()` 造对象，没有就直接失败。
- **为什么命名必须严格**：Jackson 按 `getXxx` 推 JSON 字段名（`getName` → `name`）；Spring 按 `setXxx` 找注入点。
- **布尔字段用 `isXxx`**，不要写 `getIsXxx`——序列化出来会变成 `isXxx` 字段，和 JSON 对不上。

最坑的是「生成之后手改方法名」：不报错、字段悄悄少一个，排查时完全不知道从哪下手。另外实体类里不要写业务逻辑，一旦开始写 `if`，它就该变成 Service 或领域对象了。

## 八、匿名对象：只能用一次

```java
new Student("小明", 18).show();      // 造出来直接调，用完没有引用
printInfo(new Student("小红", 19));  // 当实参传进去
```

没有变量持有它，第一次调用后就没有引用可用，所以**只能用一次**。适合「只调一次方法」「只当一次实参」——省一个变量名，读起来更直接；要连调多个方法、要传给多处，就必须给变量。

实测 `new Cat() == new Cat()` 是 `false`：匿名不等于「同一个」，每次 `new` 都是新对象。

判断标准一句话：**这个对象我还要不要再碰**。碰一次就匿名，碰两次以上就命名。

## 九、toString：为什么打印出来是 `Cat@1a6c5a9e`

```java
System.out.println(new Cat());
// Cat@1a6c5a9e
```

`println` 内部走 `String.valueOf(obj)` → `obj.toString()`，而 `Object.toString()` 的实现是 `getClass().getName() + "@" + Integer.toHexString(hashCode())`。它只保证「能区分对象」，不保证可读，末尾那串十六进制每次运行都可能不同。

重写之后就正常了：

```java
@Override
public String toString() {
    return "Cat{name='" + name + "', age=" + age + "}";
}
```

数组是同一个坑的两个版本：数组没有重写 `toString()`，`println(arr)` 打出 `[I@506e1b77`，要看内容得用 `Arrays.toString()`，二维用 `deepToString()`。

实体类里 `toString`、`equals`、`hashCode` 三个一起生成最省事：`toString` 给人看，另外两个给容器用。

## 小结

- 面向对象的核心是**数据和行为绑在一起**，判据是「有没有需要记住的状态」。
- 类是模板、对象是实例；`a == b` 比的是地址，按内容比较要 `equals` + `hashCode` 一起重写；字段不参与多态。
- 构造器的「赠品无参构造」在写了有参构造后就消失；`this(...)` 必须第一行，构造器不能写 `void`。
- `static` 属于类，类加载时分配、类初始化时赋值；通过实例改静态字段会污染全类，静态方法里没有 `this`。
- 封装的价值是**把合法性规则关进类里**，顺带让内部表示可以偷偷换掉。
- `this` 三种用法：区分同名字段、返回 `this` 做链式调用、`this(...)` 调兄弟构造器。
- JavaBean 四条：public 类、private 字段、无参构造、`getXxx` / `isXxx` 暴露——框架靠这套约定做反射。
- 匿名对象只能用一次；`println(对象)` 默认打印 `类名@哈希`，重写 `toString` 才可读。
