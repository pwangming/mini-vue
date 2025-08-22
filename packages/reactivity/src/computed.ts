import { effect, trigger } from "./effect.js";

export function computed(fn: Function) {
  let value: any;
  // 标记是否需要重新计算
  let dirty = true;

  const runner = effect(fn, { 
    scheduler: () => {
      if (!dirty) {
        // 当依赖变化时，标记为脏，但不立即执行
        dirty = true;
      }
    }, 
    lazy: true 
  })

  return {
    get value() {
      if (dirty) {
        // 执行 runner 来重新计算
        value = runner();
        // 标记为干净
        dirty = false
      }
      return value
    }
  }
}