import { transform } from "./transform.js";
import { generate } from "./generate.js";

// 根据 WHATWG 规范给出的几种状态
const TextModes = {
  DATA: 'DATA',
  RCDATA: 'RCDATA',
  RAWTEXT: 'RAWTEXT',
  CDATA: 'CDATA'
}

interface Context {
  source: string,
  mode: string,
  advanceBy: Function,
  advanceSpaces: Function
}

interface Node {
  type: string,
  tag?: string,
  content?: string,
  children: Node[],
  jsNode?: any
}

// 递归下降算法构造模板 AST
// 解析器函数，接受模板作为参数
export function parse(str: string) {
  // 定义上下文对象
  const context: Context = {
    // 模板内容，用于在解析过程中消费
    source: str,
    // 解析器当前处于文本模式，初始状态为 DATA
    mode: TextModes.DATA,
    advanceBy(num: number) {
      // 根据给定字符 num ，截取 num 后的模板内容并替换当前模板内容
      context.source = context.source.slice(num);
    },
    // 无论是开始标签还是结束标签都可能出现无用的空白字符
    advanceSpaces() {
      // 匹配空白字符
      const match = /^[\t\r\n\f ]+/.exec(context.source);
      if (match) {
        // 调用 advanceBy 函数消费空白字符
        context.advanceBy(match[0].length);
      }
    }
  }

  // 调用 parseChildren 函数进行解析，返回解析后得到的子节点
  const nodes = parseChildren(context, []);

  // 解析器返回 Root 根节点
  return {
    type: 'Root',
    children: nodes
  } as Node
}

// parseChildren 函数本质上也是一个状态机，该状态机有多少种状态取决于子节点的类型数量。
// 在模板中，元素的子节点可以是以下几种。
// ●标签节点，例如 <div>。
// ●文本插值节点，例如 {{ val }}。
// ●普通文本节点，例如：text。
// ●注释节点，例如 <!---->。
// ●CDATA 节点，例如 <![CDATA[ xxx ]​]>。
// 在标准的 HTML 中，节点的类型将会更多，例如 DOCTYPE 节点等。为了降低复杂度，我们仅考虑上述类型的节点。

// 状态迁移过程总结如下。
// ●当遇到字符 < 时，进入临时状态。
//   ○如果下一个字符匹配正则 /a-z/i，则认为这是一个标签节点，于是调用parseElement 函数完成标签的解析。
//   注意正则表达式 /a-z/i 中的 i，意思是忽略大小写（case-insensitive）​。
//   ○如果字符串以 <!-- 开头，则认为这是一个注释节点，于是调用 parseComment 函数完成注释节点的解析。
//   ○如果字符串以 <![CDATA[ 开头，则认为这是一个 CDATA 节点，于是调用parseCDATA 函数完成 CDATA 节点的解析。
// ●如果字符串以 {{ 开头，则认为这是一个插值节点，于是调用 parseInterpolation 函数完成插值节点的解析。
// ●其他情况，都作为普通文本，调用 parseText 函数完成文本节点的解析。


// ●parseChildren 函数的返回值是由子节点组成的数组，每次 while 循环都会解析一个或多个节点，
// 这些节点会被添加到 nodes 数组中，并作为 parseChildren 函数的返回值返回。
// ●解析过程中需要判断当前的文本模式。根据表 16-1 可知，只有处于 DATA 模式或RCDATA 模式时，
// 解析器才支持插值节点的解析。并且，只有处于 DATA 模式时，解析器才支持标签节点、注释节点和 CDATA 节点的解析。
// ●在 16.1 节中我们介绍过，当遇到特定标签时，解析器会切换模式。
// 一旦解析器切换到 DATA 模式和 RCDATA 模式之外的模式时，一切字符都将作为文本节点被解析。
// 当然，即使在 DATA 模式或 RCDATA 模式下，如果无法匹配标签节点、注释节点、CDATA 节点、插值节点，那么也会作为文本节点解析。

// 在解析模板时，我们不能忽略空白字符。
// 这些空白字符包括：换行符（\n）​、回车符（\r）​、空格（' '）​、制表符（\t）以及换页符（\f）​。如果我们用加号（+）代表换行符，用减号（-）代表空格字符。

/**
 * 
 * @param context 上下文对象
 * @param ancestors 父代节点构成的节点栈，用于维护节点间的父子级关系。初始栈为空
 */
