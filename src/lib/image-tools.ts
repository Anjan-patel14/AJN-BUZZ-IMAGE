export type ToolCategory = 'Optimize' | 'Photo Size' | 'Signature' | 'Edit' | 'Convert';

export type ToolId =
  | 'compress'
  | 'compress-to-kb'
  | 'resize'
  | 'resize-cm'
  | 'resize-mm'
  | 'resize-inches'
  | 'photo-size-converter'
  | 'crop'
  | 'aspect-ratio-crop'
  | 'passport-photo-maker'
  | 'id-photo-maker'
  | 'photo-35x45'
  | 'photo-2x2'
  | 'dpi-changer'
  | 'signature-maker'
  | 'signature-upload-crop'
  | 'signature-resize'
  | 'signature-size-reducer'
  | 'signature-background-remover'
  | 'signature-to-png'
  | 'photo-editor'
  | 'watermark'
  | 'background-remover'
  | 'change-background'
  | 'upscale'
  | 'rotate'
  | 'remove-metadata'
  | 'convert'
  | 'convert-to-jpg'
  | 'jpg-to-png';

export type ToolWorkflow =
  | 'compress'
  | 'compress-target'
  | 'resize-px'
  | 'resize-physical'
  | 'photo-size'
  | 'crop'
  | 'aspect-crop'
  | 'photo-preset'
  | 'dpi'
  | 'signature-maker'
  | 'signature-trim'
  | 'signature-resize'
  | 'signature-compress'
  | 'signature-remove-bg'
  | 'signature-png'
  | 'photo-editor'
  | 'watermark'
  | 'remove-bg'
  | 'change-bg'
  | 'upscale'
  | 'rotate'
  | 'remove-metadata'
  | 'convert'
  | 'to-jpg'
  | 'jpg-to-png';

export type ToolFaq = { question: string; answer: string };
export type PhysicalUnit = 'px' | 'cm' | 'mm' | 'in';

export type ImageTool = {
  id: ToolId;
  name: string;
  shortName: string;
  summary: string;
  description: string;
  seoTitle: string;
  seoDescription: string;
  icon: string;
  category: ToolCategory;
  formats: string;
  featured?: boolean;
  badge?: 'Popular' | 'New' | 'Simple';
  local: true;
  workflow: ToolWorkflow;
  defaultUnit?: PhysicalUnit;
  preset?: { width: number; height: number; unit: PhysicalUnit; dpi: number };
  seoKeywords: string[];
  faq: ToolFaq[];
};

function makeTool(tool: Omit<ImageTool, 'local'>): ImageTool { return { ...tool, local: true }; }
const faqLocal: ToolFaq[] = [{ question: 'Are my images uploaded to AJN Buzz?', answer: 'No for this tool. Processing runs in your browser and no sign-in is required.' }];

