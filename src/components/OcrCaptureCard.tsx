import { useRef, useState } from "react";
import { Camera, Upload, Sparkles, X, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { FieldDef } from "@/lib/sapApisStore";

type Row = Record<string, string | number | boolean>;

interface ExtractedPayload {
  header: Record<string, unknown>;
  items: Record<string, unknown>[];
  confidence: Record<string, number>;
}

interface Props {
  headerFields: FieldDef[];
  itemFields: FieldDef[];
  onExtracted: (data: { header: Row; items: Row[]; confidence: Record<string, number> }) => void;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // strip the data URL prefix
      const idx = result.indexOf(",");
      resolve(idx >= 0 ? result.slice(idx + 1) : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function coerceForField(value: unknown, type: FieldDef["type"]): string | number | boolean | null {
  if (value === null || value === undefined || value === "") return null;
  if (type === "number") {
    const n = typeof value === "number" ? value : Number(String(value).replace(/[, ]/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  if (type === "boolean") {
    if (typeof value === "boolean") return value;
    const s = String(value).toLowerCase();
    return s === "true" || s === "yes" || s === "1";
  }
  return String(value);
}

export function OcrCaptureCard({ headerFields, itemFields, onExtracted }: Props) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const stageFile = (f: File | null) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSummary(null);
    if (!f) {
      setFile(null);
      setPreviewUrl(null);
      return;
    }
    if (f.size > 20 * 1024 * 1024) {
      toast.error("File is too large", { description: "Maximum size is 20 MB." });
      return;
    }
    setFile(f);
    setPreviewUrl(f.type.startsWith("image/") ? URL.createObjectURL(f) : null);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) stageFile(f);
  };

  const extract = async () => {
    if (!file) {
      toast.error("Pick a photo or PDF first");
      return;
    }
    if (!headerFields.length && !itemFields.length) {
      toast.error("No form fields are configured yet — open SAP Settings first.");
      return;
    }
    setLoading(true);
    setSummary(null);
    try {
      const fileBase64 = await fileToBase64(file);
      const { data, error } = await supabase.functions.invoke<ExtractedPayload>(
        "ocr-invoice",
        {
          body: {
            fileBase64,
            mimeType: file.type || "application/octet-stream",
            headerFields: headerFields.map((f) => ({ key: f.key, label: f.label, type: f.type })),
            itemFields: itemFields.map((f) => ({ key: f.key, label: f.label, type: f.type })),
          },
        },
      );
      if (error) {
        // Surface AI gateway-specific status in the message when available
        const msg = (error as { message?: string }).message || "OCR failed";
        toast.error(msg);
        return;
      }
      if (!data) {
        toast.error("OCR returned no data");
        return;
      }

      // Coerce extracted values to the form's field types and drop nulls
      const headerRow: Row = {};
      let detected = 0;
      for (const f of headerFields) {
        const v = coerceForField(data.header?.[f.key], f.type);
        if (v !== null) {
          headerRow[f.key] = v;
          detected++;
        }
      }

      const itemRows: Row[] = [];
      for (const raw of data.items ?? []) {
        const row: Row = {};
        let any = false;
        for (const f of itemFields) {
          const v = coerceForField(raw?.[f.key], f.type);
          if (v !== null) {
            row[f.key] = v;
            any = true;
          }
        }
        if (any) itemRows.push(row);
      }

      const confValues = Object.values(data.confidence ?? {}).filter((n) => typeof n === "number");
      const avg = confValues.length
        ? Math.round((confValues.reduce((a, b) => a + b, 0) / confValues.length) * 100)
        : null;

      const summaryText = `${detected} header field${detected === 1 ? "" : "s"} · ${itemRows.length} line item${itemRows.length === 1 ? "" : "s"}${avg !== null ? ` · ${avg}% avg confidence` : ""}`;
      setSummary(summaryText);
      onExtracted({ header: headerRow, items: itemRows, confidence: data.confidence ?? {} });
      toast.success("Form auto-filled from document", { description: summaryText });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "OCR failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
      className={`mb-5 rounded-xl border-2 border-dashed p-5 transition-colors ${
        dragOver ? "border-primary bg-primary/5" : "border-primary/30 bg-gradient-surface"
      }`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground shadow-glow">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-display text-base font-semibold">OCR Capture</h3>
            <p className="text-xs text-muted-foreground">
              Snap a photo, upload a PDF, or drop a file here — AI fills the form for you.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => stageFile(e.target.files?.[0] ?? null)}
          />
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf,image/*"
            className="hidden"
            onChange={(e) => stageFile(e.target.files?.[0] ?? null)}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => cameraRef.current?.click()}
            disabled={loading}
          >
            <Camera className="h-4 w-4" /> Take Photo
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileRef.current?.click()}
            disabled={loading}
          >
            <Upload className="h-4 w-4" /> Upload PDF / Image
          </Button>
          <Button
            size="sm"
            className="bg-gradient-primary"
            onClick={extract}
            disabled={loading || !file}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {loading ? "Extracting…" : "Extract with AI"}
          </Button>
        </div>
      </div>

      {file && (
        <div className="mt-4 flex items-center gap-3 rounded-lg border bg-card p-3">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Selected document preview"
              className="h-16 w-16 rounded-md object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-md bg-muted">
              <FileText className="h-7 w-7 text-muted-foreground" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{file.name}</div>
            <div className="text-xs text-muted-foreground">
              {(file.size / 1024).toFixed(0)} KB · {file.type || "unknown type"}
            </div>
            {summary && (
              <div className="mt-1 text-xs font-medium text-success">{summary}</div>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => stageFile(null)}
            disabled={loading}
            aria-label="Clear file"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
