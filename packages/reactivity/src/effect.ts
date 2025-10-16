import { ITERATE_KEY, triggerType } from './shared.js';

let targetMap = new WeakMap();
// activeEffect 需要使用栈，可以避免 effect 嵌套带来的问题
const effectStack: any[] = [];
let activeEffect:any = null;

// 1. 定义 options 的类型
interface EffectOptions {
  scheduler?: (job: Function) => void; // scheduler 是一个可选的函数
  lazy?: boolean;
}

// effect 需要改造，用以处理 effect 嵌套
export function effect(fn: Function, options: EffectOptions = {}) {
  // activeEffect = fn;
  // activeEffect();
  // activeEffect = null;

  const { scheduler, lazy } = options;
  const runner: any = () => {
    // 防止无限递归，例如：effect 传入的函数 自己修改自己的依赖，如果没有这个，就会无限递归
    if (effectStack.includes(runner)) return;
    // try 或者 catch 的return 前会执行 finally 块的语句，如果 return fn() 会先拿到 fn() 的返回值，再执行 finally 块的语句，最后返回 fn() 的值
    // return 语句的执行可以分为两个阶段：
    // 1、求值（Evaluation）：计算 return 关键字后面的表达式，得到一个具体的值。
    // 2、返回（Return）：将这个求得的值作为函数的返回结果，并退出函数。
    // finally 块的执行时机是在求值阶段之后，返回阶段之前。
    // 如果 finally 块中也包含一个 return 语句，那么 finally 块中的 return 会覆盖 try 或 catch 块中的 return。
    try {
      cleanup(runner);
      effectStack.push(runner);
      // 将 runner 赋值给 activeEffect, 因此 activeEffect 和 runner 是同一个引用, 也即 activeEffect 上有 deps 属性
      activeEffect = runner;
      // 首次执行并不浪费
      // 1、这是“依赖收集”的唯一时机：
      // effect 的核心任务不仅仅是“执行副作用”，更重要的是“建立依赖关系”。
      // 只有在 effect 执行的过程中，对响应式数据的读取才会触发 track，从而建立“数据 → effect”的依赖。
      // 如果跳过首次执行，effect 就像一个“瞎子”，它不知道自己依赖于哪些数据，也就无法在数据变化时被 trigger。
      // 2、“执行”和“副作用”是绑定的：
      // 在组件渲染的场景下，首次执行 render 函数是为了生成初始的虚拟 DOM (VNode)，这是创建真实 DOM 的必要前提。
      // 这次执行产生的 VNode 会被 patch 函数用来创建真实的 DOM 节点。这个过程是必须发生的，不存在“浪费”。
      // 3、为了正确传递用户函数的返回值
      return fn();
    } finally {
      effectStack.pop();
      activeEffect = effectStack[effectStack.length - 1] || null;
    }
  }
  // 先给 runner 函数 (也是对象) 加属性 deps
  runner.deps = [];
  runner.options = options;
  if (lazy) {
    return runner;
  } else {
    // 第一次执行
    if (scheduler) {
      // 如果有 scheduler，由 scheduler 决定何时执行
      scheduler(runner);
    } else {
      runner();
    }
  }
  // 暴露一个控制 effect 的生命周期的句柄。effect 函数本身不执行副作用，而是返回一个 可执行器 runner
  // 1、手动触发执行，用于测试用例
  // const runner = effect(() => {
  //   console.log(obj.value.count);
  // });
  // // 之后可以手动调用
  // runner(); // 手动触发，打印最新值

  // 2、computed 的基础
  // computed 的实现就依赖于 effect 返回的 runner。
  // computed 会创建一个 lazy 的 effect，不立即执行，而是将 runner 存起来。
  // 当 computed 的 .value 被读取时，才调用 runner() 来获取最新值。

  // 3、传递给 scheduler 
  // 调度器（scheduler）需要一个“句柄”来控制 effect 的执行时机。
  // scheduler 函数接收的参数就是这个 runner。
  // scheduler 可以选择立即执行 runner()，也可以将其放入队列稍后执行。
  
  // 总结：return runner 是为了让 effect 变得可控制、可组合、可扩展。它将“定义副作用”和“执行副作用”分离开来，这是函数式编程中常见的“惰性求值”和“高阶函数”思想。
  return runner;
}

function cleanup(runner: any) {
  for (const dep of runner.deps) {
    dep.delete(runner);
  }
  runner.deps.length = 0;
}

// 当 effect 内部的用户函数 fn 正在执行，并且访问了响应式数据时，track 才会被调用，依赖才会被收集。
export function track(target: object, key: any): void {
  // 检查是否有运行的 effect，没有直接返回函数，没有运行的 effect，不会收集依赖
  if (!activeEffect) return;
  let depsMap = targetMap.get(target);
  if (!depsMap) {
    depsMap = new Map();
    targetMap.set(target, depsMap)
  }
  let dep = depsMap.get(key)
  if (!dep) {
    dep = new Set();
    depsMap.set(key, dep);
  }
  dep.add(activeEffect);
  activeEffect.deps.push(dep);
}

export function trigger(target: object, key: string, type: string = ''): void {
  const depsMap = targetMap.get(target);
  if (!depsMap) return;
  const effects = depsMap.get(key);
  // 创建副本，避免遍历时修改原 Set
  const effectsToRun: any = new Set();

  effects && effects.forEach((effectFn: any) => {
    if (effectFn !== activeEffect) {
      effectsToRun.add(effectFn);
    }
  })

  // 只有当 type 是 ADD 和 DELETE 时，才触发与 ITERATE_KEY 相关联的副作用函数
  if (type === triggerType.ADD || type === triggerType.DELETE) {
    const iterateEffects = depsMap.get(ITERATE_KEY);
    iterateEffects && iterateEffects.forEach((effectFn: any) => {
      if (effectFn !== activeEffect) {
        effectsToRun.add(effectFn);
      }
    })
  }

  for(const effect of effectsToRun) {
    const { scheduler } = effect.options;
    if (scheduler) {
      // 如果 effect 有 scheduler，交给 scheduler 处理
      scheduler(effect);
    } else {
      // 立即执行
      effect();
    }
  }
}