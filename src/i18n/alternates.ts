import { getCollection } from 'astro:content';
import { translationPath, type Lang } from './ui';

export interface Alternate {
  lang: Lang;
  path: string;
}

let cache: Map<string, Alternate[]> | null = null;

/**
 * Every language version of the page at `path`, English first, or an empty list when the page has
 * no translation. Built once per build from the translations collection.
 */
export async function alternatesFor(path: string): Promise<Alternate[]> {
  if (!cache) {
    const groups = new Map<string, Alternate[]>();
    for (const t of await getCollection('translations')) {
      const group = groups.get(t.data.en) ?? [{ lang: 'en' as Lang, path: t.data.en }];
      group.push({ lang: t.data.lang, path: translationPath(t.id) });
      groups.set(t.data.en, group);
    }
    cache = new Map();
    for (const group of groups.values()) for (const a of group) cache.set(a.path, group);
  }
  return cache.get(path) ?? [];
}
