import { effect } from "./effect.js";

interface optionsWatch {
  immediate?: boolean,
  once?: boolean
}

export function watch(source: any, callback: Function, options: optionsWatch = {}) {
  const { immediate } = options;
  let getter;
  // source 必须是一个 getter, 如果不是需要变成是, 因为 effect 的第一个参数必须是一个函数。
  if (typeof source === 'function') {
    getter = source;
  } else {
    getter = () => source.value
  }

  let oldVal: any;
  let newVal: any;

  // 创建一个 effect ，scheduler 负责执行 callback
  const runner = effect(getter, {
    lazy: true,
    scheduler: () => {
      // 这个 runner 就是 effect 函数返回的 runner 
      newVal = runner();
      callback(newVal, oldVal);
      oldVal = newVal;
    }
  })

  // 首次执行获取 oldVal 主动触发一次依赖收集，建立“数据 -> watch 回调”的连接。
  oldVal = runner();
  if (immediate) {
    callback(oldVal, undefined);
  }
}