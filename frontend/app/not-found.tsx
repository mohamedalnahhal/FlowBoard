import Link from "next/link";
import { Icon } from "@/components/ui/Icon";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-surface px-4 text-center">
      <div className="w-20 h-20 rounded-full bg-surface-container-high flex items-center justify-center">
        <Icon name="search_off" className="text-[40px] text-on-surface-variant" />
      </div>
      <div>
        <h1 className="font-headline-lg text-headline-lg text-on-surface mb-2">Page not found</h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant">
          The page you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to it.
        </p>
      </div>
      <Link
        href="/"
        className="px-4 py-2 bg-primary text-on-primary rounded-lg font-label-md text-label-md hover:opacity-90 transition-opacity"
      >
        Back to Home
      </Link>
    </div>
  );
}
