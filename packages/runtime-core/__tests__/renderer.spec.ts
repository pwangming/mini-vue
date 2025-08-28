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
})