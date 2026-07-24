import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, Play, Pause } from 'lucide-react';
import { adminService } from '../../../api/services/admin.service';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card/Card';
import { DataTable } from '../../../components/ui/DataTable/DataTable';
import styles from './OrganizationDetail.module.css';

export function OrganizationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [orgData, setOrgData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState<{ action: string, message: string, onConfirm: () => void } | null>(null);

  const fetchDetail = async () => {
    if (!id) return;
    try {
      const data = await adminService.getOrganizationDetail(id);
      setOrgData(data);
    } catch (err) {
      console.error('Failed to fetch org details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const handleToggleStatus = () => {
    const isCurrentlyActive = orgData.is_active;
    const newStatus = !isCurrentlyActive;
    
    setShowConfirmModal({
      action: newStatus ? 'Reactivate Organization' : 'Suspend Organization',
      message: newStatus 
        ? `Are you sure you want to reactivate ${orgData.name}? Users will be able to access the platform and API again.`
        : `Are you sure you want to suspend ${orgData.name}? This will instantly block all user access and disable all API keys via the proxy.`,
      onConfirm: async () => {
        try {
          await adminService.updateOrganizationStatus(id!, newStatus);
          setShowConfirmModal(null);
          fetchDetail(); // refresh data
        } catch (err) {
          console.error('Failed to update status', err);
        }
      }
    });
  };

  if (isLoading) {
    return <div className={styles.container}>Loading organization details...</div>;
  }

  if (!orgData) {
    return <div className={styles.container}>Organization not found.</div>;
  }

  const memberColumns = [
    { header: 'Name', accessorKey: 'users.full_name' },
    { header: 'Email', accessorKey: 'users.email' },
    { header: 'Role', accessorKey: 'role', cell: (val: string) => <span style={{textTransform: 'capitalize'}}>{val}</span> },
    { header: 'Status', accessorKey: 'status', cell: (val: string) => <span style={{textTransform: 'capitalize'}}>{val}</span> }
  ];

  const integrationColumns = [
    { header: 'Provider', accessorKey: 'provider', cell: (val: string) => <span style={{textTransform: 'capitalize'}}>{val}</span> },
    { header: 'Name', accessorKey: 'display_name' },
    { header: 'Status', accessorKey: 'status', cell: (val: string) => <span style={{textTransform: 'capitalize'}}>{val}</span> }
  ];

  return (
    <div className={styles.container}>
      <Link to="/admin/organizations" className={styles.backLink}>
        <ArrowLeft size={16} /> Back to Organizations
      </Link>

      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>
            {orgData.name}
            <span className={`${styles.badge} ${orgData.is_active ? styles.badgeActive : styles.badgeSuspended}`}>
              {orgData.is_active ? 'Active' : 'Suspended'}
            </span>
          </h1>
          <p className={styles.subtitle}>ID: {orgData.id} | Slug: {orgData.slug}</p>
        </div>
        <div className={styles.actions}>
          {orgData.is_active ? (
            <button className={styles.btnDanger} onClick={handleToggleStatus}>
              <Pause size={16} /> Suspend Org
            </button>
          ) : (
            <button className={styles.btnSuccess} onClick={handleToggleStatus}>
              <Play size={16} /> Reactivate Org
            </button>
          )}
        </div>
      </div>

      <div className={styles.grid}>
        <Card>
          <CardHeader>
            <CardTitle>Organization Info</CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div><strong>Created:</strong> {new Date(orgData.created_at).toLocaleString()}</div>
              <div><strong>Website:</strong> {orgData.website || 'N/A'}</div>
              <div><strong>Industry:</strong> {orgData.industry || 'N/A'}</div>
              <div><strong>Billing Email:</strong> {orgData.billing_email || 'N/A'}</div>
              <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)' }} />
              <div>
                <strong>Current Plan:</strong> {orgData.subscription?.plans?.name || 'No Plan'} 
                {orgData.subscription && ` (${orgData.subscription.status})`}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Members ({orgData.members?.length || 0})</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable 
              data={orgData.members || []} 
              columns={memberColumns} 
              isLoading={false}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>AI Integrations ({orgData.integrations?.length || 0})</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable 
              data={orgData.integrations || []} 
              columns={integrationColumns} 
              isLoading={false}
            />
          </CardContent>
        </Card>
      </div>

      {/* CONFIRMATION MODAL */}
      {showConfirmModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <AlertTriangle size={24} color="#ef4444" />
              <h2>{showConfirmModal.action}</h2>
            </div>
            <div className={styles.modalBody}>
              <p>{showConfirmModal.message}</p>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.btnSecondary} onClick={() => setShowConfirmModal(null)}>Cancel</button>
              <button 
                className={styles.btnPrimary} 
                style={{ background: showConfirmModal.action.includes('Suspend') ? '#ef4444' : '#22c55e' }}
                onClick={showConfirmModal.onConfirm}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
