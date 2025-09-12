import { tokenize, dump, parse, transform, generate } from '../src/compiler1.js'
import { describe, expect, it, vi } from 'vitest';

describe('compiler', () => {
  it('tokenize test', () => {
    const tokens = tokenize(`<div><p>Vue</p><p>Template</p></div>`);

    expect(tokens).toStrictEqual([
      {type: "tag", name: "div"},          // div 开始标签节点
      {type: "tag", name: "p"},            // p 开始标签节点
      {type: "text", content: "Vue"},      // 文本节点
      {type: "tagEnd", name: "p"},         // p 结束标签节点
      {type: "tag", name: "p"},            // p 开始标签节点
      {type: "text", content: "Template"}, // 文本节点
      {type: "tagEnd", name: "p"},         // p 结束标签节点
      {type: "tagEnd", name: "div"}        // div 结束标签节点
    ]);
  });

  it('dump test', () => {
    // 设置监听
    const spy = vi.spyOn(console, 'log');
    const ast = parse(`<div><p>Vue</p><p>Template</p></div>`)
    dump(ast)
    expect(spy).toHaveBeenCalledWith('Root: ')
    expect(spy).toHaveBeenCalledWith('--Element: div')
    expect(spy).toHaveBeenCalledWith('----Element: p')
    expect(spy).toHaveBeenCalledWith('------Text: Vue')
    expect(spy).toHaveBeenCalledWith('----Element: p')
    expect(spy).toHaveBeenCalledWith('------Text: Template')
  })

  // it('transform test', () => {
  //   const spy = vi.spyOn(console, 'log');
  //   const ast = parse(`<div><p>Vue</p><p>Template</p></div>`)
  //   transform(ast);
  //   dump(ast);
  //   expect(spy).toHaveBeenCalledWith('Root: ')
  //   expect(spy).toHaveBeenCalledWith('--Element: div')
  //   expect(spy).toHaveBeenCalledWith('----Element: h1')
  //   expect(spy).toHaveBeenCalledWith('------Element: span')
  //   expect(spy).toHaveBeenCalledWith('----Element: h1')
  //   expect(spy).toHaveBeenCalledWith('------Element: span')

  //   // 清理监听
  //   spy.mockRestore();
  // })

  it('generate test', () => {
    const ast = parse(`<div><p>Vue</p><p>Template</p></div>`)
    transform(ast)
    const code = generate(ast.jsNode);
    expect(code).toBe(
`function render (){
  return h('div', [h('p', 'Vue'), h('p', 'Template')])
}`)
  })
})