function parseChildren(context: Context, ancestors: any) {
  let nodes = [];
  const { mode } = context;
  while(!isEnd(context, ancestors)) {
    let node;
    // 只有 DATA 模式和 RCDATA 模式才支持插值节点的解析
    if (mode === TextModes.DATA || mode === TextModes.RCDATA) {
      // 只有 DATA 模式才支持标签节点的解析
      if (mode === TextModes.DATA && context.source[0] === '<') {
        if (context.source[1] === '!') {
          // 注释
          if (context.source.startsWith('<!--')) {
            node = parseComment(context);
          } else if (context.source.startsWith('<![CDATA[')) {
            // CDATA
            node = parseCDATA(context, ancestors);
          }
        } else if (context.source[1] === '/') {
          // 状态机遭遇了闭合标签，应该抛出错误，因为没有与之对应的开始标签
          console.error('无效的标签');
          continue;
        } else if (/[a-z]/i.test(context.source[1] as string)) {
          // 标签
          node = parseElement(context, ancestors);
        }
      } else if (context.source.startsWith('{{')) {
        // 解析插值
        node = parseInterpolation(context);
      }
    }

    // node 不存在，说明处于其它模式，既非 DATA 模式且非 RCDATA 模式
    // 一切都作为文本处理
    if (!node) {
      // 解析文本节点
      node = parseText(context);
    } 
    nodes.push(node);
  }
  // 子节点解析完毕，返回子节点
  return nodes;
}

// ●第一个停止时机是当模板内容被解析完毕时；
// ●第二个停止时机则是在遇到结束标签时，这时解析器会取得父级节点栈栈顶的节点作为父节点，
// 检查该结束标签是否与父节点的标签同名，如果相同，则状态机停止运行。
function isEnd(context: Context, ancestors: any): boolean {
  // 模板解析完毕后停止
  if (!context.source) return true;
  for (let i = ancestors.length - 1; i >= 0; --i) {
    // 只要栈中存在与当前结束标签同名的节点就停止状态机
    if (context.source.startsWith(`</${ancestors[i].tag}`)) {
      return true;
    }
  }
  return false;
}

function parseElement(context: Context, ancestors: any) {
  const element = parseTag(context);
  if (element.isSelfClosing) return element;
  if (element.tag === 'textarea' || element.tag === 'title') {
    context.mode = TextModes.RCDATA;
  } else if (/style|xmp|iframe|noembed|noframes|noscript/.test(element.tag)) {
    context.mode = TextModes.RAWTEXT;
  } else {
    context.mode = TextModes.DATA;
  }
  ancestors.push(element);
  element.children = parseChildren(context, ancestors);
  ancestors.pop();

  // 闭合标签
  if (context.source.startsWith(`</${element.tag}`)) {
    parseTag(context, 'end');
  } else {
    console.error(`${element.tag} 标签缺少闭合标签`)
  }
  return element;
}


// ●对于字符串 '<div>'，会匹配出字符串 '<div'，剩余 '>'。
// ●对于字符串 '<div/>'，会匹配出字符串 '<div'，剩余 '/>'。
// ●对于字符串 '<div---->'，其中减号（-）代表空白符，会匹配出字符串 '<div'，剩余 '---->'。

// 除了正则表达式外，parseTag 函数的另外几个关键点如下。
// ●在完成正则匹配后，需要调用 advanceBy 函数消费由正则匹配的全部内容。
// ●根据上面给出的第三个正则匹配例子可知，由于标签中可能存在无用的空白字符，例如 <div---->，因此我们需要调用 advanceSpaces 函数消费空白字符。
// ●在消费由正则匹配的内容后，需要检查剩余模板内容是否以字符串 /> 开头。如果是，则说明当前解析的是一个自闭合标签，这时需要将标签节点的 isSelfClosing 属性设置为 true。
// ●最后，判断标签是否自闭合。如果是，则调用 advnaceBy 函数消费内容 />，否则只需要消费内容 > 即可。

interface Element {
  type: string,
  tag: string,
  props: any[],
  children: any[],
  isSelfClosing: boolean
}
/**
 * 
 * @param context 上下文
 * @param type 标签类型：start、end
 * @returns 
 */
function parseTag(context: Context, type = 'start') {
  const { advanceBy, advanceSpaces } = context;
  let tag = '';
  // 处理开始标签和结束标签的正则表达式不同
  const match = type === 'start'
    // 开始标签
    ? /^<([a-z][^\t\r\n\f />]*)/i.exec(context.source)
    // 结束标签
    : /^<\/([a-z][^\t\r\n\f />]*)/i.exec(context.source);
  if (match?.length) {
    // 匹配成功后，正则表达式第一个捕获组的值就是标签名称
    tag = match[1] as string;
    // 消费正则表达式匹配的全部内容 eg：'<div'
    advanceBy(match[0].length);
  }
  // 消费标签中无用的字符
  advanceSpaces();

  // 解析属性和自定义指令，得到 props 数组
  const props = parseAttributes(context);

  // 在消费匹配的内容后，如果以 '/>' 开头，是自闭合标签
  const isSelfClosing = context.source.startsWith('/>');
  // 自闭合标签消费 2 个字符
  advanceBy(isSelfClosing ? 2 : 1);
  return {
    type: 'Element',
    // 名称
    tag,
    // 属性
    props,
    // 子节点
    children: [],
    // 是否自闭合
    isSelfClosing
  } as Element
}

