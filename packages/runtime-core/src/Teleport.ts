export const Teleport = {
  __isTeleport: true,
  process(n1: any, n2: any, container: any, anchor: any, internals: any) {
    const { patch, patchChildren, move } = internals;
    if (!n1) {
      // n1 不存在时挂载
      // 获取容器即挂载点
      const target = typeof n2.props.to === 'string'
        ? document.querySelector(n2.props.to)
        : n2.props.to;
      n2.children.forEach((c: any) => patch(null, c, target, anchor));
    } else {
      // 更新
      patchChildren(n1, n2, container);
      // 新旧 to 参数不同，需要对内容进行移动
      if (n2.props.to !== n1.props.to) {
        // 获取新的容器
        const newTarget = typeof n2.props.to === 'string'
          ? document.querySelector(n2.props.to)
          : n2.props.to;
          // 移动到新容器
        n2.children.forEach((c: any) => move(c, newTarget));
      }
    }
  }
}