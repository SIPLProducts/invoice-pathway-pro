import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Keyboard } from "lucide-react";
import { OcrCaptureCard } from "@/components/OcrCaptureCard";
import { useSapApis, type FieldDef } from "@/lib/sapApisStore";

export default function OCRCapture() {
  const navigate = useNavigate();
  const apis = useSapApis();

  // Same API the Create DMR screen uses, so extracted keys match its fields.
  const api = useMemo(
    () =>
      apis.find((a) => /create[_ ]?gate[_ ]?service/i.test(a.name)) ??
      apis.find((a) => /gate/i.test(a.name)),
    [apis],
  );

  const pick = (req?: FieldDef[], res?: FieldDef[]) => {
    const r = (req ?? []).filter((f) => f.showInForm !== false && f.key);
    return r.length ? r : (res ?? []).filter((f) => f.key);
  };
  const headerFields = pick(api?.requestHeaderFields, api?.responseHeaderFields);
  const itemFields = pick(api?.requestItemFields, api?.responseItemFields);

  return (
    <>
      <PageHeader
        title="OCR Invoice Capture"
        description="Upload or snap the invoice — fields are read automatically and opened in Create New DMR."
        actions={
          <Button variant="outline" size="sm" onClick={() => navigate("/dmr/new")}>
            <Keyboard className="h-4 w-4" /> Manual Entry
          </Button>
        }
      />

      <OcrCaptureCard
        headerFields={headerFields}
        itemFields={itemFields}
        onExtracted={({ header, items, confidence }) =>
          navigate("/dmr/new", { state: { ocr: { header, items, confidence } } })
        }
      />
    </>
  );
}

function Tip({ icon: Icon, title, text }: { icon: typeof FileScan; title: string; text: string }) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div className="font-display font-semibold">{title}</div>
      <div className="mt-1 text-sm text-muted-foreground">{text}</div>
    </div>
  );
}
