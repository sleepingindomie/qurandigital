// Props shared by the ui components.
import type { StyleValue } from 'vue'

/** An option of UiRadioGroup when a pair [value, text] is not enough. */
export interface RadioOption<T> {
  value: T
  text: string
  lang?: string
  ariaLabel?: string
  style?: StyleValue
}
