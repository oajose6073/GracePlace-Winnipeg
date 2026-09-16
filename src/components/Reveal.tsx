import type { ElementType, ReactNode } from "react";
import { useReveal } from "../lib/useReveal";

type RevealProps = {
  children: ReactNode;
  className?: string;
  /** Staggers the reveal so grouped items arrive one after another. */
  delay?: number;
  as?: ElementType;
};

export function Reveal({ children, className = "", delay = 0, as: Tag = "div" }: RevealProps) {
  const { ref, visible } = useReveal<HTMLDivElement>();

  return (
    <Tag
      ref={ref}
      className={`gp-reveal ${className}`}
      data-visible={visible}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}
