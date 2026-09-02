import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, X, ExternalLink, ArrowUp, ArrowDown } from 'lucide-react';
import { adminService } from '../../../api/services/admin.service';
import styles from './AdminPages.module.css';

/* ─────────────────────────────────────────────────────────────
 * Structured content model (content_blocks JSONB)
 *
 * This is the friendly, section-based shape that the Content tab
 * edits with real form controls (NO raw JSON editing). The public
 * MarketingPage renderer reads the same shape. Every part is
 * optional so a page can use as little or as much as it needs.
 * ──────────────────────────────────────────────────────────── */
interface CtaBlock {
  label: string;
  href: string;
}
interface HeroBlock {
  eyebrow: string;
  headline: string; // becomes the page's single <h1>
  subheadline: string;
  primaryCta: CtaBlock;
  secondaryCta: CtaBlock;
}
interface SectionItem {
  title: string;
  description: string;
}
interface ContentSection {
  heading: string;
  subheading: string;
  items: SectionItem[];
}
interface FaqItem {
  question: string;
  answer: string;
}
interface FinalCtaBlock {
  headline: string;
  description: string;
  primaryCta: CtaBlock;
  secondaryCta: CtaBlock;
}

/* ── New optional blocks (alternative / use-case pages) ───────── */
interface IntroBlock {
  heading: string;
  body: string;
}
interface PointsBlock {
  heading: string;
  body: string;
  points: string[];
}
interface BenefitsBlock {
  heading: string;
  subheading: string;
  items: SectionItem[];
}
interface ComparisonRow {
  label: string;
  values: string[];
}
interface ComparisonTableBlock {
  heading: string;
  subheading: string;
  columns: string[];
  rows: ComparisonRow[];
}
interface ProsConsBlock {
  heading: string;
  prosTitle: string;
  consTitle: string;
  pros: string[];
  cons: string[];
}
interface WorkflowStep {
  title: string;
  description: string;
}
interface WorkflowBlock {
  heading: string;
  subheading: string;
  steps: WorkflowStep[];
}
interface RelatedLink {
  label: string;
  href: string;
  description: string;
}
interface RelatedLinksBlock {
  heading: string;
  links: RelatedLink[];
}

interface ContentBlocks {
  hero: HeroBlock;
  intro: IntroBlock;
  problem: PointsBlock;
  solution: PointsBlock;
  benefits: BenefitsBlock;
  sections: ContentSection[];
  comparisonTable: ComparisonTableBlock;
  prosCons: ProsConsBlock;
  workflow: WorkflowBlock;
  faqs: FaqItem[];
  relatedLinks: RelatedLinksBlock;
  finalCta: FinalCtaBlock;
}

