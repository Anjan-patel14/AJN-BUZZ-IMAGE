import type { ImageTool, PhysicalUnit } from './image-tools';

export type OutputFormat = 'image/png' | 'image/jpeg' | 'image/webp';
export type CompressionMode = 'auto' | 'target';
export type WatermarkPosition = 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export type ImageOptions = {
  width?: number;
  height?: number;
  cropX?: number;
  cropY?: number;
  cropWidth?: number;
  cropHeight?: number;
  angle?: number;
  flip?: 'none' | 'horizontal' | 'vertical';
  format?: OutputFormat;
  quality?: number;
  text?: string;
  opacity?: number;
  fontSize?: number;
  amount?: number;
  color?: string;
  brightness?: number;
  contrast?: number;
  saturation?: number;
  blur?: number;
  position?: WatermarkPosition;
  unit?: PhysicalUnit;
  physicalWidth?: number;
  physicalHeight?: number;
  dpi?: number;
  ratioWidth?: number;
  ratioHeight?: number;
  anchorX?: number;
  anchorY?: number;
  backgroundColor?: string;
  replaceBackground?: boolean;
  trimMargin?: number;
};

export type ImageProcessResult = {
  blob: Blob;
  width: number;
  height: number;
  type: OutputFormat;
  targetReached?: boolean;
  targetBytes?: number;
  note?: string;
  attempts?: number;
};

export type CompressionOptions = { mode: CompressionMode; targetBytes?: number; format?: OutputFormat };

type Decoded = { source: CanvasImageSource; width: number; height: number; close?: () => void };

const MAX_EDGE = 12000;
const MAX_PIXELS = 36_000_000;
const MIN_COMPRESS_EDGE = 64;

function validateDimensions(width: number, height: number) {
  if (!width || !height || !Number.isFinite(width) || !Number.isFinite(height)) throw new Error('The image has invalid dimensions.');
  if (width > MAX_EDGE || height > MAX_EDGE || width * height > MAX_PIXELS) {
    throw new Error('This output is too large for safe browser processing. Reduce the dimensions or DPI.');
  }
}

function supportedInput(file: File) { return file.type.startsWith('image/') || /\.svg$/i.test(file.name); }

async function decode(file: File): Promise<Decoded> {
  if (!supportedInput(file)) throw new Error('Choose a supported image file.');
  if ('createImageBitmap' in window) {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      validateDimensions(bitmap.width, bitmap.height);
      return { source: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() };
    } catch { /* browser Image decoder fallback */ }
  }
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.decoding = 'async';
  image.src = url;
  try {
    await image.decode();
    validateDimensions(image.naturalWidth, image.naturalHeight);
    return { source: image, width: image.naturalWidth, height: image.naturalHeight };
  } catch { throw new Error('This image format could not be decoded by your browser.'); }
  finally { URL.revokeObjectURL(url); }
}

function makeCanvas(width: number, height: number) {
  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));
  validateDimensions(w, h);
  const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h; return canvas;
}

function context2d(canvas: HTMLCanvasElement, readFrequently = false) {
  const ctx = canvas.getContext('2d', readFrequently ? { willReadFrequently: true } : undefined);
  if (!ctx) throw new Error('Canvas processing is unavailable in this browser.');
  return ctx;
}

function drawHighQuality(ctx: CanvasRenderingContext2D, source: CanvasImageSource, width: number, height: number) {
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; ctx.drawImage(source, 0, 0, width, height);
}

function drawDecoded(decoded: Decoded, width = decoded.width, height = decoded.height) {
  const canvas = makeCanvas(width, height); drawHighQuality(context2d(canvas), decoded.source, canvas.width, canvas.height); return canvas;
}

function canvasBlob(canvas: HTMLCanvasElement, type: OutputFormat, quality = .9) {
  return new Promise<Blob>((resolve, reject) => {
    const encode = (target: HTMLCanvasElement) => target.toBlob(
      value => value ? resolve(value) : reject(new Error(`Browser could not encode ${type.replace('image/', '').toUpperCase()}.`)),
      type, Math.min(1, Math.max(.05, quality)),
    );
    if (type !== 'image/jpeg') { encode(canvas); return; }
    const flattened = makeCanvas(canvas.width, canvas.height); const ctx = context2d(flattened);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, flattened.width, flattened.height); ctx.drawImage(canvas, 0, 0); encode(flattened);
  });
}

