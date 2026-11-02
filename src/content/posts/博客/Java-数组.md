---
title: Java 数组：定长、越界，以及手写一趟冒泡
date: 2026-10-29
subject: 博客
category: Java
tags:
  - Java
  - 数组
  - 排序
summary: 数组为什么定长、默认值为什么是 null、两个越界异常分别指向哪类错误、为什么 int[] ref = src 不是复制、二维数组为什么是锯齿状、Arrays 能替你做什么、手写反转与冒泡的两处边界，以及 .length 与 .length() 的来历。
---

# Java 数组：定长、越界，以及手写一趟冒泡

数组是学 Java 时第一个「不像变量」的东西：它不接受 `a = b` 这种复制直觉，长度改不了，打印出来是一串 `[I@506e1b77`。很多人第一次运行时异常也是从它开始的——`ArrayIndexOutOfBoundsException`。

这篇把数组的七个面向串一遍：**它是什么、什么会炸、怎么复制、二维是什么、工具类能省多少事、手写排序在练什么、以及为什么它是 `.length` 而字符串是 `.length()`**。

## 一、三个硬约束：定长、同类型、内存连续

```java
int[] a = new int[5];                    // 只定长度，元素取默认值
int[] b = {1, 2, 3};                     // 声明即初始化，只能在声明行用
String[] c = new String[]{"x", "y"};     // 完整写法，任何位置都能用
```

三种写法里最容易踩的是第二种：`{1, 2, 3}` 这种简写**只能出现在声明行**，想先声明后赋值就得写 `new int[]{...}`。

它的约束来自内存布局：

| 特性 | 含义 | 后果 |
| :--- | :--- | :--- |
| 长度固定 | `length` 是 `final` 字段 | 没有 `add`，扩容只能新建再搬 |
| 元素同类型 | 数组是「T 的数组」 | 下标访问不需要类型判断，O(1) |
| 内存连续 | 元素挨着排 | 能按下标算出地址，但插入删除要挪 |
| 本身是对象 | 变量只是引用 | 传参传的是引用的副本 |

**默认值是最容易翻车的一条**。JDK 22 实测：

```text
int[]     [0, 0, 0]
double[]  [0.0, 0.0]
boolean[] [false, false]
String[]  [null, null]
```

引用类型的默认值是 `null`，不是空串。`String[] ans = new String[n]` 之后直接 `ans[0].length()`，拿到的就是空指针，而不是 0。

顺带一句命名：`int b[]` 能编译（C 风格），但 Java 推荐 `int[] b`——把方括号贴在类型上更准确，因为「b 的类型是 int 数组」，不是「b 是 int，且是数组」。

## 二、两种异常指向两个完全不同的方向

同样是运行时挂掉，两条报错要把人引向完全不同的地方：

```text
Exception in thread "main" java.lang.ArrayIndexOutOfBoundsException:
    Index 3 out of bounds for length 3
```

```text
Exception in thread "main" java.lang.NullPointerException:
    Cannot read the array length because "<local1>" is null
```

- 出现 `Index 3 out of bounds for length 3` → **下标算错了**，去查循环边界。
- 出现 `Cannot read the array length` → **数组本身还是 null**，去查有没有 `new`。

还有一个更隐蔽的变体，二维数组常见：

```text
java.lang.NullPointerException: Cannot load from int array because "<local1>[0]" is null
```

这条是 `int[][] g = new int[3][];` 之后直接读 `g[0][0]`——行数定了，每行还是 `null`。

越界的头号写法永远是边界多一个等号：

```java
for (int i = 0; i <= a.length; i++)   // i 走到 length 时必然越界
```

一个记法：**报错里带 `length` 这个词的，是「读长度」这个动作本身失败了（NPE）；带 `Index ... for length` 的，是下标越界。**

## 三、`int[] ref = src` 不是复制，是别名

这是数组最容易误解的一点。看两段代码的差别：

