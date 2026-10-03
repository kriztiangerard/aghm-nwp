export const closeOpenSelectPortals = (root: ParentNode | null = typeof document !== 'undefined' ? document : null): void => {
  if (!root || typeof root.querySelectorAll !== 'function') {
    return
  }

  root.querySelectorAll('[data-base-ui-portal]').forEach((portal) => {
    const portalElement = portal as HTMLElement

    portalElement.setAttribute('data-base-ui-portal-closed', 'true')
    portalElement.style.pointerEvents = 'none'
    portalElement.style.display = 'none'

    portalElement.querySelectorAll('[role="listbox"], [role="option"]').forEach((item) => {
      const itemElement = item as HTMLElement
      itemElement.setAttribute('aria-hidden', 'true')
      itemElement.style.pointerEvents = 'none'
      itemElement.style.display = 'none'
    })
  })
}
