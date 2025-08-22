// 存放素有待执行的 effect runner
const queue: Function[] = [];
// 用于去重，确保同一个 runner 不会被添加多次
const seen = new Set<Function>();
// 标记是否正在等待微任务执行
let isFlushing = false;

/**
 * 将 effect 的 runner 推入队列，等待异步批量执行
 * @param job 
 */
export function queueJob(job: Function) {
  // 防止重复添加同一个job
  if (!seen.has(job)) {
    seen.add(job);
    queue.push(job);
    // 如果还没开始刷新队列，则启动
    if (!isFlushing) {
      isFlushing = true;
      // 在微任务中清空队列
      Promise.resolve().then(flushJobs);
    }
  }
}

/**
 * 清空队列，执行所有 job
 */
export function flushJobs() {
  isFlushing = false;
  // 创建一个副本，避免在遍历时修改原数组
  const jobs = [...queue];
  // 清空队列和去重集合
  queue.length = 0;
  seen.clear();
  // 执行所有 job
  for (const job of jobs) {
    job();
  }
}