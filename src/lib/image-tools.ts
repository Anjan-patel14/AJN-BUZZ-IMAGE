export type ToolCategory = 'Optimize' | 'Edit' | 'Convert';

export type ToolId =
  | 'compress'
  | 'resize'
  | 'crop'
  | 'convert'
  | 'photo-editor'
  | 'watermark'
  | 'background-remover'
  | 'upscale'
  | 'rotate'
  | 'convert-to-jpg'
  | 'jpg-to-png';

export type ImageTool = {
  id: ToolId;
  name: string;
  shortName: string;
  description: string;
  icon: string;
  category: ToolCategory;
  formats: string;
  featured?: boolean;
  badge?: 'Popular' | 'New' | 'Simple';
  local: boolean;
  seoKeywords: string[];
};

export const IMAGE_TOOLS: ImageTool[] = [
  { id: 'compress', name: 'Compress Image', shortName: 'Compress', description: 'Compress an image automatically or toward an exact KB/MB target with real iterative encoding.', icon: 'Minimize2', category: 'Optimize', formats: 'JPG · PNG · WebP', featured: true, badge: 'Popular', local: true, seoKeywords: ['compress image to kb', 'compress image to mb', 'reduce image size', 'image compressor', 'compress jpg', 'compress png', 'compress webp'] },
  { id: 'resize', name: 'Resize Image', shortName: 'Resize', description: 'Resize to exact pixel dimensions with optional aspect-ratio locking and high-quality resampling.', icon: 'Scaling', category: 'Optimize', formats: 'JPG · PNG · WebP · SVG', featured: true, badge: 'Popular', local: true, seoKeywords: ['resize image', 'resize image online', 'change image dimensions', 'resize jpg', 'resize png', 'image pixel resize'] },
  { id: 'crop', name: 'Crop Image', shortName: 'Crop', description: 'Crop an exact region using X, Y, width and height values with a result preview.', icon: 'Crop', category: 'Edit', formats: 'JPG · PNG · WebP', featured: true, local: true, seoKeywords: ['crop image', 'crop photo online', 'image cropper', 'crop jpg', 'crop png', 'trim image'] },
  { id: 'convert', name: 'Convert Image', shortName: 'Convert', description: 'Decode a browser-supported image and encode it as JPG, PNG or WebP.', icon: 'RefreshCw', category: 'Convert', formats: 'JPG · PNG · WebP', featured: true, badge: 'Popular', local: true, seoKeywords: ['convert image', 'image converter', 'jpg png webp converter', 'convert jpg', 'convert png', 'convert webp'] },
  { id: 'photo-editor', name: 'Photo Editor', shortName: 'Photo Editor', description: 'Apply real canvas brightness, contrast, saturation and blur adjustments with preview.', icon: 'SlidersHorizontal', category: 'Edit', formats: 'JPG · PNG · WebP', featured: true, badge: 'Simple', local: true, seoKeywords: ['photo editor', 'edit image online', 'brightness contrast saturation', 'blur image', 'image adjustments'] },
  { id: 'watermark', name: 'Watermark Image', shortName: 'Watermark', description: 'Render a centered text watermark with colour, size and opacity controls.', icon: 'Stamp', category: 'Edit', formats: 'JPG · PNG · WebP', featured: true, local: true, seoKeywords: ['watermark image', 'add watermark to photo', 'text watermark', 'watermark jpg', 'watermark png'] },
  { id: 'background-remover', name: 'Remove Background', shortName: 'Remove BG', description: 'Remove flat or near-flat backgrounds with corner colour sampling and tolerance, exporting transparent PNG.', icon: 'Eraser', category: 'Edit', formats: 'PNG output', featured: true, badge: 'New', local: true, seoKeywords: ['remove image background', 'background remover', 'transparent png', 'remove flat background', 'background transparency'] },
  { id: 'upscale', name: 'Upscale Image', shortName: 'Upscale', description: 'Enlarge an image 2×, 3× or 4× using high-quality browser resampling.', icon: 'Maximize2', category: 'Optimize', formats: 'JPG · PNG · WebP', featured: true, badge: 'New', local: true, seoKeywords: ['upscale image', 'enlarge image', '2x image upscale', '4x image upscale', 'resize image larger'] },
  { id: 'rotate', name: 'Rotate & Flip Image', shortName: 'Rotate & Flip', description: 'Rotate by 90°, 180° or 270° and optionally flip horizontally or vertically.', icon: 'RotateCw', category: 'Edit', formats: 'JPG · PNG · WebP', featured: true, local: true, seoKeywords: ['rotate image', 'flip image', 'rotate photo 90 degrees', 'flip jpg', 'rotate png'] },
  { id: 'convert-to-jpg', name: 'Image to JPG', shortName: 'Image to JPG', description: 'Convert a browser-decodable image to JPEG and flatten transparency onto white.', icon: 'FileImage', category: 'Convert', formats: 'PNG · WebP · SVG → JPG', featured: true, local: true, seoKeywords: ['image to jpg', 'png to jpg', 'webp to jpg', 'convert image to jpeg', 'svg to jpg'] },
  { id: 'jpg-to-png', name: 'JPG to PNG / WebP', shortName: 'JPG to PNG/WebP', description: 'Convert JPG/JPEG files to PNG or WebP in a dedicated conversion flow.', icon: 'Images', category: 'Convert', formats: 'JPG → PNG · WebP', featured: true, local: true, seoKeywords: ['jpg to png', 'jpeg to png', 'jpg to webp', 'jpeg to webp', 'convert jpg'] },
];

export const TOOL_MAP = new Map(IMAGE_TOOLS.map(tool => [tool.id, tool]));
export const TOOL_CATEGORIES: Array<'All' | ToolCategory> = ['All', 'Optimize', 'Edit', 'Convert'];
export const FEATURED_TOOLS = IMAGE_TOOLS.filter(tool => tool.featured);
