import type { ImageTool, ToolFaq } from './image-tools';

export type ToolTroubleshootingItem = {
  problem: string;
  solution: string;
};

export type ToolSpecRow = {
  label: string;
  dimension: string;
  pixels300Dpi: string;
  typicalUse: string;
};

export type ToolDetailedGuide = {
  purpose: string;
  steps: string[];
  useCases: string[];
  troubleshooting: ToolTroubleshootingItem[];
  specs?: ToolSpecRow[];
  extraFaqs: ToolFaq[];
};

const PHOTO_SIZE_SPECS: ToolSpecRow[] = [
  { label: '35 × 45 mm', dimension: '3.5 × 4.5 cm', pixels300Dpi: '413 × 531 px', typicalUse: 'Standard ICAO / UK / EU / Australia passport & visa photos' },
  { label: '2 × 2 inch', dimension: '50.8 × 50.8 mm', pixels300Dpi: '600 × 600 px', typicalUse: 'US passport, OCI card, and square visa applications' },
  { label: '25 × 35 mm', dimension: '2.5 × 3.5 cm', pixels300Dpi: '295 × 413 px', typicalUse: 'PAN card, academic admit cards, and compact ID badges' },
  { label: 'A4 Photo Sheet', dimension: '210 × 297 mm', pixels300Dpi: '2480 × 3508 px', typicalUse: 'Multi-photo printable sheet with cut guide borders' },
];

const SIGNATURE_SPECS: ToolSpecRow[] = [
  { label: 'Standard Portal Signature', dimension: '3.5 × 1.5 cm', pixels300Dpi: '413 × 177 px', typicalUse: 'Civil service, banking, and university exam portals (10–20 KB)' },
  { label: 'Compact Signature Box', dimension: '4.0 × 2.0 cm', pixels300Dpi: '472 × 236 px', typicalUse: 'Application forms and digital document blocks (20–50 KB)' },
  { label: 'High-Resolution PNG Stamp', dimension: '6.0 × 2.5 cm', pixels300Dpi: '709 × 295 px', typicalUse: 'Transparent PNG overlay for letters and invoices' },
];

