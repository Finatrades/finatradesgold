import { Helmet } from 'react-helmet-async';

interface PageSeoProps {
  title: string;
  description: string;
  canonical?: string;
  ogImage?: string;
}

const BASE_URL = 'https://finatrades.com';
const DEFAULT_OG_IMAGE = `${BASE_URL}/opengraph.jpg`;

export default function PageSeo({ title, description, canonical, ogImage }: PageSeoProps) {
  const fullTitle = title.includes('Finatrades') ? title : `${title} | Finatrades`;
  const canonicalUrl = canonical ? `${BASE_URL}${canonical}` : BASE_URL;
  const image = ogImage || DEFAULT_OG_IMAGE;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={image} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
    </Helmet>
  );
}
