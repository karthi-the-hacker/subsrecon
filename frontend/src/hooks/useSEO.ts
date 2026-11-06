import { useEffect } from 'react';

export interface SEOOptions {
  title?: string;
  description?: string;
  keywords?: string;
}

const BASE_TITLE = 'SUBSRECON // Tactical Attack Surface Intelligence';

export function useSEO({ title, description, keywords }: SEOOptions = {}) {
  useEffect(() => {
    // 1. Update Document Title
    const formattedTitle = title ? `${title} | SUBSRECON` : BASE_TITLE;
    document.title = formattedTitle;

    // 2. Update og:title
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) {
      ogTitle.setAttribute('content', formattedTitle);
    }

    const twitterTitle = document.querySelector('meta[name="twitter:title"]');
    if (twitterTitle) {
      twitterTitle.setAttribute('content', formattedTitle);
    }

    // 3. Update Description
    if (description) {
      const descMeta = document.querySelector('meta[name="description"]');
      if (descMeta) {
        descMeta.setAttribute('content', description);
      }
      const ogDesc = document.querySelector('meta[property="og:description"]');
      if (ogDesc) {
        ogDesc.setAttribute('content', description);
      }
      const twitterDesc = document.querySelector('meta[name="twitter:description"]');
      if (twitterDesc) {
        twitterDesc.setAttribute('content', description);
      }
    }

    // 4. Update Keywords
    if (keywords) {
      const kwMeta = document.querySelector('meta[name="keywords"]');
      if (kwMeta) {
        kwMeta.setAttribute('content', keywords);
      }
    }
  }, [title, description, keywords]);
}

export default useSEO;
