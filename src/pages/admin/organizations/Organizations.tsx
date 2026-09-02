import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye } from 'lucide-react';
import { adminService } from '../../../api/services/admin.service';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card/Card';
import { DataTable } from '../../../components/ui/DataTable/DataTable';
import styles from './Organizations.module.css';

export function OrganizationsPage() {
  const navigate = useNavigate();
  const [orgs, setOrgs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchOrgs = async () => {
    try {
      const data = await adminService.getOrganizations();
      setOrgs(data);
    } catch (err) {
      console.error('Failed to fetch organizations:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrgs();
  }, []);

  const columns = [
    { 
      header: 'Organization', 
      accessorKey: 'name',
      cell: (_: string, row: any) => (
        <div>
          <div className={styles.orgName}>{row.name}</div>
          <div className={styles.orgSlug}>{row.slug}</div>
        </div>
      )
    },
    { 
      header: 'Members', 
      accessorKey: 'active_members',
      cell: (_: number, row: any) => `${row.active_members} / ${row.total_members}`
    },
    { 
      header: 'Subscription', 
      accessorKey: 'plan_name',
      cell: (_: string, row: any) => {
        const daysLeft = row.trial_ends_at
          ? Math.ceil((new Date(row.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          : null;
        return (
          <div>
            <div>{row.plan_name}</div>
            <span className={`${styles.badge} ${row.subscription_status === 'active' ? styles.badgeActive : row.subscription_status === 'trialing' ? styles.badgeTrialing : ''}`}>
              {row.subscription_status}
            </span>
            {row.subscription_status === 'trialing' && daysLeft !== null && (
              <div style={{ fontSize: 11, color: daysLeft <= 3 ? '#ef4444' : 'var(--color-text-tertiary)', marginTop: 3 }}>
                {daysLeft >= 0 ? `${daysLeft}d left` : 'expired'}
              </div>
            )}
          </div>
        );
      }
    },
    { 
      header: 'Monthly Spend', 
      accessorKey: 'monthly_spend',
      cell: (val: number) => `$${Number(val || 0).toFixed(2)}`
    },
    { 
      header: 'Status', 
      accessorKey: 'is_active',
      cell: (val: boolean) => (
        <span className={`${styles.badge} ${val ? styles.badgeActive : styles.badgeSuspended}`}>
          {val ? 'Active' : 'Suspended'}
        </span>
      )
    },
    {
      header: 'Actions',
      accessorKey: 'id',
      cell: (id: string) => (
        <button 
          className={styles.btnSecondary} 
          onClick={() => navigate(`/admin/organizations/${id}`)}
        >
          <Eye size={16} /> View Details
        </button>
      )
    }
  ];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Organizations</h1>
          <p className={styles.subtitle}>View and manage all customer organizations.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Organizations</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable 
            data={orgs} 
            columns={columns} 
            isLoading={isLoading} 
          />
        </CardContent>
      </Card>
    </div>
  );
}
