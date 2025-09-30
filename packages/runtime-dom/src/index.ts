import { renderer } from '@mini-vue/runtime-core';

export const createApp = (...args: []) => {
  return renderer.createApp(...args);
};