"use client";

import { useEffect } from "react";
import { initAnalytics } from "@/lib/analytics";

/** Starts PostHog when a production key is set; renders nothing. */
export default function Analytics() {
  useEffect(() => initAnalytics(), []);
  return null;
}
