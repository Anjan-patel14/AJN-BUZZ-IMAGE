import { IMAGE_TOOLS } from '@/lib/image-tools';
export async function GET() {
  return Response.json({ status: 'ok', product: 'AJN Buzz Image', version: '5.0.0', public_tools: IMAGE_TOOLS.length, processing: 'browser-local', target_size_compression: true, seo_ready: true, ads_txt: true, sitemap_registry_sync: true, all_tools_explicit: true, account_required: false, server_time: new Date().toISOString() });
}
