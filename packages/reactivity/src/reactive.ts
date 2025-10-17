import { track, trigger } from './effect.js'
import { ITERATE_KEY, triggerType } from './shared.js';

export function reactive(target: any) {
  const proxyObj = new Proxy(target, handler);

  // 递归 第一次就创建所有的深层对象的 proxy，会造成巨大的性能浪费。

  // Vue 3 的响应式系统（Reactivity）对对象的 Proxy 采用的是惰性代理（Lazy Proxy），更准确地说，是一种结合了惰性访问和递归代理的策略。

  // Vue 3 响应式系统的核心机制
  // Vue 3 使用 Proxy 来代理整个响应式对象（reactive）或 ref 的 .value。其核心思想是：

  // 惰性访问（Lazy Access）：当你访问一个响应式对象的属性时（例如 state.user），get 陷阱会被触发。Vue 会在此时进行依赖收集（Track），记录下当前正在运行的副作用（如组件渲染函数）依赖于这个属性。最关键的是，如果这个属性的值本身是一个对象，Vue 不会立即递归地为这个对象创建 Proxy。
  // 递归代理（Recursive Proxying）：当访问到嵌套对象的属性时（例如 state.user.name），get 陷阱会返回原始对象。然而，Vue 的 get 陷阱会检查这个返回值：
  // * 如果返回值是一个普通对象，Vue 会调用一个内部函数（类似于 reactive 或 shallowReactive）立即将这个对象也转换成一个响应式对象（即创建一个新的 Proxy）。
  // * 然后，这个新创建的响应式对象（Proxy）会被返回。
  // * 这个过程是“惰性”的，因为嵌套对象的代理是在你第一次访问它时才创建的，而不是在初始化 state 时就为所有层级创建。
  // for (let key in proxyObj) {
  //   if (proxyObj.hasOwnProperty(key) && typeof proxyObj[key] === 'object' && proxyObj[key] !== null) {
  //     proxyObj[key] = reactive(proxyObj[key]);
  //   }
  // }

  return proxyObj;
}

const handler = {
  get: function(target: any, prop: string, receiver: any) {
    track(target, prop);
    const res = Reflect.get(target, prop, receiver)
    // 代理对象可以通过 raw 访问原始对象
    if (prop === 'raw') {
      return target
    }
    if (typeof res === 'object' && res !== null) {
      return reactive(res)
    }
    return res;
  },
  set: function(target: any, prop: string, value: any, receiver: any) {
    const oldVal = target[prop];
    // 如果属性不存在是新增属性，否则是修改属性
    const type = Object.prototype.hasOwnProperty.call(target, prop) ? triggerType.SET : triggerType.ADD;
    // 先 Reflect.set 再 trigger(), 先更新值，再更新视图
    const res = Reflect.set(target, prop, value, receiver);
    // target === receiver.raw 说明 receiver 就是 target 的代理对象
    if (target === receiver.raw) {
      // ( newval === newval || oldVal === oldVal ) 这个条件是去掉 NaN 的
      if (oldVal !== value && (oldVal === oldVal || value === value)) {
        trigger(target, prop, type);
      }
    }
    return res;
  },
  // 拦截 in 操作符，实现 in、for in、delete 需要去看语言标准
  has: function(target: any, prop: string) {
    track(target, prop);
    return Reflect.has(target, prop);
  },
  // 拦截 for in 循环，循环并没有读取任何一个属性，track 的时候需要给一个唯一标识符去定义是 for in 循环
  ownKeys: function(target: any) {
    track(target, ITERATE_KEY);
    return Reflect.ownKeys(target);
  },
  // 拦截 delete 操作
  deleteProperty: function(target: any, prop: string) {
    // 检查操作的属性是否属于自身
    const hadKey = Object.prototype.hasOwnProperty.call(target, prop);
    const res = Reflect.deleteProperty(target, prop);

    if (res && hadKey) {
      // 只有操作的属性属性自身且被成功删除后才触发 trigger
      trigger(target, prop, triggerType.DELETE);
    }

    return res;
  }
}