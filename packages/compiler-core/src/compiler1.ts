// 编译的三个步骤
// 1、将模板编译成 ast
// 2、将 ast 转换为 JavaScript ast
// 3、将 JavaScript ast 生成代码
// const templateAST = parse(template)
// const jsAST = transform(templateAST)
// const code = generate(jsAST)

// <div>
//   <h1 v-if="ok">Vue Template</h1>
// </div>

// 上面模板代码需要编译成下面的 ast

// const ast = {
//   // 逻辑根节点
//   type: 'Root',
//   children: [
//     // div 标签节点
//     {
//       type: 'Element',
//       tag: 'div',
//       children: [
//         // h1 标签节点
//         {
//           type: 'Element',
//           tag: 'h1',
//           props: [
//             // v-if 指令节点
//             {
//               type: 'Directive', // 类型为 Directive 代表指令
//               name: 'if',      // 指令名称为 if，不带有前缀 v-
//               exp: {
//                 // 表达式节点
//                 type: 'Expression',
//                 content: 'ok'
//               }
//             }
//           ]
//         }
//       ]
//     }
//   ]
// }


// 定义状态机状态
const State = {
  initial: 1,   // 初始状态
  tagOpen: 2,   // 标签开始状态
  tagName: 3,   // 标签名称状态
  text: 4,      // 文本状态
  tagEnd: 5,    // 结束标签状态
  tagEndName: 6 // 结束标签名称状态
}

// 辅助函数，判断是否是字母
function isAlpha(char: string) {
  return char >= 'a' && char <= 'z' || char >= 'A' && char <= 'Z';
}

// 接收模板字符串作为参数，将模板字符串切割 Token 返回
export function tokenize(str: string) {
  // 当前状态机状态: 初始状态
  let currentState = State.initial;
  // 用于缓存字符
  const chars = [];
  // 生成的 Token 会存储到 tokens 数组中，并作为函数的返回值返回
  const tokens = [];
  // 使用 while 循环开启自动机，只要模板字符串没有被消费完，自动机就会一直运行
  while(str) {
    // 查看第一个字符，这里没有被消费
    const char = str[0];
    // 匹配当前状态
    switch (currentState) {
      case State.initial:
        // 遇到字符 <
        if (char === '<') {
          // 1、状态机切换到 开始标签
          currentState = State.tagOpen;
          // 2、消费字符 <
          str = str.slice(1);
        } else if (isAlpha(char as string)) {
          // 1、遇到字母切换到文本状态
          currentState = State.text;
          // 2、将当前字母 char 缓存到 chars 数组
          chars.push(char);
          // 3、消费字符
          str = str.slice(1);
        }
        break;
      // 状态机处于标签开始状态
      case State.tagOpen:
        if (isAlpha(char as string)) {
          // 1、遇到字母，切换为标签名称状态
          currentState = State.tagName;
          // 2、将当前字母缓存到 chars 数组
          chars.push(char);
          // 3、消费字符
          str = str.slice(1);
        } else if (char === '/') {
          // 1、遇到 / 切换为标签关闭状态
          currentState = State.tagEnd;
          // 2、消费字符
          str = str.slice(1);
        }
        break;
      // 状态机处于标签名称状态
      case State.tagName:
        if (isAlpha(char as string)) {
          // 1、 遇到字母，状态不变
          // 2、将当前字母缓存到 chars 数组
          chars.push(char);
          // 3、消费字符
          str = str.slice(1);
        } else if (char === '>') {
          // 1、遇到 >   切换到初始状态
          currentState = State.initial;
          // 2、同时创建一个标签 Token，添加到 tokens 数组
          // 此时 chars 数组中缓存的就是标签名称
          tokens.push({
            type: 'tag',
            name: chars.join('')
          })
          // 3、chars 数组的内容已经被消费，清空
          chars.length = 0;
          // 4、消费字符
          str = str.slice(1);
        }
        break;
      // 状态机处于文本状态
      case State.text:
        if (isAlpha(char as string)) {
          // 1、遇到字母，状态不变
          // 2、将当前字母缓存到 chars 数组
          chars.push(char);
          // 3、消费字符
          str = str.slice(1);
        } else if (char === '<') {
          // 1、遇到 < 切换为 标签开始状态
          currentState = State.tagOpen;
          // 2、同时创建一个 文本 Token 添加到 tokens 数组中
          // 此时的 chars 数组中缓存的就是 文本内容
          tokens.push({
            type: 'text',
            content: chars.join('')
          });
          // 3、chars 数组的内容已经被消费，清空
          chars.length = 0;
          // 4、消费字符
          str = str.slice(1);
        }
        break;
      case State.tagEnd:
        if (isAlpha(char as string)) {
          // 1、遇到字母 状态切换到 结束标签名称状态
          currentState = State.tagEndName;
          // 2、将当前字符添加到 chars 数组
          chars.push(char);
          // 3、消费当前字符
          str = str.slice(1);
        }
        break;
      case State.tagEndName:
        if (isAlpha(char as string)) {
          // 1、遇到字母 不需要切换状态
          // 2、缓存字符
          chars.push(char);
          // 3、消费字符
          str = str.slice(1);
        } else if (char === '>') {
          // 1、遇到字符 > 状态切换为初始状态
          currentState = State.initial;
          // 2、同时创建一个 标签 Token 添加到 tokens 数组中
          // 此时的 chars 数组中缓存的就是 标签
          tokens.push({
            type: 'tagEnd',
            name: chars.join('')
          })
          // 3、清空 chars 数组
          chars.length = 0;
          // 4、消费字符
          str = str.slice(1);
        }
        break;
    }
  }
  return tokens;
}

