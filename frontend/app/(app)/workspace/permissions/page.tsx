import { Icon } from "@/components/ui/Icon";
import Link from "next/link";

export default function WorkspacePermissionsPage() {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-24 text-center">
      <div className="w-20 h-20 rounded-full bg-surface-container-high flex items-center justify-center">
        <Icon name="admin_panel_settings" className="text-[40px] text-on-surface-variant" />
      </div>
      <div>
        <h1 className="font-headline-lg text-headline-lg text-on-surface mb-2">Workspace Permissions</h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant">This page is not implemented yet.</p>
      </div>
      <Link href="/" className="px-4 py-2 bg-primary text-on-primary rounded-lg font-label-md text-label-md hover:opacity-90 transition-opacity">
        Back to Home
      </Link>
    </div>
  );
}
