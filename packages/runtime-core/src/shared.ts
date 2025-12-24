// 全局变量，存储当前正在被初始化的组件实例
export let currentInstance: any = null;
/**
 * 接受一个组件实例作为参数，并将该实例设置为 currentInstance
 * @param instance 组件实例
 */
export function setCurrentInstance(instance: any) {
  currentInstance = instance;
}