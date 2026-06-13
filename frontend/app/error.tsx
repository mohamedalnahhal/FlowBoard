"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import { Icon } from "@/components/ui/Icon";

export default function ErrorPage({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-surface px-4 text-center">
      <div className="w-20 h-20 rounded-full bg-error-container flex items-center justify-center">
        <Icon name="error" className="text-[40px] text-on-error-container" />
      </div>
      <div>
        <h1 className="font-headline-lg text-headline-lg text-on-surface mb-2">Something went wrong</h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant">
          An unexpected error occurred. Please try again.
        </p>
      </div>
      <button
        type="button"
        onClick={() => unstable_retry()}
        className="px-4 py-2 bg-primary text-on-primary rounded-lg font-label-md text-label-md hover:opacity-90 transition-opacity"
      >
        Try again
      </button>
    </div>
  );
}
