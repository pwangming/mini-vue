interface VNode {
  type: string | Function, // 标签 或 组件
  props: Record<string, any>, // 属性
  children: VNode[] | string, 
  el?: HTMLElement | null, // 真实 dom
  key?: string | null // key dom 元素复用唯一标识符
}

export function h(type: any, props: any, children: any, el = null): VNode {
  let key: string | null = null;
  if (props?.key) {
    key = props.key as string;
    delete props.key;
  }
  return {
    type,
    props,
    children,
    el,
    key
  }
}
