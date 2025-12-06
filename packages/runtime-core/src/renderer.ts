import { reactive, effect } from '@mini-vue/reactivity'
import { queueJob } from './scheduler.js';
import { createAppAPI } from './apiCreateApp.js';
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
    // console.log('el', el, key, prevValue, nextValue);
    // 以 on 开头的都是事件
    if (/^on/.test(key)) {
      // 定义 el._vei 为一个对象，事件名称到事件处理函数的映射
      const invokers = el._vei || (el._vei = {})
      // 获取该元素伪造的事件处理函数 invoker
      let invoker = invokers[key];
      // 根据属性名获取对应的事件名称
      const name = key.slice(2).toLowerCase();
      if (nextValue) {
        if (!invoker) {
          // 如果没有 invoker 则将一个伪造的 invoker 缓存到 el._vei[key] 中, 避免覆盖
          // vei 是 vue event invoker 的缩写
          invoker = el._vei[key] = (e: any) => {
            // e.timeStamp 是事件发生的时间
            // 如果事件发生的事件早于事件处理函数绑定的事件则不执行事件处理函数
            if (e.timeStamp  < invoker.attached) return
            // 如果是数组，循环调用每个事件处理函数
            if (Array.isArray(invoker.value)) {
              invoker.value.forEach((fn: any) => fn(e));
            } else {
              // 直接作为函数调用
              // 当伪造的事件处理函数执行时，会执行真正的事件处理函数
              invoker.value(e);
            }
          }
          // 将真正的事件函数赋值给 invoker.value
          invoker.value = nextValue;
          // 添加 invoker.attached 属性，存储事件处理函数被绑定的时间
          invoker.attached = performance.now();
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
    // console.log('render', vnode)
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
    // console.log('type', type);
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
        // console.log(22222);
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
        // n1.children.forEach((c: any) => unmount(c));
        // n2.children.forEach((c: any) => patch(null, c, container, anchor));
        // 2、diff 算法 分为 3 种 1、简单 diff 算法、2、双端 diff 算法、3、快速 diff 算法
        const oldChildren = n1.children;
        const newChildren = n2.children;

        let lastIndex = 0;
        for(let i = 0; i < newChildren.length; i++) {
          const newVnode = newChildren[i];
          let j = 0;
          // 在第一层循环中定义变量 find，代表是否在旧的一组字节点中找到可复用的节点
          // 初始值为 false 代表没有找到
          let find = false;
          for(j; j < oldChildren.length; j++) {
            const oldVnode = oldChildren[j];
            // 如果找到了具有相同 key 值的两个节点，说明可以复用，但仍然需要调用 patch 函数更新
            if (newVnode.key === oldVnode.key) {
              // 一旦找到可复用的节点，将变量 find 的值设为 true
              find = true;
              patch(oldVnode, newVnode, container);
              if (j < lastIndex) {
                // 如果当前找到的节点在旧 children 中的索引小于最大索引值 lastIndex；
                // 说明该节点对应的真实 dom 需要移动
                // 先获取 newVNode 的前一个 vnode 即 prevVNode
                const prevVnode = newChildren[i - 1];
                // 如果 prevVNode 不存在，则说明当前 newVNode 是第一个节点，它不需要移动
                if (prevVnode) {
                  // 由于我们要将 newVNode 对应的真实 DOM 移动到 prevVNode 所对应的真实 DOM 后面，
                  // 所以我们要获取 prevVNode 所对应真实 DOM 的下一个兄弟节点，并将其作为锚点
                  const anchor = prevVnode.el.nextSibling;
                  // 调用 insert 方法将 newVNode 对应的真实 DOM 插入到锚点元素前面
                  // 也就是 prevVNode 对应的真实 DOM 的后面
                  insert(newVnode.el, container, anchor);
                }
              } else {
                // 如果当前找到的节点在旧 children 中的索引不小于最大索引值，
                // 则更新 lastIndex 的值
                lastIndex = j;
              }
              break;
            }
          }
          // 如果代码运行到这里，find 任然为 false
          // 说明当前 newVNode 没有在旧的一组字节点中找到可复用的节点
          // 也就是说，当前 newVNode 是新增节点，需要挂载
          if(!find) {
            // 为了将节点挂在到正确的位置，我们需要获取锚点元素
            // 获取当前 newVNode 的前一个 vnode 节点
            const prevVNode = newChildren[i - 1];
            let anchor = null;
            if (prevVNode) {
              // 如果有前一个 vnode 节点，则使用它的下一个兄弟节点作为锚点元素
              anchor = prevVNode.el.nextSibling
            } else {
              // 如果没有前一个 vnode 节点，则说明即将挂载的新节点是第一个字节点
              // 这时我们使用容器元素的 firstChild 作为锚点
              anchor = container.firstChild
            }
            patch(null, newVnode, container, anchor);
          }
        }

        for(let i = 0; i < oldChildren.length; i++) {
          // 拿旧字节点 oldVNode 去新的一组子节点中寻找具有相同 key 值的节点
          const oldVNode = oldChildren[i];
          const has = newChildren.find(
            (vnode: any) => vnode.key === oldVNode.key
          )
          if (!has) {
            // 如果没有找到具有相同 key 值的节点，则说明需要删除该节点
            unmount(oldVNode);
          }
        }

        // 这是没有进行 DOM 复用，性能很差
        // // 旧的一组子节点长度
        // const oldLen = oldChildren.length;
        // // 新的一组子节点长度
        // const newLen = newChildren.length;

        // // 公共长度，既两者中较短的一组子节点长度
        // const commonLength = Math.min(oldLen, newLen);
        // // 循环公共长度，进行节点更新
        // for(let i = 0; i < commonLength; i++) {
        //   patch(oldChildren[i], newChildren[i], container);
        // }
        // // 如果 newLen > oldLen 说明有新节点要挂载
        // if (newLen > oldLen) {
        //   for(let i = commonLength; i < newLen; i++) {
        //     patch(null, newChildren[i], container);
        //   }
        // // 如果 oldLen > newLen 说明有旧节点要卸载
        // } else if (oldLen > newLen) {
        //   for(let i = commonLength; i < oldLen; i++) {
        //     unmount(oldChildren[i]);
        //   }
        // }
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
    let { render, data, setup, props: propsOptions,
      beforeCreated, created, beforeMount, mounted, beforeUpdate, updated } = componentOptions;
    // 这里调用 beforeCreated 钩子
    beforeCreated && beforeCreated();

    const state = data ? reactive(data()) : null;

    const [props, attrs] = resolveProps(propsOptions, vnode.props);
    // 组件实例本质上就是一个状态集合（或一个对象）​，它维护着组件运行过程中的所有信息，
    // 例如注册到组件的生命周期函数、组件渲染的子树（subTree）​、组件是否已经被挂载、组件自身的状态（data）​，等等。
    // 为了解决关于组件更新的问题，我们需要引入组件实例的概念，以及与之相关的状态信息
    const instance = {
      // 组件自身状态数据
      state, 
      // 将 props 包装为 shallowReactive 并定义到组件实例上
      // props: shallowReactive(props),
      props: props,
      // 一个布尔值，表示组件是否已被挂载，初始值为 false
      isMounted: false,
      // 组件所渲染的内容，即子树 subTree
      subTree: null
    }

    // setupContext, 还可以有 emit 和 slots
    const setupContext = { attrs };
    // 调用 setup 函数，将只读版本的 props 作为第一个参数，避免用户修改 props ，将 setupContext 作为第二个参数传递
    // const setupResult = setup(shallowReactive(instance.props), setupContext);
    const setupResult = setup(instance.props, setupContext);
    // 用来存储 setup 的返回值
    let setupState = null;
    // 如果 setup 函数返回的是函数，则视为渲染函数
    if (typeof setupResult === 'function') {
      // 报告冲突
      if (render) console.error('setup 函数返回渲染函数，render选项被忽略');
      // 将 setupResult 作为渲染函数
      render = setupResult;
    } else {
      // 如果返回值不是函数，则作为数据状态赋值给 setupState
      setupState = setupResult;
    }

    vnode.component = instance;
    // 由于 props 数据与组件自身的状态数据都需要暴露到渲染函数中，
    // 并使得渲染函数能够通过 this 访问它们，因此我们需要封装一个渲染上下文对象，
    // 创建渲染上下文对象，本质时组件的实例的代理
    const renderContext = new Proxy(instance, {
      get(t, k, r) {
        // 取得组件的自身状态和 props
        const { state, props } = t;
        if (state && k in state ) {
          return state[k];
        } else if (k in props) {
          return props[k];
        } else if (setupState && k in setupState) {
          return setupState[k];
        } else {
          console.error('不存在');
        }
      },
      set(t, k, v, r) {
        const { state, props } = t;
        if (state && k in state) {
          state[k] = v;
        } else if (k in props) {
          console.warn(`Attempting to mutate prop "${String(k)}". Props are readonly`);
        } else if (setupState && k in setupState) {
          setupState[k] = v;
        } else {
          console.error('不存在');
        }
        return true;
      }
    })

    // 这里调用 created 钩子
    created && created.call(renderContext);

    // 执行渲染函数，获取组件的渲染内容，即 render 函数返回的虚拟 DOM.
    // 调用 render 函数时，将 this 设置为 state，从而可以在 render 函数内部使用 this 访问组件自身状态数据
    // 当组件自身状态发生变化时，我们需要有能力触发组件更新，即组件的自更新。
    // 为此，我们需要将整个渲染任务包装到一个 effect 中
    effect(() => {
      const subTree = render.call(renderContext, renderContext);
      // 检查组件是否被挂载
      if (!instance.isMounted) {
        // 这里调用 beforeMounted 钩子
        beforeMount && beforeMount.call(renderContext);
        // 初次挂载，调用 patch 函数 第一个参数传 null 渲染组件
        patch(null, subTree, container, anchor);
        // 将组件的 isMounted 设置为 true，后续就直接更新组件
        instance.isMounted = true;
        // 这里调用 mounted 钩子
        mounted && mounted.call(renderContext);
      } else {
        // 这里调用 beforeUpdate 钩子
        beforeUpdate && beforeUpdate.call(renderContext);
        // 更新组件，第一个参数为组件上一次渲染的子树
        patch(instance.subTree, subTree, container, anchor);
        // 这里调用 updated 钩子
        updated && updated.call(renderContext);
      }
      // 更新组件实例的子树
      instance.subTree = subTree
    }, {
      scheduler: queueJob
    })
  }

  function resolveProps(options: any, propsData: any) {
    const props: any = {};
    const attrs: any = {};
    // 遍历组件传递的 props
    for (const key in propsData) {
      if (key in options) {
        // 如果组件传递的 props 数据在组件自身的 props 中有定义，则视为合法 props
        props[key] = propsData[key];
      } else {
        // 否则将其作为 attrs
        attrs[key] = propsData[key];
      }
    }
    return [ props, attrs ];
  }
  // 上面是组件被动更新的最小实现，有两点需要注意：
  // ● 需要将组件实例添加到新的组件 vnode 对象上，即 n2.component =n1.component，否则下次更新时将无法取得组件实例；
  // ● instance.props 对象本身是浅响应的（即 shallowReactive）​。因此，在更新组件的 props 时，只需要设置 instance.props 对象下的属性值即可触发组件重新渲染。
  // 在上面的实现中，我们没有处理 attrs 与 slots 的更新。attrs 的更新本质上与更新props 的原理相似。而对于 slots，我们会在后续章节中讲解。实际上，要完善地实现Vue.js 中的 props 机制，需要编写大量边界代码。
  // 但本质上来说，其原理都是根据组件的 props 选项定义以及为组件传递的 props 数据来处理的。
  function patchComponent(n1: any, n2: any, anchor: any) {
    // 获取组件实例 n1.component，同时让新的组件的虚拟节点 n2.component 也指向组件实例 
    const instance = (n2.component = n1.component);
    // 获取当前 props
    const { props } = instance;
    // 调用 hasPropsChanged 函数检测为子组件传递的 props 是否发生改变，如果没变化不需要更新
    if (hasPropsChanged(n1.props, n2.props)) {
      // 调用 resolveProps 重新获取 props
      const [ nextProps ] = resolveProps(n1.props, n2.props);
      // 更新 props
      for(const k in nextProps) {
        props[k] = nextProps[k];
      }
      // 删除不存在的 props
      for(const k in props) {
        if (!(k in nextProps)) delete props[k];
      }
    }
  }

  function hasPropsChanged(prevProps: any, nextProps: any) {
    const nextKeys = Object.keys(nextProps);
    // 如果新旧 props 的数量变了，说明有变化
    if (nextKeys.length !== Object.keys(prevProps).length) {
      return true;
    }
    for(let i = 0; i < nextKeys.length; i++) {
      const key = nextKeys[i];
      // 有不相等的 porps 说明有变化
      if (nextProps[key] !== prevProps[key]) return true
    }
    return false;
  }

  return {
    render,
    patch,
    hydrate,
    createApp: createAppAPI(render),
  }
}
