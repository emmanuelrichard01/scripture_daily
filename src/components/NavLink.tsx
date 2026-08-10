import { NavLink as RouterNavLink, type NavLinkProps } from "react-router-dom";
import { forwardRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface NavLinkCompatProps extends Omit<NavLinkProps, "className"> {
  className?: string;
  activeClassName?: string;
  pendingClassName?: string;
  children?: ReactNode;
}

/**
 * A thin wrapper around react-router-dom's NavLink that accepts plain
 * `className` / `activeClassName` strings instead of the render-prop
 * `className` callback.  All unknown props are forwarded to the underlying
 * `<a>` element so the link always renders as a proper anchor.
 */
const NavLink = forwardRef<HTMLAnchorElement, NavLinkCompatProps>(
  (
    {
      className,
      activeClassName,
      pendingClassName,
      to,
      children,
      end,
      ...rest
    },
    ref,
  ) => {
    return (
      <RouterNavLink
        ref={ref}
        to={to}
        end={end}
        className={({ isActive, isPending }) =>
          cn(
            className,
            isActive && activeClassName,
            isPending && pendingClassName,
          )
        }
        {...rest}
      >
        {children}
      </RouterNavLink>
    );
  },
);

NavLink.displayName = "NavLink";

export { NavLink };
