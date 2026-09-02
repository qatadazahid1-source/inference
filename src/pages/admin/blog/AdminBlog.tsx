import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, X, ExternalLink } from 'lucide-react';
import {
  blogService,
  type BlogPost,
  type BlogPostInput,
  type BlogStatus,
} from '../../../api/services/blog.service';
import styles from './AdminBlog.module.css';

/* ─────────────────────────────────────────────────────────────
 * AdminBlog — friendly CMS editor for the blog_posts table.
 *
 * List table + create/edit modal built entirely from real form
 * controls (NO raw JSON editing anywhere). Every SEO field is
 * CMS-controlled: meta title/description/keywords, canonical,
 * OG image, robots. Status is a draft/published toggle with an
 * explicit publish-date control.
 * ──────────────────────────────────────────────────────────── */

type ModalMode = 'add' | 'edit';
type EditorTab = 'general' | 'content' | 'seo';

const EMPTY_POST = {
  slug: '',
  title: '',
  excerpt: '',
  body: '',
  author: '',
  category: '',
  tags: '', // comma-separated in the form; backend normalises
  featured_image: '',
  meta_title: '',
  meta_description: '',
  meta_keywords: '',
  canonical_url: '',
  og_image: '',
  robots: 'index,follow',
  status: 'draft' as BlogStatus,
  published_at: '', // datetime-local value (or empty)
};

type PostForm = typeof EMPTY_POST;

const META_TITLE_LIMIT = 60;
const META_DESCRIPTION_LIMIT = 160;

const ROBOTS_OPTIONS = [
  { value: 'index,follow', label: 'index, follow — public & indexable (default)' },
  { value: 'noindex,follow', label: 'noindex, follow — hide from search, follow links' },
  { value: 'noindex,nofollow', label: 'noindex, nofollow — fully hidden from search' },
  { value: 'index,nofollow', label: 'index, nofollow — indexable, don’t follow links' },
];

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Convert an ISO timestamp into a value the datetime-local input accepts. */
function isoToLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  // Adjust for the local timezone offset so the wall-clock time matches.
  const tzOffsetMs = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffsetMs).toISOString().slice(0, 16);
}

