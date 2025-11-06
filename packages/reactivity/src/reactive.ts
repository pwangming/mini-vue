import { track, trigger } from './effect.js'
import { ITERATE_KEY, triggerType } from './shared.js';

// 定义一个 Map 实例，用于存储原始对象到代理对象的映射
const reactiveMap = new Map();

/**
 * 深响应
 * @param target 
 * @returns 
 */
export function reactive(target: any) {
  // 优先通过原始对象查找之前创建的代理对象，找到了直接返回代理对象
  const existionProxy = reactiveMap.get(target);
  if (existionProxy) return existionProxy;
  // 创建新的代理对象
  const proxy = createReactive(target);
  // 保存在 reactiveMap 中，避免重复创建
  reactiveMap.set(target, proxy);
  return proxy;

  // 递归 第一次就创建所有的深层对象的 proxy，会造成巨大的性能浪费。

  // Vue 3 的响应式系统（Reactivity）对对象的 Proxy 采用的是惰性代理（Lazy Proxy），更准确地说，是一种结合了惰性访问和递归代理的策略。

  // Vue 3 响应式系统的核心机制
  // Vue 3 使用 Proxy 来代理整个响应式对象（reactive）或 ref 的 .value。其核心思想是：

  // 惰性访问（Lazy Access）：当你访问一个响应式对象的属性时（例如 state.user），get 陷阱会被触发。Vue 会在此时进行依赖收集（Track），记录下当前正在运行的副作用（如组件渲染函数）依赖于这个属性。最关键的是，如果这个属性的值本身是一个对象，Vue 不会立即递归地为这个对象创建 Proxy。
  // 递归代理（Recursive Proxying）：当访问到嵌套对象的属性时（例如 state.user.name），get 陷阱会返回原始对象。然而，Vue 的 get 陷阱会检查这个返回值：
  // * 如果返回值是一个普通对象，Vue 会调用一个内部函数（类似于 reactive 或 shallowReactive）立即将这个对象也转换成一个响应式对象（即创建一个新的 Proxy）。
  // * 然后，这个新创建的响应式对象（Proxy）会被返回。
  // * 这个过程是“惰性”的，因为嵌套对象的代理是在你第一次访问它时才创建的，而不是在初始化 state 时就为所有层级创建。
}

/**
 * 浅响应
 * @param target 
 * @returns 
 */
export function shallowReactive(target: any) {
  return createReactive(target, true);
}

/**
 * 浅只读
 * @param target 
 * @returns 
 */
export function shallowReadonly(target: any) {
  return createReactive(target, true, true);
}

/**
 * 只读
 * @param target 
 * @returns 
 */
export function readonly(target: any) {
  return createReactive(target, false, true);
}

// 定义一个接口，描述代理数组的结构
interface ProxiedArray<T> extends Array<T> {
  raw: T[];
}

// 重写部分数组方法
const arrayInstrumentations: any = {};

// includes、 indexOf、lastIndexOf 都是一样的
['includes', 'indexsOf', 'lastIndexOf'].forEach((method: any) => {
  const originmethod = Array.prototype[method];

  arrayInstrumentations[method] = function(this: ProxiedArray<any>, ...args: any) {
    // this 是代理对象，现在代理对象中查找，将结果存储到 res 中
    let res = originmethod.apply(this, args);

    if (res === false || res === -1) {
      // res 为 false 说明没有找到，通过 this.raw 拿到原始数组，再去查找并更新 res 的值
      // console.log(this, this.raw, "+++++++++++++++++++"); 
      res = originmethod.apply(this.raw, args);
    }

    return res;
  }
})

// 标记一个变量，代表是否进行追踪，默认追踪
export let shouldTrack = true;
// 重写数组方法
['push', 'pop', 'shift', 'unshift', 'splice'].forEach((method: any) => {
  // 获取原始方法
  const originmethod = Array.prototype[method];
  // 重写
  arrayInstrumentations[method] = function(this: ProxiedArray<any>, ...args: any) {
    // 在调用原始方法前禁止追踪
    shouldTrack = false;
    // 调用原始方法
    let res = originmethod.apply(this, args)
    // 在调用原始方法后允许追踪
    shouldTrack = true;
    return res;
  }
})

function createReactive(target: any, isShallow = false, isReadonly = false) {
  return new Proxy(target, {
    get: function(target: any, prop: string, receiver: any) {
      // 代理对象可以通过 raw 访问原始对象
      if (prop === 'raw') {
        return target
      }
      // 如果操作的是数组，并且 key 存在于 arrayInstrumentations 中，那么返回定义在 arrayInstumentations 上的值
      if (Array.isArray(target) && arrayInstrumentations.hasOwnProperty(prop)) {
        return Reflect.get(arrayInstrumentations, prop, receiver);
      }
      // 非只读的时候才需要建立响应联系, 并且 prop 的类型是 symbol，也不建立联系
      if (!isReadonly && typeof prop !== 'symbol') {
        track(target, prop);
      }
      const res = Reflect.get(target, prop, receiver)
      // 浅响应，直接返回原始值
      if (isShallow) {
        return res;
      }
      if (typeof res === 'object' && res !== null) {
        // 如果数据为只读，调用 readonly 进行包装
        return isReadonly ? readonly(res) : reactive(res)
      }
      return res;
    },
    set: function(target: any, prop: string, value: any, receiver: any) {
      if (isReadonly) {
        console.warn(`属性${prop}是只读的`);
        return true;
      }
      const oldVal = target[prop];
      // 如果属性不存在是新增属性，否则是修改属性
      const type = Array.isArray(target)
      // 如果代理的目标是数组，则检测被设置的的索引值是否小于数组长度
      // 如果是则是 SET 否则是 ADD
      ? Number(prop) < target.length ? triggerType.SET : triggerType.ADD 
      : Object.prototype.hasOwnProperty.call(target, prop) ? triggerType.SET : triggerType.ADD;
      // 先 Reflect.set 再 trigger(), 先更新值，再更新视图
      const res = Reflect.set(target, prop, value, receiver);
      // target === receiver.raw 说明 receiver 就是 target 的代理对象
      if (target === receiver.raw) {
        // ( newval === newval || oldVal === oldVal ) 这个条件是去掉 NaN 的
        if (oldVal !== value && (oldVal === oldVal || value === value)) {
          // value 是新值
          trigger(target, prop, type, value);
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
      // 数组也可以使用 for in 循环，因此如果操作目标是数组，则使用 length 作为 key 并建立响应式联系
      track(target, Array.isArray(target) ? 'length' : ITERATE_KEY);
      return Reflect.ownKeys(target);
    },
    // 拦截 delete 操作
    deleteProperty: function(target: any, prop: string) {
      if (isReadonly) {
        console.warn(`属性${prop}是只读的`);
        return true;
      }
      // 检查操作的属性是否属于自身
      const hadKey = Object.prototype.hasOwnProperty.call(target, prop);
      const res = Reflect.deleteProperty(target, prop);

      if (res && hadKey) {
        // 只有操作的属性属性自身且被成功删除后才触发 trigger
        trigger(target, prop, triggerType.DELETE);
      }

      return res;
    }
  });
}