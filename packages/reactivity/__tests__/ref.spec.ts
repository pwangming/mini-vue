import { ref } from '../src/ref.js';
import { effect } from '../src/effect.js';
import { describe, expect, it, vi } from 'vitest';

describe('ref', () => {
  it('基本类型', () => {
    const num = ref<number | undefined>(0);
    let dummy;
    effect(() => {dummy = num.value})
    expect(dummy).toBe(0);
    (num.value as number)++;
    expect(dummy).toBe(1);
    num.value = undefined;
    expect(dummy).toBe(undefined);

    const str = ref<string | null>('abc');
    effect(() => {dummy = str.value})
    expect(dummy).toBe('abc');
    str.value = 'xyz';
    expect(dummy).toBe('xyz');
    str.value = null;
    expect(dummy).toBe(null);

    const bool = ref(true);
    effect(() => {dummy = bool.value})
    expect(dummy).toBe(true);
    bool.value = false;
    expect(dummy).toBe(false);

    const a = ref<number | null>(null);
    effect(() => {dummy = a.value})
    expect(dummy).toBe(null);
    a.value = 123;
    expect(dummy).toBe(123);

    const b = ref<string | undefined>(undefined);
    effect(() => { dummy = b.value });
    expect(dummy).toBe(undefined);
    b.value = 'abc';
    expect(dummy).toBe('abc');
  })

  it('should not execute effect when setting the same value', () => {
    const count = ref(0);
    let dummy = 0;
    const fn = vi.fn(() => {
      dummy = count.value;
    });

    // 创建 effect
    effect(fn);

    // 断言初始状态
    expect(dummy).toBe(0);
    expect(fn).toHaveBeenCalledTimes(1); // effect 执行一次

    // 设置相同的值
    count.value = 0;

    // 断言 effect 没有重新执行
    expect(dummy).toBe(0);
    expect(fn).toHaveBeenCalledTimes(1); // 调用次数没有增加

    // 设置不同的值
    count.value = 1;

    // 断言 effect 重新执行
    expect(dummy).toBe(1);
    expect(fn).toHaveBeenCalledTimes(2); // 调用次数增加
  });

  it('should not execute effect when setting the same value is NaN', () => {
    const count = ref(NaN);
    let dummy = 0;
    const fn = vi.fn(() => {
      dummy = count.value;
    });

    // 创建 effect
    effect(fn);

    // 断言初始状态
    expect(dummy).toBe(NaN);
    expect(fn).toHaveBeenCalledTimes(1); // effect 执行一次

    // 设置相同的值
    count.value = NaN;

    // 断言 effect 没有重新执行
    expect(dummy).toBe(NaN);
    expect(fn).toHaveBeenCalledTimes(1); // 调用次数没有增加

    // 设置不同的值
    count.value = 1;

    // 断言 effect 重新执行
    expect(dummy).toBe(1);
    expect(fn).toHaveBeenCalledTimes(2); // 调用次数增加
  });
})