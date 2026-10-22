import React, { forwardRef } from 'react'
import { cn } from '../../lib/utils'

export const Card = forwardRef(({ className, interactive = false, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'rounded-xl border border-border/80 bg-card text-card-foreground shadow-sm transition-all duration-200',
      interactive && 'hover:shadow-md hover:border-primary/40 cursor-pointer',
      className
    )}
    {...props}
  >
    {children}
  </div>
))
Card.displayName = 'Card'

export const CardHeader = forwardRef(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col space-y-1.5 p-6 pb-4', className)}
    {...props}
  >
    {children}
  </div>
))
CardHeader.displayName = 'CardHeader'

export const CardTitle = forwardRef(({ className, children, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn('text-base font-semibold leading-tight tracking-tight text-foreground', className)}
    {...props}
  >
    {children}
  </h3>
))
CardTitle.displayName = 'CardTitle'

export const CardSubtitle = forwardRef(({ className, children, ...props }, ref) => (
  <h4
    ref={ref}
    className={cn('text-xs font-medium text-muted-foreground', className)}
    {...props}
  >
    {children}
  </h4>
))
CardSubtitle.displayName = 'CardSubtitle'

export const CardDescription = forwardRef(({ className, children, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  >
    {children}
  </p>
))
CardDescription.displayName = 'CardDescription'

export const CardContent = forwardRef(({ className, children, ...props }, ref) => (
  <div ref={ref} className={cn('p-6 pt-0', className)} {...props}>
    {children}
  </div>
))
CardContent.displayName = 'CardContent'

export const CardBody = CardContent

export const CardFooter = forwardRef(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex items-center justify-between p-6 pt-4 border-t border-border/60 text-sm text-muted-foreground', className)}
    {...props}
  >
    {children}
  </div>
))
CardFooter.displayName = 'CardFooter'

export const CardText = forwardRef(({ className, children, ...props }, ref) => (
  <p ref={ref} className={cn('text-sm text-foreground/90', className)} {...props}>
    {children}
  </p>
))
CardText.displayName = 'CardText'

export const CardImg = forwardRef(({ className, alt = '', ...props }, ref) => (
  <img ref={ref} alt={alt} className={cn('w-full h-auto object-cover rounded-t-xl', className)} {...props} />
))
CardImg.displayName = 'CardImg'

Card.Header = CardHeader
Card.Title = CardTitle
Card.Subtitle = CardSubtitle
Card.Description = CardDescription
Card.Content = CardContent
Card.Body = CardContent
Card.Footer = CardFooter
Card.Text = CardText
Card.Img = CardImg

export default Card
