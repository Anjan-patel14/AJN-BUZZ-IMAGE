/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import {
  ArrowRight,
  ChevronDown,
  ExternalLink,
  History,
  Home,
  LifeBuoy,
  Menu,
  Search,
  Wrench,
  X,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import styles from "./ShellV7.module.css";

function Brand() {
  return (
    <Link href="/" className={styles.brand} aria-label="AJN Buzz home">
      <span className={styles.logoShell}>
        <img src="/brand/ajn-buzz-logo.png" alt="" width="44" height="44" />
      </span>
      <span className={styles.brandWords}>
        <b>AJN.<span>BUZZ</span></b>
        <small>IMAGE TOOLS</small>
      </span>
    </Link>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 14);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  return (
    <header className={`${styles.header} ${scrolled ? styles.scrolled : ""}`}>
      <div className={styles.navInner}>
        <Brand />

        <nav className={styles.desktopNav} aria-label="Primary navigation">
          <Link href="/tools" className={pathname.startsWith("/tools") ? styles.active : ""}>
            Image Tools <ChevronDown size={14} />
          </Link>
          <Link href="/features" className={pathname === "/features" ? styles.active : ""}>
            Features
          </Link>
          <Link href="/help" className={pathname === "/help" ? styles.active : ""}>
            Support
          </Link>
          <Link href="/about" className={pathname === "/about" ? styles.active : ""}>
            About
          </Link>
        </nav>

        <div className={styles.navActions}>
          <Link href="/tools" className={styles.searchButton} aria-label="Search image tools">
            <Search size={18} />
          </Link>
          <Link href="/tools" className={styles.navCta}>
            Explore Tools <ArrowRight size={16} />
          </Link>
          <button
            type="button"
            className={styles.menuButton}
            aria-label="Toggle navigation"
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
      </div>

      {open ? (
        <div className={styles.mobilePanel}>
          <Link href="/tools">All Image Tools <span>›</span></Link>
          <Link href="/features">Features <span>›</span></Link>
          <Link href="/help">Support <span>›</span></Link>
          <Link href="/faq">FAQ <span>›</span></Link>
          <Link href="/contact">Contact <span>›</span></Link>
          <div className={styles.mobileExternal}>
            <a href="https://ajnpdf.com" target="_blank" rel="noopener noreferrer">
              AJN PDF <ExternalLink size={14} />
            </a>
            <a href="https://qrajn.online" target="_blank" rel="noopener noreferrer">
              QR AJN <ExternalLink size={14} />
            </a>
          </div>
        </div>
      ) : null}
    </header>
  );
}

function MobileBottomNav() {
  const pathname = usePathname();
  return (
    <nav className={styles.mobileBottom} aria-label="Mobile navigation">
      <Link href="/" className={pathname === "/" ? styles.bottomActive : ""}>
        <Home size={18} />
        <span>Home</span>
      </Link>
      <Link href="/tools" className={pathname.startsWith("/tools") ? styles.bottomActive : ""}>
        <Wrench size={18} />
        <span>Tools</span>
      </Link>
      <Link href="/help" className={pathname === "/help" ? styles.bottomActive : ""}>
        <LifeBuoy size={18} />
        <span>Help</span>
      </Link>
      <Link href="/recent" className={pathname === "/recent" ? styles.bottomActive : ""}>
        <History size={18} />
        <span>Recent</span>
      </Link>
    </nav>
  );
}

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <div className={styles.footerBrand}>
          <Brand />
          <p>Simple, focused image tools for everyday browser workflows.</p>
        </div>

        <div className={styles.footerColumn}>
          <b>Tools</b>
          <Link href="/tools/compress">Compress Image</Link>
          <Link href="/tools/resize">Resize Image</Link>
          <Link href="/tools/crop">Crop Image</Link>
          <Link href="/tools/convert">Convert Image</Link>
          <Link href="/tools/photo-editor">Photo Editor</Link>
        </div>

        <div className={styles.footerColumn}>
          <b>Product</b>
          <Link href="/features">Features</Link>
          <Link href="/about">About</Link>
          <Link href="/help">Support</Link>
          <Link href="/faq">FAQ</Link>
          <Link href="/contact">Contact</Link>
        </div>

        <div className={styles.footerColumn}>
          <b>AJN Network</b>
          <a href="https://ajnpdf.com" target="_blank" rel="noopener noreferrer">
            AJN PDF
          </a>
          <a href="https://qrajn.online" target="_blank" rel="noopener noreferrer">
            QR AJN
          </a>
          <a href="mailto:ajnbuzz@gmail.com">ajnbuzz@gmail.com</a>
        </div>

        <div className={styles.footerColumn}>
          <b>Legal</b>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <span>© {new Date().getFullYear()} AJN Buzz</span>
        </div>
      </div>
    </footer>
  );
}

export function Page({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.pageShell}>
      <Navbar />
      {children}
      <Footer />
      <MobileBottomNav />
    </div>
  );
}
