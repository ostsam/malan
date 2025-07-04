"use client";

import dynamic from "next/dynamic";
import type { ToasterProps } from "sonner";

// Dynamically import the Toaster so its JS is loaded only in the browser
const DynamicToaster = dynamic(() => import("sonner").then((m) => m.Toaster), {
  ssr: false,
});

export default function LazyToaster(props: ToasterProps) {
  return <DynamicToaster {...props} />;
}
