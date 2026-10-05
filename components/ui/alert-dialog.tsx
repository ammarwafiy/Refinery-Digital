'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { Button, ButtonProps } from '@/components/ui/button';

interface AlertDialogContextType {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const AlertDialogContext = React.createContext<AlertDialogContextType | null>(null);

function useAlertDialog() {
  const context = React.useContext(AlertDialogContext);
  if (!context) {
    throw new Error('AlertDialog sub-components must be wrapped within <AlertDialog />');
  }
  return context;
}

export interface AlertDialogProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultOpen?: boolean;
}

export function AlertDialog({
  children,
  open: controlledOpen,
  onOpenChange,
  defaultOpen = false,
}: AlertDialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;

  const setOpen = React.useCallback(
    (newOpen: boolean) => {
      if (!isControlled) {
        setUncontrolledOpen(newOpen);
      }
      onOpenChange?.(newOpen);
    },
    [isControlled, onOpenChange]
  );

  return (
    <AlertDialogContext.Provider value={{ open, setOpen }}>
      {children}
    </AlertDialogContext.Provider>
  );
}

export interface AlertDialogTriggerProps extends React.ComponentPropsWithRef<'button'> {
  asChild?: boolean;
}

export const AlertDialogTrigger = React.forwardRef<HTMLButtonElement, AlertDialogTriggerProps>(
  ({ children, asChild = false, onClick, ...props }, ref) => {
    const { setOpen } = useAlertDialog();

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(e);
      if (!e.defaultPrevented) {
        setOpen(true);
      }
    };

    if (asChild && React.isValidElement(children)) {
      const child = children as React.ReactElement<any>;
      return React.cloneElement(child, {
        onClick: (e: React.MouseEvent) => {
          child.props?.onClick?.(e);
          if (!e.defaultPrevented) {
            setOpen(true);
          }
        },
      });
    }

    return (
      <button ref={ref} type="button" onClick={handleClick} {...props}>
        {children}
      </button>
    );
  }
);
AlertDialogTrigger.displayName = 'AlertDialogTrigger';

export interface AlertDialogContentProps extends React.ComponentPropsWithRef<'div'> {
  size?: 'default' | 'sm' | 'lg';
}

export const AlertDialogContent = React.forwardRef<HTMLDivElement, AlertDialogContentProps>(
  ({ className, children, size = 'default', ...props }, ref) => {
    const { open, setOpen } = useAlertDialog();
    const [mounted, setMounted] = React.useState(false);
    const [isVisible, setIsVisible] = React.useState(false);

    React.useEffect(() => {
      setMounted(true);
    }, []);

    React.useEffect(() => {
      if (open) {
        setIsVisible(true);
        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        const handleKeyDown = (e: KeyboardEvent) => {
          if (e.key === 'Escape') {
            setOpen(false);
          }
        };
        window.addEventListener('keydown', handleKeyDown);

        return () => {
          document.body.style.overflow = originalOverflow;
          window.removeEventListener('keydown', handleKeyDown);
        };
      } else {
        const timeout = setTimeout(() => setIsVisible(false), 200);
        return () => clearTimeout(timeout);
      }
    }, [open, setOpen]);

    if (!mounted || (!open && !isVisible)) return null;

    const maxWidthClasses = {
      sm: 'max-w-sm',
      default: 'max-w-md',
      lg: 'max-w-lg',
    }[size];

    return createPortal(
      <div
        className={cn(
          'fixed inset-0 z-[9999] flex items-center justify-center p-4 transition-all duration-200 ease-out select-none',
          open
            ? 'bg-black/80 backdrop-blur-sm opacity-100 pointer-events-auto'
            : 'bg-black/0 backdrop-blur-none opacity-0 pointer-events-none'
        )}
        onClick={() => setOpen(false)}
        role="dialog"
        aria-modal="true"
      >
        <div
          ref={ref}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            'relative w-full rounded-2xl bg-[#0F1524] border border-[#1F2E43] shadow-[0_20px_50px_rgba(0,0,0,0.7)] p-6 overflow-hidden',
            // Emil Kowalski craft: Never scale from 0! Animate smoothly from 0.96 -> 1.00 with custom cubic bezier
            'transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]',
            open
              ? 'opacity-100 scale-100 translate-y-0'
              : 'opacity-0 scale-[0.96] translate-y-2',
            maxWidthClasses,
            className
          )}
          {...props}
        >
          {/* Subtle top industrial accent border beam */}
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-red-600 via-[#009FE3] to-amber-500 opacity-80" />
          {children}
        </div>
      </div>,
      document.body
    );
  }
);
AlertDialogContent.displayName = 'AlertDialogContent';

