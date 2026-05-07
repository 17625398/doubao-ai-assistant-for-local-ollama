import 'vitest'

declare module 'vitest' {
  interface Assertion<T = any> {
    toHaveTextContent(text: string | RegExp): T
    toBeInTheDocument(): T
    toHaveClass(...classNames: string[]): T
  }

  interface AsymmetricMatchersContaining {
    toHaveTextContent(text: string | RegExp): unknown
    toBeInTheDocument(): unknown
    toHaveClass(...classNames: string[]): unknown
  }
}
