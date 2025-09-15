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
    case 'Expression':
      genExpression(node, context);
      break;
    case 'Attribute':
      genAttribute(node, context);
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
  if (node.elements.length !== 0) {
    // 追加 [
    push('[');
    // 调用 genNodeList 为数组元素生成代码
    genNodeList(node.elements, context);
    // 补全 ]
    push(']');
  } else {
    push(`''`);
  }

}

// 由于目前渲染函数暂时没有接收任何参数，所以 genNodeList 函数不会为其生成任何代码。
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

function genExpression(node: any, context: any) {
  const { push } = context;
  push('`${');
  push(`${node.value}`);
  push('}`');
}

function genAttribute(node: any, context: any) {
  const { push } = context;
  if (node.value === null) {
    push('null');
  } else {
    push('{')
    for(let i = 0; i < node.value.length; i++) {
      push(` ${node.value[i].name}:`);
      push(` ${node.value[i].value}`);
      if (i !== node.value.length - 1) {
        push(`,`)
      }
    }
    push(' }')
  }
}