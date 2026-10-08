export const closeOpenSelectPortals = (root: ParentNode | null = typeof document !== 'undefined' ? document : null): void => {
  if (!root || typeof root.querySelectorAll !== 'function') {
    return
  }

  root
    .querySelectorAll<HTMLElement>(
      '[data-slot="select-trigger"][aria-expanded="true"]'
    )
    .forEach((trigger) => trigger.click())

  root
    .querySelectorAll<HTMLElement>(
      '[data-base-ui-portal-closed="true"]'
    )
    .forEach((portal) => {
      portal.removeAttribute('data-base-ui-portal-closed')
      portal.style.removeProperty('pointer-events')
      portal.style.removeProperty('display')

      portal
        .querySelectorAll<HTMLElement>('[role="listbox"], [role="option"]')
        .forEach((item) => {
          item.removeAttribute('aria-hidden')
          item.style.removeProperty('pointer-events')
          item.style.removeProperty('display')
        })
  })
}
