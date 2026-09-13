import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BriefcaseBusiness,
  Camera,
  CheckCircle2,
  Download,
  FileText,
  Gem,
  Globe2,
  GraduationCap,
  Heart,
  ImageIcon,
  MonitorSmartphone,
  PlayCircle,
  QrCode,
  Rocket,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  WandSparkles,
  Zap,
} from "lucide-react";
import { buildPageMetadata, SITE_URL } from "@/lib/seo";
import { Page } from "@/components/Shell";
import { HomeQuickCompress } from "@/components/HomeQuickCompress";
import { IMAGE_TOOLS } from "@/lib/image-tools";
import { ToolIcon } from "@/components/ToolIcon";
import styles from "./home-v7.module.css";

export const metadata = buildPageMetadata({
  title: "AJN Buzz — Smart Online Image Tools",
  description:
    "Compress, resize, crop, convert, edit, upscale, rotate and watermark images with focused browser-based tools from AJN Buzz.",
  path: "/",
  index: true,
  keywords: [
    "AJN Buzz",
    "online image tools",
    "compress image online",
    "resize image online",
    "crop image online",
    "image converter",
    "photo editor online",
    "watermark image",
    "upscale image",
    "html to image",
  ],
});

const toolTones = [
  styles.green,
  styles.purple,
  styles.pink,
  styles.orange,
  styles.blue,
  styles.indigo,
  styles.violet,
  styles.rose,
  styles.cyan,
  styles.code,
  styles.sky,
];

const differenceCards = [
  {
    title: "Photo Editor",
    href: "/tools/photo-editor",
    image: "/landing/demo_photo_editor.jpg",
    body: "Adjust brightness, contrast, saturation and blur with a live preview.",
  },
  {
    title: "Resize Image",
    href: "/tools/resize",
    image: "/landing/demo_resize.jpg",
    body: "Set exact pixel dimensions and keep proportions when needed.",
  },
  {
    title: "Watermark Image",
    href: "/tools/watermark",
    image: "/landing/demo_watermark.jpg",
    body: "Add your own text watermark with position and opacity controls.",
  },
  {
    title: "Upscale Image",
    href: "/tools/upscale",
    image: "/landing/workflow_upscale.jpg",
    body: "Increase dimensions by 2×, 3× or 4× with browser resampling.",
  },
];

const audienceCards = [
  {
    title: "Students",
    icon: GraduationCap,
    image: "/landing/audience_students.jpg",
    body: "Prepare assignment images, form uploads and presentation graphics.",
    tone: styles.purple,
  },
  {
    title: "Creators",
    icon: Camera,
    image: "/landing/audience_creators.jpg",
    body: "Resize, edit and prepare images for posts, thumbnails and portfolios.",
    tone: styles.pink,
  },
  {
    title: "Businesses",
    icon: BriefcaseBusiness,
    image: "/landing/audience_business.jpg",
    body: "Create cleaner product, website and campaign-ready image assets.",
    tone: styles.blue,
  },
  {
    title: "Personal use",
    icon: Heart,
    image: "/landing/audience_personal.jpg",
    body: "Crop, rotate, convert and improve everyday photos without extra software.",
    tone: styles.rose,
  },
];

const workflowCards = [
  {
    title: "Resize Image",
    href: "/tools/resize",
    image: "/landing/demo_resize.jpg",
    body: "Perfect for forms, websites, social posts and exact pixel requirements.",
  },
  {
    title: "Upscale Image",
    href: "/tools/upscale",
    image: "/landing/workflow_upscale.jpg",
    body: "Increase image dimensions when you need a larger export.",
  },
  {
    title: "Photo Editor",
    href: "/tools/photo-editor",
    image: "/landing/workflow_photo_editor.jpg",
    body: "Fine-tune brightness, contrast, saturation and blur.",
  },
  {
    title: "Watermark Image",
    href: "/tools/watermark",
    image: "/landing/workflow_watermark.jpg",
    body: "Add clear ownership or branding text before sharing an image.",
  },
];

const faqs = [
  {
    q: "Do I need an account to use AJN Buzz?",
    a: "No account is required for the current public image tools. Open a tool, select an image, process it and download the result.",
  },
  {
    q: "Which image formats are supported?",
    a: "Core workflows support JPG/JPEG, PNG and WebP. Some tools also accept browser-decodable SVG. Exact input and output formats are shown on each tool page.",
  },
  {
    q: "Does AJN Buzz upload my source image?",
    a: "The current public image transformations are designed to use browser APIs for source-image processing. Advertising and linked external services can make their own network requests; see the Privacy Policy for details.",
  },
  {
    q: "Is Upscale Image an AI generator?",
    a: "No. AJN Buzz Upscale uses high-quality browser resampling and does not claim to invent new visual details.",
  },
];

