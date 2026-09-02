import { axiosClient } from '../../lib/axios';

/**
 * blogService — data-access layer for the CMS-driven blog.
 *
 * Admin CRUD goes through the shared authenticated `axiosClient` (attaches the
 * Supabase JWT, normalizes failures to ApiError) against `/api/admin/blog`.
 * Public list/detail reads use native `fetch` against `/api/public/blog`
 * (unauthenticated, published-only), mirroring the StaticPage pattern.
 *
 * Backend response envelope is `{ data: ... }`; admin methods unwrap `.data`.
 */

/** Post status as stored in the `blog_posts.status` column. */
export type BlogStatus = 'draft' | 'published';

/** Full blog post record (admin view — all columns). */
export interface BlogPost {
    id: string;
    slug: string;
    title: string;
    excerpt: string | null;
    body: string | null;
    author: string | null;
    category: string | null;
    tags: string[] | null;
    featured_image: string | null;
    meta_title: string | null;
    meta_description: string | null;
    meta_keywords: string | null;
    canonical_url: string | null;
    og_image: string | null;
    robots: string | null;
    status: BlogStatus;
    published_at: string | null;
    created_at: string;
    updated_at: string;
}

/** Payload accepted by create/update (id/timestamps are server-managed). */
export type BlogPostInput = Partial<{
    slug: string;
    title: string;
    excerpt: string | null;
    body: string | null;
    author: string | null;
    category: string | null;
    tags: string[] | null;
    featured_image: string | null;
    meta_title: string | null;
    meta_description: string | null;
    meta_keywords: string | null;
    canonical_url: string | null;
    og_image: string | null;
    robots: string | null;
    status: BlogStatus;
    published_at: string | null;
}>;

/** Lightweight shape returned by the public list endpoint. */
export interface PublicBlogListItem {
    slug: string;
    title: string;
    excerpt: string | null;
    author: string | null;
    category: string | null;
    tags: string[] | null;
    featured_image: string | null;
    published_at: string | null;
}

/** Full public post (published-only) returned by the detail endpoint. */
export interface PublicBlogPost {
    slug: string;
    title: string;
    excerpt: string | null;
    body: string | null;
    author: string | null;
    category: string | null;
    tags: string[] | null;
    featured_image: string | null;
    meta_title: string | null;
    meta_description: string | null;
    meta_keywords: string | null;
    canonical_url: string | null;
    og_image: string | null;
    robots: string | null;
    published_at: string | null;
    updated_at: string;
}

export const blogService = {
    // --- Admin CRUD (authenticated) ---
    getBlogPosts: async (): Promise<BlogPost[]> => {
        const { data } = await axiosClient.get<{ data: BlogPost[] }>('/api/admin/blog');
        return data.data;
    },

    createBlogPost: async (payload: BlogPostInput): Promise<BlogPost> => {
        const { data } = await axiosClient.post<{ data: BlogPost }>('/api/admin/blog', payload);
        return data.data;
    },

    updateBlogPost: async (id: string, payload: BlogPostInput): Promise<BlogPost> => {
        const { data } = await axiosClient.put<{ data: BlogPost }>(`/api/admin/blog/${id}`, payload);
        return data.data;
    },

    deleteBlogPost: async (id: string): Promise<void> => {
        await axiosClient.delete(`/api/admin/blog/${id}`);
    },
};

/**
 * Fetch the published blog list (public). Fail-soft: the backend already
 * returns `{ data: [] }` on error, but we also guard here.
 */
export async function fetchPublicBlogList(signal?: AbortSignal): Promise<PublicBlogListItem[]> {
    const res = await fetch('/api/public/blog', { signal });
    if (!res.ok) throw new Error(`Request failed: ${res.status}`);
    const body = await res.json();
    return (body?.data as PublicBlogListItem[]) ?? [];
}

/**
 * Fetch a single published post by slug (public). Returns null on 404
 * (missing or draft) so callers can render a not-found state.
 */
export async function fetchPublicBlogPost(
    slug: string,
    signal?: AbortSignal,
): Promise<PublicBlogPost | null> {
    const res = await fetch(`/api/public/blog/${slug}`, { signal });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Request failed: ${res.status}`);
    const body = await res.json();
    return (body?.data as PublicBlogPost) ?? null;
}
