import { useState } from 'react';
import { axiosClient } from '../../../../lib/axios';
import { Download, RefreshCw, AlertTriangle, Loader2 } from 'lucide-react';
import styles from './PortkeyDashboard.module.css';

// Pre-defined list of common providers on Portkey
const PROVIDERS = [
  'All', 'OpenAI', 'Anthropic', 'Google', 'AWS Bedrock', 'Azure OpenAI',
  'Google Vertex AI', 'Together AI', 'OpenRouter', 'Fireworks AI',
  'Predibase', 'DeepSeek', 'Mistral', 'Cohere', 'AI21',
  'Groq', 'Perplexity', 'Baseten', 'Nomic', 'Anyscale'
];

interface FetchedModel {
  providerName: string;
  modelName: string;
  endpoint?: string;
  promptPrice: string;
  completionPrice: string;
}

export function PortkeyDashboard() {
  const [selectedProvider, setSelectedProvider] = useState<string>('All');
  const [customProvider, setCustomProvider] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [models, setModels] = useState<FetchedModel[]>([]);

  const handleFetch = async () => {
    const providerToFetch = selectedProvider === 'custom' ? customProvider : selectedProvider;
    if (!providerToFetch) {
      setError('Please select or enter a provider name.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await axiosClient.post('/api/admin/pricing/portkey-fetch', {
        provider: providerToFetch,
      });
      setModels(response.data.models || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch data.');
    } finally {
      setIsLoading(false);
    }
  };

  const exportToCSV = () => {
    if (models.length === 0) return;
    const headers = ['Provider', 'Model Name', 'Endpoint', 'Input Price (per 1M)', 'Output Price (per 1M)'];
    const csvContent = [
      headers.join(','),
      ...models.map(m =>
        `"${m.providerName}","${m.modelName}","${m.endpoint || 'chat'}","${m.promptPrice}","${m.completionPrice}"`
      ),
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `portkey-pricing-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Portkey Pricing Fetcher</h1>
          <p className={styles.subtitle}>Scrape live pricing directly from Portkey Catalog</p>
        </div>
        <button
          className={styles.exportBtn}
          onClick={exportToCSV}
          disabled={models.length === 0}
        >
          <Download size={16} />
          Export CSV
        </button>
      </div>

      {/* Controls */}
      <div className={styles.controlCard}>
        <div className={styles.inputGroup}>
          <label className={styles.label}>Select Provider</label>
          <div className={styles.providerRow}>
            <select
              className={styles.select}
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
            >
              {PROVIDERS.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
              <option value="custom">Custom (Type below)...</option>
            </select>

            {selectedProvider === 'custom' && (
              <input
                type="text"
                placeholder="e.g. together-ai"
                className={styles.input}
                value={customProvider}
                onChange={(e) => setCustomProvider(e.target.value)}
              />
            )}

            <button
              className={styles.fetchBtn}
              onClick={handleFetch}
              disabled={isLoading}
            >
              {isLoading
                ? <><Loader2 size={16} className={styles.spin} /> Fetching...</>
                : <><RefreshCw size={16} /> Fetch Models</>
              }
            </button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className={styles.errorAlert}>
          <AlertTriangle size={18} />
          {error}
        </div>
      )}

      {/* Results */}
      <div className={styles.dataCard}>
        <div className={styles.dataCardHeader}>
          Results ({models.length})
        </div>
        {isLoading ? (
          <div className={styles.loadingState}>
            <Loader2 size={36} className={styles.spin} />
            <p>Scraping with Apify &amp; Atria LLM... (this may take 30–60 seconds)</p>
          </div>
        ) : models.length > 0 ? (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Provider</th>
                  <th>Model</th>
                  <th>Endpoint</th>
                  <th>Input ($/1M)</th>
                  <th>Output ($/1M)</th>
                </tr>
              </thead>
              <tbody>
                {models.map((m, i) => (
                  <tr key={i}>
                    <td>{m.providerName}</td>
                    <td><code>{m.modelName}</code></td>
                    <td>{m.endpoint || 'chat'}</td>
                    <td>{m.promptPrice}</td>
                    <td>{m.completionPrice}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className={styles.emptyState}>
            <p>No data fetched yet. Select a provider and click Fetch.</p>
          </div>
        )}
      </div>
    </div>
  );
}
