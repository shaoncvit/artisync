import { HTMLAttributes } from "react";

type ContainerProps = HTMLAttributes<HTMLDivElement> & {
  as?: "div" | "section";
};

export default function Container({ as = "div", className = "", children, ...rest }: ContainerProps) {
  const Tag = as;
  return (
    <Tag
      className={`w-full mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 xl:px-10 ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  );
}
