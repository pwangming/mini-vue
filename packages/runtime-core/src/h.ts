interface VNode {
  type: string | Function, // 标签 或 组件
  props: Record<string, any>, // 属性
  children: VNode[] | string, 
  el?: HTMLElement | null // 真实 dom
}

export function h(type: any, props: any, children: any, el = null): VNode {
  return {
    type,
    props,
    children,
    el
  }
}
