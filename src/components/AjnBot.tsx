'use client';

import Link from 'next/link';
import { Bot, Check, Download, ExternalLink, FileImage, LoaderCircle, Paperclip, Play, RotateCcw, Send, Sparkles, X } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { TOOL_MAP, type ToolId } from '@/lib/image-tools';
import type { ImageOptions } from '@/lib/image-engine';
import { compressImage, processImage } from '@/lib/image-engine';

type BotResult = {
  toolId: string;
  message: string;
  confidence: number;
  needsFile: boolean;
  externalPdf: boolean;
  options: Record<string, unknown>;
};

type HistoryItem = { role: 'user' | 'bot'; text: string };

function bytesFromOption(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
}

function buildOptions(toolId: ToolId, raw: Record<string, unknown>): ImageOptions {
  const options: ImageOptions = { ...raw } as ImageOptions;
  const tool = TOOL_MAP.get(toolId);
  if (tool?.preset) {
    options.physicalWidth ??= tool.preset.width;
    options.physicalHeight ??= tool.preset.height;
    options.unit ??= tool.preset.unit;
    options.dpi ??= tool.preset.dpi;
  }
  if (toolId === 'compress-to-kb' || toolId === 'signature-size-reducer') {
    options.format = (options.format as ImageOptions['format']) || 'image/jpeg';
  }
  return options;
}

