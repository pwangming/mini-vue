import { ref } from '../src/ref.js';
import { reactive } from '../src/reactive.js';
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
})