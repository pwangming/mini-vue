// Transition 的核心原理是：
// ● 当 DOM 元素被挂载时，将动效附加到该 DOM 元素上；
// ● 当 DOM 元素被卸载时，不要立即卸载 DOM 元素，而是等到附加到该 DOM 元素上的动效执行完成后再卸载它。

// 01 <template>
// 02   <Transition>
// 03     <div>我是需要过渡的元素</div>
// 04   </Transition>
// 05 </template>

// 将这段模板被编译后的虚拟 DOM 设计为：

// 01 function render() {
// 02   return {
// 03     type: Transition,
// 04     children: {
// 05       default() {
// 06         return { type: 'div', children: '我是需要过渡的元素' }
// 07       }
// 08     }
// 09   }
// 10 }

// ● Transition 组件本身不会渲染任何额外的内容，它只是通过默认插槽读取过渡元素，并渲染需要过渡的元素；
// ● Transition 组件的作用，就是在过渡元素的虚拟节点上添加 transition 相关的钩子函数。
export const Transition = {
  name: 'Transiton',
  setup(props: any, { slots }: any) {
    return () => {
      // 通过默认插槽获取过渡的元素
      const innerVNode = slots.default();
      // 在过渡元素的 VNode 上添加 transition 相应的钩子函数
      innerVNode.transition = {
        beforeEnter(el: any) {
          // 设置初始状态
          el.classList.add('enter-from');
          el.classList.add('enter-active');
        },
        enter(el: any) {
          // 下一帧切换到结束状态
          nextFrame(() => {
            el.classList.remove('enter-from');
            el.classList.add('enter-to');
            // 监听 transitionend 事件完成收尾
            el.addEventListener('transitionend', () => {
              el.classList.remove('enter-to');
              el.classList.remove('enter-active');
            })
          })
        },
        leave(el: any, performRemove: any) {
          el.classList.add('leave-from');
          el.classList.add('leave-active');
          // 强制 reflow ，使得初始状态生效
          document.body.offsetHeight;
          nextFrame(() => {
            el.classList.remove('leave-from');
            el.classList.add('leave-to');
            el.addEventListener('transitionend', () => {
              el.classList.remove('leave-to');
              el.classList.remove('leave-active');
              // 完成 dom 元素的卸载
              performRemove();
            })
          })
        }
      }
      return innerVNode;
    }
  }
}

// 在上面的实现中，我们硬编码了过渡状态的类名，例如 enter-from、enter-to 等。
// 实际上，我们可以轻松地通过 props 来实现允许用户自定义类名的能力，从而实现一个更加灵活的 Transition 组件。
// 另外，我们也没有实现“模式”的概念，即先进后出（in-out）或后进先出（out-in）​。
// 实际上，模式的概念只是增加了对节点过渡时机的控制，
// 原理上与将卸载动作封装到 performRemove 函数中一样，只需要在具体的时机以回调的形式将控制权交接出去即可。


// 可以看到，我们使用 requestAnimationFrame 注册了一个回调函数，该回调函数理论上会在下一帧执行。
// 这样，浏览器就会在当前帧绘制元素的初始状态，然后在下一帧切换元素的状态，从而使得过渡生效。
// 但如果你尝试在 Chrome 或 Safari 浏览器中运行上面这段代码，会发现过渡仍未生效，这是为什么呢？实际上，这是浏览器的实现bug 所致。
// 该 bug 的具体描述参见 Issue 675795: Interop: mismatch in when animations are started between different browsers。
// 其大意是，使用requestAnimationFrame 函数注册回调会在当前帧执行，除非其他代码已经调用了一次 requestAnimationFrame 函数。
// 这明显是不正确的，因此我们需要一个变通方案，如下面的代码所示：
function nextFrame(func: Function) {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      func();
    });
  })
}