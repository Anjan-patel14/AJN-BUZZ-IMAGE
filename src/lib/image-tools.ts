export type ToolCategory = "Optimize" | "Edit" | "Convert";

export type ToolId =
  | "compress"
  | "resize"
  | "crop"
  | "convert"
  | "photo-editor"
  | "watermark"
  | "remove-watermark"
  | "upscale"
  | "rotate"
  | "html-to-image"
  | "jpg-to-png";

export type ToolFaq = {
  question: string;
  answer: string;
};

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
  badge?: "Popular" | "New" | "Simple";
  local: boolean;
  seoKeywords: string[];
  useCases: string[];
  steps: [string, string, string];
  faq: ToolFaq[];
};

export const IMAGE_TOOLS: ImageTool[] = [
  {
    id: "compress",
    name: "Compress Image",
    shortName: "Compress",
    summary: "Reduce image size to a KB or MB target.",
    description:
      "Compress JPG, JPEG, PNG or WebP automatically or toward a target file size in KB or MB. Choose a popular target or enter your own limit, preview the result and download it.",
    seoTitle: "Compress Image Online — Reduce Image Size to KB/MB",
    seoDescription:
      "Compress JPG, PNG or WebP to 20 KB, 50 KB, 100 KB, 200 KB, 500 KB, 1 MB or a custom size. Preview and download with AJN Buzz.",
    icon: "Minimize2",
    category: "Optimize",
    formats: "JPG · PNG · WebP",
    featured: true,
    badge: "Popular",
    local: true,
    seoKeywords: [
      "compress image",
      "compress image online",
      "compress image to kb",
      "compress image to mb",
      "reduce image size",
      "reduce photo size",
      "image size reducer",
      "photo compressor",
      "jpg compressor",
      "jpeg compressor",
      "png compressor",
      "webp compressor",
      "compress image to 20kb",
      "compress image to 50kb",
      "compress image to 100kb",
      "compress image to 200kb",
      "compress image to 500kb",
      "compress image to 1mb",
      "compress image without losing quality",
    ],
    useCases: ["Online forms", "Email attachments", "Passport photos"],
    steps: [
      "Select one image.",
      "Choose Auto or enter a KB/MB target.",
      "Compress, preview and download.",
    ],
    faq: [
      {
        question:
          "Can I compress an image to 100 KB or another file-size limit?",
        answer:
          "Yes. Choose target-size mode, enter the KB or MB limit, and AJN Buzz searches encoder quality first and image dimensions only when needed.",
      },
      {
        question: "Which format is best for a very small target?",
        answer:
          "WebP and JPG usually reach aggressive photo-size targets better than PNG. Auto output uses WebP for target-size compression.",
      },
      {
        question:
          "Will the result always be exactly the requested number of bytes?",
        answer:
          "Browser encoders produce discrete file sizes. AJN Buzz aims for a result at or below the requested limit and reports clearly when only the closest safe result is possible.",
      },
    ],
  },
  {
    id: "resize",
    name: "Resize Image",
    shortName: "Resize",
    summary: "Change image dimensions easily.",
    description:
      "Resize JPG, PNG, WebP or SVG images to exact pixel dimensions. Keep the aspect ratio locked when you want proportions preserved.",
    seoTitle: "Resize Image Online — Change Width & Height in Pixels",
    seoDescription:
      "Resize JPG, PNG, WebP or SVG images to exact width and height in pixels. Lock aspect ratio, preview the result and download with AJN Buzz.",
    icon: "Scaling",
    category: "Optimize",
    formats: "JPG · PNG · WebP · SVG",
    featured: true,
    badge: "Popular",
    local: true,
    seoKeywords: [
      "resize image",
      "resize image online",
      "image resizer",
      "resize photo",
      "change image dimensions",
      "resize jpg",
      "resize png",
      "resize webp",
      "resize image pixels",
    ],
    useCases: ["Website images", "Social posts", "Form uploads"],
    steps: [
      "Select one or more images.",
      "Enter width and height.",
      "Process, preview and download.",
    ],
    faq: [
      {
        question: "Can I keep the original aspect ratio?",
        answer:
          "Yes. Keep aspect-ratio lock enabled and changing one dimension updates the other automatically.",
      },
      {
        question: "Can I resize several images?",
        answer:
          "Yes. Resize Image supports multiple selected images and creates a ZIP when there is more than one result.",
      },
    ],
  },
  {
    id: "crop",
    name: "Crop Image",
    shortName: "Crop",
    summary: "Focus on what matters.",
    description:
      "Crop JPG, PNG or WebP using X, Y, width and height controls. The crop is clamped safely to the selected image bounds.",
    seoTitle: "Crop Image Online — Crop JPG, PNG & WebP",
    seoDescription:
      "Crop JPG, PNG or WebP images online using exact X, Y, width and height controls. Preview the crop and download with AJN Buzz.",
    icon: "Crop",
    category: "Edit",
    formats: "JPG · PNG · WebP",
    featured: true,
    local: true,
    seoKeywords: [
      "crop image",
      "crop image online",
      "crop photo",
      "image cropper",
      "crop jpg",
      "crop png",
      "crop webp",
      "trim image",
    ],
    useCases: [
      "Remove unwanted edges",
      "Exact framing",
      "Prepare profile images",
    ],
    steps: ["Select an image.", "Set the crop area.", "Process and download."],
    faq: [
      {
        question: "How do I crop precisely?",
        answer:
          "Use X and Y for the starting point, then enter the crop width and height. Values outside the image are safely clamped.",
      },
    ],
  },
  {
    id: "convert",
    name: "Convert Image",
    shortName: "Convert",
    summary: "JPG, PNG, WebP and more.",
    description:
      "Convert browser-supported images to JPG, PNG or WebP. Choose the output format and quality, then preview the converted file.",
    seoTitle: "Image Converter Online — JPG, PNG & WebP",
    seoDescription:
      "Convert images to JPG, PNG or WebP online. Choose output format and quality, preview the result and download with AJN Buzz.",
    icon: "RefreshCw",
    category: "Convert",
    formats: "JPG · PNG · WebP",
    featured: true,
    badge: "Popular",
    local: true,
    seoKeywords: [
      "image converter",
      "image converter online",
      "convert image",
      "jpg png webp converter",
      "convert jpg to png",
      "convert png to jpg",
      "convert webp to jpg",
      "convert jpg to webp",
    ],
    useCases: ["Change file format", "Prepare web images", "Convert photos"],
    steps: [
      "Select an image.",
      "Choose JPG, PNG or WebP.",
      "Convert and download.",
    ],
    faq: [
      {
        question: "Which output formats are available?",
        answer:
          "The general image converter outputs JPG, PNG or WebP. Source decoding depends on modern browser support.",
      },
    ],
  },
  {
    id: "remove-watermark",
    name: "Remove Watermark",
    shortName: "Remove Watermark",
    summary: "Repair a selected watermark or logo area.",
    description:
      "Remove a small watermark, timestamp or logo from an image you are allowed to edit. Select only the marked area and AJN Buzz reconstructs it from surrounding pixels with local browser inpainting.",
    seoTitle: "Remove Watermark from Image Online",
    seoDescription:
      "Remove a selected watermark, timestamp or small logo area from your own image with local pixel reconstruction and download the repaired result with AJN Buzz.",
    icon: "Eraser",
    category: "Edit",
    formats: "JPG · PNG · WebP",
    featured: true,
    local: true,
    seoKeywords: [
      "remove watermark from image",
      "remove watermark online",
      "remove text from photo",
      "remove timestamp from photo",
      "image watermark remover",
      "remove logo from image",
    ],
    useCases: [
      "Remove your own watermark",
      "Clean timestamps",
      "Repair small logo overlays",
    ],
    steps: [
      "Select an image you are allowed to edit.",
      "Set the watermark area tightly.",
      "Choose repair strength, process and download.",
    ],
    faq: [
      {
        question: "How does Remove Watermark work?",
        answer:
          "AJN Buzz repairs only the selected area using surrounding image pixels. Best results come from tight selections over simple or moderately textured backgrounds.",
      },
    ],
  },
  {
    id: "rotate",
    name: "Rotate & Flip Image",
    shortName: "Rotate & Flip",
    summary: "Rotate or flip an image.",
    description:
      "Rotate an image by 0°, 90°, 180° or 270° and optionally flip it horizontally or vertically without clipping.",
    seoTitle: "Rotate & Flip Image Online",
    seoDescription:
      "Rotate images 90, 180 or 270 degrees and flip horizontally or vertically online with AJN Buzz.",
    icon: "RotateCw",
    category: "Edit",
    formats: "JPG · PNG · WebP",
    featured: true,
    local: true,
    seoKeywords: [
      "rotate image",
      "rotate image online",
      "flip image",
      "flip photo",
      "rotate jpg",
      "rotate png",
    ],
    useCases: ["Fix orientation", "Mirror images", "Rotate screenshots"],
    steps: [
      "Select an image.",
      "Choose rotation and optional flip.",
      "Process and download.",
    ],
    faq: [
      {
        question: "Can I flip without rotating?",
        answer: "Yes. Choose 0° and then select horizontal or vertical flip.",
      },
    ],
  },
  {
    id: "watermark",
    name: "Watermark Image",
    shortName: "Watermark",
    summary: "Add text or branding.",
    description:
      "Add your own text watermark to JPG, PNG or WebP. Control text, color, size, opacity and position before downloading.",
    seoTitle: "Add Watermark to Image Online",
    seoDescription:
      "Add a text watermark to JPG, PNG or WebP images. Choose text, color, size, opacity and position with AJN Buzz.",
    icon: "Stamp",
    category: "Edit",
    formats: "JPG · PNG · WebP",
    featured: true,
    local: true,
    seoKeywords: [
      "watermark image",
      "watermark image online",
      "add watermark to photo",
      "text watermark",
      "watermark jpg",
      "watermark png",
    ],
    useCases: ["Brand photos", "Mark previews", "Add ownership text"],
    steps: [
      "Select an image.",
      "Enter watermark text and style.",
      "Process and download.",
    ],
    faq: [
      {
        question: "Can I choose where the watermark appears?",
        answer:
          "Yes. Choose the center or one of the four corners, then adjust text, size, color and opacity.",
      },
    ],
  },
  {
    id: "photo-editor",
    name: "Photo Editor",
    shortName: "Photo Editor",
    summary: "Brightness, contrast, color and blur.",
    description:
      "Make focused photo adjustments with brightness, contrast, saturation and blur controls. Preview changes before downloading.",
    seoTitle: "Photo Editor Online — Brightness, Contrast, Color & Blur",
    seoDescription:
      "Edit photo brightness, contrast, saturation and blur online. Preview adjustments and download the edited image with AJN Buzz.",
    icon: "SlidersHorizontal",
    category: "Edit",
    formats: "JPG · PNG · WebP",
    featured: true,
    badge: "Simple",
    local: true,
    seoKeywords: [
      "photo editor online",
      "edit image online",
      "image editor",
      "brightness image",
      "contrast image",
      "saturation image",
      "blur image",
    ],
    useCases: ["Fix dark photos", "Improve contrast", "Add blur"],
    steps: ["Select an image.", "Adjust the sliders.", "Preview and download."],
    faq: [
      {
        question: "Which adjustments are included?",
        answer:
          "Brightness, contrast, saturation and blur are available with live preview.",
      },
    ],
  },
  {
    id: "upscale",
    name: "Upscale Image",
    shortName: "Upscale",
    summary: "Increase image dimensions safely.",
    description:
      "Upscale images by 2×, 3× or 4× with high-quality browser resampling and safety checks before large canvases are allocated.",
    seoTitle: "Upscale Image Online — 2×, 3× or 4×",
    seoDescription:
      "Increase image dimensions by 2×, 3× or 4× online with high-quality browser resampling and safe output limits.",
    icon: "Maximize2",
    category: "Optimize",
    formats: "JPG · PNG · WebP",
    featured: true,
    local: true,
    seoKeywords: [
      "upscale image",
      "upscale image online",
      "increase image resolution",
      "enlarge image",
      "2x image",
      "4x image",
    ],
    useCases: [
      "Larger exports",
      "Print preparation",
      "High-resolution layouts",
    ],
    steps: [
      "Select an image.",
      "Choose 2×, 3× or 4×.",
      "Upscale and download.",
    ],
    faq: [
      {
        question: "Is this generative AI upscaling?",
        answer:
          "No. It uses high-quality browser resampling and does not claim to invent new visual details.",
      },
    ],
  },
  {
    id: "html-to-image",
    name: "HTML to Image",
    shortName: "HTML to Image",
    summary: "Turn HTML into PNG, JPG or WebP.",
    description:
      "Render safe HTML markup into a downloadable PNG, JPG or WebP image directly in your browser. Control canvas size and background color.",
    seoTitle: "HTML to Image Online — Convert HTML to PNG, JPG or WebP",
    seoDescription:
      "Convert HTML markup to PNG, JPG or WebP online. Choose image size, background and format, preview the rendered image and download with AJN Buzz.",
    icon: "Code2",
    category: "Convert",
    formats: "HTML → PNG · JPG · WebP",
    featured: true,
    badge: "New",
    local: true,
    seoKeywords: [
      "html to image",
      "html to png",
      "html to jpg",
      "html to webp",
      "convert html to image",
      "render html to png",
    ],
    useCases: ["Social graphics", "Code-generated cards", "HTML previews"],
    steps: [
      "Enter or paste HTML.",
      "Choose image size, background and output format.",
      "Render, preview and download.",
    ],
    faq: [
      {
        question: "Does HTML to Image run on a server?",
        answer:
          "No. AJN Buzz sanitizes the markup and renders it in your browser using SVG foreignObject and Canvas.",
      },
      {
        question: "Can scripts run inside my HTML?",
        answer:
          "No. Script-like tags, event handlers and javascript: URLs are removed before rendering.",
      },
    ],
  },
  {
    id: "jpg-to-png",
    name: "JPG to PNG / WebP",
    shortName: "JPG to PNG/WebP",
    summary: "Convert JPG to PNG or WebP.",
    description:
      "Convert JPG or JPEG files to PNG or WebP in a dedicated conversion workflow. Non-JPEG sources are rejected clearly.",
    seoTitle: "JPG to PNG or WebP Converter Online",
    seoDescription:
      "Convert JPG or JPEG images to PNG or WebP online. Choose the output format, preview and download with AJN Buzz.",
    icon: "Images",
    category: "Convert",
    formats: "JPG → PNG · WebP",
    featured: true,
    local: true,
    seoKeywords: [
      "jpg to png",
      "jpg to png online",
      "jpeg to png",
      "jpg to webp",
      "jpeg to webp",
      "convert jpg",
    ],
    useCases: ["JPG to PNG", "JPG to WebP", "Change JPEG format"],
    steps: [
      "Select JPG or JPEG files.",
      "Choose PNG or WebP.",
      "Convert and download.",
    ],
    faq: [
      {
        question: "Which source files are accepted?",
        answer:
          "This dedicated tool accepts JPG or JPEG source files and outputs PNG or WebP.",
      },
    ],
  },
];

export const TOOL_MAP = new Map(IMAGE_TOOLS.map((tool) => [tool.id, tool]));
export const TOOL_CATEGORIES: Array<"All" | ToolCategory> = [
  "All",
  "Optimize",
  "Edit",
  "Convert",
];
export const FEATURED_TOOLS = IMAGE_TOOLS.filter((tool) => tool.featured);
export const PRIMARY_TOOL_IDS: ToolId[] = [
  "compress",
  "resize",
  "crop",
  "convert",
];
