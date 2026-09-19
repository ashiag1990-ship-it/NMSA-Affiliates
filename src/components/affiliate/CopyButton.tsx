"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useTranslation } from "@/i18n/context";

export function CopyButton({ value, label }: { value: string; label?: string }) {
  const { dict } = useTranslation();
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard API unavailable — no-op, the value is still visible/selectable
    }
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={copy}>
      {copied ? dict.common.copied : label ?? dict.common.copy}
    </Button>
  );
}

export function ShareButton({ value, title }: { value: string; title?: string }) {
  const { dict } = useTranslation();

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title: title || dict.meta.siteName, url: value });
      } catch {
        // user cancelled — no-op
      }
    } else {
      await navigator.clipboard.writeText(value).catch(() => {});
    }
  }

  return (
    <Button type="button" variant="secondary" size="sm" onClick={share}>
      {dict.common.share}
    </Button>
  );
}
