'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, Heart, Search, X } from 'lucide-react';
import { IMAGE_TOOLS, TOOL_CATEGORIES, type ToolCategory, type ToolId } from '@/lib/image-tools';
import { favoriteTools, recentTools, toggleFavorite } from '@/lib/tool-state';
import { ToolIcon } from './ToolIcon';

function tone(category: ToolCategory) {
  if (category === 'Edit') return { card: 'ajn-card-green', icon: 'ajn-icon-green' };
  if (category === 'Convert') return { card: 'ajn-card-red', icon: 'ajn-icon-red' };
  if (category === 'Signature') return { card: 'ajn-card-purple', icon: 'ajn-icon-purple' };
  if (category === 'Photo Size') return { card: 'ajn-card-amber', icon: 'ajn-icon-amber' };
  return { card: 'ajn-card-blue', icon: 'ajn-icon-blue' };
}

export function ToolCatalog({ mode = 'all' }: { mode?: 'all' | 'favorites' | 'recent' }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<'All' | ToolCategory>('All');
  const [favorites, setFavorites] = useState<ToolId[]>([]);
  const [recent, setRecent] = useState<ToolId[]>([]);

  useEffect(() => {
    const sync = () => {
      setFavorites(favoriteTools());
      setRecent(recentTools());
    };
    sync();
    window.addEventListener('storage', sync);
    window.addEventListener('ajn-buzz-local-state', sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('ajn-buzz-local-state', sync);
    };
  }, []);

  useEffect(() => {
    const c = (new URLSearchParams(window.location.search).get('category') || 'All') as 'All' | ToolCategory;
    if (TOOL_CATEGORIES.includes(c)) setCategory(c);
  }, []);

  const tools = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const queryTokens = normalized ? normalized.split(/\s+/).filter(Boolean) : [];

    return IMAGE_TOOLS.filter((tool) => {
      if (mode === 'favorites' && !favorites.includes(tool.id)) return false;
      if (mode === 'recent' && !recent.includes(tool.id)) return false;
      if (category !== 'All' && tool.category !== category) return false;
      if (queryTokens.length === 0) return true;

      const searchableText = `${tool.id} ${tool.name} ${tool.shortName} ${tool.category} ${tool.summary} ${tool.description} ${tool.formats} ${tool.seoKeywords.join(' ')}`.toLowerCase();
      return queryTokens.every((token) => searchableText.includes(token));
    }).sort((a, b) => (mode === 'recent' ? recent.indexOf(a.id) - recent.indexOf(b.id) : 0));
  }, [query, category, favorites, recent, mode]);

  const isFiltering = query.trim().length > 0 || category !== 'All';

  return (
    <>
      <div className="catalog-surface ajn-glass-card" style={{ marginBottom: '18px' }}>
        <div className="catalog-toolbar" style={{ margin: 0, padding: 0, border: 0, background: 'transparent' }}>
          <label className="searchbox" style={{ position: 'relative' }}>
            <Search size={18} style={{ flexShrink: 0, color: 'var(--ajn-blue)' }} />
            <input
              id="home-tool-search"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search 30 tools by name or task (e.g. compress, passport, 35x45, signature, crop)..."
              aria-label="Filter image tools by name or task"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery('')}
                style={{
                  background: 'transparent',
                  border: 0,
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--ajn-muted)',
                  borderRadius: '50%',
                }}
                aria-label="Clear search"
                title="Clear search"
              >
                <X size={16} />
              </button>
            ) : null}
          </label>
          <div className="category-tabs" aria-label="Tool categories">
            {TOOL_CATEGORIES.map((item) => (
              <button
                key={item}
                className={category === item ? 'active' : ''}
                onClick={() => setCategory(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        {isFiltering && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              paddingTop: '12px',
              marginTop: '12px',
              borderTop: '1px solid var(--ajn-stroke)',
              fontSize: '11px',
              color: 'var(--ajn-muted)',
              fontWeight: 600,
            }}
          >
            <span>
              Showing <b style={{ color: 'var(--ajn-ink)' }}>{tools.length}</b> of 30 tools
              {query.trim() ? <> matching &ldquo;<span style={{ color: 'var(--ajn-blue)' }}>{query.trim()}</span>&rdquo;</> : null}
              {category !== 'All' ? <> in <span style={{ color: 'var(--ajn-ink)' }}>{category}</span></> : null}
            </span>
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setCategory('All');
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--ajn-blue)',
                cursor: 'pointer',
                fontWeight: 800,
                fontSize: '11px',
                padding: '2px 6px',
                textDecoration: 'underline',
              }}
            >
              Reset filters
            </button>
          </div>
        )}
      </div>

      <h2 className="sr-only">All 30 Image Tools</h2>
      {tools.length ? (
        <div className="tool-grid">
          {tools.map((tool) => {
            const t = tone(tool.category);
            const fav = favorites.includes(tool.id);
            return (
              <article className={`tool-card ajn-tool-card-pro ${t.card}`} key={tool.id}>
                <button
                  className={`favorite-button ${fav ? 'active' : ''}`}
                  aria-label={fav ? `Remove ${tool.name} from favorites` : `Add ${tool.name} to favorites`}
                  onClick={() => toggleFavorite(tool.id)}
                >
                  <Heart size={16} fill={fav ? 'currentColor' : 'none'} />
                </button>
                <Link href={`/${tool.id}`} className="tool-card-link" prefetch={false}>
                  <div className="tool-card-top">
                    <div className={`tool-icon ${t.icon}`}>
                      <ToolIcon name={tool.icon} />
                    </div>
                  </div>
                  <div className="tool-card-meta">
                    <span>{tool.category}</span>
                    {tool.badge ? <b>{tool.badge}</b> : null}
                  </div>
                  <h3>{tool.name}</h3>
                  <p>{tool.summary}</p>
                  <div className="tool-card-details">
                    <span>{tool.formats}</span>
                    <span>
                      Open tool <ArrowUpRight size={13} />
                    </span>
                  </div>
                </Link>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="empty-state ajn-v4-card ajn-card-blue" style={{ padding: '40px 20px', textAlign: 'center' }}>
          <Search size={32} style={{ margin: '0 auto 12px', color: 'var(--ajn-blue)' }} />
          <h3 style={{ fontSize: '18px', margin: '0 0 6px', color: 'var(--ajn-ink)' }}>
            {mode === 'favorites'
              ? 'No favorites yet'
              : mode === 'recent'
              ? 'No recent tools yet'
              : 'No matching tools found'}
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--ajn-muted)', margin: '0 auto 16px', maxWidth: '420px' }}>
            {mode === 'favorites'
              ? 'Tap the heart icon on any tool card to save it to your favorites.'
              : mode === 'recent'
              ? 'Once you open and use an image tool, it will appear here.'
              : `No image tools match "${query}". Try searching for compress, resize, passport, 35x45, signature, crop, or dpi.`}
          </p>
          {isFiltering ? (
            <button
              type="button"
              className="btn primary compact"
              onClick={() => {
                setQuery('');
                setCategory('All');
              }}
              style={{ margin: '0 auto' }}
            >
              Clear filters and view all 30 tools
            </button>
          ) : null}
        </div>
      )}
    </>
  );
}
