import { effect, track, trigger } from "./effect.js";

export function computed(fn: Function) {
  let value: any;
  // 标记是否需要重新计算
  let dirty = true;

  const runner = effect(fn, { 
    scheduler: () => {
      if (!dirty) {
        // 当依赖变化时，标记为脏，但不立即执行
        dirty = true;
        // 当计算属性依赖的响应式数据变化时，手动调用 trigger 函数进行触发响应
        trigger(obj, 'value');
      }
    }, 
    lazy: true 
  })

  const obj = {
    get value() {
      if (dirty) {
        // 执行 runner 来重新计算
        value = runner();
        // 标记为干净
        dirty = false
      }
      // 当读取 value 时，手动调用 track 函数进行依赖追踪
      track(obj, 'value');
      return value
    }
  }

  return obj;
}