interface StaticPage {
  id: string;
  slug: string;
  title: string;
  content: string;
  meta_title: string;
  meta_description: string;
  meta_keywords: string | null;
  canonical_url: string | null;
  og_image: string | null;
  robots: string | null;
  content_blocks: ContentBlocks | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

type ModalMode = 'add' | 'edit';
type EditorTab = 'general' | 'seo' | 'content';

const emptyCta = (): CtaBlock => ({ label: '', href: '' });

const emptyIntro = (): IntroBlock => ({ heading: '', body: '' });
const emptyPoints = (): PointsBlock => ({ heading: '', body: '', points: [] });
const emptyBenefits = (): BenefitsBlock => ({ heading: '', subheading: '', items: [] });
const emptyComparison = (): ComparisonTableBlock => ({ heading: '', subheading: '', columns: [], rows: [] });
const emptyProsCons = (): ProsConsBlock => ({ heading: '', prosTitle: '', consTitle: '', pros: [], cons: [] });
const emptyWorkflow = (): WorkflowBlock => ({ heading: '', subheading: '', steps: [] });
const emptyRelatedLinks = (): RelatedLinksBlock => ({ heading: '', links: [] });

const emptyContentBlocks = (): ContentBlocks => ({
  hero: {
    eyebrow: '',
    headline: '',
    subheadline: '',
    primaryCta: emptyCta(),
    secondaryCta: emptyCta(),
  },
  intro: emptyIntro(),
  problem: emptyPoints(),
  solution: emptyPoints(),
  benefits: emptyBenefits(),
  sections: [],
  comparisonTable: emptyComparison(),
  prosCons: emptyProsCons(),
  workflow: emptyWorkflow(),
  faqs: [],
  relatedLinks: emptyRelatedLinks(),
  finalCta: {
    headline: '',
    description: '',
    primaryCta: emptyCta(),
    secondaryCta: emptyCta(),
  },
});

const EMPTY_PAGE = {
  slug: '',
  title: '',
  content: '',
  meta_title: '',
  meta_description: '',
  meta_keywords: '',
  canonical_url: '',
  og_image: '',
  robots: 'index,follow',
  content_blocks: emptyContentBlocks(),
  is_published: false,
};

type PageForm = typeof EMPTY_PAGE;

const META_DESCRIPTION_LIMIT = 160;
const META_TITLE_LIMIT = 60;

const ROBOTS_OPTIONS = [
  { value: 'index,follow', label: 'index, follow — public & indexable (default)' },
  { value: 'noindex,follow', label: 'noindex, follow — hide from search, follow links' },
  { value: 'noindex,nofollow', label: 'noindex, nofollow — fully hidden from search' },
  { value: 'index,nofollow', label: 'index, nofollow — indexable, don’t follow links' },
];

// Slugs that render through the structured MarketingPage renderer.
// For these, the Content tab (structured blocks) is the primary editor.
const MARKETING_SLUGS = ['features', 'pricing', 'security'];

// Prefixes for the dynamic marketing templates (alternative / use-case
// pages). Pages stored under these flat, prefixed slugs
// (e.g. "alternatives-helicone", "use-cases-ai-cost-monitoring") also
// render through the structured MarketingPage renderer, so the Content
// tab is their primary editor too.
const MARKETING_SLUG_PREFIXES = ['alternatives-', 'use-cases-'];

/** True when a slug renders through the structured MarketingPage renderer. */
function isStructuredMarketingSlug(slug: string): boolean {
  return (
    MARKETING_SLUGS.includes(slug) ||
    MARKETING_SLUG_PREFIXES.some(prefix => slug.startsWith(prefix))
  );
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Normalise whatever came back from the API into the full ContentBlocks
 * shape so every nested field the editor touches is always defined.
 */
function normaliseContentBlocks(raw: any): ContentBlocks {
  const base = emptyContentBlocks();
  if (!raw || typeof raw !== 'object') return base;

  const hero = raw.hero ?? {};
  base.hero = {
    eyebrow: hero.eyebrow ?? '',
    headline: hero.headline ?? '',
    subheadline: hero.subheadline ?? '',
    primaryCta: {
      label: hero.primaryCta?.label ?? '',
      href: hero.primaryCta?.href ?? '',
    },
    secondaryCta: {
      label: hero.secondaryCta?.label ?? '',
      href: hero.secondaryCta?.href ?? '',
    },
  };

  base.sections = Array.isArray(raw.sections)
    ? raw.sections.map((s: any) => ({
      heading: s?.heading ?? '',
      subheading: s?.subheading ?? '',
      items: Array.isArray(s?.items)
        ? s.items.map((it: any) => ({
          title: it?.title ?? '',
          description: it?.description ?? '',
        }))
        : [],
    }))
    : [];

  const intro = raw.intro ?? {};
  base.intro = { heading: intro.heading ?? '', body: intro.body ?? '' };

  const normPoints = (p: any): PointsBlock => ({
    heading: p?.heading ?? '',
    body: p?.body ?? '',
    points: Array.isArray(p?.points) ? p.points.map((x: any) => (x ?? '').toString()) : [],
  });
  base.problem = normPoints(raw.problem);
  base.solution = normPoints(raw.solution);

  const benefits = raw.benefits ?? {};
  base.benefits = {
    heading: benefits.heading ?? '',
    subheading: benefits.subheading ?? '',
    items: Array.isArray(benefits.items)
      ? benefits.items.map((it: any) => ({ title: it?.title ?? '', description: it?.description ?? '' }))
      : [],
  };

  const comparison = raw.comparisonTable ?? {};
  base.comparisonTable = {
    heading: comparison.heading ?? '',
    subheading: comparison.subheading ?? '',
    columns: Array.isArray(comparison.columns) ? comparison.columns.map((c: any) => (c ?? '').toString()) : [],
    rows: Array.isArray(comparison.rows)
      ? comparison.rows.map((r: any) => ({
        label: r?.label ?? '',
        values: Array.isArray(r?.values) ? r.values.map((v: any) => (v ?? '').toString()) : [],
      }))
      : [],
  };

  const prosCons = raw.prosCons ?? {};
  base.prosCons = {
    heading: prosCons.heading ?? '',
    prosTitle: prosCons.prosTitle ?? '',
    consTitle: prosCons.consTitle ?? '',
    pros: Array.isArray(prosCons.pros) ? prosCons.pros.map((x: any) => (x ?? '').toString()) : [],
    cons: Array.isArray(prosCons.cons) ? prosCons.cons.map((x: any) => (x ?? '').toString()) : [],
  };

  const workflow = raw.workflow ?? {};
  base.workflow = {
    heading: workflow.heading ?? '',
    subheading: workflow.subheading ?? '',
    steps: Array.isArray(workflow.steps)
      ? workflow.steps.map((s: any) => ({ title: s?.title ?? '', description: s?.description ?? '' }))
      : [],
  };

  base.faqs = Array.isArray(raw.faqs)
    ? raw.faqs.map((f: any) => ({
      question: f?.question ?? '',
      answer: f?.answer ?? '',
    }))
    : [];

  const relatedLinks = raw.relatedLinks ?? {};
  base.relatedLinks = {
    heading: relatedLinks.heading ?? '',
    links: Array.isArray(relatedLinks.links)
      ? relatedLinks.links.map((l: any) => ({
        label: l?.label ?? '',
        href: l?.href ?? '',
        description: l?.description ?? '',
      }))
      : [],
  };

  const finalCta = raw.finalCta ?? {};
  base.finalCta = {
    headline: finalCta.headline ?? '',
    description: finalCta.description ?? '',
    primaryCta: {
      label: finalCta.primaryCta?.label ?? '',
      href: finalCta.primaryCta?.href ?? '',
    },
    secondaryCta: {
      label: finalCta.secondaryCta?.label ?? '',
      href: finalCta.secondaryCta?.href ?? '',
    },
  };

  return base;
}

/**
 * Strip empty structural content so we don't persist a big blob of blanks.
 * Returns null when there's effectively nothing to store.
 */
function serialiseContentBlocks(cb: ContentBlocks): ContentBlocks | null {
  const trimList = (arr: string[]) => arr.map(s => s.trim()).filter(Boolean);

  const heroHasContent =
    cb.hero.eyebrow.trim() ||
    cb.hero.headline.trim() ||
    cb.hero.subheadline.trim() ||
    cb.hero.primaryCta.label.trim() ||
    cb.hero.primaryCta.href.trim() ||
    cb.hero.secondaryCta.label.trim() ||
    cb.hero.secondaryCta.href.trim();

  const intro: IntroBlock = {
    heading: cb.intro.heading.trim(),
    body: cb.intro.body.trim(),
  };
  const introHasContent = intro.heading || intro.body;

  const serialisePoints = (p: PointsBlock): PointsBlock => ({
    heading: p.heading.trim(),
    body: p.body.trim(),
    points: trimList(p.points),
  });
  const problem = serialisePoints(cb.problem);
  const solution = serialisePoints(cb.solution);
  const problemHasContent = problem.heading || problem.body || problem.points.length > 0;
  const solutionHasContent = solution.heading || solution.body || solution.points.length > 0;

  const benefits: BenefitsBlock = {
    heading: cb.benefits.heading.trim(),
    subheading: cb.benefits.subheading.trim(),
    items: cb.benefits.items
      .map(it => ({ title: it.title.trim(), description: it.description.trim() }))
      .filter(it => it.title || it.description),
  };
  const benefitsHasContent = benefits.heading || benefits.subheading || benefits.items.length > 0;

  const sections = cb.sections
    .map(s => ({
      heading: s.heading.trim(),
      subheading: s.subheading.trim(),
      items: s.items
        .map(it => ({ title: it.title.trim(), description: it.description.trim() }))
        .filter(it => it.title || it.description),
    }))
    .filter(s => s.heading || s.subheading || s.items.length > 0);

  const comparisonTable: ComparisonTableBlock = {
    heading: cb.comparisonTable.heading.trim(),
    subheading: cb.comparisonTable.subheading.trim(),
    columns: trimList(cb.comparisonTable.columns),
    rows: cb.comparisonTable.rows
      .map(r => ({ label: r.label.trim(), values: r.values.map(v => v.trim()) }))
      .filter(r => r.label || r.values.some(v => v)),
  };
  const comparisonHasContent =
    comparisonTable.heading ||
    comparisonTable.subheading ||
    comparisonTable.columns.length > 0 ||
    comparisonTable.rows.length > 0;

  const prosCons: ProsConsBlock = {
    heading: cb.prosCons.heading.trim(),
    prosTitle: cb.prosCons.prosTitle.trim(),
    consTitle: cb.prosCons.consTitle.trim(),
    pros: trimList(cb.prosCons.pros),
    cons: trimList(cb.prosCons.cons),
  };
  const prosConsHasContent =
    prosCons.heading ||
    prosCons.prosTitle ||
    prosCons.consTitle ||
    prosCons.pros.length > 0 ||
    prosCons.cons.length > 0;

  const workflow: WorkflowBlock = {
    heading: cb.workflow.heading.trim(),
    subheading: cb.workflow.subheading.trim(),
    steps: cb.workflow.steps
      .map(s => ({ title: s.title.trim(), description: s.description.trim() }))
      .filter(s => s.title || s.description),
  };
  const workflowHasContent = workflow.heading || workflow.subheading || workflow.steps.length > 0;

  const faqs = cb.faqs
    .map(f => ({ question: f.question.trim(), answer: f.answer.trim() }))
    .filter(f => f.question || f.answer);

  const relatedLinks: RelatedLinksBlock = {
    heading: cb.relatedLinks.heading.trim(),
    links: cb.relatedLinks.links
      .map(l => ({ label: l.label.trim(), href: l.href.trim(), description: l.description.trim() }))
      .filter(l => l.label || l.href || l.description),
  };
  const relatedLinksHasContent = relatedLinks.heading || relatedLinks.links.length > 0;

  const finalHasContent =
    cb.finalCta.headline.trim() ||
    cb.finalCta.description.trim() ||
    cb.finalCta.primaryCta.label.trim() ||
    cb.finalCta.primaryCta.href.trim() ||
    cb.finalCta.secondaryCta.label.trim() ||
    cb.finalCta.secondaryCta.href.trim();

  if (
    !heroHasContent &&
    !introHasContent &&
    !problemHasContent &&
    !solutionHasContent &&
    !benefitsHasContent &&
    sections.length === 0 &&
    !comparisonHasContent &&
    !prosConsHasContent &&
    !workflowHasContent &&
    faqs.length === 0 &&
    !relatedLinksHasContent &&
    !finalHasContent
  ) {
    return null;
  }

  return {
    hero: cb.hero,
    intro,
    problem,
    solution,
    benefits,
    sections,
    comparisonTable,
    prosCons,
    workflow,
    faqs,
    relatedLinks,
    finalCta: cb.finalCta,
  };
}

export function AdminPagesPage() {
  const [pages, setPages] = useState<StaticPage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('add');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PageForm>({ ...EMPTY_PAGE, content_blocks: emptyContentBlocks() });
  const [slugTouched, setSlugTouched] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<EditorTab>('general');

  // Confirm delete
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; title: string } | null>(null);

  const fetchPages = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await adminService.getPages();
      setPages(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load pages');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchPages(); }, [fetchPages]);

  const openAdd = () => {
    setForm({ ...EMPTY_PAGE, content_blocks: emptyContentBlocks() });
    setSlugTouched(false);
    setModalMode('add');
    setEditingId(null);
    setFormError(null);
    setActiveTab('general');
    setModalOpen(true);
  };

  const openEdit = (page: StaticPage) => {
    setForm({
      slug: page.slug,
      title: page.title,
      content: page.content ?? '',
      meta_title: page.meta_title ?? '',
      meta_description: page.meta_description ?? '',
      meta_keywords: page.meta_keywords ?? '',
      canonical_url: page.canonical_url ?? '',
      og_image: page.og_image ?? '',
      robots: page.robots ?? 'index,follow',
      content_blocks: normaliseContentBlocks(page.content_blocks),
      is_published: page.is_published,
    });
    setSlugTouched(true);
    setModalMode('edit');
    setEditingId(page.id);
    setFormError(null);
    setActiveTab('general');
    setModalOpen(true);
  };

  const handleTitleChange = (value: string) => {
    setForm(f => ({
      ...f,
      title: value,
      // Auto-derive the slug from the title until the user edits slug
      // directly (same "don't fight the user's own edits" idea as the
      // Landing Pricing form's slug field).
      slug: slugTouched ? f.slug : slugify(value),
    }));
  };

  const handleSave = async (publishOverride?: boolean) => {
    if (!form.title.trim() || !form.slug.trim()) {
      setFormError('Title and slug are required.');
      setActiveTab('general');
      return;
    }
    const payload = {
      slug: form.slug,
      title: form.title,
      content: form.content,
      meta_title: form.meta_title,
      meta_description: form.meta_description,
      meta_keywords: form.meta_keywords.trim() || null,
      canonical_url: form.canonical_url.trim() || null,
      og_image: form.og_image.trim() || null,
      robots: form.robots.trim() || null,
      content_blocks: serialiseContentBlocks(form.content_blocks),
      is_published: publishOverride !== undefined ? publishOverride : form.is_published,
    };
    setIsSaving(true);
    setFormError(null);
    try {
      if (modalMode === 'add') {
        await adminService.createPage(payload);
      } else if (editingId) {
        await adminService.updatePage(editingId, payload);
      }
      setModalOpen(false);
      await fetchPages();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save page');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTogglePublished = async (page: StaticPage) => {
    setSavingId(page.id);
    try {
      await adminService.updatePage(page.id, { is_published: !page.is_published });
      await fetchPages();
    } catch (err) {
      console.error('[AdminPages] toggle publish error:', err);
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setSavingId(confirmDelete.id);
    try {
      await adminService.deletePage(confirmDelete.id);
      setConfirmDelete(null);
      await fetchPages();
    } catch (err) {
      console.error('[AdminPages] delete error:', err);
    } finally {
      setSavingId(null);
    }
  };

  // ─── content_blocks helpers (immutably update nested form state) ───
  const updateBlocks = (updater: (cb: ContentBlocks) => ContentBlocks) => {
    setForm(f => ({ ...f, content_blocks: updater(f.content_blocks) }));
  };

  const setHeroField = (field: keyof Omit<HeroBlock, 'primaryCta' | 'secondaryCta'>, value: string) => {
    updateBlocks(cb => ({ ...cb, hero: { ...cb.hero, [field]: value } }));
  };
  const setHeroCta = (which: 'primaryCta' | 'secondaryCta', field: keyof CtaBlock, value: string) => {
    updateBlocks(cb => ({ ...cb, hero: { ...cb.hero, [which]: { ...cb.hero[which], [field]: value } } }));
  };

  const addSection = () => {
    updateBlocks(cb => ({ ...cb, sections: [...cb.sections, { heading: '', subheading: '', items: [] }] }));
  };
  const removeSection = (idx: number) => {
    updateBlocks(cb => ({ ...cb, sections: cb.sections.filter((_, i) => i !== idx) }));
  };
  const moveSection = (idx: number, dir: -1 | 1) => {
    updateBlocks(cb => {
      const next = [...cb.sections];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return cb;
      [next[idx], next[target]] = [next[target], next[idx]];
      return { ...cb, sections: next };
    });
  };
  const setSectionField = (idx: number, field: 'heading' | 'subheading', value: string) => {
    updateBlocks(cb => ({
      ...cb,
      sections: cb.sections.map((s, i) => (i === idx ? { ...s, [field]: value } : s)),
    }));
  };
  const addSectionItem = (sIdx: number) => {
    updateBlocks(cb => ({
      ...cb,
      sections: cb.sections.map((s, i) =>
        i === sIdx ? { ...s, items: [...s.items, { title: '', description: '' }] } : s
      ),
    }));
  };
  const removeSectionItem = (sIdx: number, iIdx: number) => {
    updateBlocks(cb => ({
      ...cb,
      sections: cb.sections.map((s, i) =>
        i === sIdx ? { ...s, items: s.items.filter((_, j) => j !== iIdx) } : s
      ),
    }));
  };
  const setSectionItemField = (sIdx: number, iIdx: number, field: keyof SectionItem, value: string) => {
    updateBlocks(cb => ({
      ...cb,
      sections: cb.sections.map((s, i) =>
        i === sIdx
          ? { ...s, items: s.items.map((it, j) => (j === iIdx ? { ...it, [field]: value } : it)) }
          : s
      ),
    }));
  };

  const addFaq = () => {
    updateBlocks(cb => ({ ...cb, faqs: [...cb.faqs, { question: '', answer: '' }] }));
  };
  const removeFaq = (idx: number) => {
    updateBlocks(cb => ({ ...cb, faqs: cb.faqs.filter((_, i) => i !== idx) }));
  };
  const setFaqField = (idx: number, field: keyof FaqItem, value: string) => {
    updateBlocks(cb => ({
      ...cb,
      faqs: cb.faqs.map((f, i) => (i === idx ? { ...f, [field]: value } : f)),
    }));
  };

  const setFinalField = (field: keyof Omit<FinalCtaBlock, 'primaryCta' | 'secondaryCta'>, value: string) => {
    updateBlocks(cb => ({ ...cb, finalCta: { ...cb.finalCta, [field]: value } }));
  };
  const setFinalCta = (which: 'primaryCta' | 'secondaryCta', field: keyof CtaBlock, value: string) => {
    updateBlocks(cb => ({ ...cb, finalCta: { ...cb.finalCta, [which]: { ...cb.finalCta[which], [field]: value } } }));
  };

  // ─── Intro block ───
  const setIntroField = (field: keyof IntroBlock, value: string) => {
    updateBlocks(cb => ({ ...cb, intro: { ...cb.intro, [field]: value } }));
  };

  // ─── Problem / Solution (PointsBlock) ───
  const setPointsField = (key: 'problem' | 'solution', field: 'heading' | 'body', value: string) => {
    updateBlocks(cb => ({ ...cb, [key]: { ...cb[key], [field]: value } }));
  };
  const addPoint = (key: 'problem' | 'solution') => {
    updateBlocks(cb => ({ ...cb, [key]: { ...cb[key], points: [...cb[key].points, ''] } }));
  };
  const removePoint = (key: 'problem' | 'solution', idx: number) => {
    updateBlocks(cb => ({ ...cb, [key]: { ...cb[key], points: cb[key].points.filter((_, i) => i !== idx) } }));
  };
  const setPoint = (key: 'problem' | 'solution', idx: number, value: string) => {
    updateBlocks(cb => ({ ...cb, [key]: { ...cb[key], points: cb[key].points.map((p, i) => (i === idx ? value : p)) } }));
  };

  // ─── Benefits block ───
  const setBenefitsField = (field: 'heading' | 'subheading', value: string) => {
    updateBlocks(cb => ({ ...cb, benefits: { ...cb.benefits, [field]: value } }));
  };
  const addBenefitItem = () => {
    updateBlocks(cb => ({ ...cb, benefits: { ...cb.benefits, items: [...cb.benefits.items, { title: '', description: '' }] } }));
  };
  const removeBenefitItem = (idx: number) => {
    updateBlocks(cb => ({ ...cb, benefits: { ...cb.benefits, items: cb.benefits.items.filter((_, i) => i !== idx) } }));
  };
  const setBenefitItemField = (idx: number, field: keyof SectionItem, value: string) => {
    updateBlocks(cb => ({
      ...cb,
      benefits: { ...cb.benefits, items: cb.benefits.items.map((it, i) => (i === idx ? { ...it, [field]: value } : it)) },
    }));
  };

  // ─── Comparison table ───
  const setComparisonField = (field: 'heading' | 'subheading', value: string) => {
    updateBlocks(cb => ({ ...cb, comparisonTable: { ...cb.comparisonTable, [field]: value } }));
  };
  const addComparisonColumn = () => {
    updateBlocks(cb => ({
      ...cb,
      comparisonTable: {
        ...cb.comparisonTable,
        columns: [...cb.comparisonTable.columns, ''],
        rows: cb.comparisonTable.rows.map(r => ({ ...r, values: [...r.values, ''] })),
      },
    }));
  };
  const removeComparisonColumn = (colIdx: number) => {
    updateBlocks(cb => ({
      ...cb,
      comparisonTable: {
        ...cb.comparisonTable,
        columns: cb.comparisonTable.columns.filter((_, i) => i !== colIdx),
        rows: cb.comparisonTable.rows.map(r => ({ ...r, values: r.values.filter((_, i) => i !== colIdx) })),
      },
    }));
  };
  const setComparisonColumn = (colIdx: number, value: string) => {
    updateBlocks(cb => ({
      ...cb,
      comparisonTable: {
        ...cb.comparisonTable,
        columns: cb.comparisonTable.columns.map((c, i) => (i === colIdx ? value : c)),
      },
    }));
  };
  const addComparisonRow = () => {
    updateBlocks(cb => ({
      ...cb,
      comparisonTable: {
        ...cb.comparisonTable,
        rows: [...cb.comparisonTable.rows, { label: '', values: cb.comparisonTable.columns.map(() => '') }],
      },
    }));
  };
  const removeComparisonRow = (rowIdx: number) => {
    updateBlocks(cb => ({
      ...cb,
      comparisonTable: { ...cb.comparisonTable, rows: cb.comparisonTable.rows.filter((_, i) => i !== rowIdx) },
    }));
  };
  const setComparisonRowLabel = (rowIdx: number, value: string) => {
    updateBlocks(cb => ({
      ...cb,
      comparisonTable: {
        ...cb.comparisonTable,
        rows: cb.comparisonTable.rows.map((r, i) => (i === rowIdx ? { ...r, label: value } : r)),
      },
    }));
  };
  const setComparisonRowValue = (rowIdx: number, colIdx: number, value: string) => {
    updateBlocks(cb => ({
      ...cb,
      comparisonTable: {
        ...cb.comparisonTable,
        rows: cb.comparisonTable.rows.map((r, i) =>
          i === rowIdx ? { ...r, values: r.values.map((v, j) => (j === colIdx ? value : v)) } : r
        ),
      },
    }));
  };

  // ─── Pros / Cons ───
  const setProsConsField = (field: 'heading' | 'prosTitle' | 'consTitle', value: string) => {
    updateBlocks(cb => ({ ...cb, prosCons: { ...cb.prosCons, [field]: value } }));
  };
  const addProsConsItem = (key: 'pros' | 'cons') => {
    updateBlocks(cb => ({ ...cb, prosCons: { ...cb.prosCons, [key]: [...cb.prosCons[key], ''] } }));
  };
  const removeProsConsItem = (key: 'pros' | 'cons', idx: number) => {
    updateBlocks(cb => ({ ...cb, prosCons: { ...cb.prosCons, [key]: cb.prosCons[key].filter((_, i) => i !== idx) } }));
  };
  const setProsConsItem = (key: 'pros' | 'cons', idx: number, value: string) => {
    updateBlocks(cb => ({
      ...cb,
      prosCons: { ...cb.prosCons, [key]: cb.prosCons[key].map((p, i) => (i === idx ? value : p)) },
    }));
  };

  // ─── Workflow ───
  const setWorkflowField = (field: 'heading' | 'subheading', value: string) => {
    updateBlocks(cb => ({ ...cb, workflow: { ...cb.workflow, [field]: value } }));
  };
  const addWorkflowStep = () => {
    updateBlocks(cb => ({ ...cb, workflow: { ...cb.workflow, steps: [...cb.workflow.steps, { title: '', description: '' }] } }));
  };
  const removeWorkflowStep = (idx: number) => {
    updateBlocks(cb => ({ ...cb, workflow: { ...cb.workflow, steps: cb.workflow.steps.filter((_, i) => i !== idx) } }));
  };
  const setWorkflowStepField = (idx: number, field: keyof WorkflowStep, value: string) => {
    updateBlocks(cb => ({
      ...cb,
      workflow: { ...cb.workflow, steps: cb.workflow.steps.map((s, i) => (i === idx ? { ...s, [field]: value } : s)) },
    }));
  };

  // ─── Related links ───
  const setRelatedField = (value: string) => {
    updateBlocks(cb => ({ ...cb, relatedLinks: { ...cb.relatedLinks, heading: value } }));
  };
  const addRelatedLink = () => {
    updateBlocks(cb => ({ ...cb, relatedLinks: { ...cb.relatedLinks, links: [...cb.relatedLinks.links, { label: '', href: '', description: '' }] } }));
  };
  const removeRelatedLink = (idx: number) => {
    updateBlocks(cb => ({ ...cb, relatedLinks: { ...cb.relatedLinks, links: cb.relatedLinks.links.filter((_, i) => i !== idx) } }));
  };
  const setRelatedLinkField = (idx: number, field: keyof RelatedLink, value: string) => {
    updateBlocks(cb => ({
      ...cb,
      relatedLinks: { ...cb.relatedLinks, links: cb.relatedLinks.links.map((l, i) => (i === idx ? { ...l, [field]: value } : l)) },
    }));
  };

  const metaDescLen = form.meta_description.length;
  const metaTitleLen = form.meta_title.length;
  const cb = form.content_blocks;
  const isMarketingSlug = isStructuredMarketingSlug(form.slug);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Pages</h1>
          <p className={styles.subtitle}>
            Content for footer/legal pages (About, Privacy Policy, Terms, etc.) — write once here, no deploy needed.
            Set the matching link in <strong>Site Links</strong> to point a footer button at a page's URL below.
          </p>
        </div>
        <button className={styles.btnPrimary} onClick={openAdd}>
          <Plus size={16} /> Add Page
        </button>
      </div>

      {error && <div className={styles.errorBanner}>{error}</div>}

      {isLoading ? (
        <p className={styles.loadingText}>Loading…</p>
      ) : pages.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No pages yet. Click "Add Page" to create your first one (e.g. Privacy Policy).</p>
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Page</th>
                <th>URL</th>
                <th>Status</th>
                <th>Updated</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {pages.map(page => (
                <tr key={page.id}>
                  <td>
                    <div className={styles.pageTitleCell}>
                      <span>{page.title}</span>
                    </div>
                  </td>
                  <td>
                    <span className={styles.slug}>/{page.slug}</span>
                  </td>
                  <td>
                    <button
                      className={`${styles.badge} ${page.is_published ? styles.badgePublished : styles.badgeDraft}`}
                      onClick={() => handleTogglePublished(page)}
                      disabled={savingId === page.id}
                      title={page.is_published ? 'Click to unpublish' : 'Click to publish'}
                      style={{ cursor: 'pointer' }}
                    >
                      {page.is_published ? 'Published' : 'Draft'}
                    </button>
                  </td>
                  <td className={styles.tdUpdated}>
                    {new Date(page.updated_at).toLocaleDateString()}
                  </td>
                  <td>
                    <div className={styles.rowActions}>
                      {page.is_published && (
                        <a href={`/${page.slug}`} target="_blank" rel="noopener noreferrer" className={styles.btnIcon} title="View live page">
                          <ExternalLink size={14} />
                        </a>
                      )}
                      <button className={styles.btnIcon} onClick={() => openEdit(page)} title="Edit page">
                        <Pencil size={14} />
                      </button>
                      <button
                        className={styles.btnIconDanger}
                        onClick={() => setConfirmDelete({ id: page.id, title: page.title })}
                        disabled={savingId === page.id}
                        title="Delete page"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className={styles.overlay} onClick={() => !isSaving && setModalOpen(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>{modalMode === 'add' ? 'Add Page' : 'Edit Page'}</h2>
              <button className={styles.closeBtn} onClick={() => !isSaving && setModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            {/* Tabs */}
            <div className={styles.tabs} role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'general'}
                className={`${styles.tabBtn} ${activeTab === 'general' ? styles.tabBtnActive : ''}`}
                onClick={() => setActiveTab('general')}
              >
                General
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'seo'}
                className={`${styles.tabBtn} ${activeTab === 'seo' ? styles.tabBtnActive : ''}`}
                onClick={() => setActiveTab('seo')}
              >
                SEO &amp; Social
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'content'}
                className={`${styles.tabBtn} ${activeTab === 'content' ? styles.tabBtnActive : ''}`}
                onClick={() => setActiveTab('content')}
              >
                Content
              </button>
            </div>

            <div className={styles.modalBody}>
              {formError && <div className={styles.errorBanner}>{formError}</div>}

              {/* ─── GENERAL TAB ─────────────────────────────── */}
              {activeTab === 'general' && (
                <div className={styles.formGrid}>
                  <div className={styles.field}>
                    <label className={styles.label}>Title *</label>
                    <input className={styles.input} value={form.title}
                      onChange={e => handleTitleChange(e.target.value)} placeholder="Privacy Policy" />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>
                      URL Slug * <span className={styles.hint}>page will live at /{form.slug || '…'}</span>
                    </label>
                    <input className={styles.input} value={form.slug}
                      onChange={e => { setSlugTouched(true); setForm(f => ({ ...f, slug: slugify(e.target.value) })); }}
                      placeholder="privacy-policy" />
                  </div>

                  {isMarketingSlug ? (
                    <div className={`${styles.field} ${styles.fullWidth}`}>
                      <div className={styles.infoNote}>
                        <strong>/{form.slug}</strong> is a structured marketing page — use the{' '}
                        <button type="button" className={styles.linkBtn} onClick={() => setActiveTab('content')}>
                          Content tab
                        </button>{' '}
                        (hero, sections, FAQs, CTA) to edit it. The Markdown body below is optional and unused for this page.
                      </div>
                    </div>
                  ) : null}

                  <div className={`${styles.field} ${styles.fullWidth}`}>
                    <label className={styles.label}>
                      Content <span className={styles.hint}>Markdown supported{isMarketingSlug ? ' — optional for this page' : ''}</span>
                    </label>
                    <textarea
                      className={`${styles.textarea} ${styles.contentTextarea}`}
                      value={form.content}
                      onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                      placeholder={'# Privacy Policy\n\nLast updated: …\n\n## 1. Information we collect\n…'}
                    />
                  </div>

                  <div className={`${styles.field} ${styles.fullWidth}`}>
                    <div className={styles.checkField}>
                      <input type="checkbox" id="is_published" checked={form.is_published}
                        onChange={e => setForm(f => ({ ...f, is_published: e.target.checked }))} />
                      <label htmlFor="is_published">Published (visible to the public)</label>
                    </div>
                  </div>
                </div>
              )}

              {/* ─── SEO TAB ─────────────────────────────────── */}
              {activeTab === 'seo' && (
                <div className={styles.formGrid}>
                  <div className={`${styles.field} ${styles.fullWidth}`}>
                    <label className={styles.label}>Meta Title <span className={styles.hint}>browser tab / Google title</span></label>
                    <input className={styles.input} value={form.meta_title}
                      onChange={e => setForm(f => ({ ...f, meta_title: e.target.value }))}
                      placeholder={form.title ? `${form.title} — Ordisum` : 'Privacy Policy — Ordisum'} />
                    <div className={`${styles.charCount} ${metaTitleLen > META_TITLE_LIMIT ? styles.charCountOver : ''}`}>
                      {metaTitleLen} / {META_TITLE_LIMIT} characters
                      {metaTitleLen > META_TITLE_LIMIT ? ' — Google will likely truncate this' : ''}
                    </div>
                  </div>

                  <div className={`${styles.field} ${styles.fullWidth}`}>
                    <label className={styles.label}>Meta Description <span className={styles.hint}>shown under the title in Google search results</span></label>
                    <textarea
                      className={styles.textarea}
                      style={{ minHeight: 60 }}
                      value={form.meta_description}
                      onChange={e => setForm(f => ({ ...f, meta_description: e.target.value }))}
                      placeholder="A one or two sentence summary for search engines…"
                    />
                    <div className={`${styles.charCount} ${metaDescLen > META_DESCRIPTION_LIMIT ? styles.charCountOver : ''}`}>
                      {metaDescLen} / {META_DESCRIPTION_LIMIT} characters
                      {metaDescLen > META_DESCRIPTION_LIMIT ? ' — Google will likely truncate this' : ''}
                    </div>
                  </div>

                  <div className={`${styles.field} ${styles.fullWidth}`}>
                    <label className={styles.label}>Meta Keywords <span className={styles.hint}>optional, comma-separated</span></label>
                    <input className={styles.input} value={form.meta_keywords}
                      onChange={e => setForm(f => ({ ...f, meta_keywords: e.target.value }))}
                      placeholder="ai cost tracking, llm spend, inference analytics" />
                  </div>

                  <div className={styles.field}>
                    <label className={styles.label}>Canonical URL <span className={styles.hint}>leave blank to auto-use this page's URL</span></label>
                    <input className={styles.input} value={form.canonical_url}
                      onChange={e => setForm(f => ({ ...f, canonical_url: e.target.value }))}
                      placeholder="https://…" />
                  </div>

                  <div className={styles.field}>
                    <label className={styles.label}>Search Visibility (robots)</label>
                    <select className={styles.input} value={form.robots ?? 'index,follow'}
                      onChange={e => setForm(f => ({ ...f, robots: e.target.value }))}>
                      {ROBOTS_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className={`${styles.field} ${styles.fullWidth}`}>
                    <label className={styles.label}>Social Share Image (OG image) <span className={styles.hint}>absolute URL, ~1200×630</span></label>
                    <input className={styles.input} value={form.og_image}
                      onChange={e => setForm(f => ({ ...f, og_image: e.target.value }))}
                      placeholder="https://…/og-image.png" />
                  </div>
                </div>
              )}

              {/* ─── CONTENT TAB ─────────────────────────────── */}
              {activeTab === 'content' && (
                <div className={styles.contentEditor}>
                  <p className={styles.editorIntro}>
                    Structured content for a marketing / landing-style page (hero, sections, FAQs, closing call-to-action).
                    Leave anything blank to hide it. The <strong>Headline</strong> below becomes the page's single H1.
                  </p>

                  {/* Hero */}
                  <fieldset className={styles.blockCard}>
                    <legend className={styles.blockLegend}>Hero</legend>
                    <div className={styles.formGrid}>
                      <div className={styles.field}>
                        <label className={styles.label}>Eyebrow <span className={styles.hint}>small label above headline</span></label>
                        <input className={styles.input} value={cb.hero.eyebrow}
                          onChange={e => setHeroField('eyebrow', e.target.value)} placeholder="Built for AI teams" />
                      </div>
                      <div className={styles.field}>
                        <label className={styles.label}>Headline (H1) *</label>
                        <input className={styles.input} value={cb.hero.headline}
                          onChange={e => setHeroField('headline', e.target.value)} placeholder="Track every dollar of AI spend" />
                      </div>
                      <div className={`${styles.field} ${styles.fullWidth}`}>
                        <label className={styles.label}>Subheadline</label>
                        <textarea className={styles.textarea} style={{ minHeight: 60 }} value={cb.hero.subheadline}
                          onChange={e => setHeroField('subheadline', e.target.value)}
                          placeholder="One or two supporting sentences that expand on the headline." />
                      </div>
                      <div className={styles.field}>
                        <label className={styles.label}>Primary button label</label>
                        <input className={styles.input} value={cb.hero.primaryCta.label}
                          onChange={e => setHeroCta('primaryCta', 'label', e.target.value)} placeholder="Start free" />
                      </div>
                      <div className={styles.field}>
                        <label className={styles.label}>Primary button link</label>
                        <input className={styles.input} value={cb.hero.primaryCta.href}
                          onChange={e => setHeroCta('primaryCta', 'href', e.target.value)} placeholder="/signup" />
                      </div>
                      <div className={styles.field}>
                        <label className={styles.label}>Secondary button label</label>
                        <input className={styles.input} value={cb.hero.secondaryCta.label}
                          onChange={e => setHeroCta('secondaryCta', 'label', e.target.value)} placeholder="Talk to sales" />
                      </div>
                      <div className={styles.field}>
                        <label className={styles.label}>Secondary button link</label>
                        <input className={styles.input} value={cb.hero.secondaryCta.href}
                          onChange={e => setHeroCta('secondaryCta', 'href', e.target.value)} placeholder="/contact-sales" />
                      </div>
                    </div>
                  </fieldset>

                  {/* Intro */}
                  <fieldset className={styles.blockCard}>
                    <legend className={styles.blockLegend}>Intro</legend>
                    <div className={styles.formGrid}>
                      <div className={`${styles.field} ${styles.fullWidth}`}>
                        <label className={styles.label}>Heading</label>
                        <input className={styles.input} value={cb.intro.heading}
                          onChange={e => setIntroField('heading', e.target.value)} placeholder="Why teams switch" />
                      </div>
                      <div className={`${styles.field} ${styles.fullWidth}`}>
                        <label className={styles.label}>Body</label>
                        <textarea className={styles.textarea} style={{ minHeight: 60 }} value={cb.intro.body}
                          onChange={e => setIntroField('body', e.target.value)}
                          placeholder="Short introductory paragraph." />
                      </div>
                    </div>
                  </fieldset>

                  {/* Problem */}
                  <fieldset className={styles.blockCard}>
                    <legend className={styles.blockLegend}>Problem</legend>
                    <div className={styles.formGrid}>
                      <div className={`${styles.field} ${styles.fullWidth}`}>
                        <label className={styles.label}>Heading</label>
                        <input className={styles.input} value={cb.problem.heading}
                          onChange={e => setPointsField('problem', 'heading', e.target.value)} placeholder="The problem" />
                      </div>
                      <div className={`${styles.field} ${styles.fullWidth}`}>
                        <label className={styles.label}>Body</label>
                        <textarea className={styles.textarea} style={{ minHeight: 50 }} value={cb.problem.body}
                          onChange={e => setPointsField('problem', 'body', e.target.value)}
                          placeholder="Describe the pain point." />
                      </div>
                    </div>
                    <div className={styles.itemsBlock}>
                      <div className={styles.itemsHeader}>
                        <span className={styles.itemsLabel}>Points</span>
                        <button type="button" className={styles.addBtnSm} onClick={() => addPoint('problem')}>
                          <Plus size={13} /> Add point
                        </button>
                      </div>
                      {cb.problem.points.length === 0 && (
                        <p className={styles.emptyHint}>No points yet.</p>
                      )}
                      {cb.problem.points.map((pt, i) => (
                        <div key={i} className={styles.subItem}>
                          <div className={styles.subItemFields}>
                            <input className={styles.input} value={pt}
                              onChange={e => setPoint('problem', i, e.target.value)} placeholder="Point text" />
                          </div>
                          <button type="button" className={styles.btnIconDanger} title="Remove point"
                            onClick={() => removePoint('problem', i)}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </fieldset>

                  {/* Solution */}
                  <fieldset className={styles.blockCard}>
                    <legend className={styles.blockLegend}>Solution</legend>
                    <div className={styles.formGrid}>
                      <div className={`${styles.field} ${styles.fullWidth}`}>
                        <label className={styles.label}>Heading</label>
                        <input className={styles.input} value={cb.solution.heading}
                          onChange={e => setPointsField('solution', 'heading', e.target.value)} placeholder="The solution" />
                      </div>
                      <div className={`${styles.field} ${styles.fullWidth}`}>
                        <label className={styles.label}>Body</label>
                        <textarea className={styles.textarea} style={{ minHeight: 50 }} value={cb.solution.body}
                          onChange={e => setPointsField('solution', 'body', e.target.value)}
                          placeholder="Describe how you solve it." />
                      </div>
                    </div>
                    <div className={styles.itemsBlock}>
                      <div className={styles.itemsHeader}>
                        <span className={styles.itemsLabel}>Points</span>
                        <button type="button" className={styles.addBtnSm} onClick={() => addPoint('solution')}>
                          <Plus size={13} /> Add point
                        </button>
                      </div>
                      {cb.solution.points.length === 0 && (
                        <p className={styles.emptyHint}>No points yet.</p>
                      )}
                      {cb.solution.points.map((pt, i) => (
                        <div key={i} className={styles.subItem}>
                          <div className={styles.subItemFields}>
                            <input className={styles.input} value={pt}
                              onChange={e => setPoint('solution', i, e.target.value)} placeholder="Point text" />
                          </div>
                          <button type="button" className={styles.btnIconDanger} title="Remove point"
                            onClick={() => removePoint('solution', i)}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </fieldset>

                  {/* Benefits */}
                  <fieldset className={styles.blockCard}>
                    <legend className={styles.blockLegend}>Benefits</legend>
                    <div className={styles.formGrid}>
                      <div className={`${styles.field} ${styles.fullWidth}`}>
                        <label className={styles.label}>Heading</label>
                        <input className={styles.input} value={cb.benefits.heading}
                          onChange={e => setBenefitsField('heading', e.target.value)} placeholder="Key benefits" />
                      </div>
                      <div className={`${styles.field} ${styles.fullWidth}`}>
                        <label className={styles.label}>Subheading</label>
                        <textarea className={styles.textarea} style={{ minHeight: 50 }} value={cb.benefits.subheading}
                          onChange={e => setBenefitsField('subheading', e.target.value)}
                          placeholder="Short intro to the benefits." />
                      </div>
                    </div>
                    <div className={styles.itemsBlock}>
                      <div className={styles.itemsHeader}>
                        <span className={styles.itemsLabel}>Items</span>
                        <button type="button" className={styles.addBtnSm} onClick={addBenefitItem}>
                          <Plus size={13} /> Add item
                        </button>
                      </div>
                      {cb.benefits.items.length === 0 && (
                        <p className={styles.emptyHint}>No benefit items yet.</p>
                      )}
                      {cb.benefits.items.map((item, i) => (
                        <div key={i} className={styles.subItem}>
                          <div className={styles.subItemFields}>
                            <input className={styles.input} value={item.title}
                              onChange={e => setBenefitItemField(i, 'title', e.target.value)} placeholder="Benefit title" />
                            <textarea className={styles.textarea} style={{ minHeight: 44 }} value={item.description}
                              onChange={e => setBenefitItemField(i, 'description', e.target.value)} placeholder="Benefit description" />
                          </div>
                          <button type="button" className={styles.btnIconDanger} title="Remove item"
                            onClick={() => removeBenefitItem(i)}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </fieldset>

                  {/* Sections */}
                  <fieldset className={styles.blockCard}>
                    <legend className={styles.blockLegend}>Sections</legend>
                    {cb.sections.length === 0 && (
                      <p className={styles.emptyHint}>No sections yet. Add one to describe a feature area, benefit group, or topic.</p>
                    )}
                    {cb.sections.map((section, sIdx) => (
                      <div key={sIdx} className={styles.repeatItem}>
                        <div className={styles.repeatItemHeader}>
                          <span className={styles.repeatItemTitle}>Section {sIdx + 1}</span>
                          <div className={styles.repeatItemActions}>
                            <button type="button" className={styles.btnIcon} title="Move up"
                              onClick={() => moveSection(sIdx, -1)} disabled={sIdx === 0}>
                              <ArrowUp size={13} />
                            </button>
                            <button type="button" className={styles.btnIcon} title="Move down"
                              onClick={() => moveSection(sIdx, 1)} disabled={sIdx === cb.sections.length - 1}>
                              <ArrowDown size={13} />
                            </button>
                            <button type="button" className={styles.btnIconDanger} title="Remove section"
                              onClick={() => removeSection(sIdx)}>
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                        <div className={styles.formGrid}>
                          <div className={`${styles.field} ${styles.fullWidth}`}>
                            <label className={styles.label}>Section heading</label>
                            <input className={styles.input} value={section.heading}
                              onChange={e => setSectionField(sIdx, 'heading', e.target.value)} placeholder="Cost tracking" />
                          </div>
                          <div className={`${styles.field} ${styles.fullWidth}`}>
                            <label className={styles.label}>Section subheading</label>
                            <textarea className={styles.textarea} style={{ minHeight: 50 }} value={section.subheading}
                              onChange={e => setSectionField(sIdx, 'subheading', e.target.value)}
                              placeholder="Short paragraph introducing this section." />
                          </div>
                        </div>

                        <div className={styles.itemsBlock}>
                          <div className={styles.itemsHeader}>
                            <span className={styles.itemsLabel}>Items</span>
                            <button type="button" className={styles.addBtnSm} onClick={() => addSectionItem(sIdx)}>
                              <Plus size={13} /> Add item
                            </button>
                          </div>
                          {section.items.length === 0 && (
                            <p className={styles.emptyHint}>No items. Add feature bullets / cards for this section.</p>
                          )}
                          {section.items.map((item, iIdx) => (
                            <div key={iIdx} className={styles.subItem}>
                              <div className={styles.subItemFields}>
                                <input className={styles.input} value={item.title}
                                  onChange={e => setSectionItemField(sIdx, iIdx, 'title', e.target.value)}
                                  placeholder="Item title" />
                                <textarea className={styles.textarea} style={{ minHeight: 44 }} value={item.description}
                                  onChange={e => setSectionItemField(sIdx, iIdx, 'description', e.target.value)}
                                  placeholder="Item description" />
                              </div>
                              <button type="button" className={styles.btnIconDanger} title="Remove item"
                                onClick={() => removeSectionItem(sIdx, iIdx)}>
                                <Trash2 size={13} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    <button type="button" className={styles.addBtn} onClick={addSection}>
                      <Plus size={14} /> Add section
                    </button>
                  </fieldset>

                  {/* Comparison table */}
                  <fieldset className={styles.blockCard}>
                    <legend className={styles.blockLegend}>Comparison table</legend>
                    <div className={styles.formGrid}>
                      <div className={`${styles.field} ${styles.fullWidth}`}>
                        <label className={styles.label}>Heading</label>
                        <input className={styles.input} value={cb.comparisonTable.heading}
                          onChange={e => setComparisonField('heading', e.target.value)} placeholder="How we compare" />
                      </div>
                      <div className={`${styles.field} ${styles.fullWidth}`}>
                        <label className={styles.label}>Subheading</label>
                        <textarea className={styles.textarea} style={{ minHeight: 50 }} value={cb.comparisonTable.subheading}
                          onChange={e => setComparisonField('subheading', e.target.value)}
                          placeholder="Short intro to the comparison." />
                      </div>
                    </div>
                    <div className={styles.itemsBlock}>
                      <div className={styles.itemsHeader}>
                        <span className={styles.itemsLabel}>Columns</span>
                        <button type="button" className={styles.addBtnSm} onClick={addComparisonColumn}>
                          <Plus size={13} /> Add column
                        </button>
                      </div>
                      {cb.comparisonTable.columns.length === 0 && (
                        <p className={styles.emptyHint}>Add columns (e.g. "Us", "Competitor").</p>
                      )}
                      {cb.comparisonTable.columns.map((col, ci) => (
                        <div key={ci} className={styles.subItem}>
                          <div className={styles.subItemFields}>
                            <input className={styles.input} value={col}
                              onChange={e => setComparisonColumn(ci, e.target.value)} placeholder={`Column ${ci + 1}`} />
                          </div>
                          <button type="button" className={styles.btnIconDanger} title="Remove column"
                            onClick={() => removeComparisonColumn(ci)}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className={styles.itemsBlock}>
                      <div className={styles.itemsHeader}>
                        <span className={styles.itemsLabel}>Rows</span>
                        <button type="button" className={styles.addBtnSm} onClick={addComparisonRow}>
                          <Plus size={13} /> Add row
                        </button>
                      </div>
                      {cb.comparisonTable.rows.length === 0 && (
                        <p className={styles.emptyHint}>Add rows (one feature per row, one value per column).</p>
                      )}
                      {cb.comparisonTable.rows.map((row, ri) => (
                        <div key={ri} className={styles.repeatItem}>
                          <div className={styles.repeatItemHeader}>
                            <span className={styles.repeatItemTitle}>Row {ri + 1}</span>
                            <button type="button" className={styles.btnIconDanger} title="Remove row"
                              onClick={() => removeComparisonRow(ri)}>
                              <Trash2 size={13} />
                            </button>
                          </div>
                          <div className={styles.formGrid}>
                            <div className={`${styles.field} ${styles.fullWidth}`}>
                              <label className={styles.label}>Row label</label>
                              <input className={styles.input} value={row.label}
                                onChange={e => setComparisonRowLabel(ri, e.target.value)} placeholder="Feature name" />
                            </div>
                            {cb.comparisonTable.columns.map((col, ci) => (
                              <div key={ci} className={styles.field}>
                                <label className={styles.label}>{col || `Column ${ci + 1}`}</label>
                                <input className={styles.input} value={row.values[ci] ?? ''}
                                  onChange={e => setComparisonRowValue(ri, ci, e.target.value)} placeholder="Value" />
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </fieldset>

                  {/* Pros & cons */}
                  <fieldset className={styles.blockCard}>
                    <legend className={styles.blockLegend}>Pros &amp; cons</legend>
                    <div className={styles.formGrid}>
                      <div className={`${styles.field} ${styles.fullWidth}`}>
                        <label className={styles.label}>Heading</label>
                        <input className={styles.input} value={cb.prosCons.heading}
                          onChange={e => setProsConsField('heading', e.target.value)} placeholder="Pros and cons" />
                      </div>
                      <div className={styles.field}>
                        <label className={styles.label}>Pros column title</label>
                        <input className={styles.input} value={cb.prosCons.prosTitle}
                          onChange={e => setProsConsField('prosTitle', e.target.value)} placeholder="Pros" />
                      </div>
                      <div className={styles.field}>
                        <label className={styles.label}>Cons column title</label>
                        <input className={styles.input} value={cb.prosCons.consTitle}
                          onChange={e => setProsConsField('consTitle', e.target.value)} placeholder="Cons" />
                      </div>
                    </div>
                    <div className={styles.itemsBlock}>
                      <div className={styles.itemsHeader}>
                        <span className={styles.itemsLabel}>Pros</span>
                        <button type="button" className={styles.addBtnSm} onClick={() => addProsConsItem('pros')}>
                          <Plus size={13} /> Add pro
                        </button>
                      </div>
                      {cb.prosCons.pros.length === 0 && <p className={styles.emptyHint}>No pros yet.</p>}
                      {cb.prosCons.pros.map((pt, i) => (
                        <div key={i} className={styles.subItem}>
                          <div className={styles.subItemFields}>
                            <input className={styles.input} value={pt}
                              onChange={e => setProsConsItem('pros', i, e.target.value)} placeholder="Pro text" />
                          </div>
                          <button type="button" className={styles.btnIconDanger} title="Remove"
                            onClick={() => removeProsConsItem('pros', i)}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className={styles.itemsBlock}>
                      <div className={styles.itemsHeader}>
                        <span className={styles.itemsLabel}>Cons</span>
                        <button type="button" className={styles.addBtnSm} onClick={() => addProsConsItem('cons')}>
                          <Plus size={13} /> Add con
                        </button>
                      </div>
                      {cb.prosCons.cons.length === 0 && <p className={styles.emptyHint}>No cons yet.</p>}
                      {cb.prosCons.cons.map((pt, i) => (
                        <div key={i} className={styles.subItem}>
                          <div className={styles.subItemFields}>
                            <input className={styles.input} value={pt}
                              onChange={e => setProsConsItem('cons', i, e.target.value)} placeholder="Con text" />
                          </div>
                          <button type="button" className={styles.btnIconDanger} title="Remove"
                            onClick={() => removeProsConsItem('cons', i)}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </fieldset>

                  {/* Workflow */}
                  <fieldset className={styles.blockCard}>
                    <legend className={styles.blockLegend}>Workflow / steps</legend>
                    <div className={styles.formGrid}>
                      <div className={`${styles.field} ${styles.fullWidth}`}>
                        <label className={styles.label}>Heading</label>
                        <input className={styles.input} value={cb.workflow.heading}
                          onChange={e => setWorkflowField('heading', e.target.value)} placeholder="How it works" />
                      </div>
                      <div className={`${styles.field} ${styles.fullWidth}`}>
                        <label className={styles.label}>Subheading</label>
                        <textarea className={styles.textarea} style={{ minHeight: 50 }} value={cb.workflow.subheading}
                          onChange={e => setWorkflowField('subheading', e.target.value)}
                          placeholder="Short intro to the steps." />
                      </div>
                    </div>
                    <div className={styles.itemsBlock}>
                      <div className={styles.itemsHeader}>
                        <span className={styles.itemsLabel}>Steps</span>
                        <button type="button" className={styles.addBtnSm} onClick={addWorkflowStep}>
                          <Plus size={13} /> Add step
                        </button>
                      </div>
                      {cb.workflow.steps.length === 0 && <p className={styles.emptyHint}>No steps yet.</p>}
                      {cb.workflow.steps.map((step, i) => (
                        <div key={i} className={styles.subItem}>
                          <div className={styles.subItemFields}>
                            <input className={styles.input} value={step.title}
                              onChange={e => setWorkflowStepField(i, 'title', e.target.value)} placeholder="Step title" />
                            <textarea className={styles.textarea} style={{ minHeight: 44 }} value={step.description}
                              onChange={e => setWorkflowStepField(i, 'description', e.target.value)} placeholder="Step description" />
                          </div>
                          <button type="button" className={styles.btnIconDanger} title="Remove step"
                            onClick={() => removeWorkflowStep(i)}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </fieldset>

                  {/* FAQs */}
                  <fieldset className={styles.blockCard}>
                    <legend className={styles.blockLegend}>FAQs</legend>
                    {cb.faqs.length === 0 && (
                      <p className={styles.emptyHint}>No FAQs yet. These also generate FAQ structured data for search engines.</p>
                    )}
                    {cb.faqs.map((faq, idx) => (
                      <div key={idx} className={styles.repeatItem}>
                        <div className={styles.repeatItemHeader}>
                          <span className={styles.repeatItemTitle}>Q{idx + 1}</span>
                          <button type="button" className={styles.btnIconDanger} title="Remove FAQ"
                            onClick={() => removeFaq(idx)}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                        <div className={styles.formGrid}>
                          <div className={`${styles.field} ${styles.fullWidth}`}>
                            <label className={styles.label}>Question</label>
                            <input className={styles.input} value={faq.question}
                              onChange={e => setFaqField(idx, 'question', e.target.value)}
                              placeholder="How does pricing work?" />
                          </div>
                          <div className={`${styles.field} ${styles.fullWidth}`}>
                            <label className={styles.label}>Answer</label>
                            <textarea className={styles.textarea} style={{ minHeight: 60 }} value={faq.answer}
                              onChange={e => setFaqField(idx, 'answer', e.target.value)}
                              placeholder="A clear, honest answer." />
                          </div>
                        </div>
                      </div>
                    ))}
                    <button type="button" className={styles.addBtn} onClick={addFaq}>
                      <Plus size={14} /> Add FAQ
                    </button>
                  </fieldset>

                  {/* Related links */}
                  <fieldset className={styles.blockCard}>
                    <legend className={styles.blockLegend}>Related links</legend>
                    <div className={styles.formGrid}>
                      <div className={`${styles.field} ${styles.fullWidth}`}>
                        <label className={styles.label}>Heading</label>
                        <input className={styles.input} value={cb.relatedLinks.heading}
                          onChange={e => setRelatedField(e.target.value)} placeholder="Related pages" />
                      </div>
                    </div>
                    {cb.relatedLinks.links.length === 0 && (
                      <p className={styles.emptyHint}>No related links yet. Link to features, pricing, or related pages.</p>
                    )}
                    {cb.relatedLinks.links.map((link, i) => (
                      <div key={i} className={styles.repeatItem}>
                        <div className={styles.repeatItemHeader}>
                          <span className={styles.repeatItemTitle}>Link {i + 1}</span>
                          <button type="button" className={styles.btnIconDanger} title="Remove link"
                            onClick={() => removeRelatedLink(i)}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                        <div className={styles.formGrid}>
                          <div className={styles.field}>
                            <label className={styles.label}>Label</label>
                            <input className={styles.input} value={link.label}
                              onChange={e => setRelatedLinkField(i, 'label', e.target.value)} placeholder="Pricing" />
                          </div>
                          <div className={styles.field}>
                            <label className={styles.label}>URL</label>
                            <input className={styles.input} value={link.href}
                              onChange={e => setRelatedLinkField(i, 'href', e.target.value)} placeholder="/pricing" />
                          </div>
                          <div className={`${styles.field} ${styles.fullWidth}`}>
                            <label className={styles.label}>Description</label>
                            <input className={styles.input} value={link.description}
                              onChange={e => setRelatedLinkField(i, 'description', e.target.value)} placeholder="Short description" />
                          </div>
                        </div>
                      </div>
                    ))}
                    <button type="button" className={styles.addBtn} onClick={addRelatedLink}>
                      <Plus size={14} /> Add link
                    </button>
                  </fieldset>

                  {/* Final CTA */}
                  <fieldset className={styles.blockCard}>
                    <legend className={styles.blockLegend}>Closing call-to-action</legend>
                    <div className={styles.formGrid}>
                      <div className={`${styles.field} ${styles.fullWidth}`}>
                        <label className={styles.label}>Headline</label>
                        <input className={styles.input} value={cb.finalCta.headline}
                          onChange={e => setFinalField('headline', e.target.value)} placeholder="Ready to see your real AI costs?" />
                      </div>
                      <div className={`${styles.field} ${styles.fullWidth}`}>
                        <label className={styles.label}>Description</label>
                        <textarea className={styles.textarea} style={{ minHeight: 50 }} value={cb.finalCta.description}
                          onChange={e => setFinalField('description', e.target.value)}
                          placeholder="One supporting sentence for the closing CTA." />
                      </div>
                      <div className={styles.field}>
                        <label className={styles.label}>Primary button label</label>
                        <input className={styles.input} value={cb.finalCta.primaryCta.label}
                          onChange={e => setFinalCta('primaryCta', 'label', e.target.value)} placeholder="Start free" />
                      </div>
                      <div className={styles.field}>
                        <label className={styles.label}>Primary button link</label>
                        <input className={styles.input} value={cb.finalCta.primaryCta.href}
                          onChange={e => setFinalCta('primaryCta', 'href', e.target.value)} placeholder="/signup" />
                      </div>
                      <div className={styles.field}>
                        <label className={styles.label}>Secondary button label</label>
                        <input className={styles.input} value={cb.finalCta.secondaryCta.label}
                          onChange={e => setFinalCta('secondaryCta', 'label', e.target.value)} placeholder="Talk to sales" />
                      </div>
                      <div className={styles.field}>
                        <label className={styles.label}>Secondary button link</label>
                        <input className={styles.input} value={cb.finalCta.secondaryCta.href}
                          onChange={e => setFinalCta('secondaryCta', 'href', e.target.value)} placeholder="/contact-sales" />
                      </div>
                    </div>
                  </fieldset>
                </div>
              )}
            </div>

            <div className={styles.modalFooter}>
              <button className={styles.btnSecondary} onClick={() => !isSaving && setModalOpen(false)} disabled={isSaving}>
                Cancel
              </button>
              <div className={styles.modalFooterActions}>
                <button className={styles.btnSecondary} onClick={() => handleSave(false)} disabled={isSaving}>
                  {isSaving ? 'Saving…' : 'Save as Draft'}
                </button>
                <button className={styles.btnPrimary} onClick={() => handleSave(true)} disabled={isSaving}>
                  {isSaving ? 'Saving…' : modalMode === 'add' ? 'Publish' : 'Save & Publish'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete */}
      {confirmDelete && (
        <div className={styles.overlay} onClick={() => setConfirmDelete(null)}>
          <div className={styles.confirmBox} onClick={e => e.stopPropagation()}>
            <p className={styles.confirmText}>
              Delete <strong>"{confirmDelete.title}"</strong>? This page and its content will be permanently removed. Any footer link pointing to it will 404.
            </p>
            <div className={styles.confirmActions}>
              <button className={styles.btnSecondary} onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button className={styles.btnDanger} onClick={handleDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPagesPage;
