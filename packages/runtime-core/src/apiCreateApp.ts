import { createVNode } from "./vnode.js";

export function createAppAPI(render: any) {
  return function createApp(rootComponent: any) {
    const app = {
      _component: rootComponent,
      mount(rootContainer: any) {
        console.log("基于根组件创建 vnode");
        const vnode = createVNode(rootComponent);
        console.log("调用 render，基于 vnode 进行开箱");
        render(vnode, rootContainer);
      },
    };

    return app;
  };
}
