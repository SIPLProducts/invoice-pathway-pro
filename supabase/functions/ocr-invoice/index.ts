// Edge function: OCR an invoice (image or PDF) using Lovable AI Gateway (Gemini vision)
// Returns structured header + line items mapped to the SAP form's field keys.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface FieldHint {
  key: string;
  label?: string;
  type?: "string" | "number" | "boolean" | "date" | "time";
}

interface ReqBody {
  fileBase64: string;
  mimeType: string;
  headerFields?: FieldHint[];
  itemFields?: FieldHint[];
}

function jsonSchemaForFields(fields: FieldHint[]) {
  const props: Record<string, unknown> = {};
  for (const f of fields) {
    if (!f.key) continue;
    const t = f.type ?? "string";
    let jsonType: string;
    if (t === "number") jsonType = "number";
    else if (t === "boolean") jsonType = "boolean";
    else jsonType = "string"; // date / time / string
    props[f.key] = {
      type: [jsonType, "null"],
      description: f.label || f.key,
    };
  }
  return { type: "object", properties: props, additionalProperties: false };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = (await req.json()) as ReqBody;
    if (!body?.fileBase64 || !body?.mimeType) {
      return new Response(
        JSON.stringify({ error: "fileBase64 and mimeType are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const headerFields = body.headerFields ?? [];
    const itemFields = body.itemFields ?? [];

    // Build field-list hints for the system prompt so Gemini knows what to look for.
    const headerHintLines = headerFields
      .map((f) => `- ${f.key} (${f.label || f.key}) — ${f.type || "string"}`)
      .join("\n");
    const itemHintLines = itemFields
      .map((f) => `- ${f.key} (${f.label || f.key}) — ${f.type || "string"}`)
      .join("\n");

    const systemPrompt = `You are an OCR + invoice/gate-pass data extraction assistant.
Look at the attached document (which may be an image of an invoice, gate pass, delivery challan, or a multi-page PDF) and extract the requested fields.

HEADER FIELDS to extract (single object):
${headerHintLines || "(none)"}

LINE ITEM FIELDS to extract (one object per line/material row):
${itemHintLines || "(none)"}

Rules:
- Use the EXACT field keys above.
- For numeric fields, return numbers (not strings). Strip currency symbols, commas, units.
- For date fields, return ISO format YYYY-MM-DD.
- For time fields, return HH:MM:SS (24h).
- If a field is not found, return null for that key (do not guess).
- For line items, return one object per visible material/service row. If no line items are detected, return an empty array.
- Also return a "confidence" object: per field key, a number 0..1 indicating how confident you are.`;

    const dataUrl = `data:${body.mimeType};base64,${body.fileBase64}`;

    const tool = {
      type: "function",
      function: {
        name: "extract_invoice",
        description: "Return structured invoice data mapped to the requested keys.",
        parameters: {
          type: "object",
          properties: {
            header: jsonSchemaForFields(headerFields),
            items: {
              type: "array",
              items: jsonSchemaForFields(itemFields),
            },
            confidence: {
              type: "object",
              additionalProperties: { type: "number" },
            },
          },
          required: ["header", "items"],
          additionalProperties: false,
        },
      },
    };

    const aiResp = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Extract the requested fields from this document.",
                },
                { type: "image_url", image_url: { url: dataUrl } },
              ],
            },
          ],
          tools: [tool],
          tool_choice: { type: "function", function: { name: "extract_invoice" } },
        }),
      },
    );

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, errText);
      if (aiResp.status === 429) {
        return new Response(
          JSON.stringify({
            error: "Rate limit exceeded. Please wait a moment and try again.",
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (aiResp.status === 402) {
        return new Response(
          JSON.stringify({
            error:
              "AI credits exhausted. Add funds in Settings → Workspace → Usage to continue using OCR.",
          }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      return new Response(
        JSON.stringify({ error: `AI gateway error (${aiResp.status})`, detail: errText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const aiData = await aiResp.json();
    const toolCall = aiData?.choices?.[0]?.message?.tool_calls?.[0];
    const argsStr = toolCall?.function?.arguments;
    if (!argsStr) {
      return new Response(
        JSON.stringify({
          error: "AI returned no structured output",
          raw: aiData?.choices?.[0]?.message?.content ?? null,
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let parsed: { header?: Record<string, unknown>; items?: unknown[]; confidence?: Record<string, number> };
    try {
      parsed = JSON.parse(argsStr);
    } catch (e) {
      return new Response(
        JSON.stringify({ error: "Failed to parse AI structured output", raw: argsStr }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        header: parsed.header ?? {},
        items: Array.isArray(parsed.items) ? parsed.items : [],
        confidence: parsed.confidence ?? {},
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("ocr-invoice error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
