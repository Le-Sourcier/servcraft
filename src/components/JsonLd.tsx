import React from 'react';

/**
 * Component to inject JSON-LD structured data into the page.
 * This helps search engines understand the content and structure of our site.
 */
export default function JsonLd({ data }: { data: Record<string, any> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
