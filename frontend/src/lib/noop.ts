/** For v1 placeholder links (`href="#"`): keep the look, don't navigate. */
export const noop = (e: { preventDefault(): void }): void => e.preventDefault()
