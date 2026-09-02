import { useState, useEffect } from 'react';
import { Plus, History, X, AlertTriangle, ArrowRight, RefreshCw } from 'lucide-react';
import { adminService, type ModelPricing, type PricingAuditLog } from '../../../api/services/admin.service';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card/Card';
import { DataTable } from '../../../components/ui/DataTable/DataTable';
import styles from './ModelPricing.module.css';

export function ModelPricingPage() {
  const [pricing, setPricing] = useState<ModelPricing[]>([]);
  const [auditLog, setAuditLog] = useState<PricingAuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState<ModelPricing | null>(null);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState<{ action: string, message: string, onConfirm: () => void } | null>(null);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [customProviders, setCustomProviders] = useState([{ providerName: '', url: '' }]);
  const [isSyncing, setIsSyncing] = useState(false);

  const fetchPricing = async () => {
    try {
      const data = await adminService.getPricing();
      setPricing(data);
    } catch (err) {
      console.error('Failed to fetch pricing:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPricing();
  }, []);

  const handleFetchAuditLog = async () => {
    try {
      const data = await adminService.getPricingAuditLog();
      setAuditLog(data);
      setShowAuditModal(true);
    } catch (err) {
      console.error('Failed to fetch audit log:', err);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const provider = formData.get('provider') as string;
    const model = formData.get('model') as string;
    const inputCost = parseFloat(formData.get('input_cost') as string);
    const outputCost = parseFloat(formData.get('output_cost') as string);

    setShowConfirmModal({
      action: 'Create Pricing',
      message: `Are you sure you want to add ${provider}/${model} at $${inputCost} / $${outputCost}?`,
      onConfirm: async () => {
        try {
          await adminService.createPricing({ provider, model, input_cost_per_1k: inputCost, output_cost_per_1k: outputCost });
          setShowAddModal(false);
          setShowConfirmModal(null);
          fetchPricing();
        } catch (err) {
          console.error('Create failed', err);
        }
      }
    });
  };

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!showEditModal) return;
    
    const formData = new FormData(e.currentTarget);
    const inputCost = parseFloat(formData.get('input_cost') as string);
    const outputCost = parseFloat(formData.get('output_cost') as string);

    setShowConfirmModal({
      action: 'Update Pricing',
      message: `Are you sure you want to update ${showEditModal.model} to $${inputCost} / $${outputCost}?`,
      onConfirm: async () => {
        try {
          await adminService.updatePricing(showEditModal.id, { input_cost_per_1k: inputCost, output_cost_per_1k: outputCost });
          setShowEditModal(null);
          setShowConfirmModal(null);
          fetchPricing();
        } catch (err) {
          console.error('Update failed', err);
        }
      }
    });
  };

  const handleDelete = (id: string, modelName: string) => {
    setShowConfirmModal({
      action: 'Deactivate Model',
      message: `Are you sure you want to deactivate ${modelName}? This cannot be undone from the UI.`,
      onConfirm: async () => {
        try {
          await adminService.deletePricing(id);
          setShowConfirmModal(null);
          fetchPricing();
        } catch (err) {
          console.error('Delete failed', err);
        }
      }
    });
  };

  const handleSyncCustomUrls = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSyncing(true);
    try {
      const validProviders = customProviders.filter(p => p.providerName.trim() !== '' && p.url.trim() !== '');
      if (validProviders.length === 0) {
        alert('Please add at least one valid provider and URL.');
        setIsSyncing(false);
        return;
      }

      const result = await adminService.syncCustomUrlsPricing(validProviders);
      
      let alertMsg = '';
      
      // If nothing was updated or inserted
      if (result.updatedCount === 0 && result.insertedCount === 0) {
        alertMsg += 'Results are same so nothing is changed.\n\n';
        result.providerResults.forEach(pr => {
          if (pr.unchanged > 0) {
            alertMsg += `${pr.providerName} ${pr.unchanged} models are unchanged.\n`;
          }
        });
      } else {
        alertMsg += `Sync Complete!\n\nOverall: Updated: ${result.updatedCount}, New: ${result.insertedCount}\n\n`;
        result.providerResults.forEach(pr => {
          if (pr.unchanged > 0) {
            alertMsg += `${pr.providerName} ${pr.unchanged} models are unchanged.\n`;
          }
          if (pr.updated > 0) {
            alertMsg += `${pr.providerName} ${pr.updated} models are updated.\n`;
          }
          if (pr.newModels > 0) {
            alertMsg += `${pr.providerName} ${pr.newModels} models are added as new.\n`;
          }
        });
      }

      if (result.failedProviders && result.failedProviders.length > 0) {
        alertMsg += `\nFailed Providers: ${result.failedProviders.map(p => p.providerName).join(', ')}`;
      }
      
      alert(alertMsg);
      setShowSyncModal(false);
      setCustomProviders([{ providerName: '', url: '' }]);
      fetchPricing();
    } catch (err) {
      console.error('Sync failed', err);
      alert('Failed to sync pricing: ' + (err as any).message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAddCustomProvider = () => {
    setCustomProviders([...customProviders, { providerName: '', url: '' }]);
  };

  const handleCustomProviderChange = (index: number, field: 'providerName' | 'url', value: string) => {
    const updated = [...customProviders];
    updated[index][field] = value;
    setCustomProviders(updated);
  };

  const handleRemoveCustomProvider = (index: number) => {
    const updated = customProviders.filter((_, i) => i !== index);
    setCustomProviders(updated);
  };

  const columns = [
    { header: 'Provider', accessorKey: 'provider' },
    { header: 'Model', accessorKey: 'model' },
    { 
      header: 'Input Cost ($ / 1k)', 
      accessorKey: 'input_cost_per_1k',
      cell: (val: number) => `$${val.toFixed(4)}`
    },
    { 
      header: 'Output Cost ($ / 1k)', 
      accessorKey: 'output_cost_per_1k',
      cell: (val: number) => `$${val.toFixed(4)}`
    },
    { 
      header: 'Status', 
      accessorKey: 'is_active',
      cell: (val: boolean) => (
        <span className={`${styles.badge} ${val ? styles.badgeCreated : styles.badgeDeactivated}`}>
          {val ? 'Active' : 'Inactive'}
        </span>
      )
    },
    {
      header: 'Actions',
      accessorKey: 'id',
      cell: (id: string, row: ModelPricing) => (
        <div className={styles.actions}>
          <button 
            className={styles.btnSecondary} 
            onClick={() => setShowEditModal(row)}
            disabled={!row.is_active}
          >
            Edit
          </button>
          <button 
            className={styles.btnDanger} 
            onClick={() => handleDelete(id, row.model)}
            disabled={!row.is_active}
          >
            Deactivate
          </button>
        </div>
      )
    }
  ];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Model Pricing</h1>
          <p className={styles.subtitle}>Manage global API costs for all organizations.</p>
        </div>
        <div className={styles.actions}>
          <button 
            className={styles.btnSecondary} 
            onClick={() => setShowSyncModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <RefreshCw size={16} /> 
            Sync Pricing from URLs
          </button>
          <button className={styles.btnSecondary} onClick={handleFetchAuditLog}>
            <History size={16} /> Audit Log
          </button>
          <button className={styles.btnPrimary} onClick={() => setShowAddModal(true)}>
            <Plus size={16} /> Add Model
          </button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current Rates</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable 
            data={pricing} 
            columns={columns} 
            isLoading={isLoading} 
          />
        </CardContent>
      </Card>

      {/* ADD MODAL */}
      {showAddModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>Add Model Pricing</h2>
              <button className={styles.closeBtn} onClick={() => setShowAddModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleAddSubmit}>
              <div className={styles.modalBody}>
                <div className={styles.formGroup}>
                  <label>Provider</label>
                  <select name="provider" required>
                    <option value="openai">OpenAI</option>
                    <option value="anthropic">Anthropic</option>
                    <option value="google">Google</option>
                    <option value="azure">Azure</option>
                    <option value="cohere">Cohere</option>
                    <option value="mistral">Mistral</option>
                    <option value="replicate">Replicate</option>
                    <option value="bedrock">AWS Bedrock</option>
                    <option value="groq">Groq</option>
                    <option value="huggingface">HuggingFace</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>Model Name (Exact ID)</label>
                  <input type="text" name="model" required placeholder="e.g. gpt-4o" />
                </div>
                <div className={styles.formGroup}>
                  <label>Input Cost (per 1k tokens in USD)</label>
                  <input type="number" name="input_cost" step="0.000001" min="0" required placeholder="0.005" />
                </div>
                <div className={styles.formGroup}>
                  <label>Output Cost (per 1k tokens in USD)</label>
                  <input type="number" name="output_cost" step="0.000001" min="0" required placeholder="0.015" />
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={styles.btnSecondary} onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className={styles.btnPrimary}>Save Pricing</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {showEditModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>Edit {showEditModal.model}</h2>
              <button className={styles.closeBtn} onClick={() => setShowEditModal(null)}><X size={20} /></button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className={styles.modalBody}>
                <div className={styles.formGroup}>
                  <label>Input Cost (per 1k tokens in USD)</label>
                  <input type="number" name="input_cost" step="0.000001" min="0" required defaultValue={showEditModal.input_cost_per_1k} />
                </div>
                <div className={styles.formGroup}>
                  <label>Output Cost (per 1k tokens in USD)</label>
                  <input type="number" name="output_cost" step="0.000001" min="0" required defaultValue={showEditModal.output_cost_per_1k} />
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={styles.btnSecondary} onClick={() => setShowEditModal(null)}>Cancel</button>
                <button type="submit" className={styles.btnPrimary}>Update Pricing</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL (Required by prompt constraints) */}
      {showConfirmModal && (
        <div className={styles.modalOverlay} style={{ zIndex: 1100 }}>
          <div className={styles.modalContent} style={{ maxWidth: 400 }}>
            <div className={styles.modalHeader} style={{ borderBottom: 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#ef4444' }}>
                <AlertTriangle size={24} />
                <h2>{showConfirmModal.action}</h2>
              </div>
            </div>
            <div className={styles.modalBody}>
              <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.5, margin: 0 }}>
                {showConfirmModal.message}
              </p>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.btnSecondary} onClick={() => setShowConfirmModal(null)}>Cancel</button>
              <button className={styles.btnPrimary} style={{ background: '#ef4444' }} onClick={showConfirmModal.onConfirm}>Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* SYNC FROM CUSTOM URLS MODAL */}
      {showSyncModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent} style={{ maxWidth: 600 }}>
            <div className={styles.modalHeader}>
              <h2>Sync Pricing from URLs (AI Agent)</h2>
              <button className={styles.closeBtn} onClick={() => setShowSyncModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSyncCustomUrls}>
              <div className={styles.modalBody} style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                <p style={{ marginBottom: 15, fontSize: 14, color: 'var(--color-text-secondary)' }}>
                  Add the provider names and their official pricing URLs. The AI agent will visit these URLs, extract the pricing for all models found, and update the database automatically.
                </p>
                
                {customProviders.map((provider, index) => (
                  <div key={index} style={{ display: 'flex', gap: 10, marginBottom: 15, alignItems: 'flex-start' }}>
                    <div className={styles.formGroup} style={{ flex: 1, marginBottom: 0 }}>
                      <input 
                        type="text" 
                        placeholder="Provider Name (e.g. OpenAI)" 
                        value={provider.providerName}
                        onChange={(e) => handleCustomProviderChange(index, 'providerName', e.target.value)}
                        required
                      />
                    </div>
                    <div className={styles.formGroup} style={{ flex: 2, marginBottom: 0 }}>
                      <input 
                        type="url" 
                        placeholder="Pricing URL (e.g. https://openai.com/api/pricing/)" 
                        value={provider.url}
                        onChange={(e) => handleCustomProviderChange(index, 'url', e.target.value)}
                        required
                      />
                    </div>
                    {customProviders.length > 1 && (
                      <button 
                        type="button" 
                        className={styles.btnDanger}
                        style={{ padding: '8px', height: '38px', marginTop: '2px' }}
                        onClick={() => handleRemoveCustomProvider(index)}
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                ))}
                
                <button 
                  type="button" 
                  className={styles.btnSecondary}
                  onClick={handleAddCustomProvider}
                  style={{ width: '100%', marginTop: 10, display: 'flex', justifyContent: 'center', gap: 8 }}
                >
                  <Plus size={16} /> Add More
                </button>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={styles.btnSecondary} onClick={() => setShowSyncModal(false)} disabled={isSyncing}>Cancel</button>
                <button type="submit" className={styles.btnPrimary} disabled={isSyncing} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {isSyncing && <RefreshCw size={16} className={styles.spin} />}
                  {isSyncing ? 'Scraping and Syncing...' : 'Start Sync'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AUDIT LOG MODAL */}
      {showAuditModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent} style={{ maxWidth: 900 }}>
            <div className={styles.modalHeader}>
              <h2>Pricing Audit Log</h2>
              <button className={styles.closeBtn} onClick={() => setShowAuditModal(false)}><X size={20} /></button>
            </div>
            <div className={styles.modalBody} style={{ maxHeight: '60vh', overflowY: 'auto', padding: 0 }}>
              <table className={styles.auditTable}>
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Model</th>
                    <th>Action</th>
                    <th>Changes</th>
                    <th>User</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLog.map(log => (
                    <tr key={log.id}>
                      <td style={{ whiteSpace: 'nowrap' }}>{new Date(log.changed_at).toLocaleString()}</td>
                      <td><strong>{log.provider}</strong><br/>{log.model_name}</td>
                      <td>
                        <span className={`${styles.badge} ${log.action === 'created' ? styles.badgeCreated : log.action === 'updated' ? styles.badgeUpdated : styles.badgeDeactivated}`}>
                          {log.action}
                        </span>
                      </td>
                      <td>
                        {log.action === 'updated' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <div className={styles.priceChange}>
                              In: <span className={styles.oldPrice}>${log.old_input_cost}</span> <ArrowRight size={12}/> <span className={styles.newPrice}>${log.new_input_cost}</span>
                            </div>
                            <div className={styles.priceChange}>
                              Out: <span className={styles.oldPrice}>${log.old_output_cost}</span> <ArrowRight size={12}/> <span className={styles.newPrice}>${log.new_output_cost}</span>
                            </div>
                          </div>
                        )}
                        {log.action === 'created' && (
                          <div style={{ color: 'var(--color-text-secondary)' }}>
                            In: ${log.new_input_cost} | Out: ${log.new_output_cost}
                          </div>
                        )}
                      </td>
                      <td style={{ fontSize: 12 }}>{log.changed_by_email}</td>
                    </tr>
                  ))}
                  {auditLog.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: 30 }}>No audit logs found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
