import { useState, useCallback } from 'react';
import { Avatar } from '../../../components/ui/Avatar/Avatar';
import { Badge } from '../../../components/ui/Badge/Badge';
import { Button } from '../../../components/ui/Button/Button';
import { Input } from '../../../components/ui/Input/Input';
import { Skeleton } from '../../../components/ui/Skeleton/Skeleton';
import { useToast } from '../../../components/ui/Toast/Toast';
import { useOrganizationDetail } from '../../../hooks/queries/useOrganization';
import {
  useTeamMembers,
  useTeamInvitations,
  useUpdateMemberRole,
  useRemoveMember,
  useCancelInvitation,
  useInviteUsers,
} from '../../../hooks/queries/useTeam';
import type { OrganizationMember } from '../../../types/database.types';
import styles from './Team.module.css';

const roles = ['owner', 'admin', 'manager', 'analyst', 'viewer'] as const;

const roleBadgeConfig: Record<string, { variant: 'purple' | 'success' | 'warning' | 'neutral'; style?: React.CSSProperties }> = {
  owner: { variant: 'purple' },
  admin: { variant: 'success' },
  manager: { variant: 'success', style: { background: 'rgba(20, 184, 166, 0.10)', color: '#14b8a6' } },
  analyst: { variant: 'warning' },
  viewer: { variant: 'neutral' },
};

const statusBadgeConfig: Record<string, 'success' | 'warning' | 'error' | 'neutral'> = {
  active: 'success',
  invited: 'warning',
  suspended: 'error',
};

interface InviteRow {
  id: number;
  email: string;
  role: string;
}

function timeAgo(iso: string | null): string {
  if (!iso) return 'Never';
  const diffMs = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diffMs / 86400000);
  if (days < 1) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

