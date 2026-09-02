import type { DetailedHTMLProps, HTMLAttributes } from 'react'

/**
 * Altcha ships a custom element rather than a React component, so its tag has
 * to be declared before JSX will accept it.
 */
declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'altcha-widget': DetailedHTMLProps<
        HTMLAttributes<HTMLElement> & {
          challengeurl?: string
          hidefooter?: boolean
          hidelogo?: boolean
        },
        HTMLElement
      >
    }
  }
}
