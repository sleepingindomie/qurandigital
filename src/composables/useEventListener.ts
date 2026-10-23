// Adds a listener now and removes it when the calling component (or effect
// scope) goes away. Returns a function that removes it earlier.
import { getCurrentScope, onScopeDispose } from 'vue'

export function useEventListener<K extends keyof WindowEventMap>(
  target: Window,
  type: K,
  fn: (e: WindowEventMap[K]) => void,
  opts?: AddEventListenerOptions | boolean,
): () => void
export function useEventListener<K extends keyof DocumentEventMap>(
  target: Document,
  type: K,
  fn: (e: DocumentEventMap[K]) => void,
  opts?: AddEventListenerOptions | boolean,
): () => void
export function useEventListener<K extends keyof HTMLElementEventMap>(
  target: HTMLElement,
  type: K,
  fn: (e: HTMLElementEventMap[K]) => void,
  opts?: AddEventListenerOptions | boolean,
): () => void
export function useEventListener(target: EventTarget, type: string, fn: (e: Event) => void, opts?: AddEventListenerOptions | boolean): () => void
export function useEventListener(target: EventTarget, type: string, fn: (e: Event) => void, opts?: AddEventListenerOptions | boolean) {
  target.addEventListener(type, fn, opts)
  let on = true
  const stop = () => {
    if (!on) return
    on = false
    target.removeEventListener(type, fn, opts)
  }
  if (getCurrentScope()) onScopeDispose(stop)
  return stop
}
