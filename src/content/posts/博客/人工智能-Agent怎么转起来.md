---
title: Agent：模型不执行任何事，那它怎么转起来
date: 2026-11-02
subject: 博客
category: 人工智能
tags:
  - 博客
  - LLM
  - Agent
summary: Agent 是「模型输出意图 → 外部执行 → 结果回灌」的 while 循环加停止条件，模型没执行。跑一遍最小循环就看清：消息序列 user/assistant/tool/assistant 里那条 tool 是外部程序造的。三个数字：模型给的 unit=k 被外部枚举挡掉；不设 max_steps 就一直转；10 轮上下文是 1 轮的 10.3 倍。
---

# Agent：模型不执行任何事，那它怎么转起来

关于大模型和 Agent 的资料里，最容易被跳过的一句是：**模型不执行任何东西**。

它只做一件事——根据已给的上下文，预测下一个 token 该是什么。所谓「调用工具」，实际发生的是：模型输出一段结构化文本，说「我想调 `get_weather`，城市是西安」，然后**外部程序**去真的查天气，把结果塞回上下文，模型接着往下写。

把这句话当真之后，Agent 就没什么神秘的了：它是个 `while` 循环，循环体是「生成 → 有 tool_calls 就执行并回灌 → 再生成」，外面套一个停止条件。下面从模型的骨架讲到这个循环，每一步都配可复现的输出。

## 一、Transformer 骨架：四个部件各干一件事

一层 Transformer 的结构可以压成一行：

> 输入 → Tokenizer 分词 → Embedding + 位置编码 → 重复 N 层（多头 Self-Attention → Add & Norm → FFN 前馈网络 → Add & Norm）→ 输出表示 → 线性层 → 下一个 token 的概率分布

四个部件分工：

- **Self-Attention**：每个 token 看整句，决定「我该关注谁」
- **FFN**：对每个 token 单独做非线性变换
- **残差 + Norm**：让深层网络能训得动
- **多层堆叠**：低层学词法/句法，高层学语义/任务

「预测下一个 token」这个说法常被误解成「只会补全句子」。实际上自回归生成是逐 token 的，但每一步内部都是一次完整的前向计算，所谓「推理能力」就是这个过程的副产品。

## 二、Self-Attention 在算什么：查字典

每个 token 生成三样东西：

- **Q（Query）**：我要找什么
- **K（Key）**：我是什么
- **V（Value）**：我能提供什么

过程四步：当前 token 的 Q 和所有 token 的 K 算相似度 → 归一化成权重 → 用权重对所有 V 加权求和 → 得到当前 token 的新表示。

最顺的类比是查字典：Q 是查询词、K 是索引、V 是内容。「它」这个 token 的 Q 会和「猫」的 K 很匹配，于是重点取「猫」的 V——这就是指代消解在注意力层面的样子。

**多头**则是一组 Q/K/V 并行，各自从不同角度看：有的头盯指代，有的盯语法，有的盯位置。

这个「按相似度加权取数」的结构和很多数据处理动作同构：先算匹配度（Q 和 K 打分），再归一化（softmax），最后按权重聚合（对 V 加权和）。讲不出这个对应关系，通常说明还没真懂——它就是个带 softmax 权重的 join。

## 三、为什么能并行，位置编码为什么必须有

RNN 必须串行：第 3 个词要等第 2 个词算完。Transformer 训练时整句一起进，所有位置的 Q/K/V 同时算，注意力矩阵一次算完——**这是并行的来源**。

但并行的代价是**顺序感丢失**：Attention 本身对输入排列不敏感，「猫追狗」和「狗追猫」在它看来词集合一样。所以必须额外注入位置信息。

常见做法：绝对位置编码、相对位置编码、RoPE（旋转位置编码，现在 LLM 常用）。只需要理解结论——**没有位置编码，Transformer 看到的是词袋；有了才知道顺序。**

推理阶段是自回归的，一个一个吐 token，但每一步内部仍可并行，且能用 KV Cache 复用历史算过的 K/V，不用重算整个前缀。

## 四、六条能力边界，都是从「预测 token」推出来的

| 边界 | 根因 |
|---|---|
| 幻觉 | 在预测最可能的 token，不是查数据库 |
| 上下文窗口有限 | 一次能看的 token 有上限，超出截断 |
| 长上下文中间易丢 | 位置越远权重越难保持，中间段最易被跳过 |
| 知识有截止点 | 训练数据有时间界 |
| 不能精确计算 | 数字被分词，算术靠模式匹配 |
| 无真正长期记忆 | 默认无状态，记忆靠外部存储 |
| 推理不稳定 | 采样有随机性，同一问题可能不同答案 |

这张表的用处不是背诵，而是**判断什么该交给工具**。复杂算术、精确检索、超长文本、需要最新信息——这四类都不要指望模型，交给代码、检索、数据库。

## 五、Prompt 六法：一条控制力递增的链

