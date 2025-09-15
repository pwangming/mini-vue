import { parse } from '../src/compiler.js'
import { transform } from '../src/transform.js';
import { generate } from '../src/generate.js';
import { describe, expect, it, vi } from 'vitest';

describe('compiler test', () => {
  it('generate test', () => {
    const ast = parse(`<div><p>Vue</p><p>Template</p></div>`)
    transform(ast)
    const code = generate(ast.jsNode);
    expect(code).toBe(
`function render (){
  return h('div', null, [h('p', null, 'Vue'), h('p', null, 'Template')])
}`)
  })
  it('parse、transform、generate test', () => {
    const ast = parse('<div id="foo" v-show="display"><p>foo</p><span>{{ bar }}</span><!-- <p></p> --></div>');
    console.log(ast)
    transform(ast);
    console.log(JSON.stringify(ast.jsNode))
    const code = generate(ast.jsNode);
    console.log(code);
  })

  it('generate test', () => {
    const ast = parse(`<p class="message" @click="changeMessage">{{ message }}</p>`)
    transform(ast)
    const code = generate(ast.jsNode);
    console.log(code);
  })
})