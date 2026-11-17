"use client";

import { useId, type InputHTMLAttributes, type ReactNode, type Ref } from "react";
import FormMessage from "./FormMessage";

type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "className"> & {
  label: string;
  /** Keeps the label for screen readers only. */
  hideLabel?: boolean;
  /** 18px icon inside the field on the left. */
  icon?: ReactNode;
  error?: string | null;
  errorLink?: { href: string; label: string };
  ref?: Ref<HTMLInputElement>;
};

export default function TextField({
  label,
  hideLabel = false,
  icon,
  error = null,
  errorLink,
  id,
  ref,
  ...input
}: TextFieldProps) {
  const fallbackId = useId();
  const inputId = id ?? fallbackId;
  const errorId = `${inputId}-error`;

  return (
    <div>
      <label
        htmlFor={inputId}
        className={hideLabel ? "sr-only" : "mb-2 block text-[13px] font-medium text-ink-soft"}
      >
        {label}
      </label>
      <div className="group relative has-disabled:opacity-50">
        {icon && (
          <span
            className={`pointer-events-none absolute inset-y-0 left-4 flex items-center transition-colors duration-200 ${
              error ? "text-alert" : "text-ink-soft/70 group-focus-within:text-ink"
            }`}
          >
            {icon}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className={`h-[52px] w-full rounded-field border bg-ground text-base text-ink transition-[border-color,box-shadow] duration-200 placeholder:text-ink-soft/70 focus-visible:outline-none ${
            icon ? "pr-4 pl-[46px]" : "px-4"
          } ${
            error ? "border-alert ring-3 ring-alert/12" : "border-line focus:border-ink-deep focus:ring-3 focus:ring-ink-deep/14"
          }`}
          {...input}
        />
      </div>
      <FormMessage id={errorId} message={error} link={errorLink} align="start" />
    </div>
  );
}
