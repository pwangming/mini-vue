import { parse } from '../src/compiler.js'
import { transform } from '../src/transform.js';
import { generate } from '../src/generate.js';
import { describe, expect, it, vi } from 'vitest';

describe('compiler test', () => {
  it('test', () => {
    const nodes = parse('<div id="foo" v-show="display"><p>foo</p><span>{{ bar }}</span><!-- <p></p> --></div>');
    // const ast = parse(`<div>foo {{ bar }} baz</div>`)
    // console.log(nodes);
  });

  it('parse、transform、generate test', () => {
    const ast = parse('<div id="foo" v-show="display"><p>foo</p><span>{{ bar }}</span><!-- <p></p> --></div>');
    transform(ast);
    console.log(ast.jsNode, '1111111111111');
    const code = generate(ast.jsNode);
    console.log(code);
  })

//   it('generate test', () => {
//     const ast = parse(`<div><p>Vue</p><p>Template</p></div>`)
//     transform(ast)
//     const code = generate(ast.jsNode);
//     console.log(code);
//     expect(code).toBe(
// `function render (){
//   return h('div', [h('p', 'Vue'), h('p', 'Template')])
// }`)
//   })
})