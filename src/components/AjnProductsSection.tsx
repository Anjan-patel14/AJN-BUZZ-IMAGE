'use client';

import { ArrowUpRight, Check, FileText, Keyboard, QrCode } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  domain: string;
  url: string;
  heading?: string;
  description: string;
  highlights: string[];
  cta: string;
  theme: {
    accent: string;
    bg: string;
    border: string;
    badgeBg: string;
    badgeText: string;
    iconColor: string;
  };
  icon: typeof FileText;
}

const PRODUCTS: Product[] = [
  {
    id: 'ajn-pdf',
    name: 'AJN PDF',
    domain: 'ajnpdf.com',
    url: 'https://ajnpdf.com/',
    heading: 'Your Everyday PDF Toolkit',
    description:
      'Edit, convert, compress, merge, split, and manage PDF documents with a simple, user-friendly interface.',
    highlights: [
      'Edit and manage PDF documents',
      'Compress PDFs to smaller file sizes',
      'Merge multiple PDF files into one',
      'Split PDF documents easily',
      'Convert supported document formats',
      'Sign PDFs & access document utilities',
    ],
    cta: 'Explore AJN PDF',
    theme: {
      accent: '#1a56db',
      bg: '#f0f5ff',
      border: '#d0e1fd',
      badgeBg: '#e1effe',
      badgeText: '#1a56db',
      iconColor: '#1a56db',
    },
    icon: FileText,
  },
  {
    id: 'unna-space',
    name: 'UNNA.space',
    domain: 'unna.space',
    url: 'https://unna.space/',
    heading: 'Improve Your Typing Skills One Key at a Time',
    description:
      'Master typing speed and precision with real-time horizontal scrolling, live character-level feedback, code typing drills, and transparent WPM analytics.',
    highlights: [
      'Typing speed and accuracy practice',
      'Real-time horizontal scrolling',
      'Live character-level feedback',
      'Code typing drills',
      'Transparent words-per-minute analytics',
    ],
    cta: 'Explore UNNA.space',
    theme: {
      accent: '#059669',
      bg: '#ecfdf5',
      border: '#a7f3d0',
      badgeBg: '#d1fae5',
      badgeText: '#047857',
      iconColor: '#059669',
    },
    icon: Keyboard,
  },
  {
    id: 'qr-ajn',
    name: 'QR AJN',
    domain: 'qrajn.online',
    url: 'https://qrajn.online/',
    heading: 'Digital Visiting Card & QR Profiles',
    description:
      'Create and share a digital visiting-card experience that helps people access professional contact details through a QR code and shareable profile link.',
    highlights: [
      'Digital visiting-card profiles',
      'QR-code-based profile access',
      'Shareable profile links',
      'Professional contact presentation',
      'Visiting-card customization',
    ],
    cta: 'Explore QR AJN',
    theme: {
      accent: '#7c3aed',
      bg: '#f5f3ff',
      border: '#ddd6fe',
      badgeBg: '#ede9fe',
      badgeText: '#6d28d9',
      iconColor: '#7c3aed',
    },
    icon: QrCode,
  },
];

export function AjnProductsSection() {
  return (
    <section className="section ajn-products-section" aria-labelledby="ajn-products-heading">
      <div className="container">
        <div className="sectionhead center-head">
          <div>
            <div className="eyebrow">AJN ECOSYSTEM</div>
            <h2 id="ajn-products-heading">Explore AJN Products</h2>
            <p className="lead center-lead">
              Discover more useful digital tools from AJN. From PDF editing and digital visiting cards
              to interactive typing practice platforms, explore products designed to make everyday digital tasks easier.
            </p>
          </div>
        </div>

        <div className="ajn-products-grid">
          {PRODUCTS.map((prod) => {
            const Icon = prod.icon;
            return (
              <article key={prod.id} className="ajn-product-card">
                <div
                  className="ajn-product-card-top-accent"
                  style={{ backgroundColor: prod.theme.accent }}
                />
                <div className="ajn-product-card-header">
                  <div
                    className="ajn-product-icon-shell"
                    style={{
                      backgroundColor: prod.theme.badgeBg,
                      color: prod.theme.iconColor,
                      borderColor: prod.theme.border,
                    }}
                  >
                    <Icon size={24} />
                  </div>
                  <div className="ajn-product-title-group">
                    <h3>{prod.name}</h3>
                    <span
                      className="ajn-product-domain-tag"
                      style={{
                        backgroundColor: prod.theme.badgeBg,
                        color: prod.theme.badgeText,
                      }}
                    >
                      {prod.domain}
                    </span>
                  </div>
                </div>

                {prod.heading ? (
                  <h4 className="ajn-product-card-heading">{prod.heading}</h4>
                ) : null}

                <p className="ajn-product-description">{prod.description}</p>

                <div className="ajn-product-highlights-head">Key Features</div>
                <ul className="ajn-product-highlights">
                  {prod.highlights.map((feat) => (
                    <li key={feat}>
                      <Check
                        size={15}
                        className="ajn-check-icon"
                        style={{ color: prod.theme.accent }}
                      />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>

                <div className="ajn-product-action">
                  <a
                    href={prod.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn ajn-product-cta-btn"
                    style={{
                      borderColor: prod.theme.border,
                      color: '#14243a',
                    }}
                  >
                    <span>{prod.cta}</span>
                    <ArrowUpRight size={16} style={{ color: prod.theme.accent }} />
                  </a>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
