import { useParams, Navigate } from 'react-router-dom';
import DocsLayout from '../components/docs/DocsLayout/DocsLayout';
import { getPageBySlug } from '../docs/content/index';

export default function DocsPage() {
  const { slug } = useParams<{ slug: string }>();
  const page = getPageBySlug(slug || '');

  if (!page) {
    return <Navigate to="/docs/overview" replace />;
  }

  return <DocsLayout page={page} />;
}
