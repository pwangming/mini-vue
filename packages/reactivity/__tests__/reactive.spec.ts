import { ref } from '../src/ref.js';
import { reactive, shallowReactive, readonly, shallowReadonly } from '../src/reactive.js';
import { effect } from '../src/effect.js';
import { describe, expect, it, vi } from 'vitest';

describe('reactive', () => {
  it('object attr change', () => {
    type Obj = {
      count: number | string
    }
    const obj = ref<Obj>({ count: 0 });
    let dummy;
    effect(() => { dummy = obj.value.count })
    expect(dummy).toBe(0);
    // 类型守卫，是正确的
    // if (typeof obj.value.count === 'number') obj.value.count++;
    // 测试用例更推荐断言
    (obj.value.count as number)++;
    expect(dummy).toBe(1);
    obj.value.count = 'abc';
    expect(dummy).toBe('abc');
  })

  it('object change', () => {
    const obj = ref({ a: 'abc' });
    let dummy;
    effect(() => { dummy = obj.value });
    const obj1 = { b: 'xyz' };
    // 类型断言
    obj.value = obj1 as any;
    expect(dummy).toEqual(obj1);
  })

  it('object deps change', () => {
    const obj = ref({ a: 'abc', b: { c: 'xyz' } });
    let dummy;
    effect(() => { dummy = obj.value.a });
    obj.value.a = '123';
    expect(dummy).toBe('123');
    effect(() => { dummy = obj.value.b.c });
    obj.value.b.c = '789';
    expect(dummy).toBe('789');
  })

  it('should react to "in", "for...in", and "delete" operations', () => {
    interface Obj {
      a?: string,
      b: string
    }
    const obj = ref<Obj>({a: 'abc', b: 'xyz'});
    let dummyIn;
    let dummyKeys: string[] = [];

    effect(() => { 
      // 测试 'in' 操作符
      dummyIn = 'a' in obj.value;
      
      // 测试 'for...in' 循环
      dummyKeys = [];
      for(const key in obj.value) {
        dummyKeys.push(key);
      }
    });

    // 初始状态
    expect(dummyIn).toBe(true);
    expect(dummyKeys).toEqual(['a', 'b']);

    // 修改属性
    obj.value.a = '111';
    expect(dummyIn).toBe(true); // 'in' 操作符应该仍然为 true
    expect(dummyKeys).toEqual(['a', 'b']); // 键名不变

    // 删除属性
    delete obj.value.a;
    expect(dummyIn).toBe(false); // 'in' 操作符变为 false
    expect(dummyKeys).toEqual(['b']); // 'for...in' 循环的结果更新
  });

  it('should not execute effect when setting the same value', () => {
    const count = ref({a: 'abc'});
    let dummy;
    const fn = vi.fn(() => {
      dummy = count.value.a;
    });

    // 创建 effect
    effect(fn);

    // 断言初始状态
    expect(dummy).toBe('abc');
    expect(fn).toHaveBeenCalledTimes(1); // effect 执行一次

    // 设置相同的值
    count.value.a = 'abc';

    // 断言 effect 没有重新执行
    expect(dummy).toBe('abc');
    expect(fn).toHaveBeenCalledTimes(1); // 调用次数没有增加

    // 设置不同的值
    count.value.a = 'xyz';

    // 断言 effect 重新执行
    expect(dummy).toBe('xyz');
    expect(fn).toHaveBeenCalledTimes(2); // 调用次数增加
  });

  it('should not execute effect when setting the same value is NaN', () => {
    const count = ref({a: NaN});
    let dummy;
    const fn = vi.fn(() => {
      dummy = count.value.a;
    });

    // 创建 effect
    effect(fn);

    // 断言初始状态
    expect(dummy).toBe(NaN);
    expect(fn).toHaveBeenCalledTimes(1); // effect 执行一次

    // 设置相同的值
    count.value.a = NaN;

    // 断言 effect 没有重新执行
    expect(dummy).toBe(NaN);
    expect(fn).toHaveBeenCalledTimes(1); // 调用次数没有增加

    // 设置不同的值
    count.value.a = 1;

    // 断言 effect 重新执行
    expect(dummy).toBe(1);
    expect(fn).toHaveBeenCalledTimes(2); // 调用次数增加
  });

  it('child、parent都是响应式数据，修改child没有的属性但parent有的属性，会触发两次effect，实际希望触发一次', () => {
    const obj = {};
    const proto = { bar: 0 };
    const child = reactive(obj);
    const parent = reactive(proto);
    Object.setPrototypeOf(child, parent);
    let dummy;
    const fn = vi.fn(() => {
      dummy = child.bar;
    });

    // 创建 effect
    effect(fn);

    // 断言初始状态
    expect(dummy).toBe(0);
    expect(fn).toHaveBeenCalledTimes(1); // effect 执行一次

    child.bar = 1;
    expect(dummy).toBe(1);
    expect(fn).toHaveBeenCalledTimes(2); // 修改 child.bar, effect 应该只能执行一次
  })

  it('shallowReactive', () => {
    const obj = shallowReactive({ foo: 'abc', bar: { count: 0 } });
    let dummy;
    let dummyRef;
    effect(() => {
      dummy = obj.bar.count;
    })

    effect(() => {
      dummyRef = obj.foo;
    })

    expect(dummy).toBe(0);
    expect(dummyRef).toBe('abc');

    obj.bar.count = 1;
    expect(dummy).toBe(0);
    expect(dummyRef).toBe('abc');

    obj.foo = 'xyz';
    expect(dummy).toBe(0);
    expect(dummyRef).toBe('xyz');
  })

  it('readonly', () => {
    const obj = readonly({foo: 'abc', bar: { count: 0 }});
    let dummy;
    let dummyReadonly;
    effect(() => {
      dummy = obj.foo;
    })
    effect(() => {
      dummyReadonly = obj.bar.count;
    })

    expect(dummy).toBe('abc');
    expect(dummyReadonly).toBe(0);
    expect(obj.foo).toBe('abc');
    expect(obj.bar.count).toBe(0);

    obj.foo = 'xyz';
    expect(dummy).toBe('abc');
    expect(dummyReadonly).toBe(0);
    expect(obj.foo).toBe('abc');
    expect(obj.bar.count).toBe(0);

    obj.bar.count = 1;
    expect(dummy).toBe('abc');
    expect(dummyReadonly).toBe(0);
    expect(obj.foo).toBe('abc');
    expect(obj.bar.count).toBe(0);
  })

  it('shallowReadonly', () => {
    const obj = shallowReadonly({foo: 'abc', bar: { count: 0 }});
    let dummy;
    let dummyReadonly;
    effect(() => {
      dummy = obj.foo;
    })
    effect(() => {
      dummyReadonly = obj.bar.count;
    })

    expect(dummy).toBe('abc');
    expect(dummyReadonly).toBe(0);
    expect(obj.foo).toBe('abc');
    expect(obj.bar.count).toBe(0);

    obj.foo = 'xyz';
    expect(dummy).toBe('abc');
    expect(dummyReadonly).toBe(0);
    expect(obj.foo).toBe('abc');
    expect(obj.bar.count).toBe(0);

    obj.bar.count = 1;
    expect(dummy).toBe('abc');
    expect(dummyReadonly).toBe(0);
    expect(obj.foo).toBe('abc');
    // 能改，但不会触发 effect
    expect(obj.bar.count).toBe(1);
  })

  it('array 整体替换和单个赋值 test', () => {
    const arr = ref<number[]>([1, 2, 3]);
    let dummyArr;
    let length;

    effect(() => {
      dummyArr = arr.value;
      length = arr.value.length;
    })

    expect(dummyArr).toEqual([1, 2, 3]);
    expect(length).toBe(3);

    arr.value[0] = 9;
    expect(dummyArr).toEqual([9, 2, 3]);
    expect(length).toBe(3);

    arr.value = [3, 2, 1, 0];
    expect(dummyArr).toEqual([3, 2, 1, 0]);
    expect(length).toBe(4);
  })

  it('超出数组长度的赋值', () => {
    const arr = ref<number[]>([1, 2, 3]);
    let dummy;
    let dummyArr;
    let length;

    effect(() => {
      dummy = arr.value[0];
      dummyArr = arr.value;
      length = arr.value.length;
    })

    expect(dummyArr).toEqual([1, 2, 3]);
    expect(dummy).toBe(1)
    expect(length).toBe(3);

    arr.value[4] = 5;
    expect(dummyArr).toEqual([1, 2, 3, undefined, 5]);
    expect(dummy).toBe(1);
    expect(length).toBe(5);
  })

  it('array for in', () => {
    const arr = reactive([1, 2, 3]);
    let dummyKeys;
    effect(() => { 
      // 测试 'for...in' 循环
      dummyKeys = [];
      for(const key in arr) {
        dummyKeys.push(arr[key]);
      }
    });

    expect(dummyKeys).toEqual([1, 2, 3]);

    // for in 循环只遍历存在的属性，是通过属性拿值的。稀疏数组只会遍历索引存在的。
    arr[4] = 8;
    expect(dummyKeys).toEqual([1, 2, 3, 8]);

    arr.length = 0;
    expect(dummyKeys).toEqual([]);
  })

  it('array for of', () => {
    const arr = reactive([1, 2, 3]);
    let dummyKeys;
    effect(() => { 
      // 测试 'for...of' 循环
      dummyKeys = [];
      for(const val of arr) {
        dummyKeys.push(val);
      }
    });

    expect(dummyKeys).toEqual([1, 2, 3]);

    // for of 是用来遍历 可迭代对象
    // 而是一种协议。具体来说，一个对象能否被迭代，取决于该对象或者该对象的原型是否实现了 @@iterator 方法。
    // 这里的 @@[name] 标志在ECMAScript 规范里用来代指 JavaScript 内建的 symbols 值，
    // 例如 @@iterator 指的就是 Symbol.iterator 这个值。如果一个对象实现了 Symbol.iterator 方法，那么这个对象就是可以迭代的

    // 数组迭代器的模拟实现
    //  arr[Symbol.iterator] = function() {
    //    const target = this
    //    const len = target.length
    //    let index = 0
    
    //    return {
    //      next() {
    //        return {
    //          value: index < len ? target[index] : undefined,
    //          done: index++ >= len
    //        }
    //      }
    //    }
    //  }
    arr[4] = 8;
    expect(dummyKeys).toEqual([1, 2, 3, undefined, 8]);

    // 可以看到，不需要增加任何代码就能够使其正确地工作。
    // 这是因为只要数组的长度和元素值发生改变，副作用函数自然会重新执行。
    // 数组的 values 方法的返回值实际上就是数组内建的迭代器，
    // 我们可以验证这一点：
    // console.log(Array.prototype.values === Array.prototype[Symbol.iterator]) // true
    arr.length = 0;
    expect(dummyKeys).toEqual([]);
  })

  it('array values()', () => {
    const arr = reactive([1, 2, 3]);
    let dummyKeys;
    effect(() => { 
      // 测试 'for...of' 循环
      dummyKeys = [];
      // 无论是使用 for...of 循环，还是调用 values 等方法，它们都会读取数组的 Symbol.iterator 属性。
      // 该属性是一个 symbol 值，为了避免发生意外的错误，以及性能上的考虑，
      // 我们不应该在副作用函数与 Symbol.iterator 这类 symbol 值之间建立响应联系，因此需要修改 get 拦截函数
      for(const val of arr.values()) {
        dummyKeys.push(val);
      }
    });

    expect(dummyKeys).toEqual([1, 2, 3]);

    arr[4] = 8;
    expect(dummyKeys).toEqual([1, 2, 3, undefined, 8]);

    arr.length = 0;
    expect(dummyKeys).toEqual([]);
  })

  it('array includes', () => {
    const numberArr = reactive([1, 2]);
    let numberDummy;

    effect(() => {
      numberDummy = numberArr.includes(1);
    })

    expect(numberDummy).toBe(true);

    numberArr[0] = 3;
    expect(numberDummy).toBe(false);

    const obj = {};
    const arr = reactive([obj]);
    let dummy;
    let dummy2;

    effect(() => {
      // 测试这个是因为 obj 会多次创建 proxy ，他们是不相等的
      dummy = arr.includes(arr[0]);
      // includes 内部的 this 指向的是代理对象， 获取数组元素的值得到的对象也是代理对象，用原始对象去找肯定找不到
      dummy2 = arr.includes(obj);
    })

    expect(dummy).toBe(true);
    expect(dummy2).toBe(true);
  })
})