```java
int[] src = {1, 2, 3};

int[] copy = Arrays.copyOf(src, src.length);
copy[0] = 9;
// src = [1, 2, 3]   copy = [9, 2, 3]

int[] ref = src;
ref[0] = 7;
// src = [7, 2, 3]
```

`int[] ref = src` 只复制了地址，两个引用指向堆上同一个数组对象，改哪个都是改同一个。真副本只有三条路：`Arrays.copyOf`、`src.clone()`、`System.arraycopy`。

扩容同理，本质是「新建一个更大的 + 搬过去」：

```java
int[] src = {1, 2, 3};
int[] bigger = Arrays.copyOf(src, src.length * 2);
// [1, 2, 3, 0, 0, 0]   —— 多出来的位置补默认值
```

`System.arraycopy` 是 `native` 方法，比手写循环快，`ArrayList` 内部就用它；`Arrays.copyOf` 是它的一层封装，多了「新建数组」这一步。这也解释了 `ArrayList` 的扩容策略：默认容量 10，满了按 1.5 倍新建再复制——知道规模时直接 `new ArrayList<>(1000000)`，能省掉全部扩容动作。

刷题时的致命版本：回溯、DP 把数组塞进结果集却不复制，最后所有结果都指向同一个数组，被最后一次修改全部覆盖。`result.add(new ArrayList<>(path))` 里那个 `new`，干的就是这件事。

## 四、二维数组不是矩阵，是「数组的数组」

```java
int[][] m = new int[3][4];          // 3 行 4 列
int[][] g = {{1, 2}, {3, 4, 5}};    // 每行长度可以不同

m.length      // 3   行数
m[0].length   // 4   第 0 行的列数
```

内存上是「引用数组」，每个元素指向一个独立的一维数组：

```text
m ──> [ ref0 ][ ref1 ][ ref2 ]
          │       │       │
          ▼       ▼       ▼
      [0,0,0,0] [0,0,0,0] [0,0,0,0]
```

三个直接后果：

- `new int[3][]` 合法（只定行数），但每行是 `null`，`g[0]` 打印出来就是 `null`。
- 锯齿数组能存在，正因为「行」是独立对象，长度互不相干——实测 `{{1,2},{3,4,5}}` 的 `m[0].length` 是 2、`m[1].length` 是 3。
- 遍历内层必须用 `m[i].length`，写成 `m.length` 就是越界。

矩阵题里把 `grid[i].length` 与 `grid.length` 写反是高频错误，而且报错长得很像外层出错。记一句：**外层看行数，内层看列数。**

## 五、`Arrays` 能替你做的事

```java
int[] a = {3, 1, 2};
Arrays.sort(a);                          // 原地排序 O(n log n)
Arrays.toString(a);                      // [1, 2, 3]
Arrays.binarySearch(a, 2);               // 1（必须先排序）
Arrays.equals(a, new int[]{1, 2, 3});    // true
Arrays.fill(new int[3], 7);              // [7, 7, 7]
```

- **`sort` 是原地修改**，不返回新数组；返回 `void`，所以 `int[] b = Arrays.sort(a)` 编译不过。
- **`binarySearch` 的前提是已排序**，否则不报错、返回一个无意义的值——这才是坑。
- **`binarySearch` 返回的是下标**，找不到时返回负值（`-(插入点) - 1`），不是 -1 一刀切。
- **`equals` 是逐元素比较**，`a.equals(b)` 走的是 `Object` 的地址比较，永远 `false`。

而直接 `println(数组)` 打出的是：

```text
[I@506e1b77
```

`[` 表示数组，`I` 表示 `int`，后面是 hashCode 的十六进制。原因是数组没有重写 `toString()`，`println` 走到的是 `Object.toString()`。二维数组要用 `Arrays.deepToString()`，否则打印的是内层数组的地址。

## 六、手写反转和冒泡，练的是边界

**反转用双指针从两头夹：**