interface Node {
  type: string,
  tag?: string,
  content?: string,
  children: Node[],
  jsNode?: any
}

export function parse(str: string) {
  // 对模板进行标记化，等到tokens
  const tokens = tokenize(str);
  // 创建根节点 root
  const root: Node = {
    type: 'Root',
    children: []
  };
  // 创建一个包含根节点的栈
  let elementStack = [root];

  // 开启一个扫描 tokens 的循环
  while(tokens.length) {
    // 获取当前栈顶元素作为父节点 parent
    const parent = elementStack[elementStack.length - 1];
    // 扫描当前 token
    const t: any = tokens[0];
    switch(t.type) {
      // 如果当前是开始标签，曾创建 element 类型的 AST 节点
      case 'tag': 
        const elementNode: Node = {
          type: 'Element',
          tag: t.name,
          children: []
        };
        parent?.children.push(elementNode);
        // 压入栈
        elementStack.push(elementNode);
        break;
      // 如果是文本标签，创建文本类型的 AST 节点
      case 'text':
        const textNode: Node = {
          type: 'Text',
          content: t.content,
          children: []
        }
        parent?.children.push(textNode);
        break;
      case 'tagEnd':
        // 遇到结束节点，将栈顶节点弹出
        elementStack.pop();
        break;
    }
    // 消费已扫描过的 token
    tokens.shift();
  }
  return root;
}

export function dump(node: any, indent = 0) {
  // 节点类型
  const type = node.type;
  // 节点描述：如果是根节点，不描述
  // 如果是 Element 节点，用 tag 描述
  // 如果是 Text 节点，用 content 描述
  const desc = node.type === 'Root' 
    ? ''
    : node.type === 'Element'
    ? node.tag
    : node.content;
  console.log(`${'-'.repeat(indent)}${type}: ${desc}`);
  if (node.children) {
    node.children.forEach((n: any) => dump(n, indent + 2))
  }
}

// 深度优先遍历
// 接受第二个参数 context 可以做到对节点的操作和访问解耦 使用回调函数的方式
function traverseNode(ast: any, context: any) {
  // 当前节点的 ast 节点就是 root
  // const currentNode = ast;

  // 对当前节点进行操作
  // if (currentNode.type === 'Element' && currentNode.tag === 'p') {
  //   // 将所有 p 标签替换为 h1 标签
  //   currentNode.tag = 'h1';
  // }
  // if (currentNode.type === 'Text') {
  //   // 将文本重复两次
  //   currentNode.content = currentNode.content.repeat(2);
  // }

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
      // 递归调用 traverseNode 转换子节点前，将当前节点设置为父节点
      context.parent = context.currentNode;
      // 设置位置索引
      context.childIndex = i;
      // 递归调用时，将 context 透传
      traverseNode(children[i], context);
    }
  }
  // 3、在节点处理到最后阶段执行缓存到 exitFns 中的回调函数
  // 需要反序执行
  let i = exitFns.length;
  while(i--) {
    exitFns[i]();
  }
}

