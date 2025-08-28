import { renderer } from "./renderer.js";

export function createApp(render: any) {
  let rootComponent;
  let vnode;

  return {
    component(component: any) {
      rootComponent = component
      return this;
    },
    mount(selector: any) {
      const container = document.querySelector(selector);
      vnode = render();
      renderer.render(vnode, container);
    }
  }
}