function sourceOutputFormat(file: File): OutputFormat | null {
  if (file.type === 'image/jpeg' || file.type === 'image/png' || file.type === 'image/webp') return file.type;
  return null;
}

function safeOutputType(tool: ImageTool, requested: OutputFormat | undefined, inputType: string): OutputFormat {
  if (['to-jpg'].includes(tool.workflow)) return 'image/jpeg';
  if (['remove-bg','signature-maker','signature-remove-bg','signature-png'].includes(tool.workflow)) return 'image/png';
  if (tool.workflow === 'jpg-to-png') return requested === 'image/webp' ? 'image/webp' : 'image/png';
  if (tool.workflow === 'dpi') return requested === 'image/jpeg' ? 'image/jpeg' : 'image/png';
  if (requested) return requested;
  if (inputType === 'image/jpeg' || inputType === 'image/png' || inputType === 'image/webp') return inputType;
  return 'image/png';
}

function hexToRgb(hex: string) {
  const clean = (hex || '#ffffff').replace('#', '').trim();
  const value = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean.padEnd(6, 'f').slice(0, 6);
  const number = Number.parseInt(value, 16);
  return { r: (number >> 16) & 255, g: (number >> 8) & 255, b: number & 255 };
}

export function pixelsFromPhysical(value: number, unit: PhysicalUnit, dpi: number) {
  if (!Number.isFinite(value) || value <= 0) return 0;
  if (unit === 'px') return Math.round(value);
  const inches = unit === 'in' ? value : unit === 'cm' ? value / 2.54 : value / 25.4;
  return Math.max(1, Math.round(inches * dpi));
}

export async function imageDimensions(file: File) {
  const decoded = await decode(file); try { return { width: decoded.width, height: decoded.height }; } finally { decoded.close?.(); }
}

async function bestLossyAtSize(canvas: HTMLCanvasElement, type: 'image/jpeg' | 'image/webp', targetBytes: number) {
  let low = .12, high = .96, best: { blob: Blob; quality: number } | null = null, smallest: { blob: Blob; quality: number } | null = null, attempts = 0;
  for (let i = 0; i < 10; i++) {
    const quality = (low + high) / 2; const blob = await canvasBlob(canvas, type, quality); attempts++;
    if (!smallest || blob.size < smallest.blob.size) smallest = { blob, quality };
    if (blob.size <= targetBytes) { best = { blob, quality }; low = quality; } else high = quality;
  }
  if (best) return { ...best, attempts };
  const floor = await canvasBlob(canvas, type, .08); attempts++;
  if (!smallest || floor.size < smallest.blob.size) smallest = { blob: floor, quality: .08 };
  return { ...(smallest as { blob: Blob; quality: number }), attempts };
}

export async function compressImage(file: File, options: CompressionOptions): Promise<ImageProcessResult> {
  const rawTarget = Number(options.targetBytes ?? 0);
  if (options.mode === 'target' && (!Number.isFinite(rawTarget) || rawTarget <= 0)) throw new Error('Enter a valid target file size greater than 0.');
  const decoded = await decode(file); const requestedType = options.format || sourceOutputFormat(file) || 'image/webp'; const target = Math.max(1, Math.round(rawTarget));
  try {
    if (options.mode === 'target' && target >= file.size && sourceOutputFormat(file) === requestedType) return { blob:file,width:decoded.width,height:decoded.height,type:requestedType,targetReached:true,targetBytes:target,note:'The image is already at or below the requested size.',attempts:0 };
    if (options.mode === 'auto') {
      const canvas = drawDecoded(decoded); const blob = await canvasBlob(canvas, requestedType, requestedType === 'image/png' ? 1 : .88);
      if (sourceOutputFormat(file) === requestedType && blob.size >= file.size) return { blob:file,width:decoded.width,height:decoded.height,type:requestedType,note:'The original was already smaller, so it was kept.',attempts:1 };
      return { blob,width:canvas.width,height:canvas.height,type:requestedType,attempts:1 };
    }
    let scale = 1, attempts = 0; let smallest: { blob: Blob; width: number; height: number } | null = null;
    for (let pass = 0; pass < 9; pass++) {
      const width = Math.max(MIN_COMPRESS_EDGE, Math.round(decoded.width * scale)); const height = Math.max(MIN_COMPRESS_EDGE, Math.round(decoded.height * scale)); const canvas = drawDecoded(decoded, width, height);
      let candidate: Blob;
      if (requestedType === 'image/png') { candidate = await canvasBlob(canvas, requestedType, 1); attempts++; }
      else { const result = await bestLossyAtSize(canvas, requestedType, target); candidate = result.blob; attempts += result.attempts; }
      if (!smallest || candidate.size < smallest.blob.size) smallest = { blob:candidate,width,height };
      if (candidate.size <= target) return { blob:candidate,width,height,type:requestedType,targetReached:true,targetBytes:target,attempts,note:pass>0?'Target reached by balancing quality and dimensions.':'Target reached without reducing dimensions.' };
      if (width <= MIN_COMPRESS_EDGE || height <= MIN_COMPRESS_EDGE) break;
      const ratio = Math.sqrt(target / Math.max(1, candidate.size)) * .96; scale *= Math.min(.88, Math.max(.55, ratio));
    }
    if (!smallest) throw new Error('The browser could not produce a compressed image.');
    return { blob:smallest.blob,width:smallest.width,height:smallest.height,type:requestedType,targetReached:smallest.blob.size<=target,targetBytes:target,attempts,note:`Closest safe browser result is ${Math.max(1,Math.round(smallest.blob.size/1024))} KB.` };
  } finally { decoded.close?.(); }
}

