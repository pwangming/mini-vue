import { ref } from '../src/ref.js';
import { effect } from '../src/effect.js';
import { computed } from '../src/computed.js'
import { describe, expect, it, vi } from 'vitest';

describe('compute test', () => {
  it('computed', () => {
    const author = ref({
      name: 'John Doe',
      books: ['Vue 2 - Advanced Guide', 'Vue 3 - Basic Guide', 'Vue 4 - The Mystery']
    })
    const publishedBooksMessage = computed(() => {
      return author.value.books.length > 0 ? 'Yes' : 'No';
    })

    expect(publishedBooksMessage.value).toBe('Yes');
    author.value.books = [];
    expect(publishedBooksMessage.value).toBe('No');
  })

  it('computed lazy', () => {
    const value = ref<{ foo?: number }>({})
    const getter = vi.fn(() => value.value.foo);
    const cValue = computed(getter);

    expect(getter).not.toHaveBeenCalled();

    expect(cValue.value).toBe(undefined)
    expect(getter).toHaveBeenCalledTimes(1)

    // should not compute again
    cValue.value
    expect(getter).toHaveBeenCalledTimes(1)

    // should not compute until needed
    value.value.foo = 1
    expect(getter).toHaveBeenCalledTimes(1)

    // now it should compute
    expect(cValue.value).toBe(1)
    expect(getter).toHaveBeenCalledTimes(2)

    // should not compute again
    cValue.value
    expect(getter).toHaveBeenCalledTimes(2)
  })

})