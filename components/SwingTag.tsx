import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";

export type SwingTagSize = "sm" | "md" | "lg";

export default function SwingTag({
  children,
  color = "var(--peach)",
  size = "sm",
  rotate = -4,
  href,
  onClick,
  className,
}: {
  children: ReactNode;
  color?: string;
  size?: SwingTagSize;
  rotate?: number;
  href?: string;
  onClick?: () => void;
  className?: string;
}) {
  const style = {
    "--tag-color": color,
    "--tag-rotate": `${rotate}deg`,
  } as CSSProperties;
  const cls = `swing-tag swing-tag--${size}${className ? ` ${className}` : ""}`;

  if (href) {
    return (
      <Link href={href} className={cls} style={style}>
        {children}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button type="button" className={cls} style={style} onClick={onClick}>
        {children}
      </button>
    );
  }

  return (
    <span className={cls} style={style}>
      {children}
    </span>
  );
}