interface Context {
  currentNode: Node | null,
  childIndex: number,
  parent: Node | null,
  replaceNode: Function,
  removeNode: Function,
  nodeTransforms: Function[],
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
      transformText
    ]
  }
  traverseNode(ast, context);
}

function transformElement(node: any, context: any) {
  // if (node.type === 'Element' && node.tag === 'p') {
    // 将所有 p 标签替换为 h1 标签
    // console.log(node, context);
    // node.tag = 'h1'
    // context.replaceNode({
    //   type: 'Element',
    //   tag: 'h1',
    //   children: []
    // })
  // }

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
    // context.replaceNode({
    //   type: 'Element',
    //   tag: 'span'
    // })

    // 将文本重复两次
    // node.content = node.content.repeat(2);

    // 删除节点
    // context.removeNode();
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







// <div><p>Vue</p><p>Template</p></div>
// 与这段模板等价的渲染函数是：
// function render() {
//   return h('div', [
//     h('p', 'Vue'),
//     h('p', 'Template')
//   ])
// }

// 我们观察上面这段渲染函数的代码。它是一个函数声明，所以我们首先要描述JavaScript 中的函数声明语句。一个函数声明语句由以下几部分组成。
// 1、 id：函数名称，它是一个标识符 Identifier。
// 2、 params：函数的参数，它是一个数组。
// 3、 body：函数体，由于函数体可以包含多个语句，因此它也是一个数组。

// 为了简化问题，这里我们不考虑箭头函数、生成器函数、async 函数等情况。那么，根据以上这些信息，
// 我们就可以设计一个基本的数据结构来描述函数声明语句：

const FunctionDeclNode = {
  type: 'FunctionDecl', // 代表该节点的函数声明
  // 函数名称是一个标识符，本身也是一个节点
  id: {
    type: 'Identifier', 
    name: 'render'  // name 用来存储标识符的名称，这里就是渲染函数的名称 render
  },
  params: [], // 参数，目前还不需要参数，是 []
  // 渲染函数的函数体就一个 return 语句
  body: [
    {
      type: 'ReturnStatement',
      return: {
        type: 'CallExpression',
        callee: {
          type: 'Identifier',
          name: 'h'
        },
        arguments: [
          {
            type: 'StringLiteral',
            name: 'div'
          },
          {
            type: 'ArrayExpression',
            elements: [
              {
                type: 'CallExpression',
                callee: {
                  type: 'Identifier',
                  name: 'h'
                },
                arguments: [
                  {
                    type: 'StringLiteral',
                    value: 'p'
                  },
                  {
                    type: 'StringLiteral',
                    value: 'Vue'
                  }
                ]
              },
              {
                type: 'CallExpression',
                callee: {
                  type: 'Identifier',
                  name: 'h'
                },
                arguments: [
                  {
                    type: 'StringLiteral',
                    value: 'p'
                  },
                  {
                    type: 'StringLiteral',
                    value: 'Template'
                  }
                ]
              }
            ]
          }
        ]
      }
    }

  ]
}

// 1、 callee：用来描述被调用函数的名字称，它本身是一个标识符节点。
// 2、 arguments：被调用函数的形式参数，多个参数的话用数组来描述。
// 渲染函数返回的是虚拟 DOM 节点，具体体现在 h 函数的调用。
// 我们可以使用 CallExpression 类型的节点来描述函数调用语句，如下面的代码所示：

const CallExp = {
  type: 'CallExpression',
  // 被调用函数的名称，是一个标识符
  callee: {
    type: 'Identifier',
    name: 'h'
  },
  // 参数
  arguments: []
}

// 最外层的 h 函数的第一个参数是一个字符串字面量，我们可以使用类型为StringLiteral 的节点来描述它：
const Str = {
  type: 'StringLiteral',
  value: 'div'
}

// 最外层的 h 函数的第二个参数是一个数组，我们可以使用类型为 ArrayExpression 的节点来描述它：
const Arr = {
  type: 'ArrayExpression',
  // 数组中的元素
  elements: []
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

function compiler(template: any) {
  const ast = parse(template);
  transform(ast);
  const code = generate(ast.jsNode);
  return code;
}

// 与 AST 转换一样，代码生成也需要上下文对象。
// 该上下文对象用来维护代码生成过程中程序的运行状态，如下面的代码所示：
export function generate(node: any) {
  const context = {
    // 存储最后生成的渲染函数的代码
    code: '',
    // 生成代码时，调用 push 函数完成代码拼接
    push(code: string) {
      context.code += code;
    },
    // 我们希望最终生成的代码具有较强的可读性，因此我们应该考虑生成代码的格式，例如缩进和换行等。
    // 这就需要我们扩展 context 对象，为其增加用来完成换行和缩进的工具函数
    // 当前缩进的级别，初始值为 0 ，即没有缩进
    currentIndent: 0,
    // 该函数用来换行
    // 换行时应该保留缩进，还要追加 currentIndent * 2 个空格字符
    newLine() {
      context.code += '\n' + `  `.repeat(context.currentIndent);
    },
    // 用来缩进，让 currentIndent 自增后，调用换行函数
    indent() {
      context.currentIndent++;
      context.newLine();
    },
    // 取消缩进，让 currentIndent 自减后，调用换行函数
    deIndent() {
      context.currentIndent--;
      context.newLine();
    }
  }

  // 调用 genNode 函数完成代码生成工作
  genNode(node, context);
  return context.code;
}

// 我们就可以开始编写 genNode 函数来完成代码生成的工作了。
// 代码生成的原理其实很简单，只需要匹配各种类型的 JavaScript AST 节点，并调用对应的生成函数即可，如下面的代码所示：
function genNode(node: any, context: any) {
  switch(node.type) {
    case 'FunctionDecl':
      genFunctionDecl(node, context);
      break;
    case 'ReturnStatement':
      genReturnStatement(node, context);
      break;
    case 'CallExpression':
      genCallExpression(node, context);
      break;
    case 'StringLiteral':
      genStringLiteral(node, context);
      break;
    case 'ArrayExpression':
      genArrayExpression(node, context);
      break;
  }
}

function genFunctionDecl(node: any, context: any) {
  const { push, indent, deIndent } = context;
  // node.id 是一个标识符，用来表示函数名
  push(`function ${node.id.name} `);
  push('(');
  // 调用 genNodeList 为函数的参数生成代码
  genNodeList(node.params, context);
  push(')');
  push('{');
  // 缩进
  indent();
  // 为函数体生成代码，这里递归调用了 genNode
  node.body.forEach((n: any) => genNode(n, context));
  // 取消缩进
  deIndent();
  push('}');
}

// genNodeList 函数接收一个节点数组作为参数，并为每一个节点递归地调用 genNode 函数完成代码生成工作。
// 这里要注意的一点是，每处理完一个节点，需要在生成的代码后面拼接逗号字符（,）​。
function genNodeList(nodes: any, context: any) {
  const { push } = context;
  for(let i = 0; i < nodes?.length; i++) {
    const node = nodes[i];
    genNode(node, context);
    if (i < nodes.length - 1) {
      push(', ');
    }
  }
}

// genNodeList 函数会在节点代码之间补充逗号字符。
// 实际上，genArrayExpression 函数就利用了这个特点来实现对数组表达式的代码生成，如下面的代码所示：
function genArrayExpression(node: any, context: any) {
  const { push } = context;
  // 追加 [
  push('[');
  // 调用 genNodeList 为数组元素生成代码
  genNodeList(node.elements, context);
  // 补全 ]
  push(']');

}

// 不过，由于目前渲染函数暂时没有接收任何参数，所以 genNodeList 函数不会为其生成任何代码。
// 对于 genFunctionDecl 函数，另外需要注意的是，由于函数体本身也是一个节点数组，所以我们需要遍历它并递归地调用 genNode 函数生成代码
function genReturnStatement(node: any, context: any) {
  const { push } = context;
  // 追加 return 关键字和空格
  push(`return `);
  // 调用 genNode 函数递归的生成返回值代码
  genNode(node.return, context);
}

function genStringLiteral(node: any, context: any) {
  const { push } = context;
  // 对于字符串字面量，只需要追加 node.value 对应的字符串即可
  push(`'${node.value}'`);
}

function genCallExpression(node: any, context: any) {
  const { push } = context;
  const { callee, args } = node;
  push(`${callee.name}(`);
  genNodeList(args, context);
  push(')');
}