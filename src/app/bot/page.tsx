import type { Metadata } from 'next';
import { Page } from '@/components/Shell';
import { AjnBot } from '@/components/AjnBot';
import { buildPageMetadata } from '@/lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'AJN Bot — AI Image Task Assistant',
  description: 'Tell AJN Bot what you want to do with an image or signature. It maps your request to an AJN Buzz tool and runs supported image processing in your browser.',
  path: '/bot',
  index: true,
  keywords: ['AJN Bot','image AI assistant','photo size assistant','signature assistant','AJN Buzz bot'],
});

export default function BotPage() {
  return <Page><main className="section bot-page"><div className="container"><AjnBot /></div></main></Page>;
}
