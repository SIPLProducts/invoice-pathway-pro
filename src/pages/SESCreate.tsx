import { ClipboardList } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

export default function SESCreate() {
  return (
    <div className="space-y-6">
      <PageHeader title="Create Service Entry Sheet" description="Post a service entry sheet to SAP." />
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-card p-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-accent text-primary-foreground">
          <ClipboardList className="h-6 w-6" />
        </div>
        <div className="font-display text-lg font-semibold">Service Entry Sheet</div>
        <p className="max-w-md text-sm text-muted-foreground">
          Fields and the SAP connection for this screen will be added once the API details are available.
        </p>
      </div>
    </div>
  );
}
