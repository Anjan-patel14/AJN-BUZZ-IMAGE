import { IMAGE_TOOLS } from '@/lib/image-tools';
import { SITE_URL } from '@/lib/seo';

export function GET(){
 const urls=IMAGE_TOOLS.map(tool=>`  <url><loc>${SITE_URL}/tools/${tool.id}</loc><image:image><image:loc>${SITE_URL}/seo-tools/${tool.id}.svg</image:loc><image:title>${escapeXml(tool.name)} — AJN BUZZ IMAGE</image:title><image:caption>${escapeXml(tool.seoDescription)}</image:caption></image:image></url>`).join('\n');
 const body=`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${urls}\n</urlset>`;
 return new Response(body,{headers:{'Content-Type':'application/xml; charset=utf-8','Cache-Control':'public, max-age=3600, s-maxage=3600'}});
}
function escapeXml(value:string){const map:Record<string,string>={'<':'&lt;','>':'&gt;','&':'&amp;',"'":'&apos;',"\"":'&quot;'};return value.replace(/[<>&'\"]/g,c=>map[c]||c);}
