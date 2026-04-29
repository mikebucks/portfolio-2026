import type { ComponentPropsWithoutRef, ElementType } from "react";

type Props<T extends ElementType = "span"> = {
  as?: T;
} & ComponentPropsWithoutRef<T>;

export function InlineHighlight<T extends ElementType = "span">({
  as,
  className,
  ...props
}: Props<T>) {
  const Tag = as ?? "span";
  return (
    <Tag
      className={[
        "bg-white/80 text-black rounded px-1 py-0",
        "[box-decoration-break:clone] [-webkit-box-decoration-break:clone]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  );
}
