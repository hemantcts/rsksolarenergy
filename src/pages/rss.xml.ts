/**
 * RSS feed of the blog, newest first, at /rss.xml. Metricool reads it to share each new post on the
 * social accounts; feed readers can use it too. Written by hand, so it needs no dependency.
 */
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { BUSINESS } from '../config/business';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const rfc822 = (d: string) => new Date(`${d}T06:00:00+05:30`).toUTCString();

export const GET: APIRoute = async () => {
  const site = BUSINESS.siteUrl;
  const posts = (await getCollection('blog')).sort((a, b) => b.data.published.localeCompare(a.data.published));
  const items = posts
    .map((p) => {
      const url = `${site}/blog/${p.id}/`;
      return `    <item>
      <title>${esc(p.data.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${rfc822(p.data.published)}</pubDate>
      <category>${esc(p.data.category)}</category>
      <description>${esc(p.data.description)}</description>
    </item>`;
    })
    .join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(BUSINESS.name)}: solar guides for Punjab</title>
    <link>${site}/blog/</link>
    <atom:link href="${site}/rss.xml" rel="self" type="application/rss+xml" />
    <description>Plain guides to rooftop solar in Punjab: sizing, the PM Surya Ghar subsidy, net metering, batteries and costs.</description>
    <language>en-IN</language>
    <lastBuildDate>${posts[0] ? rfc822(posts[0].data.updated ?? posts[0].data.published) : new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>
`;
  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
};
