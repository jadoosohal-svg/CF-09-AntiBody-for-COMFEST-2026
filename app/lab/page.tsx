"use client";
import dynamic from "next/dynamic";

// The lab is client-only (session state lives in memory/sessionStorage) and lazy-loaded off the landing bundle.
const Lab = dynamic(() => import("@/components/lab/Shell"), {
  ssr: false,
  loading: () => (
    <div className="mx-auto max-w-7xl p-6">
      <div className="skeleton h-12 w-full" />
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="skeleton h-[60vh]" />
        <div className="skeleton h-[60vh]" />
      </div>
    </div>
  ),
});

export default function LabPage() {
  return <Lab />;
}
