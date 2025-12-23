// ● defineAsyncComponent 函数本质上是一个高阶组件，它的返回值是一个包装组件。
// ● 包装组件会根据加载器的状态来决定渲染什么内容。如果加载器成功地加载了组件，则渲染被加载的组件，否则会渲染一个占位内容。
// ● 通常占位内容是一个注释节点。组件没有被加载成功时，页面中会渲染一个注释节点来占位。但这里我们使用了一个空文本节点来占位。

import { ref } from '@mini-vue/reactivity'

interface Options {
  loader: Function
  timeout?: number
  errorComponent?: Function
  delay?: number
  loadingComponent?: Function
  onError?: Function
}


// defineAsyncComponent 用于定义一个异步组件，接受一个异步组件加载器作为参数，还需要添加很多功能 loading、重试、error等，就需要传入一个配置项 opitons
export function defineAsyncComponent(options: Options) {
  // options 可以是配置项，也可以是加载器
  if (typeof options === 'function') {
    options = {
      loader: options
    }
  }

  const { loader } = options;
  // 一个变量，用来存储异步加载的组件
  let InnerComp: any = null;
  // 重试次数
  let retries = 0;

  // 封装 load 函数加载异步组件
  function load() {
    return loader()
      // 捕获加载器错误
      .catch((err: any) => {
        // 如果用户指定了 onError 回调，则将控制权交给用户
        if (options.onError) {
          // 返回一个新的 promise 实例
          return new Promise((resolve, reject) => {
            // 重试
            const retry = () => {
              resolve(load());
              retries++;
            }
            // 失败
            const fail = () => reject(err);
            // 作为 onError 的参数让用户来决定下一步怎么做
            options.onError(retry, fail, retries)
          })
        } else {
          throw err;
        }
      })
  }
  // 返回一个包装组件
  return {
    name: 'AsyncComponentWrapper',
    setup() {
      // 异步组件是否加载成功
      const loaded = ref(false);
      // 定义 error ，当错误发生时，用来存储错误对象
      const error = shallowRef(null);
      const loading = ref(false);
      let loadingTimer: any = null;
      // 如果配置项存在 delay ，则开启定时器
      if (options.delay) {
        loadingTimer = setTimeout(() => {
          loading.value = true;
        }, options.delay)
      } else {
        loading.value = true;
      }
      // 加载是否超时
      // const timeout = ref(false);
      // 执行加载器函数，返回一个 promise 实例
      // 加载成功后，将加载成功后的组件赋值给 InnerComp，并将 loaded 标记 为true，代表加载成功
      load().then((c: any) => {
        InnerComp = c;
        loaded.value = true;
      }).catch((err: any) => {
        error.value = err;
      }).finally(() => {
        loading.value = false;
        clearTimeout(loadingTimer);
      })

      let timer: any = null;
      if (options.timeout) {
        // 如果指定了超时时间，则开启一个定时器
        timer = setTimeout(() => {
          // timeout.value = true;
          const err = new Error(`Async component timed out after ${options.timeout}ms.`)
          error.value = err;
        }, options.timeout)
      }

      // 包装组件被卸载时则清除定时器
      onUnmounted(() => clearTimeout(timer));
      // 占位内容
      const placeholder = { type: Text, children: '' };

      return () => {
        // 如果异步组件加载成功，则渲染该组件
        if (loaded.value) {
          return { type: InnerComp };
        } else if (error.value && options.errorComponent) {
          // 如果超时，则渲染用户提供的 Error 组件
          // return options.errorComponent ? { type: options.errorComponent } : placeholder;
          return { type: options.errorComponent, props: { error: error.value } };
        } else if (loading.value && options.loadingComponent) {
          // 异步组件正在加载，并且指定了 loading 组件 则渲染 loading 组件
          return { type: options.loadingComponent }
        } else {
          return placeholder
        }
      }
    }
  }
}