function messageFrom(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

export function Team() {
  const { addToast } = useToast();

  const orgQuery = useOrganizationDetail();
  const orgId = orgQuery.data?.id ?? null;
  const canEdit = !!orgQuery.data?.canEdit;

  const membersQuery = useTeamMembers(orgId);
  const invitationsQuery = useTeamInvitations(orgId);

  const members = membersQuery.data ?? [];
  const invitations = invitationsQuery.data ?? [];

  const updateMemberRoleMutation = useUpdateMemberRole();
  const removeMemberMutation = useRemoveMember();
  const cancelInvitationMutation = useCancelInvitation();
  const inviteUsersMutation = useInviteUsers();

  const [inviteRows, setInviteRows] = useState<InviteRow[]>([{ id: 1, email: '', role: 'viewer' }]);
  const [nextId, setNextId] = useState(2);

  const isLoading =
    orgQuery.isPending ||
    (!!orgId && (membersQuery.isPending || invitationsQuery.isPending));

  function addRow() {
    if (inviteRows.length >= 5) return;
    setInviteRows((prev) => [...prev, { id: nextId, email: '', role: 'viewer' }]);
    setNextId((p) => p + 1);
  }

  function updateRow(id: number, field: 'email' | 'role', value: string) {
    setInviteRows((prev) => prev.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  }

  function removeRow(id: number) {
    setInviteRows((prev) => prev.filter((row) => row.id !== id));
  }

  const handleSendInvites = useCallback(async () => {
    if (!orgId) return;
    const validRows = inviteRows.filter((r) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email));
    if (validRows.length === 0) {
      addToast('Enter at least one valid email', 'error');
      return;
    }

    try {
      const { sent, failed } = await inviteUsersMutation.mutateAsync({
        orgId,
        invites: validRows.map((r) => ({ email: r.email, role: r.role })),
      });
      if (failed.length > 0) {
        addToast(`${failed.length} invitation(s) failed: ${failed[0].error}`, 'error');
      } else {
        addToast(`${sent} invitation(s) sent`, 'success');
      }
      setInviteRows([{ id: 1, email: '', role: 'viewer' }]);
      setNextId(2);
    } catch (err) {
      addToast(messageFrom(err, 'Failed to send invitations'), 'error');
    }
  }, [orgId, inviteRows, addToast, inviteUsersMutation]);

  const handleCancelInvite = useCallback(async (id: string) => {
    try {
      await cancelInvitationMutation.mutateAsync(id);
      addToast('Invitation cancelled', 'success');
    } catch (err) {
      addToast(messageFrom(err, 'Failed to cancel invitation'), 'error');
    }
  }, [addToast, cancelInvitationMutation]);

  const handleRoleChange = useCallback(async (memberId: string, role: string) => {
    try {
      await updateMemberRoleMutation.mutateAsync({ memberId, role: role as OrganizationMember['role'] });
      addToast('Role updated', 'success');
    } catch (err) {
      addToast(messageFrom(err, 'Failed to update role'), 'error');
    }
  }, [addToast, updateMemberRoleMutation]);

  const handleRemoveMember = useCallback(async (memberId: string) => {
    try {
      await removeMemberMutation.mutateAsync(memberId);
      addToast('Member removed', 'success');
    } catch (err) {
      addToast(messageFrom(err, 'Failed to remove member'), 'error');
    }
  }, [addToast, removeMemberMutation]);

  if (isLoading) {
    return (
      <div className={styles.page}>
        <Skeleton height="32px" width="220px" />
        <div style={{ marginTop: 24 }}><Skeleton height="200px" /></div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.heading}>Team Members</h1>
      </div>

      <section>
        <h2 className={styles.sectionTitle}>Team Members</h2>
        <div className={styles.card}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Status</th>
                <th>Last Active</th>
                {canEdit && <th></th>}
              </tr>
            </thead>
            <tbody>
              {members.length > 0 ? (
                members.map((member) => (
                  <tr key={member.id}>
                    <td>
                      <div className={styles.memberCell}>
                        <Avatar name={member.user?.full_name || member.user?.email || '?'} src={member.user?.avatar_url ?? undefined} size="sm" />
                        <div>
                          <div className={styles.memberName}>{member.user?.full_name || '—'}</div>
                          <div className={styles.memberEmail}>{member.user?.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      {canEdit && member.role !== 'owner' ? (
                        <select
                          className={styles.select}
                          value={member.role}
                          onChange={(e) => handleRoleChange(member.id, e.target.value)}
                        >
                          {roles.filter((r) => r !== 'owner').map((r) => (
                            <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                          ))}
                        </select>
                      ) : (
                        <Badge variant={roleBadgeConfig[member.role]?.variant ?? 'neutral'}>
                          <span style={roleBadgeConfig[member.role]?.style}>
                            {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                          </span>
                        </Badge>
                      )}
                    </td>
                    <td>
                      <Badge variant={statusBadgeConfig[member.status] ?? 'neutral'}>
                        {member.status.charAt(0).toUpperCase() + member.status.slice(1)}
                      </Badge>
                    </td>
                    <td>{timeAgo(member.last_active_at)}</td>
                    {canEdit && (
                      <td>
                        {member.role !== 'owner' && (
                          <button className={styles.actionsBtn} type="button" title="Remove" onClick={() => handleRemoveMember(member.id)}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="18" y1="6" x2="6" y2="18" />
                              <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--color-text-muted)' }}>
                    No team members
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className={styles.sectionTitle}>Pending Invitations</h2>
        <div className={styles.card}>
          {invitations.length > 0 ? (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Expires</th>
                  {canEdit && <th></th>}
                </tr>
              </thead>
              <tbody>
                {invitations.map((inv) => (
                  <tr key={inv.id}>
                    <td>{inv.email}</td>
                    <td>
                      <Badge variant={roleBadgeConfig[inv.role]?.variant ?? 'neutral'}>
                        {inv.role.charAt(0).toUpperCase() + inv.role.slice(1)}
                      </Badge>
                    </td>
                    <td>{new Date(inv.expires_at).toLocaleDateString()}</td>
                    {canEdit && (
                      <td>
                        <button className={styles.removeBtn} type="button" onClick={() => handleCancelInvite(inv.id)}>
                          Cancel
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <polyline points="22,7 12,13 2,7" />
                </svg>
              </span>
              <p>No pending invitations</p>
            </div>
          )}
        </div>
      </section>

      {canEdit && (
        <section>
          <h2 className={styles.sectionTitle}>Invite New Members</h2>
          <div className={styles.card}>
            {inviteRows.map((row) => (
              <div className={styles.inviteRow} key={row.id}>
                <div className={styles.inviteEmail}>
                  <Input
                    placeholder="email@company.com"
                    value={row.email}
                    onChange={(e) => updateRow(row.id, 'email', e.target.value)}
                  />
                </div>
                <div className={styles.inviteRole}>
                  <select
                    className={styles.select}
                    value={row.role}
                    onChange={(e) => updateRow(row.id, 'role', e.target.value)}
                  >
                    {roles.filter((r) => r !== 'owner').map((role) => (
                      <option key={role} value={role}>
                        {role.charAt(0).toUpperCase() + role.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                {inviteRows.length > 1 && (
                  <button className={styles.removeBtn} onClick={() => removeRow(row.id)} type="button" title="Remove">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
            {inviteRows.length < 5 && (
              <button className={styles.addLink} onClick={addRow} type="button">
                + Add another
              </button>
            )}
            <div style={{ marginTop: 20 }}>
              <Button isLoading={inviteUsersMutation.isPending} onClick={handleSendInvites}>Send Invitations</Button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
