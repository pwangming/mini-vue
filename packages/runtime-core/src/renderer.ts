import { reactive, effect } from '@mini-vue/reactivity'
import { queueJob } from './scheduler.js';
// 通过传入一个对象，可以实现自定义渲染器，不依赖于特定的浏览器API
export const renderer = createRenderer({
  createElement(tag: string) {
    return document.createElement(tag);
  },
  setElementText(el: any, text: string) {
    el.textContent = text;
  },
  insert(el: any, parent: any, anchor = null) {
    parent.insertBefore(el, anchor)
  },
  createText(text: string) {
    return document.createTextNode(text);
  },
  setText(el: any, text: string) {
    el.nodeValue = text;
  },

  // 将属性设置相关操作封装到 patchProps 函数中，并作为渲染器选项传递
  patchProps(el: any, key: string, prevValue: any, nextValue: any) {
    // 以 on 开头的都是事件
    if (/^on/.test(key)) {
      // 获取该元素伪造的事件处理函数 invoker
      let invoker = el._vei;
      // 根据属性名获取对应的事件名称
      const name = key.slice(2).toLowerCase();
      if (nextValue) {
        if (!invoker) {
          // 如果没有 invoker 则将一个伪造的 invoker 缓存到 el.vei 中
          // vei 是 vue event invoker 的缩写
          invoker = el.vei = (e: any) => {
            // 当伪造的事件处理函数执行时，会执行真正的事件处理函数
            invoker.value(e);
          }
          // 将真正的事件函数赋值给 invoker.value
          invoker.value = nextValue;
          // 绑定 invoker 函数作为事件处理函数
          el.addEventListener(name, invoker);
        } else {
          // 如果 invoker 存在，则意味着更新，只需更新 invoker.value 的值即可
          invoker.value = nextValue;
        }
      } else if (invoker) {
        // 新的事件绑定函数不存在，且之前绑定的 invoker 存在，则移除绑定
        el.removeEventListener(name, invoker);
      }
    } else if (key === 'class') {
      // el.className、setAttribute 和 el.classList 的性能比较 el.className 性能最优
      el.className = nextValue || '';
    } else if (shouldSetAsProps(el, key, nextValue)) { // 使用 shouldSetAsProps 函数来判断是否用 Dom Properties 设置
      const type = typeof el[key];
      const value = nextValue;
      // 如果是布尔类型并且值为空，则矫正值为true.
      // 为什么要矫正 eg: disabled
      if (type === 'boolean' && value === '') {
        el[key] = true;
      } else {
        el[key] = value;
      }
    } else {
      // 如果没有对应的 Dom Properties 则使用 setAttributes 函数设置属性
      el.setAttributes(key, nextValue);
    }
  }

})

// 有一些 DOM Properties 是只读的
function shouldSetAsProps(el: any, key: string, value: any) {
  // 特殊处理，还有很多
  if (key === 'form' && el.tagName === 'INPUT') return false
  // 兜底, 用 in 操作符判断 key 是否存在于对应的 Dom Properties
  return key in el
}

// 自定义渲染器，可以在 node.js 中执行，打印 console.log
// const renderer2 = createRenderer({
//   createElement(tag: string) {
//     console.log(`创建元素 ${tag}`)
//     return { tag }
//   },
//   setElementText(el: any, text: string) {
//     console.log(`设置 ${JSON.stringify(el)} 的文本内容：${text}`)
//     el.textContent = text
//   },
//   insert(el: any, parent: any, anchor = null) {
//     console.log(`将 ${JSON.stringify(el)} 添加到 ${JSON.stringify(parent)} 下`)
//     parent.children = el
//   }
// })

