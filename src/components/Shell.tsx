'use client';

import Link from 'next/link';
import { ExternalLink, FileText, Heart, History, Home, Menu, Search, Wrench, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

function Brand() {
  return (
    <Link href="/" className="brand" aria-label="AJN BUZZ IMAGE home">
      <span className="brand-logo-shell">
        <img src="/brand/ajn-buzz-logo.png" alt="AJN BUZZ IMAGE" width="42" height="42" />
      </span>
      <span>
        <b>AJN BUZZ</b>
        <small>IMAGE TOOLS</small>
      </span>
    </Link>
  );
}

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 18);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={`nav ajn-glass-card ${scrolled || open ? 'scrolled' : ''}`}>
      <div className="navin">
        <Brand />
        <nav className={`navlinks ${open ? 'open' : ''}`} aria-label="Main navigation">
          <Link href="/tools" className="tools-link">
            All Tools
          </Link>
          <Link href="/compress">Compress</Link>
          <Link href="/resize">Resize</Link>
          <Link href="/passport-photo-maker">Passport Photo</Link>
          <Link href="/signature-maker">Signature</Link>
          <a
            className="pdf-nav-link"
            href="https://ajnpdf.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            AJN PDF <ExternalLink size={13} />
          </a>
        </nav>
        <div className="nav-actions">
          <Link href="/tools" className="nav-icon" title="Search image tools" aria-label="Search image tools">
            <Search size={18} />
          </Link>
          <div className="nav-utility">
            <Link href="/favorites" title="Favorites" aria-label="Saved favorites">
              <Heart size={17} />
            </Link>
            <Link href="/recent" title="Recent tools" aria-label="Recently opened tools">
              <History size={17} />
            </Link>
          </div>
          <button
            className="mobile-menu"
            aria-label={open ? 'Close mobile navigation menu' : 'Open mobile navigation menu'}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
        {open ? (
          <div className="mobile-nav-panel" role="dialog" aria-label="Mobile Navigation Drawer">
            <div className="mobile-quick">
              <Link href="/compress" onClick={() => setOpen(false)}>
                Compress
              </Link>
              <Link href="/resize" onClick={() => setOpen(false)}>
                Resize
              </Link>
              <Link href="/passport-photo-maker" onClick={() => setOpen(false)}>
                Passport
              </Link>
              <Link href="/signature-maker" onClick={() => setOpen(false)}>
                Signature
              </Link>
            </div>
            <Link href="/tools" onClick={() => setOpen(false)}>
              All Image Tools <span>›</span>
            </Link>
            <a href="https://ajnpdf.com" target="_blank" rel="noopener noreferrer">
              AJN PDF Tools <ExternalLink size={14} />
            </a>
            <a href="https://unna.space" target="_blank" rel="noopener noreferrer">
              UNNA.space <ExternalLink size={14} />
            </a>
            <a href="https://qrajn.online" target="_blank" rel="noopener noreferrer">
              QR AJN <ExternalLink size={14} />
            </a>
            <Link href="/favorites" onClick={() => setOpen(false)}>
              Favorites <span>›</span>
            </Link>
            <Link href="/recent" onClick={() => setOpen(false)}>
              Recent <span>›</span>
            </Link>
            <Link href="/help" onClick={() => setOpen(false)}>
              Help <span>›</span>
            </Link>
          </div>
        ) : null}
      </div>
    </header>
  );
}

function MobileBottomNav() {
  const pathname = usePathname();
  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile bottom navigation">
      <div className="mobile-bottom-nav-inner ajn-glass-card">
        <Link href="/" className={pathname === '/' ? 'active' : ''}>
          <Home size={18} />
          <span>Home</span>
        </Link>
        <Link href="/tools" className={pathname.startsWith('/tools') ? 'active' : ''}>
          <Wrench size={18} />
          <span>Tools</span>
        </Link>
        <a href="https://ajnpdf.com" target="_blank" rel="noopener noreferrer">
          <FileText size={18} />
          <span>PDF</span>
        </a>
        <Link href="/recent" className={pathname.startsWith('/recent') ? 'active' : ''}>
          <History size={18} />
          <span>Recent</span>
        </Link>
      </div>
    </nav>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="footer-grid">
        <div className="footer-brand">
          <Brand />
          <p>
            30 focused image tools for photo sizing, compression, signatures, editing, conversion and
            everyday image work.
          </p>
        </div>
        <div>
          <b>Popular tools</b>
          <Link href="/resize">Resize Image</Link>
          <Link href="/compress">Compress Image</Link>
          <Link href="/passport-photo-maker">Passport Photo Maker</Link>
          <Link href="/signature-maker">Signature Maker</Link>
          <Link href="/crop">Crop Image</Link>
        </div>
        <div>
          <b>Photo & size</b>
          <Link href="/resize-cm">Resize in CM</Link>
          <Link href="/resize-mm">Resize in MM</Link>
          <Link href="/resize-inches">Resize in Inches</Link>
          <Link href="/photo-size-converter">Photo Size Converter</Link>
          <Link href="/dpi-changer">DPI Changer</Link>
        </div>
        <div>
          <b>AJN Ecosystem</b>
          <a href="https://ajnpdf.com" target="_blank" rel="noopener noreferrer">
            AJN PDF Tools
          </a>
          <a href="https://unna.space" target="_blank" rel="noopener noreferrer">
            UNNA.space
          </a>
          <a href="https://qrajn.online" target="_blank" rel="noopener noreferrer">
            QR AJN Visiting Card
          </a>
        </div>
        <div>
          <b>Company</b>
          <Link href="/about">About</Link>
          <Link href="/help">Help</Link>
          <Link href="/faq">FAQ</Link>
          <Link href="/contact">Contact</Link>
        </div>
        <div>
          <b>Legal</b>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <span className="small muted">© {new Date().getFullYear()} AJN BUZZ IMAGE</span>
        </div>
      </div>
    </footer>
  );
}

export function Page({ children }: { children: React.ReactNode }) {
  return (
    <div className="ajn-page-shell">
      <Navbar />
      {children}
      <Footer />
      <MobileBottomNav />
    </div>
  );
}
