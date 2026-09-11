import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const qa = z.object({ q: z.string(), a: z.string() });
const link = z.object({ href: z.string(), label: z.string() });

/** Evergreen pages at the site root: subsidy guide, explainers, commercial, society, distributor. */
const guides = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/guides' }),
  schema: z.object({
    title: z.string().max(70),
    description: z.string().max(170),
    h1: z.string(),
    lead: z.string(),
    crumb: z.string(),
    kind: z.enum(['service', 'article']).default('article'),
    serviceType: z.string().optional(),
    updated: z.string(),
    faq: z.array(qa).default([]),
    related: z.array(link).default([]),
    cta: z.object({ heading: z.string(), label: z.string(), message: z.string() }).optional(),
  }),
});

const blog = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/blog' }),
  schema: z.object({
    title: z.string().max(70),
    description: z.string().max(170),
    published: z.string(),
    updated: z.string().optional(),
    category: z.enum(['Subsidy and bills', 'Sizing and systems']),
    faq: z.array(qa).default([]),
  }),
});

export const collections = { guides, blog };