function drawCover(source: CanvasImageSource, sourceWidth: number, sourceHeight: number, outputWidth: number, outputHeight: number, anchorX = .5, anchorY = .5) {
  const canvas = makeCanvas(outputWidth, outputHeight); const ctx = context2d(canvas);
  const targetRatio = outputWidth / outputHeight; const sourceRatio = sourceWidth / sourceHeight;
  let sx = 0, sy = 0, sw = sourceWidth, sh = sourceHeight;
  if (sourceRatio > targetRatio) { sw = sourceHeight * targetRatio; sx = (sourceWidth - sw) * Math.min(1,Math.max(0,anchorX)); }
  else if (sourceRatio < targetRatio) { sh = sourceWidth / targetRatio; sy = (sourceHeight - sh) * Math.min(1,Math.max(0,anchorY)); }
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; ctx.drawImage(source, sx, sy, sw, sh, 0, 0, outputWidth, outputHeight); return canvas;
}

function edgeBackgroundTransparency(canvas: HTMLCanvasElement, selectedColor?: string, tolerance = 42) {
  const ctx = context2d(canvas, true); const pixels = ctx.getImageData(0,0,canvas.width,canvas.height);
  const sample = selectedColor ? hexToRgb(selectedColor) : (() => {
    const positions=[0,(canvas.width-1)*4,((canvas.height-1)*canvas.width)*4,((canvas.height*canvas.width)-1)*4];
    const sum=positions.reduce((a,p)=>({r:a.r+pixels.data[p]!,g:a.g+pixels.data[p+1]!,b:a.b+pixels.data[p+2]!}),{r:0,g:0,b:0});
    return {r:Math.round(sum.r/4),g:Math.round(sum.g/4),b:Math.round(sum.b/4)};
  })();
  const limit=Math.min(220,Math.max(5,tolerance)); const width=canvas.width,height=canvas.height,count=width*height; const connected=new Uint8Array(count);
  const matches=(index:number)=>{const i=index*4,dr=pixels.data[i]!-sample.r,dg=pixels.data[i+1]!-sample.g,db=pixels.data[i+2]!-sample.b;return Math.sqrt(dr*dr+dg*dg+db*db)<=limit;};
  for(let x=0;x<width;x++){if(matches(x))connected[x]=1;const b=(height-1)*width+x;if(matches(b))connected[b]=1;}
  for(let y=0;y<height;y++){const l=y*width,r=l+width-1;if(matches(l))connected[l]=1;if(matches(r))connected[r]=1;}
  for(let sweep=0;sweep<4;sweep++){
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){const index=y*width+x;if(connected[index]||!matches(index))continue;if((x>0&&connected[index-1])||(y>0&&connected[index-width]))connected[index]=1;}
    for(let y=height-1;y>=0;y--)for(let x=width-1;x>=0;x--){const index=y*width+x;if(connected[index]||!matches(index))continue;if((x+1<width&&connected[index+1])||(y+1<height&&connected[index+width]))connected[index]=1;}
  }
  for(let index=0;index<count;index++)if(connected[index])pixels.data[index*4+3]=0;
  ctx.putImageData(pixels,0,0); return canvas;
}