export const AlertDialogHeader = ({
  className,
  ...props
}: React.ComponentPropsWithoutRef<'div'>) => (
  <div className={cn('flex flex-col space-y-2 text-left mb-5', className)} {...props} />
);
AlertDialogHeader.displayName = 'AlertDialogHeader';

export const AlertDialogTitle = React.forwardRef<
  HTMLHeadingElement,
  React.ComponentPropsWithRef<'h2'>
>(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={cn('text-base font-bold text-slate-100 font-mono tracking-tight flex items-center gap-2', className)}
    {...props}
  />
));
AlertDialogTitle.displayName = 'AlertDialogTitle';

export const AlertDialogDescription = React.forwardRef<
  HTMLParagraphElement,
  React.ComponentPropsWithRef<'p'>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-xs text-slate-400 font-sans leading-relaxed', className)}
    {...props}
  />
));
AlertDialogDescription.displayName = 'AlertDialogDescription';

export const AlertDialogFooter = ({
  className,
  ...props
}: React.ComponentPropsWithoutRef<'div'>) => (
  <div
    className={cn(
      'flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 pt-4 border-t border-[#1F2E43]/60',
      className
    )}
    {...props}
  />
);
AlertDialogFooter.displayName = 'AlertDialogFooter';

export interface AlertDialogCancelProps extends ButtonProps {}

export const AlertDialogCancel = React.forwardRef<HTMLButtonElement, AlertDialogCancelProps>(
  ({ className, variant = 'outline', children = 'Cancel', onClick, ...props }, ref) => {
    const { setOpen } = useAlertDialog();

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(e);
      if (!e.defaultPrevented) {
        setOpen(false);
      }
    };

    return (
      <Button
        ref={ref}
        type="button"
        variant={variant}
        onClick={handleClick}
        className={cn('border-[#1F2E43] hover:bg-[#152030] text-slate-300 font-mono text-xs', className)}
        {...props}
      >
        {children}
      </Button>
    );
  }
);
AlertDialogCancel.displayName = 'AlertDialogCancel';

export interface AlertDialogActionProps extends ButtonProps {
  onConfirm?: (() => void) | (() => Promise<void>) | (() => any);
}

export const AlertDialogAction = React.forwardRef<HTMLButtonElement, AlertDialogActionProps>(
  ({ className, variant = 'destructive', children = 'Continue', onClick, onConfirm, ...props }, ref) => {
    const { setOpen } = useAlertDialog();
    const [loading, setLoading] = React.useState(false);

    const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(e);
      if (onConfirm) {
        try {
          setLoading(true);
          await onConfirm();
          setOpen(false);
        } finally {
          setLoading(false);
        }
      } else {
        setOpen(false);
      }
    };

    return (
      <Button
        ref={ref}
        type="button"
        variant={variant}
        onClick={handleClick}
        disabled={loading || props.disabled}
        className={cn('font-mono text-xs font-bold text-white', className)}
        {...props}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <svg
              className="h-3.5 w-3.5 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Processing...
          </span>
        ) : (
          children
        )}
      </Button>
    );
  }
);
AlertDialogAction.displayName = 'AlertDialogAction';