| 方法 | 作用 |
|---|---|
| Zero-shot | 直接下任务，最省事也最不可控 |
| Few-shot | 给几个示例，用例子框定格式 |
| CoT | 要求分步推理，把过程露出来 |
| Self-Consistency | 多次采样 CoT 投票，压随机性 |
| ReAct | 思考与行动交替，边查边做 |
| 结构化输出 | 约束成 JSON/Schema，钉死格式 |

这条链的排序依据是**控制力**：越往后，你对输出的形状和过程掌握得越紧，代价是 token 消耗和延迟都在涨。

一个常被问的点：CoT 为什么有效？因为它把「一步到位的大概率错误」拆成「多步小概率错误」，而且每一步都能被检查。错在第三步，你当场就能看出来；一步给出错误答案，你只能靠别的办法验。

结构化输出的配套手段有五个：JSON Schema 约束、Function Calling、JSON Mode、解析失败重试、参数校验。前三个管「让它按格式说」，后两个管「说错了怎么办」。

## 六、Function Calling：模型只输出意图

工具要先声明成 JSON Schema，随请求一起发给模型：

```python
SCHEMA = {
    "name": "get_weather",
    "parameters": {
        "type": "object",
        "properties": {"city": {"type": "string"}, "unit": {"enum": ["c", "f"]}},
        "required": ["city"],
    },
}

def validate(args, schema):
    props = schema["parameters"]["properties"]
    for k in schema["parameters"]["required"]:
        if k not in args:
            return f"缺必填参数 {k}"
    for k, v in args.items():
        if k not in props:
            return f"未知参数 {k}"
        if "enum" in props[k] and v not in props[k]["enum"]:
            return f"{k}={v} 不在枚举 {props[k]['enum']}"
    return "ok"

for args in ({"city": "西安", "unit": "c"}, {"unit": "c"}, {"city": "西安", "unit": "k"}):
    print(f"  {str(args):<30} -> {validate(args, SCHEMA)}")
```

```text
  {'city': '西安', 'unit': 'c'}    -> ok
  {'unit': 'c'}                  -> 缺必填参数 city
  {'city': '西安', 'unit': 'k'}    -> unit=k 不在枚举 ['c', 'f']
```

注意这些校验**全部在外部做**。模型可能给出 `unit=k`（它觉得开尔文也行），也可能漏掉必填字段——Schema 是给模型看的提示，不是给它的约束。真正挡住非法参数的是执行器。

一次完整调用的消息演化：

```python
SCRIPT = [
    {"tool_calls": [{"id": "call_1", "name": "get_weather",
                     "arguments": {"city": "西安", "unit": "c"}}]},
    {"content": "西安晴，25°C"},
]

def fake_llm(messages):
    """假模型：只返回意图，不会执行任何工具。"""
    n = sum(1 for m in messages if m["role"] == "assistant")
    return SCRIPT[n]

def execute(call):
    """外部程序：真正干活的地方。"""
    return "晴，25°C"

messages = [{"role": "user", "content": "西安天气怎么样"}]
step = 0
while step < 4:
    step += 1
    resp = fake_llm(messages)
    if resp.get("tool_calls"):
        call = resp["tool_calls"][0]
        print(f"  第 {step} 轮 assistant -> tool_calls: {call['name']}({call['arguments']})")
        messages.append({"role": "assistant", "tool_calls": resp["tool_calls"]})
        result = execute(call)
        messages.append({"role": "tool", "tool_call_id": call["id"], "content": result})
        print(f"           外部执行 -> role=tool, content={result}")
    else:
        print(f"  第 {step} 轮 assistant -> content: {resp['content']}")
        messages.append({"role": "assistant", "content": resp["content"]})
        break
print(f"  消息角色序列: {[m['role'] for m in messages]}")
print(f"  模型执行过工具吗: 没有，它只返回了 tool_calls 字段")
```

```text
  第 1 轮 assistant -> tool_calls: get_weather({'city': '西安', 'unit': 'c'})
           外部执行 -> role=tool, content=晴，25°C
  第 2 轮 assistant -> content: 西安晴，25°C
  消息角色序列: ['user', 'assistant', 'tool', 'assistant']
  模型执行过工具吗: 没有，它只返回了 tool_calls 字段
```

序列里那条 `role=tool` 消息不是模型写的——是 `execute()` 的返回被包成消息塞进上下文。`tool_call_id` 的作用是配对，让模型知道「这条结果是哪个调用的答案」，一次并行调多个工具时靠它区分。

所以判断一个人是不是真懂 Function Calling，只需问一句：「模型真的执行工具了吗？」正确答案是没有。

## 七、Agent 循环：三样东西不能少

Agent 和聊天机器人的区别就三样：**循环**（思考→调用→观察→再思考）、**工具**（能改变外部世界）、**停止条件**。

伪代码很短：

```text
messages = [system, user]
for step in range(max_steps):
    resp = llm(messages, tools)
    if resp.tool_calls:
        for call in resp.tool_calls:
            result = execute(call)
            messages.append(tool_result(call.id, result))
    else:
        return resp.content
return "达到最大步数，停止"
```