// 创建渲染器
export function createRenderer(options: any) {
  const { createElement, setElementText, insert, createText, setText, patchProps } = options;
  // 渲染函数
  function render(vnode: any, container: any) {
    if (vnode) {
      // 挂载或更新
      patch(container._vnode, vnode, container)
    } else {
      if (container._vnode) {
        unmount(container._vnode)
      }
    }

    container._vnode = vnode;
  }

  // 服务端渲染
  function hydrate(vnode: any, container: any) {
    // 同构渲染
  }

  // 文本节点的 type 标识
  const Text = Symbol()
  const textVNode = {
    // 描述文本节点
    type: Text,
    children: '我是文本内容'
  }

  // 注释节点的 type 标识
  const Comment = Symbol()
  const commentVNode = {
    // 描述注释节点
    type: Comment,
    children: '我是注释内容'
  }

  // Vue.js 3 支持多根节点模板，所以不存在上述问题。那么，Vue.js 3 是如何用 vnode 来描述多根节点模板的呢？
  // 答案是，使用 Fragment，
  const Fragment = Symbol()
  const fragmentVnode = {
    type: Fragment,
    children: [
      { type: 'li', children: 'text 1' },
      { type: 'li', children: 'text 2' },
      { type: 'li', children: 'text 3' }
    ]
  }
  function patch(n1: any, n2: any, container: any, anchor: any = null) {
    // 必须要两个 vnode 的 type 相同才可以更新 eg：同时是 span 才可以更新，一个 div 一个 span 直接卸载旧的，挂载新的
    if (n1 && n1.type !== n2.type) {
      unmount(n1);
      // 只有 n1 重置为 null ，才可以挂载新的
      n1 = null;
    }

    const { type } = n2;
    if (typeof type === 'string') {
      if (!n1) {
        // 旧的不存在，意味着是挂载
        mountElement(n2, container, anchor);
      } else {
        // 更新
        patchElement(n1, n2, anchor);
      }
    } else if (type === 'Text') {
      // 新 vnode 的类型是 Text, 说明该 vnode 描述的是文本节点
      if (!n1) {
        const el = n2.el = createText(n2.children);
        insert(el, container);
      } else {
        // 旧的存在就用新的文本节点的内容替换旧的内容
        const el = n2.el = n1.el;
        if (n2.children !== n1.children) {
          setText(el, n2.children);
        }
      }
    } else if (type === 'Fragment') {
      if (!n1) {
        // 旧的 vonde 不存在，逐个挂载新的
        n2.children.forEach((c: any) => patch(null, c, container, anchor));
      } else {
        // 旧的存在，更新
        patchChildren(n1, n2, container, anchor);
      }
    } else if (typeof type === 'object') {
      // 是 object，描述的是组件
      if(!n1) {
        // 挂载组件
        mountComponent(n2, container, anchor);
      } else {
        // 更新组件
        patchComponent(n1, n2, anchor);
      }
    } else {
      // 其它
    }
  }

  function mountElement(vnode: any, container: any, anchor: any) {
    const el = vnode.el = createElement(vnode.type);

    if (typeof vnode.children === 'string') {
      // 代表文本节点
      setElementText(el, vnode.children);
    } else if (Array.isArray(vnode.children)) {
      // 不是文本节点，是一个数组，递归处理
      vnode.children.forEach((child: any) => {
        patch(null, child, el, anchor);
      })
    }

    // 处理属性, 属性这里很复杂。HTML Attributes 与 DOM Properties 都存在缺陷。
    // HTML Attributes class="foo" 对应的 DOM Properties 则是 el.className。
    // <div aria-valuenow="75"></div>
    // aria-* 类的 HTML Attributes 就没有与之对应的 DOM Properties。
    // 也不是所有 DOM Properties 都有与之对应的 HTML Attributes，例如可以用el.textContent 来设置元素的文本内容，但并没有与之对应的 HTML Attributes 来完成同样的工作。
    // 两者的关系核心原则：HTML Attributes 的作用是设置与之对应的 DOM Properties 的初始值。
    if (vnode.props) {
      for (const key in vnode.props) {
        patchProps(el, key, null, vnode.props[key]);
      }
    }
    // 挂载
    insert(el, container);
  }

  function patchElement(n1: any, n2: any, anchor: any) {
    const el = n2.el = n1.el;
    const oldProps = n1.props;
    const newProps = n2.props;
    // 第一步 更新props
    for (const key in newProps) {
      if (newProps[key] !== oldProps[key]) {
        patchProps(el, key, oldProps[key], newProps[key]);
      }
    }
    for(const key in oldProps) {
      if (!(key in newProps)) {
        patchProps(el, key, oldProps[key], null);
      }
    }

    // 第二步 更新children
    patchChildren(n1, n2, el, anchor);
  }

  function patchChildren(n1: any, n2: any, container: any, anchor: any) {
    // 判断新子节点是否是文本节点
    if (typeof n2.children === 'string') {
      // 旧节点有3种情况：没有子节点，文本节点，一组子节点

      // 只有是一组子节点时需要逐个卸载，其它情况不需处理
      if (Array.isArray(n1.children)) {
        n1.children.forEach((c: any) => unmount(c) );
      }

      // 设置文本节点
      setElementText(container, n2.children);
      // 判断新节点时一组节点
    } else if (Array.isArray(n2.children)) {
      // 判断旧节点是否是一组节点
      if (Array.isArray(n1.children)) {
        // 1、粗暴做法 卸载所有旧的子节点，挂载所有新的子节点
        n1.children.forEach((c: any) => unmount(c));
        n2.children.forEach((c: any) => patch(null, c, container, anchor));
        // 2、diff 算法
      } else {
        // 旧节点要么是文本节点要么没有
        // 都要清空容器，挂载新的节点
        setElementText(container, '');
        n2.children.forEach((c: any) => patch(null, c, container, anchor));
      }
    } else {
      // 新子节点不存在
      // 一组旧节点，卸载
      if (Array.isArray(n1.children)) {
        n1.children.forEach((c: any) => unmount(c));
      } else if ( typeof n1.children === 'string') {
        setElementText(container, '');
      }

    }
  }

  function unmount(vnode: any) {
    // 卸载时也需要判断，逐个卸载 children
    if (vnode.type === 'Fragment') {
      vnode.children.forEach((c: any) => unmount(c));
      return;
    }
    const parent = vnode.el.parentNode;
    if (parent) {
      parent.removeChild(vnode.el);
    }
  }

  // const MyComponent = {
  //   name: 'MyComponent',
  //   // 用 data 函数来定义组件自身的状态
  //   data() {
  //     return {
  //       foo: 'hello world'
  //     }
  //   },
  //   render() {
  //     return {
  //       type: 'div',
  //       children: `foo 的值是: ${this.foo}` // 在渲染函数内使用组件状态
  //     }
  //   }
  // }

 // 用来描述组件的 VNode 对象，type 属性值为组件的选项对象
  // const CompVNode = {
  //   type: MyComponent
  // }
  // // 调用渲染器来渲染组件
  // renderer.render(CompVNode, document.querySelector('#app'))
  function mountComponent(vnode: any, container: any, anchor: any) {
    // 通过 vnode.type 获取组件的选项对象
    const componentOptions = vnode.type;
    // 获取组件的渲染函数
    const { render, data, beforeCreated, created, beforeMount, mounted, beforeUpdate, updated } = componentOptions;
    // 这里调用 beforeCreated 钩子
    beforeCreated && beforeCreated();

    const state = reactive(data());
    // 组件实例本质上就是一个状态集合（或一个对象）​，它维护着组件运行过程中的所有信息，
    // 例如注册到组件的生命周期函数、组件渲染的子树（subTree）​、组件是否已经被挂载、组件自身的状态（data）​，等等。
    // 为了解决关于组件更新的问题，我们需要引入组件实例的概念，以及与之相关的状态信息
    const instance = {
      // 组件自身状态数据
      state, 
      // 一个布尔值，表示组件是否已被挂载，初始值为 false
      isMounted: false,
      // 组件所渲染的内容，即子树 subTree
      subTree: null
    }

    vnode.component = instance;

    // 这里调用 created 钩子
    created && created.call(state);

    // 执行渲染函数，获取组件的渲染内容，即 render 函数返回的虚拟 DOM.
    // 调用 render 函数时，将 this 设置为 state，从而可以在 render 函数内部使用 this 访问组件自身状态数据
    // 当组件自身状态发生变化时，我们需要有能力触发组件更新，即组件的自更新。
    // 为此，我们需要将整个渲染任务包装到一个 effect 中
    effect(() => {
      const subTree = render.call(state, state);
      // 检查组件是否被挂载
      if (!instance.isMounted) {
        // 这里调用 beforeMounted 钩子
        beforeMount && beforeMount.call(state);
        // 初次挂载，调用 patch 函数 第一个参数传 null 渲染组件
        patch(null, subTree, container, anchor);
        // 将组件的 isMounted 设置为 true，后续就直接更新组件
        instance.isMounted = true;
        // 这里调用 mounted 钩子
        mounted && mounted.call(state);
      } else {
        // 这里调用 beforeUpdate 钩子
        beforeUpdate && beforeUpdate.call(state);
        // 更新组件，第一个参数为组件上一次渲染的子树
        patch(instance.subTree, subTree, container, anchor);
        // 这里调用 updated 钩子
        updated && updated.call(state);
      }
      // 更新组件实例的子树
      instance.subTree = subTree
    }, {
      scheduler: queueJob
    })
  }

  function patchComponent(n1: any, n2: any, anchor: any) {

  }

  return {
    render,
    patch,
    hydrate
  }
}