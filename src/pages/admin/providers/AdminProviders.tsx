import { useState } from 'react';
import { Plus, Trash2, Edit } from 'lucide-react';
import { Button } from '../../../components/ui/Button/Button';
import { Modal } from '../../../components/ui/Modal/Modal';
import { Input } from '../../../components/ui/Input/Input';
import { DataTable } from '../../../components/ui/DataTable/DataTable';
import {
  useAdminProviders,
  useCreateProvider,
  useUpdateProvider,
  useDeleteProvider,
} from '../../../hooks/queries/admin/useAdminProviders';
import type { ProviderData } from '../../../api/services/admin.service';
import { ApiError } from '../../../lib/axios';
import styles from '../integrations/AdminIntegrations.module.css'; // Reusing styles

export function AdminProvidersPage() {
  const { data: providers = [], isLoading } = useAdminProviders();
  const createProvider = useCreateProvider();
  const updateProvider = useUpdateProvider();
  const deleteProvider = useDeleteProvider();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [providerId, setProviderId] = useState('');
  const [color, setColor] = useState('#74aa9c');
  const [isActive, setIsActive] = useState(true);

  const isSaving = createProvider.isPending || updateProvider.isPending;

  const openAddModal = () => {
    setEditingId(null);
    setName('');
    setProviderId('');
    setColor('#74aa9c');
    setIsActive(true);
    setIsModalOpen(true);
  };

  const openEditModal = (provider: ProviderData) => {
    setEditingId(provider.id);
    setName(provider.name);
    setProviderId(provider.provider_id);
    setColor(provider.color);
    setIsActive(provider.is_active);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    const payload = { name, provider_id: providerId, color, is_active: isActive };
    try {
      if (editingId) {
        await updateProvider.mutateAsync({ id: editingId, payload });
      } else {
        await createProvider.mutateAsync(payload);
      }
      setIsModalOpen(false);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : 'Failed to save provider';
      alert('Error: ' + message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this provider? This will break integrations using this provider.')) return;
    try {
      await deleteProvider.mutateAsync(id);
    } catch (err) {
      console.error(err);
    }
  };

  const columns = [
    {
      header: 'Name',
      accessorKey: 'name',
      cell: (val: string, row: any) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: 24, height: 24, borderRadius: '4px', background: row.color,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#000', fontWeight: 'bold', fontSize: '12px'
          }}>
            {val.charAt(0)}
          </div>
          {val}
        </div>
      )
    },
    { header: 'Provider ID', accessorKey: 'provider_id' },
    {
      header: 'Status',
      accessorKey: 'is_active',
      cell: (val: boolean) => (
        <span className={`${styles.badge} ${val ? styles.badgeActive : styles.badgeInactive}`}>
          {val ? 'Active' : 'Inactive'}
        </span>
      )
    },
    {
      header: 'Actions',
      accessorKey: 'id',
      cell: (id: string, row: any) => (
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="secondary" size="sm" onClick={() => openEditModal(row)}>
            <Edit size={14} /> Edit
          </Button>
          <Button variant="danger" size="sm" onClick={() => handleDelete(id)}>
            <Trash2 size={14} /> Delete
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>AI Providers</h1>
          <p className={styles.subtitle}>
            Manage global AI providers available for users to connect.
          </p>
        </div>
        <Button onClick={openAddModal}>
          <Plus size={16} /> Add Provider
        </Button>
      </div>

      <div className={styles.tableCard}>
        <DataTable
          data={providers}
          columns={columns}
          isLoading={isLoading}
          emptyMessage="No AI providers found."
        />
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Edit AI Provider' : 'Add AI Provider'}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '12px' }}>
          <Input
            label="Provider Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., DeepSeek"
          />
          <Input
            label="Provider ID (used in API)"
            value={providerId}
            onChange={(e) => setProviderId(e.target.value)}
            placeholder="e.g., deepseek"
          />
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Icon Color</label>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              style={{ width: '100%', height: '40px', padding: '0', cursor: 'pointer' }}
            />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            Active (visible to users)
          </label>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '12px' }}>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} isLoading={isSaving}>{editingId ? 'Save Changes' : 'Create Provider'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
