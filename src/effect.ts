let targetMap = new WeakMap();
let activeEffect:any = null;

export function effect(fn: any) {
  activeEffect = fn;
  activeEffect();
  activeEffect = null;
}

export function track(target: object, key: string): void {
  if (!activeEffect) return;
  let depsMap = targetMap.get(target);
  if (!depsMap) {
    depsMap = new Map();
    targetMap.set(target, depsMap)
  }
  let dep = depsMap.get(key)
  if (!dep) {
    dep = new Set();
    depsMap.set(key, dep);
  }
  dep.add(activeEffect);
}

export function trigger(target: object, key: string): void {
  const depsMap = targetMap.get(target);
  if (!depsMap) return;
  const deps = depsMap.get(key);
  if (deps) {
    deps.forEach((fn: any) => {
      fn();
    });
  }
}