```java
int[] arr = {1, 2, 3, 4, 5, 6, 7};
for (int min = 0, max = arr.length - 1; min < max; min++, max--) {
    int temp = arr[min];
    arr[min] = arr[max];
    arr[max] = temp;
}
// [7, 6, 5, 4, 3, 2, 1]
```

三个细节：`for` 的初始化块可以声明**同类型**的两个变量；循环条件是 `min < max` 而不是 `<=`——奇数长度时中间那个元素原地不动，写 `<=` 只是多换一次自己；交换必须借第三个变量，`a = b; b = a;` 会把两个都变成 `b`。

**冒泡是两层循环，每趟少比一个：**

```java
int[] b = {5, 2, 9, 1, 3};
for (int j = 0; j < b.length - 1; j++) {            // 趟数最多 n-1
    for (int i = 0; i < b.length - 1 - j; i++) {    // 每趟少比一个
        if (b[i] > b[i + 1]) {
            int t = b[i]; b[i] = b[i + 1]; b[i + 1] = t;
        }
    }
}
// [1, 2, 3, 5, 9]
```

两个边界写错就崩，而且错法不一样：

- 内层 `i < b.length` → 最后一次读 `b[b.length]`，**运行时** `ArrayIndexOutOfBoundsException`。
- 外层写成 `j < length`（漏了 `b.`）→ `length` 不是变量，**编译期** `cannot find symbol`。

`Arrays.sort()` 一行就够，手写的价值只在「自己算一次边界」。写过之后再看 `i < n - 1 - j`，才不是背下来的。

## 七、`.length` 与 `.length()`：那一对括号的来历

| 类型 | 取长度 | 是什么 | 括号 |
| :--- | :--- | :--- | :--- |
| 数组 | `a.length` | `public final` 字段 | 无 |
| `String` | `s.length()` | 方法 | 有 |
| 集合 `List` / `Set` / `Map` | `c.size()` | 接口方法 | 有 |
| `StringBuilder` | `sb.length()` | 方法 | 有 |
| 二维数组第 i 行 | `m[i].length` | 字段 | 无 |

为什么不一样？三个理由，各不相同：

- **数组是语言级容器**，JVM 直接支持，长度在创建时写进对象头（JLS §10.7 规定为 `public final`），读它只是一次内存访问。
- **`String` 底层是私有数组**，长度只能靠方法读。而且它的内部表示变过一次：Java 8 是 `char[]`，Java 9 之后改成 `byte[]` + `coder`（Compact Strings，纯拉丁字符省一半内存）。如果 `length` 是公开字段，这次改动就是破坏性变更；正因为是方法，外部代码一行都不用改。
- **集合是接口**，接口只能声明方法，不能声明字段。

两个坑：`length` 是 `final`，但**元素不是**——`a[0] = 1` 合法，`a = new int[10]` 也合法（改的是引用）。另一个是 `String.length()` 返回的是 **UTF-16 code unit 数**，不是人眼字符数：`"😀".length()` 是 2，`codePointCount` 才是 1，按 UTF-8 字节算是 4。

## 小结

- 数组是**定长、同类型、连续内存的对象**，`{...}` 只能在声明行用；引用元素默认 `null`，不是空串。
- `Index ... out of bounds` 查边界，`Cannot read the array length` 查初始化——两条报错方向相反。
- `int[] ref = src` 是别名不是复制；真副本用 `Arrays.copyOf` / `clone` / `System.arraycopy`，扩容一律「新建 + 搬」。
- 二维数组是「数组的数组」，行数看 `m.length`、列数看 `m[i].length`，`new int[3][]` 之后每行是 `null`。
- 打印数组要 `Arrays.toString`（二维 `deepToString`），否则只会看到 `[I@506e1b77`。
- 手写反转与冒泡的意义是**把边界算一遍**：`min < max`、`i < n - 1 - j`，两个都靠 `.length` 推算，不写死数字。
- `.length` 是字段、`.length()` 是方法，差别来自「能不能改内部表示」——这正是封装的价值。