function trimSignature(source: HTMLCanvasElement, margin = 12) {
  const ctx=context2d(source,true), pixels=ctx.getImageData(0,0,source.width,source.height), data=pixels.data;
  const corners=[0,(source.width-1)*4,((source.height-1)*source.width)*4,((source.height*source.width)-1)*4];
  const bg=corners.reduce((a,p)=>({r:a.r+data[p]!,g:a.g+data[p+1]!,b:a.b+data[p+2]!,a:a.a+data[p+3]!}),{r:0,g:0,b:0,a:0}); bg.r/=4;bg.g/=4;bg.b/=4;bg.a/=4;
  let minX=source.width,minY=source.height,maxX=-1,maxY=-1;
  for(let y=0;y<source.height;y++)for(let x=0;x<source.width;x++){const i=(y*source.width+x)*4,alpha=data[i+3]!;if(alpha<10)continue;const dr=data[i]!-bg.r,dg=data[i+1]!-bg.g,db=data[i+2]!-bg.b;const distance=Math.sqrt(dr*dr+dg*dg+db*db);const visible=bg.a<40?alpha>20:distance>28;if(!visible)continue;minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}
  if(maxX<minX||maxY<minY)return source;
  const m=Math.max(0,Math.round(margin));const x=Math.max(0,minX-m),y=Math.max(0,minY-m),right=Math.min(source.width,maxX+1+m),bottom=Math.min(source.height,maxY+1+m);
  const out=makeCanvas(right-x,bottom-y);context2d(out).drawImage(source,x,y,right-x,bottom-y,0,0,right-x,bottom-y);return out;
}

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const value of bytes) { crc ^= value; for (let k=0;k<8;k++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1)); }
  return (crc ^ 0xffffffff) >>> 0;
}
function u32(value:number){return new Uint8Array([(value>>>24)&255,(value>>>16)&255,(value>>>8)&255,value&255]);}
function concatBytes(parts:Uint8Array[]){const size=parts.reduce((n,p)=>n+p.length,0),out=new Uint8Array(size);let offset=0;for(const p of parts){out.set(p,offset);offset+=p.length;}return out;}

async function applyDpi(blob: Blob, type: OutputFormat, dpi: number) {
  const density=Math.min(65535,Math.max(1,Math.round(dpi)));
  const raw=new Uint8Array(await blob.arrayBuffer());
  if(type==='image/jpeg'){
    for(let i=2;i+16<raw.length;){if(raw[i]!==0xff)break;const marker=raw[i+1]!;if(marker===0xd9||marker===0xda)break;const length=(raw[i+2]!<<8)|raw[i+3]!;if(marker===0xe0&&raw[i+4]===0x4a&&raw[i+5]===0x46&&raw[i+6]===0x49&&raw[i+7]===0x46&&raw[i+8]===0){const out=raw.slice();out[i+11]=1;out[i+12]=(density>>8)&255;out[i+13]=density&255;out[i+14]=(density>>8)&255;out[i+15]=density&255;return new Blob([out],{type});}if(length<2)break;i+=2+length;}
    const segment=new Uint8Array([0xff,0xe0,0x00,0x10,0x4a,0x46,0x49,0x46,0x00,0x01,0x01,0x01,(density>>8)&255,density&255,(density>>8)&255,density&255,0x00,0x00]);
    return new Blob([concatBytes([raw.slice(0,2),segment,raw.slice(2)])],{type});
  }
  if(type==='image/png'&&raw.length>8){
    const ppm=Math.max(1,Math.round(dpi/0.0254)); const data=concatBytes([u32(ppm),u32(ppm),new Uint8Array([1])]); const typeBytes=new TextEncoder().encode('pHYs'); const chunk=concatBytes([u32(data.length),typeBytes,data,u32(crc32(concatBytes([typeBytes,data])))]);
    const parts:Uint8Array[]=[raw.slice(0,8)];let offset=8,inserted=false;
    while(offset+12<=raw.length){const length=(raw[offset]!<<24)|(raw[offset+1]!<<16)|(raw[offset+2]!<<8)|raw[offset+3]!;const end=offset+12+length;if(end>raw.length)break;const name=String.fromCharCode(...raw.slice(offset+4,offset+8));if(!inserted&&name==='IDAT'){parts.push(chunk);inserted=true;}if(name!=='pHYs')parts.push(raw.slice(offset,end));offset=end;}
    if(!inserted)parts.push(chunk);return new Blob([concatBytes(parts)],{type});
  }
  return blob;
}

