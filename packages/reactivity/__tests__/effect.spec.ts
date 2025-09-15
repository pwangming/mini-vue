import { ref } from '../src/ref.js';
import { effect } from '../src/effect.js';
import { computed } from '../src/computed.js';
import { describe, expect, it, vi } from 'vitest';

describe('ref', () => {
  it('effect 嵌套', () => {
    const obj = ref({ count: 0, user: { name: 'Bob', age: 18 } });
    let dummy;
    let user;
    effect(() => {
      effect(() => {
        user = obj.value.user.age;
      })
      dummy = obj.value.count;
    })

    obj.value.count++;
    obj.value.user.age = 20;
    expect(dummy).toBe(1);
    expect(user).toBe(20);
  })

  // 内存泄漏：旧的依赖关系（target -> key -> effect）无法被垃圾回收。
  // 错误的依赖收集：effect 会同时依赖于旧数据和新数据，导致在不应该更新的时候被触发。 
  it('测试cleanup函数', () => {
    const obj1 = ref({ count: 0 });
    const obj2 = ref({ count: 10 });
    const flag = ref(true);
    let dummy;
    let num = 0;

    effect(() => {
      num++;
      const target = flag.value ? obj1.value : obj2.value;
      dummy = target.count;
    });

    // 初始状态：flag.value 为 true，所以 dummy = 0
    expect(dummy).toBe(0);
    expect(num).toBe(1);
    flag.value =false;
    expect(dummy).toBe(10);
    expect(num).toBe(2);
    // 已经和 obj1 没关系了，obj1更新不会触发依赖函数
    obj1.value.count = 100;
    expect(dummy).toBe(10);
    expect(num).toBe(2);
  })

  it('should avoid infinite recursion', () => {
    const count = ref(0);
    let calls = 0;

    const runner = effect(() => {
      calls++;
      count.value++; // effect 修改了自己的依赖
    });

    // 由于 effectStack 的保护，这个 effect 只会执行一次
    expect(calls).toBe(1);
    expect(count.value).toBe(1); // 确保值确实被修改了

    // 再次手动执行 runner，应该可以正常工作
    runner();
    expect(calls).toBe(2);
    expect(count.value).toBe(2);
  });

  it('should handle deep nesting', () => {
    const a = ref(0);
    const b = ref(0);
    const c = ref(0);
    let result = '';

    effect(() => {
      effect(() => {
        effect(() => {
          result = `${a.value}${b.value}${c.value}`;
        });
        b.value; // 读取 b，建立依赖
      });
      a.value; // 读取 a，建立依赖
    });

    // 断言初始值
    expect(result).toBe('000');

    // 修改最内层依赖
    c.value = 1;
    expect(result).toBe('001');

    // 修改中间层依赖
    b.value = 2;
    expect(result).toBe('021'); // b 变了，c 也重新执行

    // 修改最外层依赖
    a.value = 3;
    expect(result).toBe('321'); // a 变了，b 和 c 都重新执行
  });

  // 这个测试用例有问题
  // it('should execute nested effects in correct order', () => {
  //   const outer = ref(0);
  //   const inner = ref(0);
  //   const log: string[] = [];

  //   effect(() => {
  //     log.push('outer start');
  //     effect(() => {
  //       log.push(`inner: ${inner.value}`);
  //     });
  //     log.push(`outer: ${outer.value}`);
  //     log.push('outer end');
  //   });

  //   // 断言初始执行顺序
  //   expect(log).toEqual(['outer start', 'inner: 0', 'outer: 0', 'outer end']);

  //   // 重置日志
  //   log.length = 0;

  //   // 修改外层依赖
  //   outer.value = 1;
  //   expect(log).toEqual(['outer start', 'inner: 0', 'outer: 1', 'outer end']);

  //   // 重置日志
  //   log.length = 0;

  //   // 修改内层依赖
  //   inner.value = 1;
  //   expect(log).toEqual(['inner: 1']);
  // });

  it('should return a runner function', () => {
    const count = ref(0);
    let dummy = 0;

    const runner = effect(() => {
      dummy = count.value;
    });

    expect(dummy).toBe(0);
    runner();
    expect(dummy).toBe(0);

    count.value = 1;
    expect(dummy).toBe(1);

    // 手动执行 runner
    runner(); // 手动触发
    expect(dummy).toBe(1);
  });

  // 测试用例：验证 effect 没有立即执行
  it('should not run effect immediately with scheduler', () => {
    const fn = vi.fn(); // 使用 Vitest 的 mock 函数
    const scheduler = vi.fn((job) => {
      // 将 job (runner) 推入一个队列
      queue.push(job);
    });
    const queue: Function[] = [];

    effect(fn, { scheduler }); // 传入 scheduler

    // 断言：fn 没有被立即调用
    expect(fn).not.toHaveBeenCalled();

    // 断言：scheduler 被调用了
    expect(scheduler).toHaveBeenCalled();
  });

  // 手动清空队列的函数
  function flushJobs(queue: Function[]) {
    // 创建一个副本，避免在遍历时修改原数组
    const jobs = [...queue];
    queue.length = 0; // 清空原队列
    for (const job of jobs) {
      job(); // 执行 runner
    }
  }

  // 在测试中使用
  it('should run effect when queue is flushed', () => {
    const fn = vi.fn();
    const queue: Function[] = [];
    const scheduler = (job: Function) => queue.push(job);

    effect(fn, { scheduler });

    // 手动清空队列
    flushJobs(queue);

    // 断言：fn 被执行了一次
    expect(fn).toHaveBeenCalledTimes(1);
  });

  // 模拟 queueJob 函数
  function queueJob(job: Function) {
    Promise.resolve().then(() => {
      job();
    });
  }

  // 使用 await Promise.resolve() 来等待微任务
  it('should run effect in next microtask', async () => {
    const fn = vi.fn();
    const queue: Function[] = [];
    const scheduler = (job: Function) => queue.push(job);

    // 模拟 queueJob 函数
    // function queueJob(job: Function) {
    //   Promise.resolve().then(() => {
    //     job();
    //   });
    // }

    effect(fn, { scheduler: queueJob });

    // 断言：fn 没有被立即调用
    expect(fn).not.toHaveBeenCalled();

    // 等待微任务执行
    await Promise.resolve();

    // 断言：fn 被执行了
    expect(fn).toHaveBeenCalled();
  });

  it('批量更新', async () => {
    const obj = ref({foo: 1});
    const log: number[] = [];
    const obj1 = ref({ bar: 1 });
    let dummy;
    effect(() => {
      log.push(obj.value.foo);
    });

    obj.value.foo++;
    obj.value.foo++;
    expect(log).toEqual([1, 2, 3]);

    log.length = 0;
    effect(() => {
      dummy = obj1.value.bar;
      log.push(dummy);
    }, {
      scheduler: queueJob
    });

    obj1.value.bar++;
    obj1.value.bar++;

    // 等待微任务执行
    // 它是一个“等待微任务”的信号。它强制当前函数暂停，让事件循环有机会去执行微任务队列中的所有任务（包括你的 flushJobs）。
    await Promise.resolve();

    expect(dummy).toBe(3);
    expect(log).toEqual([3]);
  })

  // it('在另外一个effect中读取计算属性的值', () => {
  //   const obj = ref({ foo: 1, bar: 2 })
  //   const sumRes = computed(() => obj.value.foo + obj.value.bar);
  //   let dummy;
  //   effect(() => {
  //     dummy = sumRes.value;
  //   })

  //   expect(dummy).toBe(3);
  //   obj.value.foo++;
  //   expect(dummy).toBe(4);
  // })
})