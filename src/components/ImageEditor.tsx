'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import JSZip from 'jszip';
import {
  Check, Download, Eye, FileArchive, PenLine, Play, RefreshCcw, RotateCcw, Share2, Sparkles, Trash2, UploadCloud, X,
} from 'lucide-react';
import {
  compressImage, imageDimensions, pixelsFromPhysical, processImage,
  type CompressionMode, type ImageOptions, type ImageProcessResult, type OutputFormat,
} from '@/lib/image-engine';
import type { ImageTool, PhysicalUnit } from '@/lib/image-tools';
import { markRecentTool } from '@/lib/tool-state';

function outputExt(type: string) { return type === 'image/jpeg' ? 'jpg' : type === 'image/webp' ? 'webp' : 'png'; }
function safeName(name: string) { return name.replace(/\.[^.]+$/, '').replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '') || 'image'; }
function formatBytes(bytes: number) { if (bytes < 1024) return `${bytes} B`; if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`; return `${(bytes / 1024 / 1024).toFixed(2)} MB`; }
function sourceFormat(file: File): OutputFormat | null { return file.type === 'image/jpeg' || file.type === 'image/png' || file.type === 'image/webp' ? file.type : null; }

type CompressOutput = 'keep' | OutputFormat;
type TargetUnit = 'KB' | 'MB';
type ProcessedItem = ImageProcessResult & { name: string; url: string; originalSize: number };

function baseOptions(tool: ImageTool): ImageOptions {
  return {
    quality: .9, format: tool.category === 'Signature' ? 'image/png' : 'image/webp', angle: 90, flip: 'none', amount: 42,
    opacity: .55, fontSize: 48, color: '#ffffff', backgroundColor: '#ffffff', brightness: 100, contrast: 100,
    saturation: 100, blur: 0, position: 'center', width: 1200, height: 630, unit: tool.defaultUnit || tool.preset?.unit || 'cm',
    physicalWidth: tool.preset?.width || (tool.category === 'Signature' ? 4 : 3.5), physicalHeight: tool.preset?.height || (tool.category === 'Signature' ? 2 : 4.5),
    dpi: tool.preset?.dpi || 300, ratioWidth: 1, ratioHeight: 1, anchorX: .5, anchorY: .42, replaceBackground: false, trimMargin: 12,
  };
}

export function ImageEditor({ tool }: { tool: ImageTool }) {
  const [files, setFiles] = useState<File[]>([]);
  const [sourceUrl, setSourceUrl] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [results, setResults] = useState<ProcessedItem[]>([]);
  const [batchUrl, setBatchUrl] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [working, setWorking] = useState(false);
  const [previewWorking, setPreviewWorking] = useState(false);
  const [progress, setProgress] = useState(0);
  const [livePreview, setLivePreview] = useState(!['compress','compress-target','signature-compress'].includes(tool.workflow));
  const [lockAspect, setLockAspect] = useState(true);
  const [ratio, setRatio] = useState(1);
  const [autoBackground, setAutoBackground] = useState(true);
  const [options, setOptions] = useState<ImageOptions>(() => baseOptions(tool));
  const [compressMode, setCompressMode] = useState<CompressionMode>(tool.workflow === 'compress' ? 'auto' : 'target');
  const [targetValue, setTargetValue] = useState(tool.workflow === 'signature-compress' ? 20 : 100);
  const [targetUnit, setTargetUnit] = useState<TargetUnit>('KB');
  const [compressOutput, setCompressOutput] = useState<CompressOutput>(tool.workflow === 'signature-compress' ? 'image/png' : 'keep');
  const inputRef = useRef<HTMLInputElement>(null);
  const drawCanvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const previewRun = useRef(0);
  const cancelled = useRef(false);
  const objectUrls = useRef<Set<string>>(new Set());
  const maxMb = Number(process.env.NEXT_PUBLIC_IMAGE_MAX_INPUT_MB || 30);
  const configuredBatch = Number(process.env.NEXT_PUBLIC_IMAGE_BATCH_LIMIT || 20);
  const singleRun = ['compress','compress-target','signature-compress','signature-maker','passport-photo-maker','id-photo-maker','photo-35x45','photo-2x2'].includes(tool.id);
  const runLimit = singleRun ? 1 : configuredBatch;

  const forcedType: OutputFormat | null =
    tool.workflow === 'to-jpg' ? 'image/jpeg' :
    ['remove-bg','signature-maker','signature-trim','signature-remove-bg','signature-png'].includes(tool.workflow) ? 'image/png' : null;

  useEffect(() => { markRecentTool(tool.id); }, [tool.id]);
  useEffect(() => () => { objectUrls.current.forEach(url => URL.revokeObjectURL(url)); objectUrls.current.clear(); }, []);

  function makeObjectUrl(blob: Blob) { const url = URL.createObjectURL(blob); objectUrls.current.add(url); return url; }
  function revokeObjectUrl(url: string) { if (!url) return; URL.revokeObjectURL(url); objectUrls.current.delete(url); }
  function clearResults() {
    previewRun.current += 1;
    setPreviewUrl(current => { if (current) revokeObjectUrl(current); return ''; });
    setBatchUrl(current => { if (current) revokeObjectUrl(current); return ''; });
    setResults(current => { current.forEach(item => revokeObjectUrl(item.url)); return []; });
  }
  function clearSelection() { setFiles([]); setSourceUrl(current => { if (current) revokeObjectUrl(current); return ''; }); clearResults(); }

  const effectiveOptions = useMemo<ImageOptions>(() => ({
    ...options,
    format: forcedType || options.format,
    ...(tool.workflow === 'remove-bg' && autoBackground ? { color: undefined } : {}),
  }), [options, forcedType, tool.workflow, autoBackground]);

  const targetBytes = useMemo(() => Math.round(Math.max(0,targetValue) * (targetUnit === 'MB' ? 1024*1024 : 1024)), [targetUnit,targetValue]);
  const calculatedPixels = useMemo(() => {
    const unit = options.unit || 'cm'; const dpi = Number(options.dpi || 300);
    return { width: pixelsFromPhysical(Number(options.physicalWidth || 0), unit, dpi), height: pixelsFromPhysical(Number(options.physicalHeight || 0), unit, dpi) };
  }, [options.unit,options.dpi,options.physicalWidth,options.physicalHeight]);

  const processOne = useCallback(async (file: File): Promise<ImageProcessResult> => {
    if (tool.workflow === 'compress' || tool.workflow === 'compress-target' || tool.workflow === 'signature-compress') {
      const mode: CompressionMode = tool.workflow === 'compress' ? compressMode : 'target';
      if (mode === 'target' && (!Number.isFinite(targetValue) || targetValue <= 0)) throw new Error('Enter a target size greater than 0.');
      const format = compressOutput === 'keep' ? sourceFormat(file) || 'image/webp' : compressOutput;
      return compressImage(file,{ mode,targetBytes:mode==='target'?targetBytes:undefined,format });
    }
    return processImage(file,tool,effectiveOptions);
  }, [tool,compressMode,targetValue,targetBytes,compressOutput,effectiveOptions]);

  async function choose(selectedFiles: File[]) {
    clearSelection(); setError(''); setMessage(''); setProgress(0);
    let valid = selectedFiles.filter(file => (file.type.startsWith('image/') || /\.svg$/i.test(file.name)) && file.size > 0 && file.size <= maxMb*1024*1024);
    if (tool.workflow === 'jpg-to-png') {
      valid = valid.filter(file => file.type === 'image/jpeg' || /\.jpe?g$/i.test(file.name));
      if (!valid.length) { setError('JPG to PNG / WebP accepts JPG or JPEG source files.'); return; }
    }
    if (!valid.length) { setError(`Choose a supported image up to ${maxMb} MB.`); return; }
    if (singleRun && valid.length > 1) setMessage('This workflow processes one image at a time; the first selected image was loaded.');
    valid = valid.slice(0,runLimit);
    const first = valid[0]!;
    try {
      const dimensions = await imageDimensions(first); setRatio(dimensions.width/dimensions.height);
      setOptions(current => {
        const preserve = !['convert','to-jpg','jpg-to-png','remove-bg','signature-maker','signature-trim','signature-remove-bg','signature-png','dpi'].includes(tool.workflow);
        const nextFormat = preserve ? sourceFormat(first) || current.format : current.format;
        return {
          ...current,
          ...(nextFormat ? {format:nextFormat}:{}),
          ...(tool.workflow==='resize-px'?{width:dimensions.width,height:dimensions.height}:{}),
          ...(tool.workflow==='crop'?{cropX:0,cropY:0,cropWidth:dimensions.width,cropHeight:dimensions.height}:{}),
          ...(tool.workflow==='watermark'?{fontSize:Math.min(220,Math.max(24,Math.round(dimensions.width/18)))}:{}),
        };
      });
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Image could not be decoded.'); return; }
    setSourceUrl(current => { if(current) revokeObjectUrl(current); return makeObjectUrl(first); }); setFiles(valid);
  }

  useEffect(() => {
    if(!livePreview||working||!files[0])return;
    const runId=++previewRun.current;
    const timer=window.setTimeout(()=>{void(async()=>{setPreviewWorking(true);try{const processed=await processOne(files[0]!);if(runId!==previewRun.current)return;const nextUrl=makeObjectUrl(processed.blob);setPreviewUrl(current=>{if(current)revokeObjectUrl(current);return nextUrl;});}catch{}finally{if(runId===previewRun.current)setPreviewWorking(false);}})();},350);
    return()=>window.clearTimeout(timer);
  },[files,livePreview,processOne,working]);

  async function run() {
    if(!files.length){setError(tool.workflow==='signature-maker'?'Draw or upload a signature first.':'Select an image first.');return;}
    setWorking(true);setError('');setMessage('');setProgress(0);cancelled.current=false;clearResults();
    try{
      const selected=files.slice(0,runLimit);const processedItems:ProcessedItem[]=[];
      for(let index=0;index<selected.length;index++){
        if(cancelled.current)throw new Error('Processing cancelled.');
        const file=selected[index]!,processed=await processOne(file),ext=outputExt(processed.type),name=`${safeName(file.name)}-${tool.id}.${ext}`,url=makeObjectUrl(processed.blob);
        processedItems.push({...processed,name,url,originalSize:file.size});setProgress(Math.round(((index+1)/selected.length)*100));
      }
      setResults(processedItems);
      if(processedItems.length>1){const zip=new JSZip();for(const item of processedItems)zip.file(item.name,item.blob);const blob=await zip.generateAsync({type:'blob',compression:'DEFLATE',compressionOptions:{level:6}});setBatchUrl(makeObjectUrl(blob));}
      const notes=processedItems.map(item=>item.note).filter(Boolean);setMessage(notes[0]||`${processedItems.length} result${processedItems.length===1?'':'s'} ready.`);
    }catch(reason){setError(reason instanceof Error?reason.message:'Image processing failed.');}finally{setWorking(false);setProgress(100);}
  }

  function resetSettings(){setOptions(baseOptions(tool));setCompressMode(tool.workflow==='compress'?'auto':'target');setTargetValue(tool.workflow==='signature-compress'?20:100);setTargetUnit('KB');setCompressOutput(tool.workflow==='signature-compress'?'image/png':'keep');setError('');setMessage('');clearResults();}
  function processAnother(){clearSelection();setError('');setMessage('');setProgress(0);if(inputRef.current)inputRef.current.value='';}
  function resizeWidth(value:number){setOptions(current=>({...current,width:value,...(lockAspect&&ratio>0?{height:Math.max(1,Math.round(value/ratio))}:{})}));}
  function resizeHeight(value:number){setOptions(current=>({...current,height:value,...(lockAspect&&ratio>0?{width:Math.max(1,Math.round(value*ratio))}:{})}));}
  function numberField(key:keyof ImageOptions,label:string,min=0,max=12000,step=1){return <div className="field"><label>{label}</label><input type="number" min={min} max={max} step={step} value={Number(options[key]??0)} onChange={event=>setOptions(current=>({...current,[key]:Number(event.target.value)}))}/></div>}
  function rangeField(key:keyof ImageOptions,label:string,min:number,max:number,step=1){return <div className="field"><div className="label-row"><label>{label}</label><span>{Number(options[key]??0)}</span></div><input type="range" min={min} max={max} step={step} value={Number(options[key]??0)} onChange={event=>setOptions(current=>({...current,[key]:Number(event.target.value)}))}/></div>}

  async function shareResult(item:ProcessedItem){try{const file=new File([item.blob],item.name,{type:item.type});if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[file]})))await navigator.share({title:tool.name,files:[file]});else{const a=document.createElement('a');a.href=item.url;a.download=item.name;a.click();setMessage('Direct file sharing is unavailable in this browser, so the result was downloaded.');}}catch(reason){if((reason as Error)?.name!=='AbortError')setError('Sharing is not available for this result.');}}

  function drawPoint(event:ReactPointerEvent<HTMLCanvasElement>){const canvas=drawCanvas.current;if(!canvas||!drawing.current)return;const rect=canvas.getBoundingClientRect(),ctx=canvas.getContext('2d');if(!ctx)return;const x=(event.clientX-rect.left)*canvas.width/rect.width,y=(event.clientY-rect.top)*canvas.height/rect.height;ctx.lineTo(x,y);ctx.stroke();}
  function drawStart(event:ReactPointerEvent<HTMLCanvasElement>){const canvas=drawCanvas.current;if(!canvas)return;canvas.setPointerCapture(event.pointerId);const rect=canvas.getBoundingClientRect(),ctx=canvas.getContext('2d');if(!ctx)return;const x=(event.clientX-rect.left)*canvas.width/rect.width,y=(event.clientY-rect.top)*canvas.height/rect.height;ctx.strokeStyle='#111111';ctx.lineWidth=6;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();ctx.moveTo(x,y);drawing.current=true;}
  function drawEnd(){drawing.current=false;drawCanvas.current?.getContext('2d')?.closePath();}
  function clearDrawing(){const canvas=drawCanvas.current;if(canvas)canvas.getContext('2d')?.clearRect(0,0,canvas.width,canvas.height);}
  async function useDrawing(){const canvas=drawCanvas.current;if(!canvas)return;const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob){setError('Could not create the drawn signature.');return;}await choose([new File([blob],'drawn-signature.png',{type:'image/png'})]);}

  const firstResult=results[0];
  const savings=firstResult?Math.round((1-firstResult.blob.size/Math.max(1,firstResult.originalSize))*100):null;
  const actionLabel=tool.workflow==='compress'||tool.workflow==='compress-target'||tool.workflow==='signature-compress'?'Compress':tool.workflow==='convert'||tool.workflow==='to-jpg'||tool.workflow==='jpg-to-png'?'Convert':tool.workflow==='remove-bg'?'Remove background':tool.workflow==='change-bg'?'Change background':tool.workflow==='dpi'?'Set DPI':'Process';
  const showQuality=!['remove-bg','signature-maker','signature-trim','signature-remove-bg','signature-png','dpi'].includes(tool.workflow) && (effectiveOptions.format==='image/jpeg'||effectiveOptions.format==='image/webp');
  const physicalWorkflow=['resize-physical','photo-size','signature-resize'].includes(tool.workflow);
  const photoPreset=tool.workflow==='photo-preset';
  const dedicatedPreset=tool.id==='photo-35x45'||tool.id==='photo-2x2';

  return <div className="image-editor editor-shell">
    <section className="editor-preview panel">
      <div className="preview-toolbar"><div><span className="eyebrow">Input & preview</span><h2>{files.length?files[0]!.name:'Select an image'}</h2></div><label className="preview-toggle"><input type="checkbox" checked={livePreview} onChange={event=>setLivePreview(event.target.checked)}/>Live preview</label></div>

      {tool.workflow==='signature-maker'?<div className="signature-draw-card">
        <div className="signature-draw-head"><div><b>Draw signature</b><span>Use mouse, touch or pen. Or upload an existing signature below.</span></div><PenLine size={20}/></div>
        <canvas ref={drawCanvas} width={900} height={300} className="signature-canvas" onPointerDown={drawStart} onPointerMove={drawPoint} onPointerUp={drawEnd} onPointerCancel={drawEnd} onPointerLeave={drawEnd}/>
        <div className="signature-draw-actions"><button className="btn" type="button" onClick={clearDrawing}><Trash2 size={16}/> Clear</button><button className="btn primary" type="button" onClick={()=>void useDrawing()}><Check size={16}/> Use drawing</button></div>
      </div>:null}

      <div className="dropzone" onClick={()=>inputRef.current?.click()} onDragOver={event=>event.preventDefault()} onDrop={event=>{event.preventDefault();void choose(Array.from(event.dataTransfer.files));}}>
        <UploadCloud size={28}/><div><b>{tool.workflow==='signature-maker'?'Upload signature image':'Choose image'}</b><span>JPG, PNG, WebP or browser-supported image · up to {maxMb} MB</span></div>
        <input ref={inputRef} type="file" accept="image/*,.svg" multiple={!singleRun} hidden onChange={event=>{const chosen=Array.from(event.currentTarget.files||[]);event.currentTarget.value='';void choose(chosen);}}/>
      </div>

      <div className="preview-stage">{sourceUrl?<><img src={previewUrl||sourceUrl} alt="Selected image preview"/><div className="preview-badge">{previewWorking?'Updating preview…':previewUrl?'Live result preview':'Source preview'}</div></>:<div className="preview-empty large"><UploadCloud size={34}/><b>{tool.workflow==='signature-maker'?'Draw or upload a signature':'Choose an image'}</b><span>Preview appears here.</span></div>}</div>

      {firstResult?<div className="result-summary"><div><span>Original size</span><b>{formatBytes(firstResult.originalSize)}</b></div><div><span>Result size</span><b>{formatBytes(firstResult.blob.size)}</b></div><div><span>Output</span><b>{firstResult.width} × {firstResult.height}</b></div><div><span>Format</span><b>{outputExt(firstResult.type).toUpperCase()}</b></div>{savings!==null?<div><span>Size change</span><b className={savings>=0?'positive':''}>{savings>=0?`${savings}% smaller`:`${Math.abs(savings)}% larger`}</b></div>:null}{['compress','compress-target','signature-compress'].includes(tool.workflow)?<div><span>Target</span><b className={firstResult.targetReached?'positive':'target-miss'}>{firstResult.targetReached===undefined?'Automatic':firstResult.targetReached?'Reached':'Closest result'}</b></div>:null}</div>:null}
    </section>

    <aside className="editor-controls panel editor-panel">
      <div className="controls-head"><div><span className="eyebrow">{tool.category}</span><h2>{tool.name}</h2></div><button className="icon-button" title="Reset settings" onClick={resetSettings}><RotateCcw size={18}/></button></div>
      <p className="muted small tool-control-summary">{tool.summary}</p>

      {tool.workflow==='compress'?<div className="compress-controls"><div className="field"><label>Select compression method</label><div className="compression-methods"><label className={`compression-method ${compressMode==='auto'?'active':''}`}><input type="radio" checked={compressMode==='auto'} onChange={()=>setCompressMode('auto')}/><span><b>Auto</b><small>Smaller file with strong visual quality.</small></span></label><label className={`compression-method ${compressMode==='target'?'active':''}`}><input type="radio" checked={compressMode==='target'} onChange={()=>setCompressMode('target')}/><span><b>Compress file to</b><small>Enter the KB or MB limit you need.</small></span></label></div></div></div>:null}

      {(tool.workflow==='compress-target'||tool.workflow==='signature-compress'||(tool.workflow==='compress'&&compressMode==='target'))?<><div className="target-size-row"><div className="field"><label>Target size</label><input type="number" min="1" max={targetUnit==='MB'?50:51200} value={targetValue} onChange={event=>setTargetValue(Number(event.target.value))}/></div><div className="field unit-field"><label>Unit</label><select value={targetUnit} onChange={event=>setTargetUnit(event.target.value as TargetUnit)}><option value="KB">KB</option><option value="MB">MB</option></select></div></div><div className="target-preset-row">{(tool.workflow==='signature-compress'?[[10,'KB'],[20,'KB'],[50,'KB'],[100,'KB']]:[[20,'KB'],[50,'KB'],[100,'KB'],[200,'KB'],[500,'KB']]).map(([value,unit])=><button type="button" key={`${value}${unit}`} onClick={()=>{setTargetValue(Number(value));setTargetUnit(unit as TargetUnit)}}>{value} {unit}</button>)}</div></>:null}

      {['compress','compress-target','signature-compress'].includes(tool.workflow)?<div className="field"><label>Output format</label><select value={compressOutput} onChange={event=>setCompressOutput(event.target.value as CompressOutput)}><option value="keep">Keep original format</option><option value="image/jpeg">JPG</option><option value="image/webp">WebP</option><option value="image/png">PNG</option></select></div>:null}

      {tool.workflow==='resize-px'?<><label className="check"><input type="checkbox" checked={lockAspect} onChange={event=>setLockAspect(event.target.checked)}/>Lock aspect ratio</label><div className="row"><div className="field"><label>Width px</label><input type="number" min="1" value={options.width||''} onChange={event=>resizeWidth(Number(event.target.value))}/></div><div className="field"><label>Height px</label><input type="number" min="1" value={options.height||''} onChange={event=>resizeHeight(Number(event.target.value))}/></div></div></>:null}

      {physicalWorkflow?<><div className="field"><label>Unit</label>{tool.workflow==='resize-physical'?<div className="locked-format"><Check size={16}/><span>{(tool.defaultUnit||'cm').toUpperCase()}</span></div>:<select value={options.unit||'cm'} onChange={event=>setOptions(current=>({...current,unit:event.target.value as PhysicalUnit}))}><option value="px">Pixels</option><option value="cm">CM</option><option value="mm">MM</option><option value="in">Inches</option></select>}</div><div className="row">{numberField('physicalWidth','Width',.01,10000,.01)}{numberField('physicalHeight','Height',.01,10000,.01)}</div>{(options.unit||'cm')!=='px'?numberField('dpi','DPI',1,1200,1):null}<div className="calculated-size"><span>Calculated output</span><b>{calculatedPixels.width} × {calculatedPixels.height} px</b></div></>:null}

      {tool.workflow==='crop'?<><div className="row">{numberField('cropX','X',0)}{numberField('cropY','Y',0)}</div><div className="row">{numberField('cropWidth','Width',1)}{numberField('cropHeight','Height',1)}</div></>:null}

      {tool.workflow==='aspect-crop'?<><div className="field"><label>Aspect ratio</label><select value={`${options.ratioWidth||1}:${options.ratioHeight||1}`} onChange={event=>{const [w,h]=event.target.value.split(':').map(Number);setOptions(current=>({...current,ratioWidth:w,ratioHeight:h}));}}><option value="1:1">1:1 Square</option><option value="4:3">4:3</option><option value="3:4">3:4 Portrait</option><option value="16:9">16:9 Wide</option><option value="9:16">9:16 Vertical</option><option value="5:4">5:4</option></select></div>{rangeField('anchorX','Horizontal position',0,1,.05)}{rangeField('anchorY','Vertical position',0,1,.05)}</>:null}

      {photoPreset?<><div className="field"><label>Physical size</label>{dedicatedPreset?<div className="locked-format"><Check size={16}/><span>{tool.preset?.width} × {tool.preset?.height} {tool.preset?.unit}</span></div>:<><div className="row">{numberField('physicalWidth','Width',.1,500,.1)}{numberField('physicalHeight','Height',.1,500,.1)}</div><select value={options.unit||tool.preset?.unit||'mm'} onChange={event=>setOptions(current=>({...current,unit:event.target.value as PhysicalUnit}))}><option value="mm">MM</option><option value="cm">CM</option><option value="in">Inches</option></select></>}</div>{numberField('dpi','DPI',72,1200,1)}<div className="calculated-size"><span>Output pixels</span><b>{calculatedPixels.width} × {calculatedPixels.height}px</b></div>{rangeField('anchorX','Horizontal crop position',0,1,.05)}{rangeField('anchorY','Vertical crop position',0,1,.05)}<label className="check"><input type="checkbox" checked={Boolean(options.replaceBackground)} onChange={event=>setOptions(current=>({...current,replaceBackground:event.target.checked}))}/>Replace plain background</label>{options.replaceBackground?<><div className="field"><label>Background colour</label><input type="color" value={options.backgroundColor||'#ffffff'} onChange={event=>setOptions(current=>({...current,backgroundColor:event.target.value}))}/></div>{rangeField('amount','Background tolerance',5,220,1)}<small className="muted">Works best when the original background is plain or nearly flat.</small></>:null}</>:null}

      {tool.workflow==='dpi'?<>{numberField('dpi','DPI',1,1200,1)}<small className="muted">Changes density metadata only; pixel dimensions remain unchanged.</small></>:null}
      {tool.workflow==='signature-maker'||tool.workflow==='signature-trim'?<>{numberField('trimMargin','Trim margin (px)',0,200,1)}<small className="muted">Blank space is trimmed automatically around the visible signature.</small></>:null}
      {tool.workflow==='signature-remove-bg'?<>{rangeField('amount','Background tolerance',5,220,1)}{numberField('trimMargin','Trim margin (px)',0,200,1)}</>:null}
      {tool.workflow==='rotate'?<><div className="field"><label>Rotate</label><select value={options.angle} onChange={event=>setOptions(current=>({...current,angle:Number(event.target.value)}))}><option value="0">0° (flip only)</option><option value="90">90° clockwise</option><option value="180">180°</option><option value="270">270° clockwise</option></select></div><div className="field"><label>Flip after rotation</label><select value={options.flip||'none'} onChange={event=>setOptions(current=>({...current,flip:event.target.value as ImageOptions['flip']}))}><option value="none">No flip</option><option value="horizontal">Flip horizontally</option><option value="vertical">Flip vertically</option></select></div></>:null}
      {tool.workflow==='upscale'?<div className="field"><label>Scale</label><select value={options.amount} onChange={event=>setOptions(current=>({...current,amount:Number(event.target.value)}))}><option value="2">2×</option><option value="3">3×</option><option value="4">4×</option></select></div>:null}
      {tool.workflow==='watermark'?<><div className="field"><label>Watermark text</label><input maxLength={120} value={options.text||''} onChange={event=>setOptions(current=>({...current,text:event.target.value}))} placeholder="AJN Buzz"/></div><div className="field"><label>Position</label><select value={options.position||'center'} onChange={event=>setOptions(current=>({...current,position:event.target.value as ImageOptions['position']}))}><option value="center">Center</option><option value="top-left">Top left</option><option value="top-right">Top right</option><option value="bottom-left">Bottom left</option><option value="bottom-right">Bottom right</option></select></div><div className="row">{numberField('fontSize','Font size',12,400)}<div className="field"><label>Colour</label><input type="color" value={options.color||'#ffffff'} onChange={event=>setOptions(current=>({...current,color:event.target.value}))}/></div></div>{rangeField('opacity','Opacity',.05,1,.05)}</>:null}
      {tool.workflow==='photo-editor'?<>{rangeField('brightness','Brightness',0,200)}{rangeField('contrast','Contrast',0,200)}{rangeField('saturation','Saturation',0,200)}{rangeField('blur','Blur',0,30)}</>:null}
      {tool.workflow==='remove-bg'?<><label className="check"><input type="checkbox" checked={autoBackground} onChange={event=>setAutoBackground(event.target.checked)}/>Auto-sample image corners</label>{!autoBackground?<div className="field"><label>Background colour</label><input type="color" value={options.color||'#ffffff'} onChange={event=>setOptions(current=>({...current,color:event.target.value}))}/></div>:null}{rangeField('amount','Tolerance',5,220,1)}</>:null}
      {tool.workflow==='change-bg'?<><div className="field"><label>New background colour</label><div className="background-presets"><button type="button" onClick={()=>setOptions(c=>({...c,backgroundColor:'#ffffff'}))}>White</button><button type="button" onClick={()=>setOptions(c=>({...c,backgroundColor:'#4f86f7'}))}>Blue</button><input type="color" value={options.backgroundColor||'#ffffff'} onChange={event=>setOptions(c=>({...c,backgroundColor:event.target.value}))}/></div></div>{rangeField('amount','Detection tolerance',5,220,1)}<small className="muted">Designed for plain or near-flat original backgrounds.</small></>:null}
      {tool.workflow==='remove-metadata'?<div className="notice">The output is freshly encoded from visible pixels, so source EXIF/GPS metadata is not copied.</div>:null}

      {!['compress','compress-target','signature-compress'].includes(tool.workflow)?(tool.workflow==='jpg-to-png'?<div className="field"><label>Output format</label><select value={options.format==='image/webp'?'image/webp':'image/png'} onChange={event=>setOptions(current=>({...current,format:event.target.value as OutputFormat}))}><option value="image/png">PNG</option><option value="image/webp">WebP</option></select></div>:tool.workflow==='dpi'?<div className="field"><label>Output format</label><select value={options.format==='image/jpeg'?'image/jpeg':'image/png'} onChange={event=>setOptions(current=>({...current,format:event.target.value as OutputFormat}))}><option value="image/png">PNG</option><option value="image/jpeg">JPG</option></select></div>:!forcedType?<div className="field"><label>Output format</label><select value={options.format} onChange={event=>setOptions(current=>({...current,format:event.target.value as OutputFormat}))}><option value="image/webp">WebP</option><option value="image/jpeg">JPEG</option><option value="image/png">PNG</option></select></div>:<div className="locked-format"><Check size={16}/><span>Output fixed to {outputExt(forcedType).toUpperCase()}</span></div>):null}
      {showQuality?<div className="field"><div className="label-row"><label>Output quality</label><span>{Math.round(Number(options.quality||.9)*100)}%</span></div><input type="range" min="10" max="100" value={Math.round(Number(options.quality||.9)*100)} onChange={event=>setOptions(current=>({...current,quality:Number(event.target.value)/100}))}/></div>:null}

      {working?<div className="progress" aria-label={`Processing ${progress}%`}><span style={{width:`${progress}%`}}/></div>:null}
      <button className="btn primary action-big" disabled={!files.length||working} onClick={()=>void run()}>{working?<><Sparkles size={18}/> Processing {progress}%</>:<><Play size={18}/>{actionLabel}</>}</button>
      {working?<button className="btn" onClick={()=>{cancelled.current=true}}><X size={17}/> Cancel</button>:null}
      {error?<div className="error" role="alert">{error}</div>:null}
      {message?<div className={`notice ${firstResult?.targetReached===false?'warning':''}`}>{message}</div>:null}
      {firstResult&&results.length===1?<div className="result-actions"><a className="btn success" href={firstResult.url} download={firstResult.name}><Download size={18}/> Download</a><a className="btn" href={firstResult.url} target="_blank" rel="noopener noreferrer"><Eye size={18}/> Preview</a><button className="btn" onClick={()=>void shareResult(firstResult)}><Share2 size={18}/> Share</button><button className="btn" onClick={processAnother}><RefreshCcw size={18}/> Process another</button></div>:null}
      {batchUrl?<div className="result-actions"><a className="btn success" href={batchUrl} download={`ajn-buzz-${tool.id}-${Date.now()}.zip`}><FileArchive size={18}/> Download {results.length} results as ZIP</a><button className="btn" onClick={processAnother}><RefreshCcw size={18}/> Process another</button></div>:null}
      <div className="privacy-note"><ShieldMini/><div><b>Browser processing</b><span>No sign-in required.</span></div></div>
    </aside>
  </div>;
}

function ShieldMini(){return <span className="shield-mini">✓</span>}