export async function processImage(file: File, tool: ImageTool, options: ImageOptions = {}): Promise<ImageProcessResult> {
  if (tool.workflow === 'compress') return compressImage(file,{mode:'auto',format:safeOutputType(tool,options.format,file.type)});
  const decoded=await decode(file);const quality=Math.min(1,Math.max(.05,options.quality??.9));const type=safeOutputType(tool,options.format,file.type);const dpi=Math.min(1200,Math.max(1,Number(options.dpi||tool.preset?.dpi||300)));
  try {
    let canvas:HTMLCanvasElement;
    if(tool.workflow==='resize-px'){
      const rw=Number(options.width||0),rh=Number(options.height||0);let w=decoded.width,h=decoded.height;if(rw>0&&rh>0){w=rw;h=rh;}else if(rw>0){w=rw;h=Math.round(decoded.height*rw/decoded.width);}else if(rh>0){h=rh;w=Math.round(decoded.width*rh/decoded.height);}canvas=drawDecoded(decoded,w,h);
    } else if(tool.workflow==='resize-physical'||tool.workflow==='photo-size'||tool.workflow==='signature-resize'){
      const unit=options.unit||tool.defaultUnit||'cm';const w=pixelsFromPhysical(Number(options.physicalWidth||3.5),unit,dpi),h=pixelsFromPhysical(Number(options.physicalHeight||4.5),unit,dpi);canvas=drawDecoded(decoded,w,h);
    } else if(tool.workflow==='crop'){
      const x=Math.max(0,Math.min(decoded.width-1,Number(options.cropX||0))),y=Math.max(0,Math.min(decoded.height-1,Number(options.cropY||0))),w=Math.min(decoded.width-x,Math.max(1,Number(options.cropWidth||decoded.width-x))),h=Math.min(decoded.height-y,Math.max(1,Number(options.cropHeight||decoded.height-y)));canvas=makeCanvas(w,h);context2d(canvas).drawImage(decoded.source,x,y,w,h,0,0,w,h);
    } else if(tool.workflow==='aspect-crop'){
      const rw=Math.max(.01,Number(options.ratioWidth||1)),rh=Math.max(.01,Number(options.ratioHeight||1));const target=rw/rh;let outW=decoded.width,outH=decoded.height;if(decoded.width/decoded.height>target)outW=Math.round(decoded.height*target);else outH=Math.round(decoded.width/target);canvas=drawCover(decoded.source,decoded.width,decoded.height,outW,outH,options.anchorX??.5,options.anchorY??.5);
    } else if(tool.workflow==='photo-preset'){
      const unit=options.unit||tool.preset?.unit||'mm';const pw=Number(options.physicalWidth||tool.preset?.width||35),ph=Number(options.physicalHeight||tool.preset?.height||45);const w=pixelsFromPhysical(pw,unit,dpi),h=pixelsFromPhysical(ph,unit,dpi);
      let source:CanvasImageSource=decoded.source,sw=decoded.width,sh=decoded.height;let prepared:HTMLCanvasElement|undefined;
      if(options.replaceBackground){prepared=drawDecoded(decoded);edgeBackgroundTransparency(prepared,undefined,Number(options.amount||42));source=prepared;sw=prepared.width;sh=prepared.height;}
      canvas=drawCover(source,sw,sh,w,h,options.anchorX??.5,options.anchorY??.42);
      if(options.replaceBackground){const composed=makeCanvas(w,h),ctx=context2d(composed);ctx.fillStyle=options.backgroundColor||'#ffffff';ctx.fillRect(0,0,w,h);ctx.drawImage(canvas,0,0);canvas=composed;}
    } else if(tool.workflow==='dpi'){
      canvas=drawDecoded(decoded);
    } else if(tool.workflow==='signature-maker'||tool.workflow==='signature-trim'||tool.workflow==='signature-png'){
      const base=drawDecoded(decoded);
      if(tool.workflow==='signature-maker'||tool.workflow==='signature-png') edgeBackgroundTransparency(base,undefined,Number(options.amount||48));
      canvas=trimSignature(base,Number(options.trimMargin??12));
    } else if(tool.workflow==='signature-remove-bg'){
      canvas=drawDecoded(decoded);edgeBackgroundTransparency(canvas,undefined,Number(options.amount||48));canvas=trimSignature(canvas,Number(options.trimMargin??10));
    } else if(tool.workflow==='photo-editor'){
      canvas=makeCanvas(decoded.width,decoded.height);const ctx=context2d(canvas);ctx.filter=[`brightness(${Math.max(0,Number(options.brightness??100))}%)`,`contrast(${Math.max(0,Number(options.contrast??100))}%)`,`saturate(${Math.max(0,Number(options.saturation??100))}%)`,`blur(${Math.max(0,Number(options.blur??0))}px)`].join(' ');drawHighQuality(ctx,decoded.source,decoded.width,decoded.height);ctx.filter='none';
    } else if(tool.workflow==='watermark'){
      canvas=drawDecoded(decoded);const ctx=context2d(canvas),text=(options.text||'AJN Buzz').slice(0,120),size=Math.max(12,Number(options.fontSize||Math.max(24,Math.round(decoded.width/18)))),position=options.position||'center',margin=Math.max(18,Math.round(Math.min(decoded.width,decoded.height)*.035));const x=position.endsWith('left')?margin:position.endsWith('right')?decoded.width-margin:decoded.width/2,y=position.startsWith('top')?margin:position.startsWith('bottom')?decoded.height-margin:decoded.height/2;ctx.save();ctx.globalAlpha=Math.min(1,Math.max(.05,Number(options.opacity??.55)));ctx.font=`800 ${size}px Inter, Arial, sans-serif`;ctx.textAlign=position.endsWith('left')?'left':position.endsWith('right')?'right':'center';ctx.textBaseline=position.startsWith('top')?'top':position.startsWith('bottom')?'bottom':'middle';ctx.fillStyle=options.color||'#ffffff';ctx.shadowColor='rgba(0,0,0,.45)';ctx.shadowBlur=6;ctx.translate(x,y);if(position==='center')ctx.rotate(-Math.PI/8);ctx.fillText(text,0,0,decoded.width*.9);ctx.restore();
    } else if(tool.workflow==='remove-bg'){
      canvas=drawDecoded(decoded);edgeBackgroundTransparency(canvas,options.color,Number(options.amount||42));
    } else if(tool.workflow==='change-bg'){
      const transparent=drawDecoded(decoded);edgeBackgroundTransparency(transparent,undefined,Number(options.amount||42));canvas=makeCanvas(decoded.width,decoded.height);const ctx=context2d(canvas);ctx.fillStyle=options.backgroundColor||'#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(transparent,0,0);
    } else if(tool.workflow==='upscale'){
      const scale=Math.min(4,Math.max(2,Math.round(options.amount||2)));canvas=drawDecoded(decoded,decoded.width*scale,decoded.height*scale);
    } else if(tool.workflow==='rotate'){
      const angle=((Number(options.angle??90)%360)+360)%360,swap=angle===90||angle===270,w=swap?decoded.height:decoded.width,h=swap?decoded.width:decoded.height,rotated=makeCanvas(w,h),rctx=context2d(rotated);rctx.translate(w/2,h/2);rctx.rotate(angle*Math.PI/180);rctx.drawImage(decoded.source,-decoded.width/2,-decoded.height/2);const flip=options.flip||'none';if(flip==='none')canvas=rotated;else{canvas=makeCanvas(w,h);const ctx=context2d(canvas);if(flip==='horizontal'){ctx.translate(w,0);ctx.scale(-1,1);}else{ctx.translate(0,h);ctx.scale(1,-1);}ctx.drawImage(rotated,0,0);}
    } else if(['remove-metadata','convert','to-jpg','jpg-to-png'].includes(tool.workflow)){
      canvas=drawDecoded(decoded);
    } else throw new Error(`Unsupported image workflow: ${tool.workflow}`);
    let blob=await canvasBlob(canvas,type,quality);if(tool.workflow==='dpi'||tool.workflow==='photo-preset'||tool.workflow==='resize-physical'||tool.workflow==='photo-size'||tool.workflow==='signature-resize')blob=await applyDpi(blob,type,dpi);
    return {blob,width:canvas.width,height:canvas.height,type,note:tool.workflow==='remove-metadata'?'Source EXIF/GPS metadata was not copied to the new image.':tool.workflow==='dpi'?`Density metadata set to ${Math.round(dpi)} DPI.`:undefined};
  } finally { decoded.close?.(); }
}
