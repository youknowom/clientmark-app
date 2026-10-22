import React from 'react'
import { Tabs as BaseTabs } from '@base-ui/react'
import { cn } from '../../lib/utils'

export const Tabs = ({
  value,
  defaultValue,
  onValueChange,
  children,
  className,
}) => {
  return (
    <BaseTabs.Root
      value={value}
      defaultValue={defaultValue}
      onValueChange={onValueChange}
      className={cn('w-full', className)}
    >
      {children}
    </BaseTabs.Root>
  )
}

export const TabList = ({ children, className, ...props }) => (
  <BaseTabs.List
    className={cn(
      'inline-flex h-10 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground border border-border/50',
      className
    )}
    {...props}
  >
    {children}
  </BaseTabs.List>
)

export const Tab = ({ value, children, className, disabled = false, ...props }) => (
  <BaseTabs.Tab
    value={value}
    disabled={disabled}
    className={cn(
      'inline-flex items-center justify-center whitespace-nowrap rounded-md px-3.5 py-1.5 text-sm font-medium transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 data-[selected]:bg-card data-[selected]:text-foreground data-[selected]:shadow-sm hover:text-foreground cursor-pointer',
      className
    )}
    {...props}
  >
    {children}
  </BaseTabs.Tab>
)

export const TabPanel = ({ value, children, className, ...props }) => (
  <BaseTabs.Panel
    value={value}
    className={cn('mt-4 focus-visible:outline-none', className)}
    {...props}
  >
    {children}
  </BaseTabs.Panel>
)

Tabs.List = TabList
Tabs.Tab = Tab
Tabs.Panel = TabPanel

export default Tabs
