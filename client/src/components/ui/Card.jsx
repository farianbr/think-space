import { forwardRef } from "react";
import { cn } from "../../lib/cn";

/**
 * Surface container. `interactive` adds a subtle hover lift for clickable cards.
 */
const Card = forwardRef(function Card(
  { as: Comp = "div", interactive = false, className, children, ...props },
  ref
) {
  return (
    <Comp
      ref={ref}
      className={cn(
        "rounded-xl border border-hairline bg-surface shadow-soft",
        interactive &&
          "cursor-pointer transition-[box-shadow,transform,border-color] duration-200 ease-out hover:-translate-y-0.5 hover:border-line hover:shadow-card",
        className
      )}
      {...props}
    >
      {children}
    </Comp>
  );
});

export default Card;
