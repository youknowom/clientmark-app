import React from 'react'
import { Tooltip as BaseTooltip } from '@base-ui/react'

/**
 * Modern Clientmark Tooltip
 * Built with @base-ui/react for accessible floating tooltips.
 */
export const Tooltip = ({
  content,
  children,
  side = 'top',
  align = 'center',
  sideOffset = 6,
  delay = 200,
}) => {
  if (!content) return children

  return (
    <BaseTooltip.Provider delay={delay}>
      <BaseTooltip.Root>
        <BaseTooltip.Trigger render={children} />
        <BaseTooltip.Portal>
          <BaseTooltip.Positioner side={side} align={align} sideOffset={sideOffset}>
            <BaseTooltip.Popup className="cm-tooltip-popup">
              {content}
            </BaseTooltip.Popup>
          </BaseTooltip.Positioner>
        </BaseTooltip.Portal>
      </BaseTooltip.Root>
    </BaseTooltip.Provider>
  )
}

export default Tooltip
