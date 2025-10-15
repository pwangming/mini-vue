import { effect } from "./effect.js";

interface optionsWatch {
  immediate?: boolean,
  once?: boolean,
  // 回调函数执行的时机，pre | post | sync
  // flush 本质上是在指定调度函数的执行时机。前文讲解过如何在微任务队列中执行调度函数 scheduler，这与 flush 的功能相同。
  // 当 flush 的值为 'post' 时，代表调度函数需要将副作用函数放到一个微任务队列中，并等待 DOM 更新结束后再执行
  flush?: string
}

export function watch(source: any, callback: Function, options: optionsWatch = {}) {
  const { immediate, flush } = options;
  let getter;
  // source 必须是一个 getter, 如果不是需要变成是, 因为 effect 的第一个参数必须是一个函数。
  if (typeof source === 'function') {
    getter = source;
  } else {
    getter = () => source.value
  }

  let oldVal: any;
  let newVal: any;
  let cleanup: any;

  function onInvalidate(fn: any) {
    cleanup = fn;
  }

  const job = () => {
    // 这个 runner 就是 effect 函数返回的 runner 
    newVal = runner();
    if (cleanup) {
      cleanup();
    }
    callback(newVal, oldVal, onInvalidate);
    oldVal = newVal;
  }

  // 创建一个 effect ，scheduler 负责执行 callback
  const runner = effect(getter, {
    lazy: true,
    // 使用 job 函数作为调度器函数
    scheduler: () => {
      // 我们修改了调度器函数 scheduler 的实现方式，在调度器函数内检测 options.flush 的值是否为 post，如果是，
      // 则将 job 函数放到微任务队列中，从而实现异步延迟执行；
      // 否则直接执行 job 函数，这本质上相当于 'sync' 的实现机制，即同步执行。
      // 对于 options.flush 的值为 'pre' 的情况，我们暂时还没有办法模拟，因为这涉及组件的更新时机，
      // 其中 'pre' 和 'post' 原本的语义指的就是组件更新前和更新后，不过这并不影响我们理解如何控制回调函数的更新时机。
      if (flush === 'post') {
        const p = Promise.resolve();
        p.then(job);
      } else {
        job();
      }
    }
  })

  if (immediate) {
    job();
  } else {
    // 首次执行获取 oldVal 主动触发一次依赖收集，建立“数据 -> watch 回调”的连接。
    oldVal = runner();
  }
}