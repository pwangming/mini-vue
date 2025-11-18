import { renderer } from "../src/renderer.js";
import { h } from "../src/h.js";
import { beforeEach, describe, it, expect } from "vitest";

describe('renderer', () => {
  let container: HTMLElement;
  beforeEach(() => {
    container = document.createElement('div');
  })

  it('should mount a simple element', () => {
    const vnode = h('div', { id: 'text' }, 'Hello');
    renderer.render(vnode, container);
    
    expect(container.innerHTML).toBe('<div id="text">Hello</div>');
    expect(vnode.el).toBe(container.firstChild);
  })

  it('should update element text', () => {
    const oldVnode = h('div', null, 'old');
    const newVnode = h('div', null, 'new');

    renderer.render(oldVnode, container);
    expect(container.innerHTML).toBe('<div>old</div>');
    renderer.render(newVnode, container);
    expect(container.innerHTML).toBe('<div>new</div>');
  })

  it('should mount nested elements', () => {
    const vnode = h('div', null, [
      h('span', null, 'child1'),
      h('span', null, 'child2')
    ])

    renderer.render(vnode, container);
    expect(container.innerHTML).toBe('<div><span>child1</span><span>child2</span></div>');
  })

  it('should update text node content', () => {
    const oldVnode = h('text', null, 'old');
    const newVnode = h('text', null, 'new');

    renderer.render(oldVnode, container);
    const textNode = container.firstChild!;
    expect(textNode.textContent).toBe('old');

    renderer.render(newVnode, container);
    expect(textNode.textContent).toBe('new'); // 同一个节点，内容被修改
  })

  it('should update element props correctly', () => {
    const oldVnode = h('div', { id: 'old', class: 'a' }, []);
    const newVnode = h('div', { id: 'new', class: 'b', title: 'title' }, []);

    renderer.render(oldVnode, container);
    const el = container.firstChild as HTMLElement;
    expect(el.id).toBe('old');
    expect(el.className).toBe('a');
    expect(el.title).toBe('');

    renderer.render(newVnode, container);
    expect(el.id).toBe('new');
    expect(el.className).toBe('b');
    expect(el.title).toBe('title');
  })

  // 子节点数量不变，仅内容改变
  it('should patch children with same length but different content', () => {
    const oldVnode = h('ul', null, [
      h('li', null, 'a'),
      h('li', null, 'b')
    ]);
    const newVnode = h('ul', null, [
      h('li', null, 'x'), // 内容改变
      h('li', null, 'y')  // 内容改变
    ]);

    renderer.render(oldVnode, container);
    const ul = container.firstChild as HTMLElement;
    const [li1, li2] = ul.children;

    renderer.render(newVnode, container);
    expect(li1.textContent).toBe('x'); // 同一个 li 节点，内容被更新
    expect(li2.textContent).toBe('y');
  });

  // 仅新增子节点
  it('should append new child nodes', () => {
    const oldVnode = h('ul', null, [h('li', null, 'a')]);
    const newVnode = h('ul', null, [
      h('li', null, 'a'),
      h('li', null, 'b') // 新增
    ]);

    renderer.render(oldVnode, container);
    const ul = container.firstChild as HTMLElement;

    renderer.render(newVnode, container);
    expect(ul.children.length).toBe(2);
    expect(ul.children[1].textContent).toBe('b');
  });

  // 删除子节点
  it('should remove deleted child nodes', () => {
    const oldVnode = h('ul', null, [
      h('li', null, 'a'),
      h('li', null, 'b')
    ]);
    const newVnode = h('ul', null, [h('li', null, 'a')]); // 删除 b

    renderer.render(oldVnode, container);
    const ul = container.firstChild as HTMLElement;

    renderer.render(newVnode, container);
    expect(ul.children.length).toBe(1);
    expect(ul.children[0].textContent).toBe('a');
  });
})