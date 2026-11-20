"use client";
import type { LinkProps } from "next/link";
import NextLink from "next/link";
import { type ForesightRegisterOptionsWithoutElement } from "js.foresight";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, type AnchorHTMLAttributes, type Ref } from "react";
import useForesight from "@/hooks/useForsight";

interface ForesightLinkProps
    extends Omit<LinkProps, "prefetch">,
    Omit<ForesightRegisterOptionsWithoutElement, "callback">,
    Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps | "name"> {
    children: React.ReactNode;
    ref?: Ref<HTMLAnchorElement>;
}

export function Link({
    children,
    hitSlop,
    name,
    meta,
    reactivateAfter,
    enabled,
    ref,
    ...props
}: ForesightLinkProps) {
    const router = useRouter();
    const href = props.href.toString();
    const options = useMemo(
        () => ({
            callback: () => router.prefetch(href),
            hitSlop,
            name,
            meta,
            reactivateAfter,
            enabled,
        }),
        [router, href, hitSlop, name, meta, reactivateAfter, enabled],
    );
    const { elementRef } = useForesight<HTMLAnchorElement>(options);
    const setRef = useCallback(
        (node: HTMLAnchorElement | null) => {
            elementRef.current = node;
            if (typeof ref === "function") return ref(node);
            if (ref) ref.current = node;
        },
        [elementRef, ref],
    );

    return (
        <NextLink {...props} ref={setRef} prefetch={false}>
            {children}
        </NextLink>
    );
}
