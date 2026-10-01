import { IMAGE_TOOLS, TOOL_MAP, type ToolId } from '@/lib/image-tools';

export async function GET(_request: Request, context: { params: Promise<Record<string, string>> }) {
  const { slug } = await context.params;
  const tool = TOOL_MAP.get(slug as ToolId) || IMAGE_TOOLS[0];
  const title = escapeXml(tool.name);
  const summary = escapeXml(tool.summary);
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675" role="img" aria-labelledby="title desc">
<title id="title">${title} â€” AJN BUZZ IMAGE</title><desc id="desc">${summary}</desc>
<rect width="1200" height="675" fill="#f7f9fc"/><rect x="42" y="42" width="1116" height="591" rx="34" fill="#fff" stroke="#d9e3ef" stroke-width="3"/>
<rect x="42" y="42" width="1116" height="83" rx="34" fill="#eef5ff"/><rect x="42" y="92" width="1116" height="33" fill="#eef5ff"/>
<rect x="78" y="58" width="92" height="92" rx="18" fill="#1769e8"/><text x="124" y="116" text-anchor="middle" font-family="Arial,sans-serif" font-size="24" font-weight="800" fill="#fff">AJN</text>
<text x="190" y="101" font-family="Arial,sans-serif" font-size="26" font-weight="800" fill="#15365f">AJN BUZZ IMAGE</text>
<text x="90" y="225" font-family="Arial,sans-serif" font-size="48" font-weight="800" fill="#15243b">${title}</text>
<text x="90" y="276" font-family="Arial,sans-serif" font-size="22" fill="#5b6b80">${summary.slice(0,120)}</text>
<rect x="90" y="350" width="1020" height="220" rx="24" fill="#f8fbff" stroke="#d9e3ef" stroke-width="2"/><rect x="125" y="388" width="490" height="140" rx="18" fill="#e7f0ff"/>
<text x="150" y="465" font-family="Arial,sans-serif" font-size="24" font-weight="700" fill="#1769e8">Image workspace</text>
<rect x="660" y="388" width="410" height="48" rx="12" fill="#fff" stroke="#d9e3ef"/><text x="684" y="419" font-family="Arial,sans-serif" font-size="16" fill="#263b55">Set options for this task</text>
<rect x="660" y="464" width="190" height="54" rx="12" fill="#eaf2ff"/><text x="682" y="498" font-family="Arial,sans-serif" font-size="16" font-weight="700" fill="#1769e8">Preview</text>
<rect x="875" y="464" width="195" height="54" rx="12" fill="#1769e8"/><text x="915" y="498" font-family="Arial,sans-serif" font-size="16" font-weight="700" fill="#fff">Download</text></svg>`;
  return new Response(svg,{headers:{'Content-Type':'image/svg+xml; charset=utf-8','Cache-Control':'public, max-age=86400, s-maxage=86400'}});
}
function escapeXml(value:string){return value.replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]||c));}