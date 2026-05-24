import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card } from '@/components/ui/card';
import { useRoute, Link } from 'wouter';
import { useMemo } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

interface Article {
  id: string; slug: string; category: string; title: string;
  excerpt: string | null; publishedAt: string | null;
}
interface ArticleFull extends Article { body: string }

export default function HelpCenter() {
  const [matchDetail, params] = useRoute<{ slug: string }>('/help/:slug');
  return matchDetail && params?.slug ? <Detail slug={params.slug} /> : <Listing />;
}

function Listing() {
  const q = useQuery({
    queryKey: ['/api/help-articles'],
    queryFn: async () => (await (await apiRequest('GET', '/api/help-articles')).json()) as { articles: Article[] },
  });
  const byCategory = new Map<string, Article[]>();
  for (const a of q.data?.articles ?? []) {
    if (!byCategory.has(a.category)) byCategory.set(a.category, []);
    byCategory.get(a.category)!.push(a);
  }
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold" style={{ color: '#1A1A1A' }}>Help Center</h1>
        <p className="text-sm" style={{ color: '#888880' }}>Guides, FAQs and platform documentation.</p>
      </div>
      {q.isLoading && <div className="text-sm text-gray-500">Loading…</div>}
      {[...byCategory.entries()].map(([cat, items]) => (
        <Card key={cat} className="p-5">
          <h2 className="font-semibold text-lg mb-3 capitalize">{cat.replace(/-/g, ' ')}</h2>
          <ul className="space-y-2">
            {items.map(a => (
              <li key={a.id}>
                <Link href={`/help/${a.slug}`} className="font-semibold hover:underline" style={{ color: '#C73B22' }}>{a.title}</Link>
                {a.excerpt && <div className="text-sm text-gray-600">{a.excerpt}</div>}
              </li>
            ))}
          </ul>
        </Card>
      ))}
      {!q.isLoading && byCategory.size === 0 && <div className="text-sm text-gray-500">No articles published yet.</div>}
    </div>
  );
}

function Detail({ slug }: { slug: string }) {
  const q = useQuery({
    queryKey: ['/api/help-articles', slug],
    queryFn: async () => (await (await apiRequest('GET', `/api/help-articles/${slug}`)).json()) as { article: ArticleFull },
  });
  if (q.isLoading) return <div className="p-6 text-sm text-gray-500">Loading…</div>;
  if (q.isError || !q.data?.article) return <div className="p-6 text-sm text-gray-500">Article not found. <Link href="/help" className="underline">Back to Help</Link></div>;
  const a = q.data.article;
  const html = useMemo(() => {
    // Render markdown → HTML, then sanitize with DOMPurify before injecting.
    // marked.parse is synchronous when called without async options.
    const raw = marked.parse(a.body ?? '', { async: false }) as string;
    return DOMPurify.sanitize(raw, {
      ALLOWED_TAGS: ['a','b','i','em','strong','u','s','code','pre','blockquote','br','hr',
        'p','div','span','h1','h2','h3','h4','h5','h6','ul','ol','li',
        'table','thead','tbody','tr','td','th','img'],
      ALLOWED_ATTR: ['href','title','target','rel','src','alt','width','height','colspan','rowspan'],
      ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
    });
  }, [a.body]);
  return (
    <div className="max-w-3xl mx-auto p-6">
      <Link href="/help" className="text-sm" style={{ color: '#C73B22' }}>← Back to Help Center</Link>
      <h1 className="text-3xl font-bold mt-3 mb-2" style={{ color: '#1A1A1A' }}>{a.title}</h1>
      <div className="text-xs text-gray-500 mb-6">{a.category}{a.publishedAt && ` • ${new Date(a.publishedAt).toLocaleDateString()}`}</div>
      <article className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
