import { renderer } from "./renderer.js";
import { queueJob } from "./scheduler.js";
import { h } from "./h.js";
import { effect } from '@mini-vue/reactivity'
import { compiler } from '@mini-vue/compiler-core'; // 引入你的 compiler-core

export function createApp(rootComponent: any) {
  return {
    mount(selector: string) {
      const container = document.querySelector(selector) as Element;
      
      // 👇 关键：如果 rootComponent 是一个对象，并且有 template 或从容器中获取模板
      let render = rootComponent.render;
      if (!render) {
        // 从容器的 innerHTML 获取模板
        const template = container.innerHTML;
        container.innerHTML = '';
        console.log('template', template)
        // 使用 compiler-core 编译模板，生成 render 函数
        const code = compiler(template);
        console.log(code, 'code');
        // 将字符串形式的 render 函数转换为可执行的函数
        render = new Function('h', 'message', `${code} return render`); // 注意：这里传入了 h 和 ref
        console.log(render, 'render')
      }

      // 创建 setup 上下文
      const setupContext = {};
      // 调用 setup()，获取 setupState
      const setupResult = typeof rootComponent.setup === 'function' 
        ? rootComponent.setup({}, setupContext) 
        : {};

      // 创建组件实例
      const instance = {
        vnode: null,
        type: rootComponent,
        setupState: setupResult,
        render,
        subTree: null
      };

      console.log('instance', instance)

      // 👇 核心：创建一个 effect 来驱动更新
      const updateComponent = effect(() => {
        // 执行 render 函数，生成新的 VNode (subTree)
        // 注意：render 函数需要能访问到 setupState
        const subTree = instance.render(h,
          // 将 setupState 作为参数传递给 render 函数
          instance.setupState.message
        );
        console.log('subTree', subTree)
        // 调用 patch 进行渲染或更新
        renderer.render(subTree(), container);
        // 更新 subTree 的引用
        // instance.subTree = subTree;
      }, {
        scheduler: queueJob // 使用你在 reactivity 中实现的调度器
      });

      // 首次执行 updateComponent，完成挂载
      updateComponent();
    }
  };
}