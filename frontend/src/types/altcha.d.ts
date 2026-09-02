/**
 * Altcha ships its own JSX typings for the custom element. Use theirs rather
 * than hand-writing a declaration: a local guess is what let `challengeurl`
 * (the v1/v2 attribute name, still shown in the Laravel package's README) sit
 * in the markup unnoticed while v3 silently ignored it.
 */
import 'altcha/types/react'