/** Convert a datetime-local value back into an ISO string (or null). */
function localInputToIso(local: string): string | null {
  if (!local) return null;
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

/** Build a form snapshot from an existing post. */
function postToForm(post: BlogPost): PostForm {
  return {
    slug: post.slug ?? '',
    title: post.title ?? '',
    excerpt: post.excerpt ?? '',
    body: post.body ?? '',
    author: post.author ?? '',
    category: post.category ?? '',
    tags: Array.isArray(post.tags) ? post.tags.join(', ') : '',
    featured_image: post.featured_image ?? '',
    meta_title: post.meta_title ?? '',
    meta_description: post.meta_description ?? '',
    meta_keywords: post.meta_keywords ?? '',
    canonical_url: post.canonical_url ?? '',
    og_image: post.og_image ?? '',
    robots: post.robots ?? 'index,follow',
    status: post.status ?? 'draft',
    published_at: isoToLocalInput(post.published_at),
  };
}

/** Convert the form into the API payload. */
function formToInput(form: PostForm): BlogPostInput {
  const trimOrNull = (v: string) => {
    const t = v.trim();
    return t.length ? t : null;
  };
  return {
    slug: form.slug.trim(),
    title: form.title.trim(),
    excerpt: trimOrNull(form.excerpt),
    body: trimOrNull(form.body),
    author: trimOrNull(form.author),
    category: trimOrNull(form.category),
    tags: form.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean),
    featured_image: trimOrNull(form.featured_image),
    meta_title: trimOrNull(form.meta_title),
    meta_description: trimOrNull(form.meta_description),
    meta_keywords: trimOrNull(form.meta_keywords),
    canonical_url: trimOrNull(form.canonical_url),
    og_image: trimOrNull(form.og_image),
    robots: trimOrNull(form.robots),
    status: form.status,
    published_at: localInputToIso(form.published_at),
  };
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function AdminBlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('add');
  const [editorTab, setEditorTab] = useState<EditorTab>('general');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PostForm>(EMPTY_POST);
  const [slugTouched, setSlugTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [confirmDelete, setConfirmDelete] = useState<BlogPost | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await blogService.getBlogPosts();
      setPosts(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load blog posts.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const openAdd = () => {
    setModalMode('add');
    setEditingId(null);
    setForm(EMPTY_POST);
    setSlugTouched(false);
    setEditorTab('general');
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (post: BlogPost) => {
    setModalMode('edit');
    setEditingId(post.id);
    setForm(postToForm(post));
    setSlugTouched(true);
    setEditorTab('general');
    setFormError(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
  };

  const update = <K extends keyof PostForm>(key: K, value: PostForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const onTitleChange = (value: string) => {
    setForm((prev) => {
      const next = { ...prev, title: value };
      // Auto-derive slug from title until the user edits the slug directly.
      if (!slugTouched && modalMode === 'add') {
        next.slug = slugify(value);
      }
      return next;
    });
  };

  const handleSave = async () => {
    setFormError(null);

    if (!form.title.trim()) {
      setFormError('Title is required.');
      setEditorTab('general');
      return;
    }
    const slug = form.slug.trim();
    if (!slug) {
      setFormError('Slug is required.');
      setEditorTab('general');
      return;
    }
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
      setFormError('Slug must be lowercase letters, numbers and hyphens only (e.g. "llm-cost-tracking").');
      setEditorTab('general');
      return;
    }

    const payload = formToInput(form);

    setSaving(true);
    try {
      if (modalMode === 'add') {
        await blogService.createBlogPost(payload);
      } else if (editingId) {
        await blogService.updateBlogPost(editingId, payload);
      }
      setModalOpen(false);
      await loadPosts();
    } catch (err: any) {
      setFormError(err?.message || 'Failed to save the post.');
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublish = async (post: BlogPost) => {
    const nextStatus: BlogStatus = post.status === 'published' ? 'draft' : 'published';
    try {
      await blogService.updateBlogPost(post.id, { status: nextStatus });
      await loadPosts();
    } catch (err: any) {
      setError(err?.message || 'Failed to change publish status.');
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await blogService.deleteBlogPost(confirmDelete.id);
      setConfirmDelete(null);
      await loadPosts();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete the post.');
    } finally {
      setDeleting(false);
    }
  };

  const metaTitleLen = form.meta_title.length;
  const metaDescLen = form.meta_description.length;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Blog</h1>
          <p className={styles.subtitle}>
            Create and manage CMS-driven blog articles. Draft posts stay hidden from
            the public site and sitemap until published.
          </p>
        </div>
        <button className={styles.btnPrimary} onClick={openAdd}>
          <Plus size={16} />
          New Post
        </button>
      </div>

      {error && <div className={styles.errorBanner}>{error}</div>}

      {loading ? (
        <p className={styles.loadingText}>Loading posts…</p>
      ) : posts.length === 0 ? (
        <p className={styles.emptyState}>
          No blog posts yet. Click “New Post” to write your first article.
        </p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Title</th>
                <th>Category</th>
                <th>Status</th>
                <th>Published</th>
                <th>Updated</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => (
                <tr key={post.id}>
                  <td>
                    <div className={styles.pageTitleCell}>
                      <span>{post.title}</span>
                      <span className={styles.slug}>/blog/{post.slug}</span>
                    </div>
                  </td>
                  <td>{post.category || '—'}</td>
                  <td>
                    <span
                      className={`${styles.badge} ${
                        post.status === 'published' ? styles.badgePublished : styles.badgeDraft
                      }`}
                    >
                      {post.status === 'published' ? 'Published' : 'Draft'}
                    </span>
                  </td>
                  <td className={styles.tdUpdated}>{formatDate(post.published_at)}</td>
                  <td className={styles.tdUpdated}>{formatDate(post.updated_at)}</td>
                  <td>
                    <div className={styles.rowActions}>
                      {post.status === 'published' && (
                        <a
                          className={styles.btnIcon}
                          href={`/blog/${post.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          title="View live post"
                        >
                          <ExternalLink size={15} />
                        </a>
                      )}
                      <button
                        className={styles.btnSecondary}
                        onClick={() => handleTogglePublish(post)}
                        title={post.status === 'published' ? 'Unpublish' : 'Publish'}
                      >
                        {post.status === 'published' ? 'Unpublish' : 'Publish'}
                      </button>
                      <button
                        className={styles.btnIcon}
                        onClick={() => openEdit(post)}
                        title="Edit"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        className={styles.btnIconDanger}
                        onClick={() => setConfirmDelete(post)}
                        title="Delete"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── Editor modal ─────────────────────────────────── */}
      {modalOpen && (
        <div className={styles.overlay} onMouseDown={closeModal}>
          <div className={styles.modal} onMouseDown={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                {modalMode === 'add' ? 'New Post' : 'Edit Post'}
              </h2>
              <button className={styles.closeBtn} onClick={closeModal} disabled={saving}>
                <X size={20} />
              </button>
            </div>

            <div className={styles.tabs}>
              <button
                className={`${styles.tabBtn} ${editorTab === 'general' ? styles.tabBtnActive : ''}`}
                onClick={() => setEditorTab('general')}
              >
                General
              </button>
              <button
                className={`${styles.tabBtn} ${editorTab === 'content' ? styles.tabBtnActive : ''}`}
                onClick={() => setEditorTab('content')}
              >
                Content
              </button>
              <button
                className={`${styles.tabBtn} ${editorTab === 'seo' ? styles.tabBtnActive : ''}`}
                onClick={() => setEditorTab('seo')}
              >
                SEO
              </button>
            </div>

            <div className={styles.modalBody}>
              {formError && <div className={styles.errorBanner}>{formError}</div>}

              {/* ── General ── */}
              {editorTab === 'general' && (
                <div className={styles.formGrid}>
                  <div className={`${styles.field} ${styles.fullWidth}`}>
                    <label className={styles.label}>Title</label>
                    <input
                      className={styles.input}
                      value={form.title}
                      onChange={(e) => onTitleChange(e.target.value)}
                      placeholder="How to track LLM costs across providers"
                    />
                  </div>

                  <div className={`${styles.field} ${styles.fullWidth}`}>
                    <label className={styles.label}>
                      Slug
                      <span className={styles.hint}>lowercase, hyphens — becomes /blog/&lt;slug&gt;</span>
                    </label>
                    <input
                      className={styles.input}
                      value={form.slug}
                      onChange={(e) => {
                        setSlugTouched(true);
                        update('slug', e.target.value);
                      }}
                      placeholder="llm-cost-tracking"
                    />
                  </div>

                  <div className={styles.field}>
                    <label className={styles.label}>Author</label>
                    <input
                      className={styles.input}
                      value={form.author}
                      onChange={(e) => update('author', e.target.value)}
                      placeholder="Ordisum Team"
                    />
                  </div>

                  <div className={styles.field}>
                    <label className={styles.label}>Category</label>
                    <input
                      className={styles.input}
                      value={form.category}
                      onChange={(e) => update('category', e.target.value)}
                      placeholder="Cost Optimization"
                    />
                  </div>

                  <div className={`${styles.field} ${styles.fullWidth}`}>
                    <label className={styles.label}>
                      Tags
                      <span className={styles.hint}>comma-separated</span>
                    </label>
                    <input
                      className={styles.input}
                      value={form.tags}
                      onChange={(e) => update('tags', e.target.value)}
                      placeholder="llm, cost, observability"
                    />
                  </div>

                  <div className={`${styles.field} ${styles.fullWidth}`}>
                    <label className={styles.label}>Featured image URL</label>
                    <input
                      className={styles.input}
                      value={form.featured_image}
                      onChange={(e) => update('featured_image', e.target.value)}
                      placeholder="https://…/cover.jpg"
                    />
                  </div>

                  <div className={styles.field}>
                    <label className={styles.label}>Status</label>
                    <select
                      className={styles.input}
                      value={form.status}
                      onChange={(e) => update('status', e.target.value as BlogStatus)}
                    >
                      <option value="draft">Draft — hidden from public</option>
                      <option value="published">Published — live on site</option>
                    </select>
                  </div>

                  <div className={styles.field}>
                    <label className={styles.label}>
                      Publish date
                      <span className={styles.hint}>optional</span>
                    </label>
                    <input
                      type="datetime-local"
                      className={styles.input}
                      value={form.published_at}
                      onChange={(e) => update('published_at', e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* ── Content ── */}
              {editorTab === 'content' && (
                <div className={styles.formGrid}>
                  <div className={`${styles.field} ${styles.fullWidth}`}>
                    <label className={styles.label}>
                      Excerpt
                      <span className={styles.hint}>short summary shown in listings</span>
                    </label>
                    <textarea
                      className={styles.textarea}
                      rows={3}
                      value={form.excerpt}
                      onChange={(e) => update('excerpt', e.target.value)}
                      placeholder="A concise one- or two-sentence summary of the article."
                    />
                  </div>

                  <div className={`${styles.field} ${styles.fullWidth}`}>
                    <label className={styles.label}>
                      Body
                      <span className={styles.hint}>Markdown — headings, lists, links, code</span>
                    </label>
                    <textarea
                      className={`${styles.textarea} ${styles.contentTextarea}`}
                      value={form.body}
                      onChange={(e) => update('body', e.target.value)}
                      placeholder={'## Introduction\n\nWrite your article in Markdown…'}
                    />
                  </div>
                </div>
              )}

              {/* ── SEO ── */}
              {editorTab === 'seo' && (
                <div className={styles.formGrid}>
                  <div className={`${styles.field} ${styles.fullWidth}`}>
                    <label className={styles.label}>
                      Meta title
                      <span className={styles.hint}>falls back to the post title</span>
                    </label>
                    <input
                      className={styles.input}
                      value={form.meta_title}
                      onChange={(e) => update('meta_title', e.target.value)}
                      placeholder="How to track LLM costs across providers"
                    />
                    <div
                      className={`${styles.charCount} ${
                        metaTitleLen > META_TITLE_LIMIT ? styles.charCountOver : ''
                      }`}
                    >
                      {metaTitleLen}/{META_TITLE_LIMIT}
                    </div>
                  </div>

                  <div className={`${styles.field} ${styles.fullWidth}`}>
                    <label className={styles.label}>
                      Meta description
                      <span className={styles.hint}>falls back to the excerpt</span>
                    </label>
                    <textarea
                      className={styles.textarea}
                      rows={3}
                      value={form.meta_description}
                      onChange={(e) => update('meta_description', e.target.value)}
                      placeholder="Shown in search results and social previews."
                    />
                    <div
                      className={`${styles.charCount} ${
                        metaDescLen > META_DESCRIPTION_LIMIT ? styles.charCountOver : ''
                      }`}
                    >
                      {metaDescLen}/{META_DESCRIPTION_LIMIT}
                    </div>
                  </div>

                  <div className={`${styles.field} ${styles.fullWidth}`}>
                    <label className={styles.label}>Meta keywords</label>
                    <input
                      className={styles.input}
                      value={form.meta_keywords}
                      onChange={(e) => update('meta_keywords', e.target.value)}
                      placeholder="llm cost, ai observability, token tracking"
                    />
                  </div>

                  <div className={`${styles.field} ${styles.fullWidth}`}>
                    <label className={styles.label}>
                      Canonical URL
                      <span className={styles.hint}>leave blank to auto-generate</span>
                    </label>
                    <input
                      className={styles.input}
                      value={form.canonical_url}
                      onChange={(e) => update('canonical_url', e.target.value)}
                      placeholder="https://app.ordisum.com/blog/llm-cost-tracking"
                    />
                  </div>

                  <div className={`${styles.field} ${styles.fullWidth}`}>
                    <label className={styles.label}>OG image URL</label>
                    <input
                      className={styles.input}
                      value={form.og_image}
                      onChange={(e) => update('og_image', e.target.value)}
                      placeholder="https://…/social-card.jpg (falls back to featured image)"
                    />
                  </div>

                  <div className={`${styles.field} ${styles.fullWidth}`}>
                    <label className={styles.label}>Robots</label>
                    <select
                      className={styles.input}
                      value={form.robots}
                      onChange={(e) => update('robots', e.target.value)}
                    >
                      {ROBOTS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            <div className={styles.modalFooter}>
              <span />
              <div className={styles.modalFooterActions}>
                <button className={styles.btnSecondary} onClick={closeModal} disabled={saving}>
                  Cancel
                </button>
                <button className={styles.btnPrimary} onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving…' : modalMode === 'add' ? 'Create Post' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Delete confirm ───────────────────────────────── */}
      {confirmDelete && (
        <div className={styles.overlay} onMouseDown={() => !deleting && setConfirmDelete(null)}>
          <div className={styles.confirmBox} onMouseDown={(e) => e.stopPropagation()}>
            <p className={styles.confirmText}>
              Delete “{confirmDelete.title}”? This permanently removes the post and cannot be undone.
            </p>
            <div className={styles.confirmActions}>
              <button
                className={styles.btnSecondary}
                onClick={() => setConfirmDelete(null)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button className={styles.btnDanger} onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminBlogPage;