容易忽略的是「停止条件」这一段——它决定了 Agent 会不会失控。至少要有四道闸：

```python
def run(script, max_steps=5):
    seen = set()
    for step in range(1, max_steps + 1):
        if step > len(script):
            return f"达到 max_steps={max_steps} 停止"
        act = script[step - 1]
        key = str(act)
        if key in seen:
            return f"第 {step} 轮检测到重复动作，强制停止"
        seen.add(key)
        if act[0] == "final":
            return f"第 {step} 轮模型给出最终答案，正常停"
    return "循环结束"

print("  情况 1：", run([("tool", "get_weather"), ("final", "答")]))
print("  情况 2：", run([("tool", "a"), ("tool", "b")], max_steps=3))
print("  情况 3：", run([("tool", "a"), ("tool", "a"), ("tool", "b")]))
```

```text
  情况 1： 第 2 轮模型给出最终答案，正常停
  情况 2： 达到 max_steps=3 停止
  情况 3： 第 2 轮检测到重复动作，强制停止
```

三种停法对应三种失败模式：正常停是任务完成；撞 `max_steps` 是模型绕不出来（或任务本身没边界）；检测到重复动作是模型陷进了死循环——它反复调同一个工具同一个参数，每次都拿到同样的结果。

生产环境还要加两道：**时间/成本预算**（跑太久或烧太多就停）和**人工确认**（危险动作如删除、付款必须等人点头）。

## 八、上下文会膨胀，这是循环的代价

每轮的工具结果都要塞回上下文，上下文只增不减。按「一次工具返回约 180 字」估算 10 轮的量级：

```python
PER_CALL = 180      # 一次工具返回约 180 字

def ctx(rounds):
    total = 40      # system + user
    for r in range(1, rounds + 1):
        total += 60 + r * 10        # 模型输出的 tool_calls 描述
        total += PER_CALL           # 工具结果回灌
    return total

print(f"  {'轮数':>4}{'上下文累计（字）':>18}")
for r in (1, 3, 6, 10):
    print(f"  {r:>4}{ctx(r):>18}")
print(f"  10 轮后是 1 轮的 {ctx(10) / ctx(1):.1f} 倍")
```

```text
    轮数          上下文累计（字）
     1               290
     3               820
     6              1690
    10              2990
  10 轮后是 1 轮的 10.3 倍
```

这是量级估算，不是实测——真实字数取决于工具返回的大小。但趋势是真的：**轮数线性增长，上下文线性膨胀**，而上下文窗口是有限的。

工程上的四种应对：截断旧消息（保 system 和最近几轮）、把长结果摘要后再回灌、把中间结果落外部存储只传引用、按任务分片重启上下文。其中「工具结果截断」是必须做的一条——一个返回 10 万字符的工具，能一次性把上下文撑爆。

## 九、三种形态怎么选

| 形态 | 机制 | 适合 | 风险 |
|---|---|---|---|
| ReAct | Thought / Action / Observation 交替 | 搜索、排障、环境动态、工具多而流程不固定 | 易绕路、成本高 |
| Plan-and-Execute | 先规划全部步骤，再执行并调整 | 复杂多步、依赖明确、报告生成、代码迁移 | 计划可能过时 |
| 多 Agent | 角色分工（Planner / Executor / Reviewer） | 大型任务、并行子任务、需要交叉审查 | 通信成本、冲突、难调试 |

选型原则可以压成一句：**步骤固定就别上 Agent**。流程能写成 chain/workflow 的，用 chain 更稳更便宜——Agent 的价值在「边查边决定」，如果不需要决定，它只是把确定性流程换成随机流程。

生产环境还有一条优先级：**简单、可控、可观测、可回滚**。多 Agent 的调试成本常被低估——出问题时你不知道是规划错了、执行错了，还是两者之间的通信丢了信息。

## 十、小结

- **模型不执行任何东西**，它只输出意图。消息序列 `['user','assistant','tool','assistant']` 里那条 `tool` 是外部程序造的。
- **Schema 是提示，不是约束**。`unit=k` 能通过模型，但会被外部的枚举校验挡掉；必填字段同理。
- **Agent = 循环 + 工具 + 停止条件**，三样缺一不可。停止条件至少有四道闸：模型自停、最大步数、重复检测、预算（生产再加人工确认）。
- **上下文线性膨胀**：10 轮约是 1 轮的 10.3 倍，所以工具结果必须截断，长结果要摘要或落外部存储。
- **Prompt 六法按控制力递增**：Zero → Few-shot → CoT → Self-Consistency → ReAct → 结构化输出，代价是 token 和延迟。
- **步骤固定就别上 Agent**。ReAct 适合边查边做，Plan-and-Execute 适合依赖明确的复杂任务，多 Agent 适合需要交叉审查——但它最难调。
- **六条能力边界都是从「预测 token」推出来的**：幻觉、上下文有限、长文中间易丢、知识有截止、不能精确算、无长期记忆。前四类问题该交给检索和工具，不该指望模型。
