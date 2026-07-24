import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, ExternalLink } from 'lucide-react';
import { adminService } from '../../../api/services/admin.service';
import styles from './AdminSiteLinks.module.css';

const SECTIONS = [
  { key: 'product', label: 'Product' },
  { key: 'company', label: 'Company' },
  { key: 'legal', label: 'Legal' },
  { key: 'social', label: 'Social' },
] as const;

interface SiteLink {
  id: string;
  section: string;
  label: string;
  url: string;
  sort_order: number;
  is_active: boolean;
}

export function AdminSiteLinksPage() {
  const [links, setLinks] = useState<SiteLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; label: string } | null>(null);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [newLabel, setNewLabel] = useState('');
  const [newUrl, setNewUrl] = useState('');

  const fetchLinks = useCallback(async () => {
    try {
      const data = await adminService.getSiteLinks();
      setLinks(data);
    } catch (err) {
      console.error('[AdminSiteLinks] fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchLinks(); }, [fetchLinks]);

  const handleFieldSave = async (id: string, field: 'label' | 'url', value: string) => {
    setSavingId(id);
    try {
      await adminService.updateSiteLink(id, { [field]: value });
      await fetchLinks();
    } catch (err) {
      console.error('[AdminSiteLinks] update error:', err);
    } finally {
      setSavingId(null);
    }
  };

  const handleToggleActive = async (link: SiteLink) => {
    setSavingId(link.id);
    try {
      await adminService.updateSiteLink(link.id, { is_active: !link.is_active });
      await fetchLinks();
    } catch (err) {
      console.error('[AdminSiteLinks] toggle error:', err);
    } finally {
      setSavingId(null);
    }
  };

  const handleAdd = async (section: string) => {
    if (!newLabel.trim() || !newUrl.trim()) return;
    try {
      await adminService.createSiteLink({ section, label: newLabel.trim(), url: newUrl.trim() });
      setNewLabel('');
      setNewUrl('');
      setAddingTo(null);
      await fetchLinks();
    } catch (err) {
      console.error('[AdminSiteLinks] add error:', err);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await adminService.deleteSiteLink(confirmDelete.id);
      setConfirmDelete(null);
      await fetchLinks();
    } catch (err) {
      console.error('[AdminSiteLinks] delete error:', err);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Site Links</h1>
          <p className={styles.subtitle}>
            Footer and social links shown on the public landing page — changes go live immediately, no deploy needed.
          </p>
        </div>
      </div>

      {isLoading ? (
        <p className={styles.loadingText}>Loading…</p>
      ) : (
        SECTIONS.map(({ key, label }) => {
          const sectionLinks = links.filter(l => l.section === key).sort((a, b) => a.sort_order - b.sort_order);
          return (
            <div key={key} className={styles.sectionBlock}>
              <div className={styles.sectionHead}>
                <h2 className={styles.sectionTitle}>{label}</h2>
                <button className={styles.btnAdd} onClick={() => { setAddingTo(key); setNewLabel(''); setNewUrl(''); }}>
                  <Plus size={14} /> Add Link
                </button>
              </div>

              <div className={styles.table}>
                <div className={styles.tableHeadRow}>
                  <span>Label</span>
                  <span>URL</span>
                  <span>Active</span>
                  <span></span>
                </div>

                {sectionLinks.length === 0 && addingTo !== key && (
                  <p className={styles.emptyText}>No links in this section yet.</p>
                )}

                {sectionLinks.map(link => (
                  <div key={link.id} className={styles.tableRow}>
                    <input
                      className={styles.input}
                      defaultValue={link.label}
                      disabled={savingId === link.id}
                      onBlur={(e) => e.target.value !== link.label && handleFieldSave(link.id, 'label', e.target.value)}
                    />
                    <input
                      className={styles.input}
                      defaultValue={link.url}
                      disabled={savingId === link.id}
                      onBlur={(e) => e.target.value !== link.url && handleFieldSave(link.id, 'url', e.target.value)}
                    />
                    <button
                      className={`${styles.toggle} ${link.is_active ? styles.toggleOn : ''}`}
                      onClick={() => handleToggleActive(link)}
                      disabled={savingId === link.id}
                      title={link.is_active ? 'Visible on landing page' : 'Hidden from landing page'}
                    >
                      <span className={styles.toggleDot} />
                    </button>
                    <div className={styles.rowActions}>
                      <a href={link.url} target="_blank" rel="noopener noreferrer" className={styles.btnIcon} title="Open link">
                        <ExternalLink size={13} />
                      </a>
                      <button
                        className={styles.btnIconDanger}
                        onClick={() => setConfirmDelete({ id: link.id, label: link.label })}
                        title="Delete link"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}

                {addingTo === key && (
                  <div className={styles.tableRow}>
                    <input
                      className={styles.input}
                      placeholder="Label (e.g. Careers)"
                      value={newLabel}
                      onChange={(e) => setNewLabel(e.target.value)}
                      autoFocus
                    />
                    <input
                      className={styles.input}
                      placeholder="https://…"
                      value={newUrl}
                      onChange={(e) => setNewUrl(e.target.value)}
                    />
                    <span />
                    <div className={styles.rowActions}>
                      <button className={styles.btnSave} onClick={() => handleAdd(key)}>Save</button>
                      <button className={styles.btnCancel} onClick={() => setAddingTo(null)}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })
      )}

      {confirmDelete && (
        <div className={styles.confirmOverlay} onClick={() => setConfirmDelete(null)}>
          <div className={styles.confirmBox} onClick={(e) => e.stopPropagation()}>
            <p className={styles.confirmText}>Delete "{confirmDelete.label}"? This link will disappear from the landing page immediately.</p>
            <div className={styles.confirmActions}>
              <button className={styles.btnCancel} onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button className={styles.btnDanger} onClick={handleDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminSiteLinksPage;
