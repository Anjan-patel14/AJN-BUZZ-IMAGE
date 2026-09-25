import { IMAGE_TOOLS } from '@/lib/image-tools';
export async function GET() {
  return Response.json({ product: 'AJN Buzz Image', version: '6.1.0', public_tools: IMAGE_TOOLS.length, processing: 'browser-local', target_size_compression: true, seo_ready: true, ads_txt: true, sitemap_registry_sync: true, all_tools_explicit: true, stale_selection_fix: true, pdf_shortcuts: 'https://ajnpdf.com', photo_signature_suite: true, physical_units: ['px','cm','mm','in'], dpi_tools: true, signature_tools: true, photo_presets: true, account_required: false, batch_limit: Number(process.env.NEXT_PUBLIC_IMAGE_BATCH_LIMIT || 20), max_input_mb: Number(process.env.NEXT_PUBLIC_IMAGE_MAX_INPUT_MB || 30), ads_enabled: process.env.NEXT_PUBLIC_ADS_ENABLED === 'true' });
}
