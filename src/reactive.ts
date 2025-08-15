import { track, trigger } from './effect.js'

export function reactive(obj: any) {
  const proxyObj = new Proxy(obj, handler);

  // 递归 第一次就创建所有的深层对象的 proxy，会造成巨大的性能浪费。

  // Vue 3 的响应式系统（Reactivity）对对象的 Proxy 采用的是惰性代理（Lazy Proxy），更准确地说，是一种结合了惰性访问和递归代理的策略。

  // Vue 3 响应式系统的核心机制
  // Vue 3 使用 Proxy 来代理整个响应式对象（reactive）或 ref 的 .value。其核心思想是：

  // 惰性访问（Lazy Access）：当你访问一个响应式对象的属性时（例如 state.user），get 陷阱会被触发。Vue 会在此时进行依赖收集（Track），记录下当前正在运行的副作用（如组件渲染函数）依赖于这个属性。最关键的是，如果这个属性的值本身是一个对象，Vue 不会立即递归地为这个对象创建 Proxy。
  // 递归代理（Recursive Proxying）：当访问到嵌套对象的属性时（例如 state.user.name），get 陷阱会返回原始对象。然而，Vue 的 get 陷阱会检查这个返回值：
  // * 如果返回值是一个普通对象，Vue 会调用一个内部函数（类似于 reactive 或 shallowReactive）立即将这个对象也转换成一个响应式对象（即创建一个新的 Proxy）。
  // * 然后，这个新创建的响应式对象（Proxy）会被返回。
  // * 这个过程是“惰性”的，因为嵌套对象的代理是在你第一次访问它时才创建的，而不是在初始化 state 时就为所有层级创建。
  for (let key in proxyObj) {
    if (proxyObj.hasOwnProperty(key) && typeof proxyObj[key] === 'object' && proxyObj[key] !== null) {
      proxyObj[key] = reactive(proxyObj[key]);
    }
  }

  return proxyObj;
}

const handler = {
  get: function(obj: any, prop: string) {
    track(obj, prop);
    return Reflect.get(obj, prop);
  },
  set: function(obj: any, prop: string, value: any) {
    // 先 Reflect.set 再 trigger(), 先更新值，再更新视图
    Reflect.set(obj, prop, value);
    trigger(obj, prop);
    return true;
  }
}