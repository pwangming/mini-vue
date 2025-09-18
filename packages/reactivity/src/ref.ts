// 1、实现ref<T>
// 目标：
// ref(0) 返回 { value: 0 }
// 支持 .value 读写
// 支持嵌套对象的自动解包 (shallow vs deep)

import { track, trigger } from './effect.js'
import { reactive } from './reactive.js'

/**
 * ref 的返回类型
 * 包含一个 .value 属性的对象，类型是泛型 T
 */
export interface Ref<T = any> {
  value: T,
  __v_isRef?: true,
}

/**
 * 创建一个响应式的引用对象
 * @param value 初始值
 * @returns 一个Ref对象
 */
export function ref<T>(value: T): Ref<T>;

export function ref(value?: unknown) {
  return new RefImpl(value)
}

/**
 * 
 */
class RefImpl<T = any> {
  _value: T
  private _rawValue: T
  public readonly __v_isRef = true

  constructor(value: T) {
    if (typeof value === 'object' && value !== null) {
      const reactiveValue = reactive(value);
      this._value = reactiveValue;
      this._rawValue = value;
    } else {
      this._value = value;
      this._rawValue = value;
    }
  }

  get value() {
    console.log('track');
    track(this, 'value')
    return this._value;
  }

  set value(newval) {
    const oldVal = this._rawValue;
    if (newval !== oldVal) {
      this._value = newval;
      this._rawValue = newval
    }
    console.log('trigger');
    trigger(this, 'value')
  }
}