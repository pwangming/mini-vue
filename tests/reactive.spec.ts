import { ref } from '../src/ref';
import { effect } from '../src/effect';
import { describe, expect, it } from 'vitest';

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
})