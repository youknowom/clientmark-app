import React from 'react'
import { Accordion as BaseAccordion } from '@base-ui/react'
import { ChevronDown } from 'lucide-react'

/**
 * Modern Clientmark Accordion (replaces CAccordion)
 * Built with @base-ui/react for accessible disclosure panels.
 */
export const Accordion = ({
  value,
  defaultValue,
  onValueChange,
  multiple = false,
  children,
  className = '',
}) => {
  return (
    <BaseAccordion.Root
      value={value}
      defaultValue={defaultValue}
      onValueChange={onValueChange}
      multiple={multiple}
      className={className}
    >
      {children}
    </BaseAccordion.Root>
  )
}

export const AccordionItem = ({ value, children, className = '' }) => (
  <BaseAccordion.Item value={value} className={`cm-accordion-item ${className}`}>
    {children}
  </BaseAccordion.Item>
)

export const AccordionTrigger = ({ children, className = '' }) => (
  <BaseAccordion.Header>
    <BaseAccordion.Trigger className={`cm-accordion-trigger ${className}`}>
      <span>{children}</span>
      <ChevronDown
        size={18}
        style={{
          transition: 'transform var(--cm-duration-normal) var(--cm-ease-out)',
          flexShrink: 0,
        }}
      />
    </BaseAccordion.Trigger>
  </BaseAccordion.Header>
)

export const AccordionPanel = ({ children, className = '' }) => (
  <BaseAccordion.Panel className={`cm-accordion-panel ${className}`}>
    {children}
  </BaseAccordion.Panel>
)

Accordion.Item = AccordionItem
Accordion.Trigger = AccordionTrigger
Accordion.Panel = AccordionPanel

export default Accordion
