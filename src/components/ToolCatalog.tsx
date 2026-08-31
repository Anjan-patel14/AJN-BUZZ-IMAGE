'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, Heart, Search } from 'lucide-react';
import { IMAGE_TOOLS, TOOL_CATEGORIES, type ToolCategory, type ToolId } from '@/lib/image-tools';
import { favoriteTools, recentTools, toggleFavorite } from '@/lib/tool-state';
import { ToolIcon } from './ToolIcon';

const helperText: Record<ToolId, string> = {
  compress: 'Reduce file size',
  resize: 'Change dimensions',
  crop: 'Trim image',
  convert: 'Change format',
  'photo-editor': 'Adjust photo',
  watermark: 'Add watermark',
  'background-remover': 'Remove flat background',
  upscale: 'Enlarge image',
  rotate: 'Rotate or flip',
  'convert-to-jpg': 'Convert to JPG',
  'jpg-to-png': 'Convert JPG',
};

function tone(category: ToolCategory){
  if(category==='Edit') return {card:'ajn-card-green',icon:'ajn-icon-green'};
  if(category==='Convert') return {card:'ajn-card-red',icon:'ajn-icon-red'};
  return {card:'ajn-card-blue',icon:'ajn-icon-blue'};
}

export function ToolCatalog({ mode = 'all' }: { mode?: 'all' | 'favorites' | 'recent' }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<'All' | ToolCategory>('All');
  const [favorites, setFavorites] = useState<ToolId[]>([]);
  const [recent, setRecent] = useState<ToolId[]>([]);

  useEffect(() => {
    const sync = () => { setFavorites(favoriteTools()); setRecent(recentTools()); };
    sync();
    window.addEventListener('storage', sync);
    window.addEventListener('ajn-buzz-local-state', sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('ajn-buzz-local-state', sync);
    };
  }, []);

  const tools = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return IMAGE_TOOLS.filter(tool => {
      if (mode === 'favorites' && !favorites.includes(tool.id)) return false;
      if (mode === 'recent' && !recent.includes(tool.id)) return false;
      if (category !== 'All' && tool.category !== category) return false;
      if (!normalized) return true;
      return `${tool.name} ${tool.description} ${tool.formats} ${tool.category}`.toLowerCase().includes(normalized);
    }).sort((a, b) => mode === 'recent' ? recent.indexOf(a.id) - recent.indexOf(b.id) : 0);
  }, [query, category, favorites, recent, mode]);

  return <>
    <div className="catalog-surface ajn-glass-card">
      <div className="catalog-heading">
        <h2>Choose a tool</h2>
        <span className="catalog-accent" aria-hidden="true"/>
      </div>
      <div className="catalog-toolbar">
        <label className="searchbox">
          <Search size={17}/>
          <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search tools" />
        </label>
        <div className="category-tabs" aria-label="Tool categories">
          {TOOL_CATEGORIES.map(item => (
            <button key={item} className={category === item ? 'active' : ''} onClick={() => setCategory(item)}>
              {item === 'All' ? 'All' : item}
            </button>
          ))}
        </div>
      </div>
    </div>

    {tools.length ? <div className="tool-grid">
      {tools.map(tool => {
        const t = tone(tool.category);
        return <article
          className={`tool-card ajn-tool-card-pro ${t.card}`}
          style={{ minHeight: 168 }}
          key={tool.id}
        >
          <button
            className={`favorite-button ${favorites.includes(tool.id) ? 'active' : ''}`}
            aria-label={favorites.includes(tool.id) ? `Remove ${tool.name} from favorites` : `Add ${tool.name} to favorites`}
            onClick={() => toggleFavorite(tool.id)}
          >
            <Heart size={16} fill={favorites.includes(tool.id) ? 'currentColor' : 'none'}/>
          </button>

          <Link href={`/tools/${tool.id}`} className="tool-card-link" prefetch={false} style={{ padding: 16 }}>
            <div className="tool-card-top">
              <div className={`tool-icon ${t.icon}`} style={{ marginBottom: 8 }}>
                <ToolIcon name={tool.icon}/>
              </div>
              <span className="tool-arrow"><ArrowUpRight size={16}/></span>
            </div>
            <h3 style={{ marginTop: 6 }}>{tool.name}</h3>
            <p style={{ marginBottom: 0 }}>{helperText[tool.id]}</p>
          </Link>
        </article>;
      })}
    </div> : <div className="empty-state ajn-v4-card ajn-card-blue">
      <Search size={28}/>
      <h3>{mode === 'favorites' ? 'No favorites yet' : mode === 'recent' ? 'No recent tools yet' : 'No matching tool'}</h3>
      <p>{mode === 'favorites' ? 'Tap a heart to save a tool.' : mode === 'recent' ? 'Open a tool and it appears here.' : 'Try compress, resize, crop or convert.'}</p>
    </div>}
  </>;
}