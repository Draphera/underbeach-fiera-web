import React from "react";

export interface StartButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string;
  children: React.ReactNode;
}

export default function StartButton({
  children,
  className = "",
  type = "button",
  ...props
}: StartButtonProps) {
  return (
    <button
      type={type}
      className={`ub-button ub-button--primary ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
}
