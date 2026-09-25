import { NextRequest, NextResponse } from 'next/server';
import { IMAGE_TOOLS, type ToolId } from '@/lib/image-tools';

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const TOOL_IDS = new Set(IMAGE_TOOLS.map((tool) => tool.id));
const TOOL_CATALOG = IMAGE_TOOLS.map((tool) => ({
  id: tool.id,
  name: tool.name,
  category: tool.category,
  workflow: tool.workflow,
  summary: tool.summary,
  defaultUnit: tool.defaultUnit,
  preset: tool.preset,
}));

const responseSchema = {
  type: 'OBJECT',
  properties: {
    toolId: { type: 'STRING', description: 'One registered AJN Buzz image tool ID, or NONE.' },
    message: { type: 'STRING', description: 'Short user-facing explanation of what AJN Bot will do.' },
    confidence: { type: 'NUMBER' },
    needsFile: { type: 'BOOLEAN' },
    externalPdf: { type: 'BOOLEAN', description: 'True only when the user is asking for a PDF operation not provided by AJN Buzz.' },
    options: {
      type: 'OBJECT',
      properties: {
        width: { type: 'NUMBER' },
        height: { type: 'NUMBER' },
        physicalWidth: { type: 'NUMBER' },
        physicalHeight: { type: 'NUMBER' },
        unit: { type: 'STRING' },
        dpi: { type: 'NUMBER' },
        targetBytes: { type: 'NUMBER' },
        format: { type: 'STRING' },
        quality: { type: 'NUMBER' },
        ratioWidth: { type: 'NUMBER' },
        ratioHeight: { type: 'NUMBER' },
        angle: { type: 'NUMBER' },
        flip: { type: 'STRING' },
        backgroundColor: { type: 'STRING' },
        replaceBackground: { type: 'BOOLEAN' },
        amount: { type: 'NUMBER' },
        trimMargin: { type: 'NUMBER' },
        brightness: { type: 'NUMBER' },
        contrast: { type: 'NUMBER' },
        saturation: { type: 'NUMBER' },
        blur: { type: 'NUMBER' },
        text: { type: 'STRING' },
        opacity: { type: 'NUMBER' },
        fontSize: { type: 'NUMBER' },
        position: { type: 'STRING' },
      },
    },
  },
  required: ['toolId', 'message', 'confidence', 'needsFile', 'externalPdf', 'options'],
} as const;

function cleanOptions(raw: Record<string, unknown>) {
  const allowed = new Set(Object.keys(responseSchema.properties.options.properties));
  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw || {})) {
    if (!allowed.has(key) || value === null || value === '') continue;
    if (typeof value === 'number' && !Number.isFinite(value)) continue;
    output[key] = value;
  }
  return output;
}

export async function POST(request: NextRequest) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return NextResponse.json({ ok: false, error: 'AJN Bot is not configured yet. Add GEMINI_API_KEY to .env.local and restart AJN Buzz.' }, { status: 503 });
  }

  const body = await request.json().catch(() => null) as { prompt?: string; files?: Array<{ name?: string; type?: string; size?: number }> } | null;
  const prompt = String(body?.prompt || '').trim();
  if (!prompt) return NextResponse.json({ ok: false, error: 'Enter a task for AJN Bot.' }, { status: 400 });
  if (prompt.length > 2000) return NextResponse.json({ ok: false, error: 'Please keep the task under 2,000 characters.' }, { status: 400 });

  const files = Array.isArray(body?.files) ? body.files.slice(0, 10) : [];
  const fileContext = files.length
    ? files.map((file) => `${file.name || 'image'} | ${file.type || 'unknown'} | ${Math.round((Number(file.size) || 0) / 1024)} KB`).join('\n')
    : 'No file attached.';

  const system = `You are AJN Bot, the task assistant for AJN Buzz image tools and the wider AJN PDF ecosystem.
Your job is to map the user's plain-English request to exactly one registered AJN Buzz image tool when possible.
Never invent a tool ID. Use only the catalog below.
If the user asks for a PDF operation (merge PDF, split PDF, protect PDF, OCR PDF, etc.), set externalPdf=true and toolId=NONE because this AJN Buzz build does not execute PDF workflows.
If the user asks for an unsupported task, set toolId=NONE and explain briefly.
If a file is needed for execution, needsFile=true.
Translate natural language sizes carefully: 50 KB = 50*1024 bytes; 1 MB = 1024*1024 bytes. For physical sizes use unit cm/mm/in and a sensible DPI, normally 300 for document photos/signatures unless the user specifies another value.
For 35x45 mm, prefer photo-35x45. For 2x2 inch, prefer photo-2x2. For passport-style without a specified size, prefer passport-photo-maker.
For signature requests, prefer the dedicated signature tools.
For 'square', use aspect-ratio-crop with ratioWidth=1 and ratioHeight=1.
Keep message concise. Return valid JSON matching the schema.
Registered catalog:\n${JSON.stringify(TOOL_CATALOG)}`;

  const payload = {
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: 'user', parts: [{ text: `User task:\n${prompt}\n\nAttached files:\n${fileContext}` }] }],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: 'application/json',
      responseSchema,
    },
  };

  const response = await fetch(`${API_URL}?key=${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('AJN Bot Gemini error:', response.status, errorText.slice(0, 1000));
    return NextResponse.json({ ok: false, error: 'AJN Bot could not analyze that request right now. Check the Gemini API key and try again.' }, { status: 502 });
  }

  const data = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('') || '';
  let result: { toolId: string; message: string; confidence: number; needsFile: boolean; externalPdf: boolean; options: Record<string, unknown> };
  try {
    result = JSON.parse(text);
  } catch {
    return NextResponse.json({ ok: false, error: 'AJN Bot returned an invalid task plan. Please try the request again.' }, { status: 502 });
  }

  if (result.toolId !== 'NONE' && !TOOL_IDS.has(result.toolId as ToolId)) result.toolId = 'NONE';
  result.options = cleanOptions(result.options || {});
  result.confidence = Math.min(1, Math.max(0, Number(result.confidence) || 0));
  result.needsFile = Boolean(result.needsFile);
  result.externalPdf = Boolean(result.externalPdf);
  result.message = String(result.message || 'I could not map that request to an AJN Buzz tool.').slice(0, 500);

  return NextResponse.json({ ok: true, result, model: MODEL }, { headers: { 'cache-control': 'no-store' } });
}