export function getToolDetailedGuide(tool: ImageTool): ToolDetailedGuide {
  switch (tool.workflow) {
    case 'compress':
    case 'compress-target':
      return {
        purpose: `${tool.name} reduces the byte size of JPG, PNG, and WebP files directly in your browser using iterative quality search and intelligent resolution scaling when a strict KB or MB ceiling is specified.`,
        steps: [
          `Select or drag your JPG, PNG, or WebP image into the ${tool.name} upload box.`,
          tool.workflow === 'compress'
            ? 'Choose Auto compression for balanced visual quality, or select "Compress file to" and enter your exact KB or MB target.'
            : 'Enter your required KB limit (such as 20 KB, 50 KB, 100 KB, or 200 KB) or click one of the quick preset buttons.',
          'Select an Output format (choose JPG or WebP when aiming for strict small KB targets).',
          `Click Compress, inspect the actual output size and percentage saved, and click Download.`,
        ],
        useCases: [
          'Meeting strict 20 KB, 50 KB, or 100 KB photo upload limits on recruitment, exam, and visa portals.',
          'Shrinking high-resolution smartphone photos before attaching them to emails or web forms.',
          'Optimizing hero banners and product images into lightweight WebP files for faster page loads.',
        ],
        troubleshooting: [
          {
            problem: 'Output file size stays above my small KB target when using PNG.',
            solution: 'PNG is a lossless format and cannot compress photographs aggressively. Switch the Output format dropdown to JPG or WebP to reach targets like 20 KB or 50 KB.',
          },
          {
            problem: 'Text or fine edges look soft at very low KB targets (under 20 KB).',
            solution: 'Crop unnecessary borders around the subject first so the encoder spends all available bytes on the important area.',
          },
        ],
        extraFaqs: [
          {
            question: `Can ${tool.name} guarantee an exact KB file size?`,
            answer: 'Browser image encoders compress in discrete quality steps, so the tool aims for the highest-quality file at or below your requested KB ceiling and displays the exact resulting byte size before download.',
          },
          {
            question: 'Which format achieves the smallest file size?',
            answer: 'WebP and JPG achieve the smallest file sizes for photographs. Use JPG when an application portal specifically requires .jpg or .jpeg uploads.',
          },
          {
            question: 'Does compression reduce pixel dimensions?',
            answer: 'In Auto mode, pixel dimensions stay unchanged. In Target KB mode, the tool tries quality adjustment first and only scales dimensions down if the target cannot be met at the quality floor.',
          },
        ],
      };

    case 'resize-px':
      return {
        purpose: `${tool.name} changes the exact horizontal and vertical pixel resolution of your image using high-quality browser resampling, with optional aspect-ratio locking to prevent distortion.`,
        steps: [
          'Upload your JPG, PNG, WebP, or SVG image.',
          'Keep "Lock aspect ratio" checked to scale proportionally, or uncheck it to enter independent width and height values.',
          'Enter your target Width (px) and Height (px), and select your preferred output format and quality.',
          'Review the live preview and click Process to download the resized image.',
        ],
        useCases: [
          'Resizing social media headers, blog thumbnails, and e-commerce product photos to exact pixel specs.',
          'Downscaling 4000 × 3000 px camera photos to 1200 × 900 px for web publishing.',
          'Preparing fixed-dimension avatars or portal uploads that specify exact pixel widths and heights.',
        ],
        troubleshooting: [
          {
            problem: 'The resized image looks stretched or squashed.',
            solution: 'Enable "Lock aspect ratio" before typing your new width or height, or use Aspect Ratio Crop first if your target ratio differs from the original photo.',
          },
          {
            problem: 'Upscaling a tiny icon makes it look soft.',
            solution: 'Raster images contain a fixed grid of pixels; enlarging them interpolates between pixels. Start from the highest-resolution source available.',
          },
        ],
        extraFaqs: [
          {
            question: 'What is the maximum pixel dimension supported?',
            answer: 'AJN BUZZ IMAGE decodes high-resolution camera photos up to 50 megapixels and safely caps output canvases at 16.7 megapixels (up to 8,192 pixels per side) so exports never crash mobile Safari or desktop browser memory.',
          },
          {
            question: 'Does resizing in pixels strip EXIF metadata?',
            answer: 'Yes. Because the resized image is freshly rendered on an HTML5 Canvas, hidden camera EXIF and GPS tags are not copied to the exported file.',
          },
        ],
      };

    case 'resize-physical':
    case 'photo-size':
      return {
        purpose: `${tool.name} converts physical print measurements (${tool.defaultUnit ? tool.defaultUnit.toUpperCase() : 'CM, MM, or Inches'}) and DPI into exact pixel dimensions using the formula pixels = (millimetres ÷ 25.4) × DPI.`,
        steps: [
          'Select your source photo from your device.',
          'Enter the desired physical Width and Height and verify the measurement unit (CM, MM, Inches, or PX).',
          'Set the target DPI (300 DPI is standard for print and official photo submissions; 96–150 DPI is common for screen use).',
          'Check the "Calculated output" pixel readout, click Process, and download the finished file with embedded DPI metadata.',
        ],
        useCases: [
          'Converting 3.5 × 4.5 cm or 35 × 45 mm requirements into exact 413 × 531 px images at 300 DPI.',
          'Preparing print-ready images in centimetres, millimetres, or inches for lab printing and ID cards.',
          'Switching seamlessly between physical units and pixel dimensions without manual math.',
        ],
        troubleshooting: [
          {
            problem: 'My portal rejects the photo because the aspect ratio does not match the physical dimensions.',
            solution: 'If your original photo is widescreen and you resize directly to 35 × 45 mm without cropping, the face may look narrow. Use Passport Photo Maker to crop and size simultaneously.',
          },
          {
            problem: 'The output pixel count is very large.',
            solution: 'Check that you entered 3.5 cm (not 35 cm) or 35 mm, and verify DPI is set to 300 rather than 1200.',
          },
        ],
        specs: PHOTO_SIZE_SPECS,
        extraFaqs: [
          {
            question: 'How are physical units converted to pixels?',
            answer: 'Inches are multiplied by DPI (pixels = inches × DPI). Centimetres are divided by 2.54 then multiplied by DPI, and millimetres are divided by 25.4 then multiplied by DPI.',
          },
          {
            question: 'Does the downloaded file include the selected DPI in its header?',
            answer: 'Yes. JPG outputs include the JFIF density header and PNG outputs include the pHYs chunk matching your selected DPI.',
          },
        ],
      };

    case 'photo-preset':
      return {
        purpose: `${tool.name} is a complete browser-local studio for preparing passport, visa, ID, and application photos. It combines aspect-locked cropping, zoom and head positioning, rotation, brightness/contrast tuning, optional plain-background replacement, target KB compression, DPI metadata embedding, and printable A4 multi-photo sheets.`,
        steps: [
          'Upload a well-lit front-facing portrait in JPG, PNG, or WebP format.',
          'Choose a preset size (such as 35 × 45 mm, 2 × 2 inch, 3.5 × 4.5 cm, or 25 × 35 mm) or enter custom dimensions and DPI.',
          'Use the Zoom, Horizontal, and Vertical sliders (plus Rotate if sideways) to center your head and shoulders in the frame.',
          'Optionally adjust Brightness and Contrast, replace a plain background with white/light blue, set an optional KB file-size limit, or enable "Generate printable A4 photo sheet".',
          'Review the live preview and actual pixel/KB readout, then click Process and Download.',
        ],
        useCases: [
          'Creating 35 × 45 mm (413 × 531 px at 300 DPI) or 2 × 2 inch (600 × 600 px at 300 DPI) photos for online passport, visa, and exam portals.',
          'Generating a print-ready A4 sheet containing 4, 6, 8, or 12 passport photos with subtle cut guide lines for home or shop printing.',
          'Meeting strict portal file-size rules (e.g., 20 KB–50 KB JPEG) while keeping exact physical pixel dimensions.',
        ],
        troubleshooting: [
          {
            problem: 'Background replacement leaves halos around hair or patterned walls.',
            solution: 'Browser edge-connected background replacement is designed for plain, evenly lit walls. Take the photo against a flat light wall without heavy shadows and adjust the Background tolerance slider.',
          },
          {
            problem: 'My application portal asks for a specific KB range (such as 20 KB to 50 KB).',
            solution: 'Set Output format to JPG and choose ≤ 50 KB (or ≤ 20 KB) in the Target KB limit dropdown. Note that A4 sheet mode must be unchecked when creating a single portal upload.',
          },
        ],
        specs: PHOTO_SIZE_SPECS,
        extraFaqs: [
          {
            question: 'Does one passport photo preset apply to every government form?',
            answer: 'No. Every issuing authority and exam portal sets its own rules for dimensions, head height, background color, glasses, and file size. Always verify your portal’s current official instructions before submitting.',
          },
          {
            question: 'How does the A4 passport photo sheet generator work?',
            answer: 'When enabled, the tool arranges multiple copies of your cropped photo onto a 210 × 297 mm A4 canvas (2480 × 3508 px at 300 DPI) with configurable spacing and cut-guide outlines ready for printing.',
          },
          {
            question: 'Are my passport photos uploaded to any server?',
            answer: 'Never. All cropping, background adjustment, DPI writing, and A4 sheet rendering happen 100% locally inside your browser.',
          },
        ],
      };

    case 'crop':
    case 'aspect-crop':
      return {
        purpose: `${tool.name} trims unwanted outer areas from your image using ${tool.workflow === 'crop' ? 'exact X, Y, width, and height pixel coordinates' : 'standard aspect ratio presets (1:1, 4:3, 3:4, 16:9, 9:16, 5:4) with zoom and position sliders'}.`,
        steps: [
          'Upload your image to load its dimensions and live preview.',
          tool.workflow === 'crop'
            ? 'Enter the starting X and Y coordinates along with the exact crop Width and Height in pixels.'
            : 'Choose your desired Aspect ratio preset and adjust Zoom, Horizontal position, and Vertical position.',
          'Select your output format (WebP, JPEG, or PNG) and quality.',
          'Click Process and download your freshly cropped image.',
        ],
        useCases: [
          'Cropping square 1:1 profile pictures, 3:4 portrait ID cards, or 16:9 video thumbnails.',
          'Removing distracting borders, timestamps, or margins from scanned documents and screenshots.',
          'Framing a subject cleanly before running target-KB compression.',
        ],
        troubleshooting: [
          {
            problem: 'My subject is off-center after choosing an aspect ratio.',
            solution: 'Move the Horizontal position and Vertical position sliders while watching the Live preview to center the subject.',
          },
        ],
        extraFaqs: [
          {
            question: 'Does cropping lower image quality?',
            answer: 'Cropping discards outside pixels without upscaling the remaining area. Export as PNG for lossless pixel preservation or high-quality JPG/WebP for compact files.',
          },
          {
            question: 'Can I compare the cropped result with the original image?',
            answer: 'Yes. Click the "Compare original" button in the preview toolbar at any time to toggle between the source image and live cropped preview.',
          },
        ],
      };

    case 'dpi':
      return {
        purpose: `${tool.name} writes print resolution density metadata (such as 72, 96, 150, 200, 300, or 600 DPI) into JPG (JFIF header) or PNG (pHYs chunk) files without altering the image’s pixel width or height.`,
        steps: [
          'Select your JPG, PNG, or WebP image.',
          'Enter the required DPI value (for example, 300 DPI for print or portal compliance).',
          'Choose PNG or JPG output format.',
          'Click Set DPI and download the updated image.',
        ],
        useCases: [
          'Fixing "Image must be 300 DPI" errors on academic, publishing, and government upload portals.',
          'Setting consistent print density metadata before importing graphics into desktop publishing software.',
        ],
        troubleshooting: [
          {
            problem: 'The pixel width and height did not change after setting 300 DPI.',
            solution: 'DPI Changer modifies only the embedded density metadata header. If you also need to recalculate pixel dimensions from CM, MM, or Inches at 300 DPI, use Photo Size Converter or Resize Image in MM/CM.',
          },
        ],
        extraFaqs: [
          {
            question: 'Which image formats support embedded DPI headers here?',
            answer: 'Both JPG (via the JFIF APP0 density segment) and PNG (via the standard pHYs pixels-per-unit chunk) are supported.',
          },
        ],
      };

    case 'signature-maker':
    case 'signature-trim':
    case 'signature-resize':
    case 'signature-compress':
    case 'signature-remove-bg':
    case 'signature-png':
      return {
        purpose: `${tool.name} helps you prepare clean, legible digital signature images for online application portals, PDF signing workflows, and official forms—entirely inside your browser.`,
        steps: [
          tool.workflow === 'signature-maker'
            ? 'Draw your signature on the touch/mouse pad and click "Use drawing", or upload a photo of your signature on white paper.'
            : 'Upload your signature image (JPG, PNG, or WebP).',
          tool.workflow === 'signature-resize'
            ? 'Select your unit (CM, MM, Inches, or PX), enter the required width and height (such as 3.5 × 1.5 cm), and set DPI.'
            : tool.workflow === 'signature-compress'
            ? 'Enter your target KB limit (e.g., 10 KB, 20 KB, or 50 KB) and choose JPG, WebP, or PNG output.'
            : 'Adjust the Trim margin (px) and Background tolerance sliders to remove surrounding paper and blank whitespace.',
          'Verify the live preview and output dimensions, then click Process and Download.',
        ],
        useCases: [
          'Preparing 10 KB–20 KB signature images at 140 × 60 px or 3.5 × 1.5 cm for competitive exam and banking forms.',
          'Removing gray paper backgrounds from mobile photos of handwritten ink signatures.',
          'Creating transparent PNG signatures for placing over letters, invoices, and certificates.',
        ],
        troubleshooting: [
          {
            problem: 'Part of the paper background remains visible around my signature.',
            solution: 'Increase the Background tolerance slider slightly, and make sure the photo of your signature was taken under even light without dark phone shadows.',
          },
          {
            problem: 'My portal requires a JPG signature instead of transparent PNG.',
            solution: 'In Signature Size Reducer or Signature Resize, select JPG as the output format; transparent pixels are automatically flattened onto a crisp white background.',
          },
        ],
        specs: SIGNATURE_SPECS,
        extraFaqs: [
          {
            question: 'What is the best way to photograph a handwritten signature?',
            answer: 'Sign with dark black or blue ink on unlined white paper, hold your phone parallel under bright daylight to avoid shadows, and let the tool trim and clean the background.',
          },
          {
            question: 'Are drawn or uploaded signatures stored anywhere?',
            answer: 'No. Your signature is drawn and processed exclusively in your device’s browser memory and is cleared as soon as you close or reset the tab.',
          },
        ],
      };

    case 'photo-editor':
    case 'text-overlay':
    case 'upscale':
    case 'rotate':
    case 'remove-metadata':
      return {
        purpose: `${tool.name} provides fast, local browser editing to ${tool.summary.toLowerCase()} with live visual feedback and flexible export formats.`,
        steps: [
          'Upload one or more supported images from your device.',
          tool.workflow === 'photo-editor'
            ? 'Adjust the Brightness, Contrast, Saturation, and Blur sliders while inspecting the live preview.'
            : tool.workflow === 'text-overlay'
            ? 'Type your overlay text, pick the placement corner or center, and set font size, colour, and opacity.'
            : tool.workflow === 'upscale'
            ? 'Select a 2×, 3×, or 4× enlargement factor.'
            : tool.workflow === 'rotate'
            ? 'Select 0°, 90°, 180°, or 270° rotation and optional horizontal or vertical flip.'
            : 'Verify the output format and quality settings to re-encode clean pixels without source metadata.',
          'Click Process and download your updated image (or ZIP archive when processing multiple files).',
        ],
        useCases: [
          'Correcting sideways scans, brightening indoor portraits, or adding copyright text watermarks before sharing.',
          'Stripping hidden EXIF camera details and GPS location coordinates before posting photos publicly.',
          'Batch processing up to 20 images at once and downloading them in a single ZIP archive.',
        ],
        troubleshooting: [
          {
            problem: 'I want to undo my slider changes back to the defaults.',
            solution: 'Click the Reset icon button in the top-right corner of the controls panel to restore all default settings immediately.',
          },
        ],
        extraFaqs: [
          {
            question: `Can ${tool.name} process multiple images in a batch?`,
            answer: 'Yes. You can select up to 20 images at once and download all processed results together as a convenient ZIP file.',
          },
        ],
      };

    case 'dimension-check':
    case 'quality-check':
      return {
        purpose: `${tool.name} inspects the exact pixel resolution, aspect ratio, orientation, megapixel count, byte size, and encoding density of any image locally in your browser.`,
        steps: [
          'Drop or select any image file to view instant source telemetry right below the preview.',
          'Review exact pixel width × height, simplified aspect ratio, megapixels, orientation, and byte size.',
          'Optionally adjust output format and quality to test how much file size can be saved, then click Analyze & Export.',
        ],
        useCases: [
          'Verifying whether an image meets exact pixel width, height, and KB requirements before uploading to a strict portal.',
          'Checking aspect ratios (such as 16:9, 4:3, or 35:45) and bits-per-pixel compression efficiency.',
        ],
        troubleshooting: [
          {
            problem: 'My file meets the KB limit, but a form still rejects its dimensions.',
            solution: 'Check the "Source dimensions" readout—many portals require an exact pixel width and height (e.g., 413 × 531 px) in addition to a KB limit.',
          },
        ],
        extraFaqs: [
          {
            question: 'Does inspecting an image upload my file to a server?',
            answer: 'No. Image dimensions and file size are read directly from the local File and ImageBitmap APIs in your browser.',
          },
        ],
      };

    default:
      return {
        purpose: `${tool.name} converts images cleanly between browser-supported formats (${tool.formats}) with adjustable compression quality and automatic white-background flattening when converting transparent PNGs to JPG.`,
        steps: [
          'Select one or up to 20 images from your device.',
          'Choose your target output format and adjust the Output quality slider if exporting to JPG or WebP.',
          'Click Convert and download your converted image (or batch ZIP file).',
        ],
        useCases: [
          'Converting transparent PNGs or modern WebP files into universal JPG format for legacy portals.',
          'Converting JPG photos into lossless PNG or lightweight WebP images.',
        ],
        troubleshooting: [
          {
            problem: 'Transparent areas turned white when converting to JPG.',
            solution: 'The JPEG specification does not support transparency, so transparent pixels are composited onto a clean white background. Choose PNG or WebP if you need to keep transparency.',
          },
        ],
        extraFaqs: [
          {
            question: 'Can I convert multiple images at the same time?',
            answer: 'Yes. Select up to 20 files at once and download all converted files in a single ZIP archive.',
          },
        ],
      };
  }
}
