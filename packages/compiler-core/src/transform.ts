interface Context {
  currentNode: Node | null,
  childIndex: number,
  parent: Node | null,
  replaceNode: Function,
  removeNode: Function,
  nodeTransforms: Function[],
}

interface Node {
  type: string,
  tag?: string,
  content?: string,
  children: Node[],
  jsNode?: any
}

export function transform(ast: any) {
  // context 上下文 提供信息
  const context: Context = {
    // 当前正在转换的 节点
    currentNode: null,
    // 当前节点在父节点的 children 的位置索引
    childIndex: 0,
    // 当前转换节点的父节点
    parent: null,
    // 有了上下文数据就可以实现节点替换
    replaceNode(node: any) {
      // 为了替换节点，需要修改 AST
      // 找到当前节点在父节点的 children 的位置，context.childIndex
      // 然后使用新节点替换
      if (context.parent) {
        context.parent.children[context.childIndex] = node;
      }
      // 由于当前节点被更新了，需要将 currentNode 设置为当前节点
      context.currentNode = node;
    },
    // 删除当前节点
    removeNode() {
      // 根据索引删除当前节点
      if (context.parent) {
        context.parent.children.splice(context.childIndex, 1);
      }
      // 删除后置空
      context.currentNode = null;
    },
    // 注册 nodeTransforms 数组
    // 退出阶段的回调函数时逆序的，这里注册顺序将会决定代码执行结果
    nodeTransforms: [
      // 转换根节点
      transformRoot,
      // 转换标签节点
      transformElement,
      // 转换文本节点
      transformText,
      // 转换插值节点
      transformInterpolation
    ]
  }
  traverseNode(ast, context);
}

// 深度优先遍历
// 接受第二个参数 context 可以做到对节点的操作和访问解耦 使用回调函数的方式
function traverseNode(ast: any, context: any) {
  context.currentNode = ast;
  // 1 、增加退出阶段的回调函数
  const exitFns = [];

  // 是一个数组，每一个元素都是 函数
  const transforms = context.nodeTransforms;
  for(let i = 0; i < transforms.length; i++) {
    // transforms[i](context.currentNode, context)
    // 将当前节点 currentNode 和 context 都传递给回调函数
    // 2、转换函数可以返回另外一个函数，作为退出阶段的回调函数
    const onExit = transforms[i](context.currentNode, context);
    if (onExit) {
      // 将退出阶段的函数添加到数组中
      exitFns.push(onExit);
    }
    // 任何转换函数都有可能删除当前节点，每次转换函数执行完毕后都应该检查当前节点是否被移除，移除了直接返回即可
    if (!context.currentNode) return;
  }
  // 如果有子节点，则递归的调用 traverseNode
  const children = context.currentNode.children;
  if (children) {
    for(let i = 0; i < children.length; i++) {
      if (children[i].type === 'Comment') {
        // 移除注释节点
        children.splice(i, 1);
      } else {
        // 递归调用 traverseNode 转换子节点前，将当前节点设置为父节点
        context.parent = context.currentNode;
        // 设置位置索引
        context.childIndex = i;
        // 递归调用时，将 context 透传
        traverseNode(children[i], context);
      }
    }
  }
  // 3、在节点处理到最后阶段执行缓存到 exitFns 中的回调函数
  // 需要反序执行
  let i = exitFns.length;
  while(i--) {
    exitFns[i]();
  }
}

function transformElement(node: any, context: any) {
  // 返回一个在退出节点执行的函数
  // 将转换代码编写在退出阶段的回调函数中
  // 可以保证在该节点下的子节点已全部处理完毕
  return () => {
    // 在这里编写退出节点的逻辑，当这里的代码执行时，当前转换节点的子节点一定是处理完成的
    if (node.type !== 'Element') {
      return
    }
    // 1、创建 h 函数调用语句
    // h 函数调用的第一个参数是标签名称，因此使用 node.tag 来创建
    const callExp = createCallExpression('h', [
      createStringLiteral(node.tag)
    ])
    // 2、 处理 h 函数的调用参数
    node.children.length === 1
      // 如果当前标签只有一个子节点，直接使用子节点的 jsNode 为参数
      ? callExp.args.push(node.children[0].jsNode)
      // 如果当前标签有多个子节点，则创建 ArrayExpression 节点作为参数
      : callExp.args.push(
        // 数组的每个元素都是子节点的 jsNode
        createArrayExpression(node.children.map((c: any) => c.jsNode))
      )
    // 3、将当前标签对应的 JavaScript AST 对应到 jsNode
    node.jsNode = callExp
  }
}

// 转换文本节点
function transformText(node: any, context: any) {
  if (node.type !== 'Text') {
    return;
  }
  // 文本节点对应 JavaScript AST 节点就是一个字符字面量
  // 使用 node.content 创建一个  createStringLiteral 节点
  // 最后将文本节点对应的 JavaScript AST 添加到 node.jsNode 中
  node.jsNode = createStringLiteral(node.content);

  // 返回一个在退出节点执行的函数
  return () => {
    // 在这里编写退出节点的逻辑，当这里的代码执行时，当前转换节点的子节点一定是处理完成的
  }
}

// 使用上面两个转换函数即可完成标签节点和文本节点的转换，即把模板转换成 h 函数的调用。
// 但是，转换后得到的 AST 只是用来描述渲染函数 render 的返回值的，所以我们最后一步要做的就是，补全 JavaScript AST，
// 即把用来描述 render 函数本身的函数声明语句节点附加到 JavaScript AST 中。
// 这需要我们编写 transformRoot 函数来实现对 Root 根节点的转换：
function transformRoot(node: any) {
  return () => {
    if (node.type !== 'Root') {
      return
    }

    // node 是根节点，根节点的第一个子节点就是模板的根节点
    // 暂时不考虑模板存在多个根节点的情况
    const vnodeJSAST = node.children[0].jsNode;
    // 创建 render 函数的声明语句节点，将 vnodeJSAST 作为 render 函数体的返回语句
    node.jsNode = {
      type: 'FunctionDecl',
      id: { type: 'Identifier', name: 'render' },
      params: [],
      body: [
        {
          type: 'ReturnStatement',
          return: vnodeJSAST
        }
      ]
    }
  }
}

function transformInterpolation(node: any, context: any) {
  if (node.type !== 'Interpolation') {
    return
  }

  node.jsNode = cretaeInterpolation(node.content);
}

// 用来创建 Interpolation 节点
function cretaeInterpolation(value: any) {
  return {
    type: 'Expression',
    value: value.content
  }
}

// 用来创建 StringLiteral 节点
function createStringLiteral(value: any) {
  return {
    type: 'StringLiteral',
    value
  }
}

// 用来创建 Identifier 节点
function createIdentifier(name: any) {
  return {
    type: 'Identifier',
    name
  }
}

// 用来创建 ArrayExpression 节点
function createArrayExpression(elements: any) {
  return {
    type: 'ArrayExpression',
    elements
  }
}

// 用来创建 CallExpression 节点
function createCallExpression(callee: any, args: any) {
  return {
    type: 'CallExpression',
    callee: createIdentifier(callee),
    args
  }
}