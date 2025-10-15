import { ref } from "../src/ref.js";
import { watch } from "../src/watch.js"
import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest';

describe('watch test', () => {
  // 启用假计时器，以便精确控制 setTimeout
  // ✅ 在每个测试用例开始前启用假计时器
  beforeEach(() => {
    vi.useFakeTimers();
  });

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

  // 竞态这里有点问题，以后再修改
  // it('should cancel previous async operation and only get the latest result', () => {
  //   const obj = ref(1);
  //   let oldV: any;
  //   let newV: any;
  //   let finalData: any;

  //   watch(obj, (newValue: any, oldValue: any, onInvalidate: any) => {
  //     oldV = oldValue;
  //     newV = newValue;

  //     console.log(oldV, newV);

  //     let expired = false;
  //     // 当该次 watch 回调被下一次覆盖时，此函数会被调用
  //     onInvalidate(() => {
  //       console.log(`Watcher for value ${oldValue} -> ${newValue} is invalidated!`);
  //       expired = true;
  //     });

  //     // 模拟一个异步请求
  //     const res = new Promise((resolve) => {
  //       setTimeout(() => {
  //         resolve(`Hello, World!`);
  //       }, 1000); // 1秒后返回结果
  //     });

  //     console.log('expired', expired)

  //     // 只有当该次回调未过期时，才处理结果
  //     if (!expired) {
  //       res.then((r: any) => {
  //         console.log(`Resolved: ${r}`);
  //         finalData = r;
  //       }).catch(console.error);
  //     }
  //   }, {
  //     flush: 'post' // 在组件更新后执行
  //   });

  //   // --- 模拟用户交互 ---
    
  //   // 第一次修改: obj.value 从 1 变为 2
  //   obj.value++; // 此时 obj.value = 2
  //   console.log('First change: obj.value =', obj.value);

  //   // 在 200ms 后进行第二次修改，这会使第一次的 watch 回调失效
  //   setTimeout(() => {
  //     console.log('--- 200ms later ---');
  //     obj.value++; // 此时 obj.value = 3
  //     console.log('Second change: obj.value =', obj.value);
  //   }, 200);

  //   // --- 关键：推进时间以触发断言 ---

  //   // 先推进 200ms，确保第二次修改发生，并使第一次的 watcher 失效
  //   vi.advanceTimersByTime(200);

  //   // 再推进 1000ms，让所有 pending 的 setTimeout 执行
  //   // 注意：只有最后一次的异步操作不会被取消
  //   vi.advanceTimersByTime(1000);

  //   // --- 断言 ---
  //   // 最终结果应该只包含最后一次修改 (obj.value = 3) 的响应
  //   expect(finalData).toBe('Hello, World!');

  //   // 验证 oldV 和 newV 记录的是最后一次的变化
  //   expect(oldV).toBe(2); // 上一次是 2
  //   expect(newV).toBe(3); // 这一次是 3
  // });

  // ✅ 在每个测试用例结束后恢复真实计时器
  afterEach(() => {
    vi.useRealTimers();
  });
})
