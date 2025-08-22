import { ref } from "../src/ref.js";
import { watch } from "../src/watch.js"
import { describe, expect, it, vi } from 'vitest';

describe('watch test', () => {
  it('watch base test', () => {
    const user = ref('Bob');
    let dummy;
    let old;
    watch(user, (newVal: any, oldVal: any) => {
      old = oldVal;
      dummy = newVal;
    })

    user.value = 'Tom';
    expect(old).toBe('Bob');
    expect(dummy).toBe('Tom');
  })

  it('立即回调的 watch', () => {
    const name = ref('Jerry');
    let oldV;
    let newV;
    watch(name, (newVal: any, oldVal: any) => {
      oldV = oldVal;
      newV = newVal;
    }, {
      immediate: true,
    })

    expect(oldV).toBe(undefined);
    expect(newV).toBe('Jerry');
  })
})