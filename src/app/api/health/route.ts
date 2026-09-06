import { IMAGE_TOOLS } from "@/lib/image-tools";

export async function GET() {
  return Response.json({
    status: "ok",
    product: "AJN Buzz Image",
    version: "5.4.0",
    public_tools: IMAGE_TOOLS.length,
    processing: "browser-local",
    target_size_compression: true,
    seo_ready: true,
    ads_txt: true,
    sitemap_registry_sync: true,
    remove_watermark_local_inpainting: true,
    html_to_image_local_rendering: true,
    output_validation: true,
    dimension_safety: true,
    batch_processing: true,
    all_tools_explicit: true,
    stale_selection_fix: true,
    watermark_positions: true,
    rotate_zero_fix: true,
    compression_aspect_fix: true,
    recovery_pages: true,
    account_required: false,
    server_time: new Date().toISOString(),
  });
}
