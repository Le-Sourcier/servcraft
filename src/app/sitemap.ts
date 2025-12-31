import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://servcraft.nexuscorporat.com';

  // Define our main static routes
  const routes = [
    '',
    '/cli',
    '/modules',
    '/quickstart',
    '/playground',
    '/docs',
    '/docs/getting-started',
    '/docs/structure',
    '/docs/architecture',
    '/docs/configuration',
    '/docs/auth',
    '/docs/database',
    '/docs/cli',
    '/docs/api',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route.includes('docs') ? 'weekly' : 'monthly' as any,
    priority: route === '' ? 1 : 0.8,
  }));

  return routes;
}