function parseAttributes(context: Context) {
  const { advanceBy, advanceSpaces } = context;
  const props: any[] = [];
  while(
    !context.source.startsWith('>') &&
    !context.source.startsWith('/>')
  ) {
    // 该正则用于匹配属性名称
    const match = /^[^\t\r\n\f />][^\t\r\n\f />=]*/.exec(context.source) as any[];
    // 得到属性名称
    let name = match[0];
    // 消费属性名称
    advanceBy(name.length);
    // 消费空格
    advanceSpaces();
    // 消费=
    advanceBy(1);
    // 消费空格
    advanceSpaces();

    // 属性值
    let value = '';
    // 获取当前模板内容的第一个字符
    const quote = context.source[0];
    // 判断当前属性值是否被引号引用
    const isQuote = quote === '"' || quote === "'";
    if (isQuote) {
      // 属性值被引号引用，消费引号
      advanceBy(1);
      // 获取下一个引号的索引
      const endQuoteIndex = context.source.indexOf(quote);
      if (endQuoteIndex > -1) {
        // 两个引号之间的内容为属性值
        value = context.source.slice(0, endQuoteIndex);
        // 消费属性值
        advanceBy(value.length);
        // 消费引号
        advanceBy(1);
      } else {
        // 抛出错误
        console.error('缺少引号');
      }
    } else {
      // 属性值没有被引号引用
      // 下一个空格字符前都是属性值
      const match = /^[^\t\r\n\f >]+/.exec(context.source) as any[];
      // 获取属性值
      value = match[0];
      // 消费属性值
      advanceBy(value.length);
    }
    // 消费属性值后的空白节点
    advanceSpaces();
    // 创建一个属性节点，添加到 props 数组中
    if (/^@/.test(name)) {
      name = name.replace('@', 'on');
    }
    if (/^v-on/.test(name)) {
      name = name.replace('v-on:', 'on');
    }
    props.push({
      type: 'Attribute',
      name,
      value
    })
  }
  return props;
}

function parseCDATA(context: Context, ancestors: any) {

}

function parseComment(context: Context) {
  // 消费 <!--
  context.advanceBy('<!--'.length);
  // 找到 结尾索引
  const closeIndex = context.source.indexOf('-->');
  // 注释节点的内容
  const content = context.source.slice(0, closeIndex);
  // 消费内容
  context.advanceBy(content.length);
  // 消费 -->
  context.advanceBy('-->'.length);

  // 返回注释节点
  return {
    type: 'Comment',
    content
  }
}

function parseInterpolation(context: Context) {
  // 消费 {{
  context.advanceBy('{{'.length);
  // 找到 }} 的索引
  const closeIndex = context.source.indexOf('}}');
  if (closeIndex < 0) {
    console.error('缺少}}');
  }
  // 中间内容为插值表达式
  const content = context.source.slice(0, closeIndex);
  // 消费插值表达式
  context.advanceBy(content.length);
  // 消费 }}
  context.advanceBy('}}'.length);

  // 返回类型为 Interpolation 的节点，代表插值节点
  return {
    type: 'Interpolation',
    // 插值节点的 content 是一个类型为 Expression 的表达式节点
    content: {
      type: 'Expression',
      content
    }
  }
}

function parseText(context: Context) {
  // endIndex 作为整个文本内容的结尾索引，默认取整个模板的剩余内容都作为文本内容
  let endIndex = context.source.length;
  // 寻找字符 < 的位置
  const ltIndex = context.source.indexOf('<');
  // {{ 的位置
  const delimiterIndex = context.source.indexOf('{{');
  // 取 ltIndex 和 endIndex 中较小的为新的结尾索引
  if (ltIndex > -1 && ltIndex < endIndex) {
    endIndex = ltIndex;
  }
  // 取 delimiterIndex 和 endIndex 中较小的作为新的结尾索引
  if (delimiterIndex > -1 && delimiterIndex < endIndex) {
    endIndex = delimiterIndex;
  }
  // 截取文本内容
  const content = context.source.slice(0, endIndex);
  // 消费文本内容的字符
  context.advanceBy(content.length);

  // 返回文本节点
  return {
    type: 'Text',
    content
  }
}

export function compiler(templateStr: string) {
  const ast = parse(templateStr)
  transform(ast)
  const code = generate(ast.jsNode);
  return code;
}