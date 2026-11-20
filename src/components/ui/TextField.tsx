"use client";

import { useId, type InputHTMLAttributes, type ReactNode, type Ref } from "react";
import FormMessage from "./FormMessage";

type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "className"> & {
  label: string;
  /** Keeps the label for screen readers only. */
  hideLabel?: boolean;
  /** auth: 13px medium, soft. form: the dashboard's 13px semibold ink label. */
  labelStyle?: "auth" | "form";
  /** Next to the label on the right, e.g. "✓ Found". */
  labelAside?: ReactNode;
  /** 18px icon inside the field on the left. */
  icon?: ReactNode;
  error?: string | null;
  errorLink?: { href: string; label: string };
  ref?: Ref<HTMLInputElement>;
};

const labelStyles = {
  auth: "mb-2 block text-[13px] font-medium text-ink-soft",
  form: "mb-1.5 block text-[13px] font-semibold text-ink",
} as const;

/** The input's own look, shared with the dashboard's select and date fields. */
export function fieldClasses({ error = false, icon = false, readOnly = false } = {}) {
  return `h-12 w-full rounded-field border bg-ground text-base text-ink sm:h-[52px] transition-[border-color,box-shadow] duration-200 placeholder:text-ink-soft/70 focus-visible:outline-none ${
    icon ? "pr-4 pl-[46px]" : "px-4"
  } ${
    readOnly
      ? "border-dashed border-line text-ink-soft"
      : error
        ? "border-alert ring-3 ring-alert/12"
        : "border-line focus:border-ink-deep focus:ring-3 focus:ring-ink-deep/14"
  }`;
}

export default function TextField({
  label,
  hideLabel = false,
  labelStyle = "auth",
  labelAside,
  icon,
  error = null,
  errorLink,
  id,
  ref,
  readOnly,
  ...input
}: TextFieldProps) {
  const fallbackId = useId();
  const inputId = id ?? fallbackId;
  const errorId = `${inputId}-error`;

  return (
    <div>
      <div className={hideLabel ? "" : "flex items-baseline justify-between gap-3"}>
        <label htmlFor={inputId} className={hideLabel ? "sr-only" : labelStyles[labelStyle]}>
          {label}
        </label>
        {labelAside}
      </div>
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
          readOnly={readOnly}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className={fieldClasses({ error: Boolean(error), icon: Boolean(icon), readOnly })}
          {...input}
        />
      </div>
      <FormMessage id={errorId} message={error} link={errorLink} align="start" />
    </div>
  );
}