export const IMAGE_TOOLS: ImageTool[] = [
  makeTool({ id:'compress', name:'Compress Image', shortName:'Compress', summary:'Reduce image size automatically or to a KB/MB target.', description:'Compress JPG, PNG or WebP with quality search and dimension fallback when a strict file-size limit is selected.', seoTitle:'Compress Image to KB or MB Online', seoDescription:'Compress JPG, PNG or WebP to targets such as 50 KB, 100 KB, 200 KB, 500 KB or 1 MB in your browser.', icon:'Minimize2', category:'Optimize', formats:'JPG · PNG · WebP', featured:true, badge:'Popular', workflow:'compress', seoKeywords:['compress image to kb','compress image to mb','image compressor','photo compressor','compress image to 100kb','compress image to 200kb'], faq:[...faqLocal,{question:'Can I target a specific file size?',answer:'Yes. Choose target mode and enter a KB or MB limit. AJN Buzz aims for an at-or-below result.'}] }),
  makeTool({ id:'compress-to-kb', name:'Compress Image to KB', shortName:'Compress to KB', summary:'Enter an exact KB limit for forms and uploads.', description:'Target 20 KB, 50 KB, 100 KB, 200 KB or any custom size while keeping the best practical browser-encoded quality.', seoTitle:'Compress Image to KB Online', seoDescription:'Compress an image to 20 KB, 50 KB, 100 KB, 200 KB or a custom KB target online.', icon:'Gauge', category:'Optimize', formats:'JPG · PNG · WebP', featured:true, badge:'Popular', workflow:'compress-target', seoKeywords:['compress image to kb','20kb photo','50kb photo','100kb photo','200kb photo','photo size reducer'], faq:faqLocal }),
  makeTool({ id:'resize', name:'Resize Image', shortName:'Resize', summary:'Change width and height in pixels.', description:'Resize to exact pixel dimensions with optional aspect-ratio locking.', seoTitle:'Resize Image Online by Pixels', seoDescription:'Resize JPG, PNG, WebP or SVG images to exact pixel dimensions online.', icon:'Scaling', category:'Optimize', formats:'JPG · PNG · WebP · SVG', featured:true, workflow:'resize-px', seoKeywords:['resize image','resize pixels','change photo dimensions'], faq:faqLocal }),
  makeTool({ id:'resize-cm', name:'Resize Image in CM', shortName:'Resize in CM', summary:'Set physical width and height in centimetres with DPI.', description:'Convert centimetres and DPI to exact pixel dimensions, then resize the image.', seoTitle:'Resize Image in CM Online with DPI', seoDescription:'Resize a photo to exact centimetre dimensions with 72, 96, 150, 200, 300 or custom DPI.', icon:'Ruler', category:'Photo Size', formats:'JPG · PNG · WebP', featured:true, badge:'New', workflow:'resize-physical', defaultUnit:'cm', seoKeywords:['resize image in cm','photo size cm','cm to pixels image','resize photo 3.5x4.5 cm'], faq:faqLocal }),
  makeTool({ id:'resize-mm', name:'Resize Image in MM', shortName:'Resize in MM', summary:'Set width and height in millimetres with DPI.', description:'Convert millimetres and DPI to output pixels and create an exact-size image.', seoTitle:'Resize Image in MM Online with DPI', seoDescription:'Resize images to exact millimetre dimensions using a selected DPI.', icon:'Ruler', category:'Photo Size', formats:'JPG · PNG · WebP', workflow:'resize-physical', defaultUnit:'mm', seoKeywords:['resize image in mm','photo size millimetres','mm to pixels photo'], faq:faqLocal }),
  makeTool({ id:'resize-inches', name:'Resize Image in Inches', shortName:'Resize in Inches', summary:'Set exact inch dimensions and DPI.', description:'Resize photos using physical inch dimensions converted to pixels at the selected DPI.', seoTitle:'Resize Image in Inches Online with DPI', seoDescription:'Resize an image to exact inch dimensions with custom DPI and live pixel calculation.', icon:'Ruler', category:'Photo Size', formats:'JPG · PNG · WebP', workflow:'resize-physical', defaultUnit:'in', seoKeywords:['resize image inches','photo inches to pixels','2x2 inch photo'], faq:faqLocal }),
  makeTool({ id:'photo-size-converter', name:'Photo Size Converter', shortName:'Photo Size', summary:'Convert PX, CM, MM and inches using DPI.', description:'Switch between physical units and pixels, see the calculated output dimensions, and create the resized photo.', seoTitle:'Photo Size Converter — PX, CM, MM & Inches', seoDescription:'Convert photo dimensions between pixels, centimetres, millimetres and inches using DPI, then resize online.', icon:'ArrowLeftRight', category:'Photo Size', formats:'PX · CM · MM · Inches', featured:true, badge:'New', workflow:'photo-size', defaultUnit:'cm', seoKeywords:['photo size converter','cm to pixels','mm to pixels','inches to pixels','dpi calculator photo'], faq:faqLocal }),
  makeTool({ id:'crop', name:'Crop Image', shortName:'Crop', summary:'Crop using exact X, Y, width and height.', description:'Trim an image using precise crop coordinates and dimensions.', seoTitle:'Crop Image Online', seoDescription:'Crop JPG, PNG or WebP images to exact coordinates and dimensions online.', icon:'Crop', category:'Edit', formats:'JPG · PNG · WebP', featured:true, workflow:'crop', seoKeywords:['crop image','crop photo','image cropper'], faq:faqLocal }),
  makeTool({ id:'aspect-ratio-crop', name:'Aspect Ratio Crop', shortName:'Ratio Crop', summary:'Crop to 1:1, 4:3, 3:4, 16:9 or custom ratio.', description:'Create a centred or manually positioned crop with common aspect-ratio presets.', seoTitle:'Crop Image to Aspect Ratio Online', seoDescription:'Crop photos to 1:1, 4:3, 3:4, 16:9 or a custom aspect ratio with position controls.', icon:'Frame', category:'Edit', formats:'JPG · PNG · WebP', featured:true, workflow:'aspect-crop', seoKeywords:['aspect ratio crop','crop 1:1','crop 4:3','crop 3:4','crop 16:9'], faq:faqLocal }),
  makeTool({ id:'passport-photo-maker', name:'Passport Photo Maker', shortName:'Passport Photo', summary:'Crop, size and prepare a passport-style photo.', description:'Choose a common physical photo size, DPI, crop position and optional plain-background replacement. Always confirm the current issuing authority requirements before submission.', seoTitle:'Passport Photo Maker Online — Size, Crop & DPI', seoDescription:'Prepare passport-style photos with exact physical dimensions, DPI, crop positioning and optional plain-background replacement.', icon:'ScanFace', category:'Photo Size', formats:'JPG · PNG', featured:true, badge:'Popular', workflow:'photo-preset', preset:{width:35,height:45,unit:'mm',dpi:300}, seoKeywords:['passport photo maker','35x45 photo','passport photo size','passport photo dpi'], faq:[...faqLocal,{question:'Does AJN Buzz guarantee government acceptance?',answer:'No. Requirements vary by authority and can change. Use the tool for sizing/cropping and verify the official current specification before submitting.'}] }),
  makeTool({ id:'id-photo-maker', name:'ID Photo Maker', shortName:'ID Photo', summary:'Create an ID/application photo with custom physical size.', description:'Crop to fit a chosen physical size and DPI for application and ID photo workflows.', seoTitle:'ID Photo Maker Online', seoDescription:'Create ID and application photos with exact dimensions, DPI, crop position and optional plain-background replacement.', icon:'BadgeCheck', category:'Photo Size', formats:'JPG · PNG', featured:true, workflow:'photo-preset', preset:{width:35,height:45,unit:'mm',dpi:300}, seoKeywords:['id photo maker','application photo size','id card photo','photo for online form'], faq:faqLocal }),
  makeTool({ id:'photo-35x45', name:'35 × 45 mm Photo', shortName:'35×45 Photo', summary:'Create a 35 × 45 mm photo at the selected DPI.', description:'Crop to the 35:45 aspect ratio and export exact pixel dimensions calculated from 35 × 45 mm.', seoTitle:'35x45 mm Photo Maker Online', seoDescription:'Create a 35 × 45 mm photo online with exact DPI-based pixels and crop positioning.', icon:'ScanFace', category:'Photo Size', formats:'35 × 45 mm · JPG/PNG', featured:true, workflow:'photo-preset', preset:{width:35,height:45,unit:'mm',dpi:300}, seoKeywords:['35x45 photo','35 mm 45 mm photo','413x531 photo','passport size photo 35x45'], faq:faqLocal }),
  makeTool({ id:'photo-2x2', name:'2 × 2 Inch Photo', shortName:'2×2 Photo', summary:'Create a square 2 × 2 inch photo at the selected DPI.', description:'Crop to square and export exact pixels for a 2 × 2 inch physical size.', seoTitle:'2x2 Inch Photo Maker Online', seoDescription:'Create a 2 × 2 inch square photo with DPI-based output dimensions and crop positioning.', icon:'ScanFace', category:'Photo Size', formats:'2 × 2 inch · JPG/PNG', featured:true, workflow:'photo-preset', preset:{width:2,height:2,unit:'in',dpi:300}, seoKeywords:['2x2 photo','2 inch photo','600x600 photo','square id photo'], faq:faqLocal }),
  makeTool({ id:'dpi-changer', name:'DPI Changer', shortName:'DPI', summary:'Set image density metadata without changing visual dimensions.', description:'Write DPI density metadata to PNG or JPEG output while keeping the same pixel dimensions.', seoTitle:'Change Image DPI Online', seoDescription:'Change PNG or JPEG DPI metadata to 72, 96, 150, 200, 300 or a custom value online.', icon:'Gauge', category:'Photo Size', formats:'JPG · PNG', featured:true, workflow:'dpi', seoKeywords:['change dpi','300 dpi photo','image dpi changer','set photo dpi'], faq:[...faqLocal,{question:'Does changing DPI add detail?',answer:'No. DPI describes print/display density. Pixel dimensions stay the same unless you also resize the image.'}] }),
  makeTool({ id:'signature-maker', name:'Signature Maker', shortName:'Signature Maker', summary:'Draw a signature or upload one, then export a clean PNG.', description:'Draw with mouse, touch or pen, or upload an existing signature image. Trim whitespace and export a transparent PNG.', seoTitle:'Signature Maker Online — Draw or Upload', seoDescription:'Draw or upload a signature, clean it, trim whitespace and download a transparent PNG.', icon:'PenLine', category:'Signature', formats:'Draw · PNG · JPG · WebP', featured:true, badge:'Popular', workflow:'signature-maker', seoKeywords:['signature maker','draw signature online','upload signature','signature png'], faq:faqLocal }),
  makeTool({ id:'signature-upload-crop', name:'Upload Signature & Crop', shortName:'Crop Signature', summary:'Auto-trim blank space around an uploaded signature.', description:'Detect the visible signature area, add a small safe margin and crop away blank surrounding space.', seoTitle:'Upload and Crop Signature Online', seoDescription:'Upload a signature image and automatically crop blank whitespace around the signature.', icon:'Crop', category:'Signature', formats:'PNG · JPG · WebP', workflow:'signature-trim', seoKeywords:['crop signature','trim signature image','signature upload crop'], faq:faqLocal }),
  makeTool({ id:'signature-resize', name:'Signature Resize', shortName:'Resize Signature', summary:'Resize a signature in PX, CM, MM or inches.', description:'Set signature width and height using physical units or pixels with DPI conversion.', seoTitle:'Resize Signature Online — PX, CM, MM & Inches', seoDescription:'Resize a signature to exact pixel, centimetre, millimetre or inch dimensions using DPI.', icon:'Scaling', category:'Signature', formats:'PNG · JPG · WebP', featured:true, workflow:'signature-resize', defaultUnit:'cm', seoKeywords:['signature resize','signature size cm','signature pixels','resize signature for form'], faq:faqLocal }),
  makeTool({ id:'signature-size-reducer', name:'Signature Size Reducer', shortName:'Signature KB', summary:'Reduce a signature to a target KB size.', description:'Compress an uploaded signature to a custom KB limit, reducing dimensions only when needed.', seoTitle:'Reduce Signature Size to KB Online', seoDescription:'Compress a signature image to 10 KB, 20 KB, 50 KB or a custom KB target.', icon:'Minimize2', category:'Signature', formats:'PNG · JPG · WebP', workflow:'signature-compress', seoKeywords:['signature size reducer','signature 20kb','signature 50kb','compress signature'], faq:faqLocal }),
  makeTool({ id:'signature-background-remover', name:'Signature Background Remover', shortName:'Signature BG', summary:'Remove a plain signature background to transparency.', description:'Remove white or near-flat edge-connected background pixels and export a transparent PNG.', seoTitle:'Remove Signature Background Online', seoDescription:'Remove white or plain background from a signature and download a transparent PNG.', icon:'Eraser', category:'Signature', formats:'PNG output', featured:true, workflow:'signature-remove-bg', seoKeywords:['remove signature background','transparent signature','signature white background remover'], faq:faqLocal }),
  makeTool({ id:'signature-to-png', name:'Signature to PNG', shortName:'Signature PNG', summary:'Convert a signature to transparent-friendly PNG.', description:'Re-encode a signature as PNG, remove a plain edge-connected background where possible, trim whitespace and preserve transparency.', seoTitle:'Convert Signature to PNG Online', seoDescription:'Convert a signature image to a clean transparent-friendly PNG, trim whitespace and remove a plain background where possible.', icon:'FileImage', category:'Signature', formats:'JPG · WebP → PNG', workflow:'signature-png', seoKeywords:['signature to png','convert signature png','signature image png'], faq:faqLocal }),
  makeTool({ id:'photo-editor', name:'Photo Editor', shortName:'Photo Editor', summary:'Adjust brightness, contrast, saturation and blur.', description:'Make common image adjustments with a live browser preview.', seoTitle:'Photo Editor Online — Brightness, Contrast & Blur', seoDescription:'Adjust image brightness, contrast, saturation and blur online with live preview.', icon:'SlidersHorizontal', category:'Edit', formats:'JPG · PNG · WebP', featured:true, workflow:'photo-editor', seoKeywords:['photo editor','brightness image','contrast photo','blur image'], faq:faqLocal }),
  makeTool({ id:'watermark', name:'Watermark Image', shortName:'Watermark', summary:'Add a text watermark with position controls.', description:'Add text with size, colour, opacity and corner/centre placement controls.', seoTitle:'Add Watermark to Image Online', seoDescription:'Add a text watermark to JPG, PNG or WebP images with position, colour, size and opacity controls.', icon:'Stamp', category:'Edit', formats:'JPG · PNG · WebP', workflow:'watermark', seoKeywords:['watermark image','add watermark','text watermark'], faq:faqLocal }),
  makeTool({ id:'background-remover', name:'Remove Background', shortName:'Remove BG', summary:'Remove plain or near-flat edge-connected backgrounds.', description:'Create transparency from a plain or near-flat background. This is not presented as universal AI segmentation.', seoTitle:'Remove Plain Image Background Online', seoDescription:'Remove a plain or near-flat background and export transparent PNG in your browser.', icon:'Eraser', category:'Edit', formats:'PNG output', featured:true, badge:'New', workflow:'remove-bg', seoKeywords:['remove background','transparent png','remove white background'], faq:faqLocal }),
  makeTool({ id:'change-background', name:'Change Photo Background', shortName:'Change BG', summary:'Replace a plain photo background with white, blue or custom colour.', description:'Detect a plain edge-connected background, make it transparent internally and composite the subject onto a selected colour.', seoTitle:'Change Photo Background Colour Online', seoDescription:'Change a plain photo background to white, blue or any custom colour online.', icon:'Palette', category:'Edit', formats:'JPG · PNG · WebP', featured:true, workflow:'change-bg', seoKeywords:['change photo background','white background photo','blue background photo','background color changer'], faq:faqLocal }),
  makeTool({ id:'upscale', name:'Upscale Image', shortName:'Upscale', summary:'Enlarge an image 2×, 3× or 4×.', description:'Enlarge an image with high-quality browser resampling. It does not invent generative detail.', seoTitle:'Upscale Image 2x, 3x or 4x Online', seoDescription:'Enlarge images 2x, 3x or 4x with high-quality browser resampling.', icon:'Maximize2', category:'Optimize', formats:'JPG · PNG · WebP', workflow:'upscale', seoKeywords:['upscale image','enlarge image','2x image','4x image'], faq:faqLocal }),
  makeTool({ id:'rotate', name:'Rotate & Flip Image', shortName:'Rotate & Flip', summary:'Rotate 0°, 90°, 180° or 270° and flip.', description:'Rotate and/or mirror an image while preserving its selected output format.', seoTitle:'Rotate or Flip Image Online', seoDescription:'Rotate images 90, 180 or 270 degrees, or flip horizontally or vertically.', icon:'RotateCw', category:'Edit', formats:'JPG · PNG · WebP', workflow:'rotate', seoKeywords:['rotate image','flip image','mirror photo'], faq:faqLocal }),
  makeTool({ id:'remove-metadata', name:'Remove Image Metadata', shortName:'Remove Metadata', summary:'Re-encode an image without EXIF and hidden source metadata.', description:'Create a fresh browser-encoded image that excludes source EXIF/GPS metadata.', seoTitle:'Remove Image Metadata and EXIF Online', seoDescription:'Remove EXIF, GPS and source metadata by safely re-encoding your image in the browser.', icon:'ShieldCheck', category:'Edit', formats:'JPG · PNG · WebP', workflow:'remove-metadata', seoKeywords:['remove image metadata','remove exif','remove gps photo','photo privacy'], faq:[...faqLocal,{question:'How is metadata removed?',answer:'AJN Buzz decodes the visible image pixels and creates a new file instead of copying the original EXIF blocks.'}] }),
  makeTool({ id:'convert', name:'Convert Image', shortName:'Convert', summary:'Convert between JPG, PNG and WebP.', description:'Convert browser-decodable images to JPG, PNG or WebP with adjustable quality.', seoTitle:'Convert Image to JPG, PNG or WebP Online', seoDescription:'Convert images between JPG, PNG and WebP online in your browser.', icon:'RefreshCw', category:'Convert', formats:'JPG · PNG · WebP', featured:true, workflow:'convert', seoKeywords:['image converter','jpg png webp converter','convert image'], faq:faqLocal }),
  makeTool({ id:'convert-to-jpg', name:'Image to JPG', shortName:'Image to JPG', summary:'Convert an image to JPEG with white transparency flattening.', description:'Convert PNG, WebP, SVG and other browser-supported images to JPEG.', seoTitle:'Convert Image to JPG Online', seoDescription:'Convert PNG, WebP, SVG and other browser-supported images to JPG online.', icon:'FileImage', category:'Convert', formats:'PNG · WebP · SVG → JPG', workflow:'to-jpg', seoKeywords:['image to jpg','png to jpg','webp to jpg','svg to jpg'], faq:faqLocal }),
  makeTool({ id:'jpg-to-png', name:'JPG to PNG / WebP', shortName:'JPG to PNG', summary:'Convert JPG/JPEG to PNG or WebP.', description:'Convert a JPEG file to PNG for lossless output or WebP for compact output.', seoTitle:'JPG to PNG or WebP Converter Online', seoDescription:'Convert JPG or JPEG images to PNG or WebP online.', icon:'Images', category:'Convert', formats:'JPG → PNG · WebP', workflow:'jpg-to-png', seoKeywords:['jpg to png','jpeg to png','jpg to webp'], faq:faqLocal }),
];

export const TOOL_MAP = new Map<ToolId, ImageTool>(IMAGE_TOOLS.map(tool => [tool.id, tool]));
export const TOOL_CATEGORIES: Array<'All' | ToolCategory> = ['All', 'Optimize', 'Photo Size', 'Signature', 'Edit', 'Convert'];