const toolListStructuredData = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "AJN Buzz Online Image Tools",
  itemListElement: IMAGE_TOOLS.map((tool, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: tool.name,
    url: `${SITE_URL}/tools/${tool.id}`,
  })),
};

const homeWebAppData = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "AJN Buzz",
  url: SITE_URL,
  applicationCategory: "MultimediaApplication",
  operatingSystem: "Any",
  description:
    "Focused browser-based image tools for compression, resizing, cropping, conversion and editing.",
  featureList: IMAGE_TOOLS.map((tool) => tool.name),
};

export default function Home() {
  return (
    <Page>
      <main className={styles.home}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(toolListStructuredData),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(homeWebAppData) }}
        />

        <section className={styles.hero}>
          <div className={styles.heroGlowOne} aria-hidden="true" />
          <div className={styles.heroGlowTwo} aria-hidden="true" />
          <div className={styles.dotPattern} aria-hidden="true" />
          <div className={`container ${styles.heroInner}`}>
            <span className={styles.pill}>ALL-IN-ONE IMAGE TOOLS</span>
            <h1>
              Smart Image Tools <span>in One Place</span>
            </h1>
            <p className={styles.heroLead}>
              Compress, resize, crop, convert and edit images online with a
              simple workflow built for everyday image tasks.
            </p>
            <div className={styles.heroActions}>
              <Link href="/tools/photo-editor" className={styles.primaryButton}>
                Start Editing Now <ArrowRight size={18} />
              </Link>
              <Link href="/tools" className={styles.secondaryButton}>
                <PlayCircle size={18} /> Explore Tools
              </Link>
            </div>
            <div className={styles.handNote}>
              Edit. Resize. Convert.
              <span aria-hidden="true">↘</span>
            </div>
            <div className={styles.proofRow}>
              <div>
                <span className={`${styles.proofIcon} ${styles.blue}`}>
                  <Zap size={19} />
                </span>
                <span>
                  <b>Fast & easy</b>
                  <small>Focused workflows</small>
                </span>
              </div>
              <div>
                <span className={`${styles.proofIcon} ${styles.green}`}>
                  <ShieldCheck size={19} />
                </span>
                <span>
                  <b>Browser processing</b>
                  <small>For current image tools</small>
                </span>
              </div>
              <div>
                <span className={`${styles.proofIcon} ${styles.pink}`}>
                  <Heart size={19} />
                </span>
                <span>
                  <b>No sign-up</b>
                  <small>Open a tool and start</small>
                </span>
              </div>
              <div>
                <span className={`${styles.proofIcon} ${styles.indigo}`}>
                  <Globe2 size={19} />
                </span>
                <span>
                  <b>Works on devices</b>
                  <small>Modern desktop & mobile browsers</small>
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.toolsSection}>
          <div className="container">
            <div className={styles.centerHeading}>
              <span>EXPLORE OUR TOOLS</span>
              <h2>Everything You Need for Images</h2>
              <p>Eleven focused tools, ready when you need them.</p>
            </div>
            <div className={styles.toolGrid}>
              {IMAGE_TOOLS.map((tool, index) => (
                <Link
                  href={`/tools/${tool.id}`}
                  className={styles.toolCard}
                  key={tool.id}
                >
                  <span
                    className={`${styles.toolIcon} ${
                      toolTones[index % toolTones.length]
                    }`}
                  >
                    <ToolIcon name={tool.icon} size={28} />
                  </span>
                  <strong>{tool.name}</strong>
                  <small>{tool.summary}</small>
                </Link>
              ))}
              <Link href="/tools" className={`${styles.toolCard} ${styles.moreCard}`}>
                <span className={`${styles.toolIcon} ${styles.soft}`}>
                  <Sparkles size={28} />
                </span>
                <strong>All Image Tools</strong>
                <small>Search and explore the complete current image catalog.</small>
              </Link>
            </div>
          </div>
        </section>

        <section className={styles.differenceSection}>
          <div className="container">
            <div className={styles.centerHeading}>
              <h2>See the Difference</h2>
              <p>Illustrative workflow previews for real AJN Buzz tools.</p>
            </div>
            <div className={styles.differenceGrid}>
              {differenceCards.map((item) => (
                <Link href={item.href} className={styles.visualCard} key={item.title}>
                  <div className={styles.visualCardTitle}>
                    <span className={`${styles.miniIcon} ${styles.purple}`}>
                      <ImageIcon size={18} />
                    </span>
                    <span>
                      <strong>{item.title}</strong>
                      <small>{item.body}</small>
                    </span>
                  </div>
                  <div className={styles.visualImage}>
                    <Image
                      src={item.image}
                      alt={`${item.title} workflow preview`}
                      fill
                      sizes="(max-width: 760px) 90vw, 24vw"
                    />
                  </div>
                </Link>
              ))}
            </div>
            <div className={styles.benefitStrip}>
              <div>
                <Rocket size={22} />
                <span>
                  <b>Quick workflows</b>
                  <small>Clear controls without a complex editor.</small>
                </span>
              </div>
              <div>
                <MonitorSmartphone size={22} />
                <span>
                  <b>Works everywhere</b>
                  <small>Use a modern browser on desktop, tablet or mobile.</small>
                </span>
              </div>
              <div>
                <Gem size={22} />
                <span>
                  <b>Purpose-built tools</b>
                  <small>Each workflow stays focused on one image task.</small>
                </span>
              </div>
              <div>
                <CheckCircle2 size={22} />
                <span>
                  <b>Capability honesty</b>
                  <small>No unsupported AI claims or fabricated results.</small>
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.stepsSection} id="how-it-works">
          <div className="container">
            <div className={styles.centerHeading}>
              <span>HOW IT WORKS</span>
              <h2>Get Results in 4 Simple Steps</h2>
              <p>No installation and no complicated desktop software.</p>
            </div>
            <div className={styles.stepsGrid}>
              {[
                {
                  n: "1",
                  title: "Upload image",
                  body: "Choose or drag and drop a supported image.",
                  Icon: UploadCloud,
                  tone: styles.purple,
                },
                {
                  n: "2",
                  title: "Choose a tool",
                  body: "Pick the exact image task you want to complete.",
                  Icon: ImageIcon,
                  tone: styles.pink,
                },
                {
                  n: "3",
                  title: "Edit & process",
                  body: "Adjust the available controls and process the result.",
                  Icon: WandSparkles,
                  tone: styles.blue,
                },
                {
                  n: "4",
                  title: "Download result",
                  body: "Preview the output and save it to your device.",
                  Icon: Download,
                  tone: styles.green,
                },
              ].map(({ n, title, body, Icon, tone }, index) => (
                <article className={styles.stepCard} key={title}>
                  <span className={`${styles.stepIcon} ${tone}`}>
                    <Icon size={25} />
                  </span>
                  <span className={styles.stepNumber}>{n}</span>
                  <div>
                    <h3>{title}</h3>
                    <p>{body}</p>
                  </div>
                  {index < 3 ? (
                    <ArrowRight className={styles.stepArrow} size={24} aria-hidden="true" />
                  ) : null}
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.audienceSection}>
          <div className="container">
            <div className={styles.centerHeading}>
              <h2>Perfect for Everyday Image Work</h2>
              <p>Useful for students, creators, businesses and personal tasks.</p>
            </div>
            <div className={styles.audienceGrid}>
              {audienceCards.map(({ title, icon: Icon, image, body, tone }) => (
                <article className={styles.audienceCard} key={title}>
                  <div className={styles.audienceTitle}>
                    <span className={`${styles.miniIcon} ${tone}`}>
                      <Icon size={19} />
                    </span>
                    <span>
                      <h3>{title}</h3>
                      <p>{body}</p>
                    </span>
                  </div>
                  <div className={styles.audienceImage}>
                    <Image
                      src={image}
                      alt={`${title} image workflow illustration`}
                      fill
                      sizes="(max-width: 760px) 90vw, 24vw"
                    />
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.workflowsSection}>
          <div className="container">
            <div className={styles.centerHeading}>
              <span>EXPLORE BY USE CASE</span>
              <h2>Popular Image Workflows</h2>
              <p>Start with a common task and continue from there.</p>
            </div>
            <div className={styles.workflowGrid}>
              {workflowCards.map((item) => (
                <Link href={item.href} className={styles.workflowCard} key={item.title}>
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.body}</p>
                  </div>
                  <div className={styles.workflowImage}>
                    <Image
                      src={item.image}
                      alt={`${item.title} example`}
                      fill
                      sizes="(max-width: 760px) 90vw, 24vw"
                    />
                  </div>
                  <span className={styles.workflowLink}>
                    Open tool <ArrowRight size={15} />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.realProductSection}>
          <div className="container">
            <div className={styles.centerHeading}>
              <span>BUILT AROUND REAL WORKFLOWS</span>
              <h2>Simple Tools. Clear Capabilities.</h2>
              <p>
                AJN Buzz avoids fabricated testimonials, invented usage numbers and unsupported
                technology claims.
              </p>
            </div>
            <div className={styles.principleGrid}>
              <article>
                <span className={`${styles.principleIcon} ${styles.purple}`}>
                  <ShieldCheck size={22} />
                </span>
                <h3>Privacy-conscious design</h3>
                <p>
                  Current image transformations are designed around browser APIs.
                  Privacy details are documented publicly.
                </p>
              </article>
              <article>
                <span className={`${styles.principleIcon} ${styles.blue}`}>
                  <Zap size={22} />
                </span>
                <h3>Focused image catalog</h3>
                <p>
                  Eleven public image tools instead of a large catalog of unfinished
                  or unrelated utilities.
                </p>
              </article>
              <article>
                <span className={`${styles.principleIcon} ${styles.green}`}>
                  <CheckCircle2 size={22} />
                </span>
                <h3>Honest tool descriptions</h3>
                <p>
                  Upscale is described as resampling, and tool limitations stay visible
                  instead of being hidden behind marketing language.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section className={styles.quickCompressSection}>
          <div className="container">
            <div className={styles.centerHeading}>
              <span>TRY A TOOL NOW</span>
              <h2>Compress an Image from the Homepage</h2>
              <p>Use the real AJN Buzz compressor without leaving the landing page.</p>
            </div>
            <div className={styles.quickCompressShell}>
              <HomeQuickCompress />
            </div>
          </div>
        </section>

        <section className={styles.networkSection}>
          <div className="container">
            <div className={styles.centerHeading}>
              <span>AJN NETWORK</span>
              <h2>More Focused Tools from AJN</h2>
              <p>Image work stays in AJN Buzz. PDF and QR workflows open separately.</p>
            </div>
            <div className={styles.networkGrid}>
              <a
                href="https://ajnpdf.com"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.networkCard}
              >
                <span className={`${styles.networkIcon} ${styles.rose}`}>
                  <FileText size={29} />
                </span>
                <span>
                  <strong>AJN PDF</strong>
                  <p>Open focused PDF tools for document workflows.</p>
                  <small>Open ajnpdf.com →</small>
                </span>
              </a>
              <a
                href="https://qrajn.online"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.networkCard}
              >
                <span className={`${styles.networkIcon} ${styles.indigo}`}>
                  <QrCode size={29} />
                </span>
                <span>
                  <strong>QR AJN</strong>
                  <p>Create and manage QR workflows at qrajn.online.</p>
                  <small>Open qrajn.online →</small>
                </span>
              </a>
            </div>
          </div>
        </section>

        <section className={styles.faqSection}>
          <div className={`container ${styles.faqInner}`}>
            <div className={styles.centerHeading}>
              <span>QUESTIONS</span>
              <h2>AJN Buzz FAQ</h2>
              <p>Important answers before you start processing images.</p>
            </div>
            <div className={styles.faqList}>
              {faqs.map((item) => (
                <details key={item.q}>
                  <summary>{item.q}</summary>
                  <p>{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.finalCta}>
          <div className="container">
            <div className={styles.finalCtaCard}>
              <Sparkles size={30} />
              <h2>Start Working with Your Images</h2>
              <p>
                Choose a focused image tool and complete the task directly in your
                browser.
              </p>
              <div className={styles.heroActions}>
                <Link href="/tools" className={styles.primaryButton}>
                  Explore AJN Buzz Tools <ArrowRight size={18} />
                </Link>
              </div>
              <span className={styles.ctaNote}>Your next image task is one click away.</span>
            </div>
          </div>
        </section>

        {/* Main Image Tools · More Image Tools · Image tools that do the actual work. */}
        {/* IMAGES · IDEAS · POSSIBILITIES */}
      </main>
    </Page>
  );
}
