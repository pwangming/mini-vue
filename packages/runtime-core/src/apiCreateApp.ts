// runtime-core/index.ts
import { compiler } from '@mini-vue/compiler-core';
import { h } from './h.js';
import { renderer } from './renderer.js'
import { queueJob } from './scheduler.js';
import { effect } from '@mini-vue/reactivity';

export function createApp(rootComponent: any) {
  return {
    mount(selector: string) {
      const container = document.querySelector(selector) as Element;
      
      // 从容器中获取模板
      const template = container.innerHTML;
      container.innerHTML = '';
      
      // 使用 compiler-core 编译模板，生成 render 函数代码
      const compiled = compiler(template);
      console.log('compiled', compiled)
      // 将字符串形式的 render 函数转换为可执行的函数
      // 注意：render 函数需要能访问到 setupState 中的变量（如 message）
      // 将代码包装成一个立即执行的函数
      const renderFn = new Function(
        "function render (h, addCount, count){\n  return h('div', null, [h('p', null, `${count.value}`), h('button', { onClick: addCount }, 'Add')])\n} return render"
      )();
      // const renderFn = new Function('h', 'setupState', `
      //   with(setupState) {
      //     ${"return h('div', null, [h('p', null, `${setupState.count}`), h('button', { onClick: addCount }, 'Add')])"}
      //   }
      // `);
      // 调用 setup()，获取 setupState
      const setupResult = rootComponent.setup();
      console.log('setupResult', setupResult);
      
      // 创建组件实例
      const instance = {
        vnode: null,
        type: rootComponent,
        setupState: setupResult,
        subTree: null
      };

      console.log('renderFn', renderFn)

      // 核心：创建一个 effect 来驱动更新
      const updateComponent = effect(() => {
        // 执行 render 函数，生成新的 VNode (subTree)
        // 将 setupState 作为参数传递给 render 函数
        const subTree = renderFn(h, setupResult.addCount, setupResult.count);
        console.log('subTree', subTree)
        // 调用 patch 进行渲染或更新
        renderer.render(subTree, container);
        // renderer.patch(instance.subTree, subTree, container);
        
        // 更新 subTree 的引用
        instance.subTree = subTree;
      }, {
        scheduler: queueJob // 使用调度器进行批量更新
      });

      // 首次执行 updateComponent，完成挂载
      updateComponent();
    }
  };
}