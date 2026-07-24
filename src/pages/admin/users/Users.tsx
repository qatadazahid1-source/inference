import { useState, useEffect, useCallback } from 'react';
import {
  Search, RefreshCw, Eye, X, Shield, ShieldOff,
  UserCog, Zap, DollarSign, Hash,
} from 'lucide-react';
import { adminService } from '../../../api/services/admin.service';
import { DataTable } from '../../../components/ui/DataTable/DataTable';
import styles from './Users.module.css';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getInitials(name: string): string {
  return (name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function formatDate(iso: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatUSD(n: number): string { return `$${n.toFixed(4)}`; }
function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// ─── User Detail Modal ────────────────────────────────────────────────────────
function UserDetailModal({
  userId,
  onClose,
  onRoleChange,
  onAdminToggle,
  onStatusToggle,
}: {
  userId: string;
  onClose: () => void;
  onRoleChange: (uid: string, orgId: string, role: 'admin' | 'member') => Promise<void>;
  onAdminToggle: (uid: string, val: boolean) => Promise<void>;
  onStatusToggle: (uid: string, val: boolean) => Promise<void>;
}) {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmAction, setConfirmAction] = useState<null | { label: string; onConfirm: () => void }>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    adminService.getUserDetail(userId)
      .then(u => {
        if (cancelled) return;
        setUser(u);
        setIsLoading(false);
      })
      .catch(err => {
        console.error('[UserDetailModal] Failed to load user detail:', err);
        if (cancelled) return;
        setUser(null);
        setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, [userId]);

  const handleRoleChange = async (orgId: string, role: 'admin' | 'member') => {
    setIsSaving(true);
    try {
      await onRoleChange(userId, orgId, role);
      const updated = await adminService.getUserDetail(userId);
      setUser(updated);
    } catch (err) {
      console.error('[UserDetailModal] Role change failed:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAdminToggle = async (val: boolean) => {
    setConfirmAction({
      label: val
        ? `Grant platform-admin to ${user.full_name}? They will have FULL admin access.`
        : `Revoke platform-admin from ${user.full_name}?`,
      onConfirm: async () => {
        setIsSaving(true);
        setConfirmAction(null);
        try {
          await onAdminToggle(userId, val);
          const updated = await adminService.getUserDetail(userId);
          setUser(updated);
        } catch (err) {
          console.error('[UserDetailModal] Admin toggle failed:', err);
        } finally {
          setIsSaving(false);
        }
      },
    });
  };

  const handleStatusToggle = async (val: boolean) => {
    setConfirmAction({
      label: val
        ? `Reactivate ${user.full_name}'s account? They will regain full access.`
        : `Deactivate ${user.full_name}'s account? They will lose access immediately.`,
      onConfirm: async () => {
        setIsSaving(true);
        setConfirmAction(null);
        try {
          await onStatusToggle(userId, val);
          const updated = await adminService.getUserDetail(userId);
          setUser(updated);
        } catch (err) {
          console.error('[UserDetailModal] Status toggle failed:', err);
        } finally {
          setIsSaving(false);
        }
      },
    });
  };

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>User Detail</h2>
          <button className={styles.btnIcon} onClick={onClose}><X size={16} /></button>
        </div>

        <div className={styles.modalBody}>
          {isLoading ? (
            <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '24px 0' }}>Loading...</p>
          ) : !user ? (
            <p style={{ color: '#ef4444' }}>User not found.</p>
          ) : (
            <>
              {/* Profile */}
              <div className={styles.detailSection}>
                <div className={styles.userCell} style={{ marginBottom: 12 }}>
                  <div className={styles.avatar} style={{ width: 48, height: 48, fontSize: 18 }}>
                    {user.avatar_url
                      ? <img src={user.avatar_url} alt={user.full_name} />
                      : getInitials(user.full_name)}
                  </div>
                  <div>
                    <div className={styles.userName} style={{ fontSize: 16 }}>{user.full_name}</div>
                    <div className={styles.userEmail}>{user.email}</div>
                    {user.is_platform_admin && (
                      <span className={styles.badgePlatformAdmin} style={{ marginTop: 4, display: 'inline-flex' }}>
                        <Shield size={10} /> Platform Admin
                      </span>
                    )}
                    <span
                      style={{
                        marginTop: 4,
                        marginLeft: user.is_platform_admin ? 6 : 0,
                        display: 'inline-flex',
                        fontSize: 11,
                        padding: '2px 8px',
                        borderRadius: 999,
                        color: user.is_active === false ? '#ef4444' : '#22c55e',
                        background: user.is_active === false ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.12)',
                      }}
                    >
                      {user.is_active === false ? 'Deactivated' : 'Active'}
                    </span>
                  </div>
                </div>

                <div className={styles.detailGrid}>
                  <div className={styles.detailItem}>
                    <label>Joined</label>
                    <span>{formatDate(user.created_at)}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <label>Organizations</label>
                    <span>{user.organization_members?.length ?? 0}</span>
                  </div>
                </div>
              </div>

              <div className={styles.divider} />

              {/* 30-day stats */}
              <div className={styles.detailSection}>
                <p className={styles.detailSectionTitle}>Last 30 Days Activity</p>
                <span className={styles.statPill}><Hash size={12} /> {formatNumber(user.stats_30d?.requests ?? 0)} requests</span>
                <span className={styles.statPill}><Zap size={12} /> {formatNumber(user.stats_30d?.tokens ?? 0)} tokens</span>
                <span className={styles.statPill}><DollarSign size={12} /> {formatUSD(user.stats_30d?.spend_usd ?? 0)}</span>
              </div>

              <div className={styles.divider} />

              {/* Org memberships + role control */}
              <div className={styles.detailSection}>
                <p className={styles.detailSectionTitle}>Organization Memberships</p>
                {(user.organization_members || []).length === 0 ? (
                  <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>Not a member of any organization.</p>
                ) : (
                  user.organization_members.map((m: any) => (
                    <div key={m.organizations?.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <div>
                        <div style={{ fontSize: 14, color: 'var(--color-text-primary)', fontWeight: 500 }}>{m.organizations?.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Joined {formatDate(m.joined_at)}</div>
                      </div>
                      <select
                        className={styles.select}
                        value={m.role}
                        disabled={isSaving}
                        onChange={e => handleRoleChange(m.organizations?.id, e.target.value as 'admin' | 'member')}
                      >
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                  ))
                )}
              </div>

              <div className={styles.divider} />

              {/* Account status toggle */}
              <div className={styles.detailSection}>
                <p className={styles.detailSectionTitle}>Account Status</p>
                {user.is_active === false ? (
                  <button
                    className={styles.btnIcon}
                    disabled={isSaving}
                    onClick={() => handleStatusToggle(true)}
                  >
                    <Shield size={14} /> Reactivate Account
                  </button>
                ) : (
                  <button
                    className={styles.btnDanger}
                    disabled={isSaving}
                    onClick={() => handleStatusToggle(false)}
                  >
                    <ShieldOff size={14} /> Deactivate Account
                  </button>
                )}
              </div>

              <div className={styles.divider} />

              {/* Platform admin toggle */}
              <div className={styles.detailSection}>
                <p className={styles.detailSectionTitle}>Platform Access</p>
                {user.is_platform_admin ? (
                  <button
                    className={styles.btnDanger}
                    disabled={isSaving}
                    onClick={() => handleAdminToggle(false)}
                  >
                    <ShieldOff size={14} /> Revoke Platform Admin
                  </button>
                ) : (
                  <button
                    className={styles.btnIcon}
                    disabled={isSaving}
                    onClick={() => handleAdminToggle(true)}
                  >
                    <Shield size={14} /> Grant Platform Admin
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {/* Confirm sub-modal — rendered as an overlay so it's always
            visible regardless of scroll position within the modal body
            (previously appended at the bottom of a scrollable container,
            which made it look like the button did nothing). */}
        {confirmAction && (
          <div className={styles.confirmOverlay}>
            <div className={styles.confirmBox}>
              <p style={{ fontSize: 14, color: '#f59e0b', margin: '0 0 16px 0' }}>⚠️ {confirmAction.label}</p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button className={styles.btnSecondary} onClick={() => setConfirmAction(null)}>Cancel</button>
                <button className={styles.btnPrimary} onClick={confirmAction.onConfirm}>Confirm</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const fetchUsers = useCallback(async (q = search) => {
    setIsRefreshing(true);
    try {
      const result = await adminService.getUsers(q);
      setUsers(result.data);
      setTotal(result.total);
    } catch (err) {
      console.error('[AdminUsers] fetch error:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [search]);

  useEffect(() => { fetchUsers(''); }, []);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => fetchUsers(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const handleRoleChange = async (uid: string, orgId: string, role: 'admin' | 'member') => {
    await adminService.updateUserRole(uid, orgId, role);
    await fetchUsers();
  };

  const handleAdminToggle = async (uid: string, val: boolean) => {
    await adminService.togglePlatformAdmin(uid, val);
    await fetchUsers();
  };

  const handleStatusToggle = async (uid: string, val: boolean) => {
    await adminService.toggleUserStatus(uid, val);
    await fetchUsers();
  };

  const columns = [
    {
      header: 'User',
      accessorKey: 'full_name',
      cell: (_: string, row: any) => (
        <div className={styles.userCell}>
          <div className={styles.avatar}>
            {row.avatar_url
              ? <img src={row.avatar_url} alt={row.full_name} />
              : getInitials(row.full_name)}
          </div>
          <div>
            <div className={styles.userName}>{row.full_name || '—'}</div>
            <div className={styles.userEmail}>{row.email}</div>
          </div>
        </div>
      ),
    },
    {
      header: 'Organization',
      accessorKey: 'organization',
      cell: (org: any) => org ? (
        <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{org.name}</span>
      ) : <span style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>—</span>,
    },
    {
      header: 'Role',
      accessorKey: 'role',
      cell: (role: string, row: any) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {role ? (
            <span className={role === 'admin' ? styles.badgeAdmin : styles.badgeMember}>
              <UserCog size={10} /> {role}
            </span>
          ) : <span style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>—</span>}
          {row.is_platform_admin && (
            <span className={styles.badgePlatformAdmin}><Shield size={10} /> Platform Admin</span>
          )}
          {row.is_active === false && (
            <span style={{
              fontSize: 11, padding: '2px 8px', borderRadius: 999, width: 'fit-content',
              color: '#ef4444', background: 'rgba(239,68,68,0.12)'
            }}>
              Deactivated
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Joined',
      accessorKey: 'created_at',
      cell: (v: string) => <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{formatDate(v)}</span>,
    },
    {
      header: 'Actions',
      accessorKey: 'id',
      cell: (_: string, row: any) => (
        <div className={styles.actionsCell}>
          <button
            className={styles.btnIcon}
            title="View details"
            onClick={() => setSelectedUserId(row.id)}
          >
            <Eye size={13} /> View
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Users</h1>
          <p className={styles.subtitle}>All platform users across every organization.</p>
        </div>
        <button
          className={styles.btnSecondary}
          onClick={() => fetchUsers()}
          disabled={isRefreshing}
        >
          <RefreshCw size={16} className={isRefreshing ? styles.spin : ''} />
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchWrapper}>
          <Search size={14} className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search by name or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <span className={styles.totalBadge}>{total} users total</span>
      </div>

      <div className={styles.tableCard}>
        <DataTable
          data={users}
          columns={columns}
          isLoading={isLoading}
          emptyMessage="No users found."
        />
      </div>

      {selectedUserId && (
        <UserDetailModal
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
          onRoleChange={handleRoleChange}
          onAdminToggle={handleAdminToggle}
          onStatusToggle={handleStatusToggle}
        />
      )}
    </div>
  );
}