export function AjnBot() {
  const [prompt, setPrompt] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [result, setResult] = useState<BotResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState('Ready');
  const [error, setError] = useState('');
  const [output, setOutput] = useState<{ url: string; name: string; size: number; width: number; height: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const tool = result?.toolId && result.toolId !== 'NONE' ? TOOL_MAP.get(result.toolId as ToolId) : null;
  const examples = useMemo(() => [
    'Compress this photo to 100 KB',
    'Make this photo 35 x 45 mm at 300 DPI',
    'Crop this image square',
    'Resize this signature to 4 cm x 2 cm',
    'Make a 2 x 2 inch photo',
  ], []);

  async function analyze() {
    const text = prompt.trim();
    if (!text || busy) return;
    setBusy(true); setError(''); setOutput(null); setResult(null); setStage('Understanding your request');
    setHistory((current) => [...current, { role: 'user', text }]);
    try {
      await new Promise((resolve) => setTimeout(resolve, 220));
      setStage('Choosing the AJN tool');
      const response = await fetch('/api/ajn-bot', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ prompt: text, files: files.map((file) => ({ name: file.name, type: file.type, size: file.size })) }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || 'AJN Bot could not analyze the request.');
      setResult(data.result);
      setHistory((current) => [...current, { role: 'bot', text: data.result.message }]);
      setStage(data.result.toolId === 'NONE' ? 'Needs another tool' : 'Plan ready');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'AJN Bot request failed.');
      setStage('Ready');
    } finally { setBusy(false); }
  }

  async function execute() {
    if (!result || !tool || !files[0] || busy) return;
    setBusy(true); setError(''); setOutput(null); setStage('Reading your image');
    try {
      const options = buildOptions(tool.id, result.options);
      await new Promise((resolve) => setTimeout(resolve, 180));
      setStage('Processing in your browser');
      let processed;
      if (tool.workflow === 'compress-target' || tool.workflow === 'signature-compress') {
        const targetBytes = bytesFromOption(result.options.targetBytes) || 100 * 1024;
        processed = await compressImage(files[0]!, { mode: 'target', targetBytes, format: options.format });
      } else {
        processed = await processImage(files[0]!, tool, options);
      }
      setStage('Preparing download');
      const url = URL.createObjectURL(processed.blob);
      const ext = processed.type === 'image/png' ? 'png' : processed.type === 'image/webp' ? 'webp' : 'jpg';
      const base = files[0]!.name.replace(/\.[^.]+$/, '').replace(/[^a-z0-9_-]+/gi, '-').slice(0, 50) || 'ajn-buzz-result';
      setOutput({ url, name: `${base}-${tool.id}.${ext}`, size: processed.blob.size, width: processed.width, height: processed.height });
      setStage('Done');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Image processing failed.');
      setStage('Plan ready');
    } finally { setBusy(false); }
  }

  function reset() {
    if (output) URL.revokeObjectURL(output.url);
    setPrompt(''); setFiles([]); setResult(null); setOutput(null); setError(''); setHistory([]); setStage('Ready');
  }

  return <div className="ajn-bot-shell">
    <div className="ajn-bot-header">
      <div className="ajn-bot-avatar"><Bot size={24}/></div>
      <div><div className="eyebrow">AJN Bot</div><h1>Tell AJN Buzz what you want to do.</h1><p>Describe an image or signature task in plain English. AJN Bot selects the matching tool, then the image is processed in your browser.</p></div>
    </div>

    <div className="ajn-bot-layout">
      <section className="ajn-bot-chat panel">
        <div className="ajn-bot-messages" aria-live="polite">
          {!history.length ? <div className="ajn-bot-welcome"><Sparkles size={20}/><b>What can I do?</b><span>Try “compress to 100 KB”, “make 35 × 45 mm”, “crop square”, or “resize my signature to 4 cm × 2 cm”.</span></div> : null}
          {history.map((item, index) => <div key={`${item.role}-${index}`} className={`ajn-bot-message ${item.role}`}><span>{item.text}</span></div>)}
          {busy ? <div className="ajn-bot-message bot thinking"><LoaderCircle size={15} className="spin"/> {stage}</div> : null}
        </div>

        <div className="ajn-bot-files">
          {files.map((file) => <div className="ajn-bot-file" key={`${file.name}-${file.size}`}><FileImage size={16}/><span>{file.name}</span><button type="button" onClick={() => setFiles((current) => current.filter((value) => value !== file))} aria-label={`Remove ${file.name}`}><X size={14}/></button></div>)}
        </div>

        <div className="ajn-bot-composer">
          <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void analyze(); } }} placeholder="Example: Compress this photo to 100 KB" rows={3}/>
          <div className="ajn-bot-composer-actions">
            <button className="icon-button" type="button" onClick={() => inputRef.current?.click()} title="Attach image"><Paperclip size={18}/></button>
            <input ref={inputRef} hidden type="file" accept="image/*,.svg" multiple onChange={(event) => { setFiles(Array.from(event.currentTarget.files || []).slice(0, 5)); event.currentTarget.value = ''; }}/>
            <button className="btn primary" type="button" disabled={!prompt.trim() || busy} onClick={() => void analyze()}><Send size={15}/> Ask AJN Bot</button>
          </div>
        </div>
        <div className="ajn-bot-examples"><span>Try:</span>{examples.map((example) => <button key={example} type="button" onClick={() => setPrompt(example)}>{example}</button>)}</div>
      </section>

      <aside className="ajn-bot-plan panel">
        <div className="controls-head"><div><span className="eyebrow">Live plan</span><h2>{result ? 'Ready to run' : 'Waiting for a task'}</h2></div><button className="icon-button" type="button" onClick={reset} title="Reset AJN Bot"><RotateCcw size={17}/></button></div>
        {error ? <div className="notice warning">{error}</div> : null}
        {result?.externalPdf ? <div className="ajn-bot-pdf-route"><b>This is an AJN PDF task.</b><span>The current AJN BUZZ Bot can recognize it, but PDF execution stays in AJN PDF.</span><a className="btn" href="https://ajnpdf.com" target="_blank" rel="noopener noreferrer">Open AJN PDF <ExternalLink size={14}/></a></div> : null}
        {tool ? <>
          <div className="ajn-bot-selected-tool"><span className="ajn-bot-tool-number"><Check size={15}/></span><div><b>{tool.name}</b><small>{tool.summary}</small></div></div>
          <div className="ajn-bot-stage"><span>1</span><b>Analyze prompt</b><em>Done</em></div>
          <div className="ajn-bot-stage"><span>2</span><b>Map to tool</b><em>Done</em></div>
          <div className="ajn-bot-stage"><span>3</span><b>Run locally</b><em>{files.length ? 'Ready' : 'Needs image'}</em></div>
          <div className="ajn-bot-option-box"><b>Parameters</b><code>{JSON.stringify(result?.options ?? {}, null, 2)}</code></div>
          <button className="btn primary bot-run" type="button" disabled={!files.length || busy} onClick={() => void execute()}><Play size={15}/> {files.length ? 'Run this task' : 'Attach an image to run'}</button>
          <Link className="btn bot-tool-link" href={`/tools/${tool.id}`}>Open full tool</Link>
        </> : !result?.externalPdf ? <div className="ajn-bot-empty"><Bot size={28}/><span>AJN Bot will show the selected tool and parameters here.</span></div> : null}
        {output ? <div className="ajn-bot-output"><div className="ajn-bot-output-head"><b>Result ready</b><span>{Math.round(output.size / 1024)} KB · {output.width} × {output.height}</span></div><a className="btn primary" href={output.url} download={output.name}><Download size={15}/> Download result</a></div> : null}
      </aside>
    </div>
  </div>;
}
