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

export { parse } from './compiler.js'