import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../../components/ui/Card/Card';
import { DataTable } from '../../../../components/ui/DataTable/DataTable';
import { Button } from '../../../../components/ui/Button/Button';
import { Spinner } from '../../../../components/ui/Spinner/Spinner';
import { Download, RefreshCw, AlertTriangle } from 'lucide-react';
import styles from './PortkeyDashboard.module.css';

// Pre-defined list of common providers on Portkey based on docs
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
      // In a real implementation this will point to your backend url if different
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      
      const token = localStorage.getItem('supabase.auth.token');
      // If we use supabase auth session:
      const authHeader = token ? { Authorization: `Bearer ${JSON.parse(token).access_token}` } : {};

      const response = await fetch(`${API_URL}/admin/pricing/portkey-fetch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader
        },
        body: JSON.stringify({ provider: providerToFetch })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch from Portkey');
      }

      setModels(data.models || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const exportToCSV = () => {
    if (models.length === 0) return;
    
    const headers = ['Provider', 'Model Name', 'Endpoint', 'Input Price (per 1M)', 'Output Price (per 1M)'];
    const csvContent = [
      headers.join(','),
      ...models.map(m => `"${m.providerName}","${m.modelName}","${m.endpoint || 'chat'}","${m.promptPrice}","${m.completionPrice}"`)
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

  const columns = [
    { header: 'Provider', accessor: 'providerName' as keyof FetchedModel },
    { header: 'Model', accessor: 'modelName' as keyof FetchedModel },
    { header: 'Endpoint', accessor: 'endpoint' as keyof FetchedModel },
    { header: 'Input Price ($/1M)', accessor: 'promptPrice' as keyof FetchedModel },
    { header: 'Output Price ($/1M)', accessor: 'completionPrice' as keyof FetchedModel },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Portkey Pricing Fetcher</h1>
          <p className={styles.subtitle}>Scrape live pricing directly from Portkey Catalog</p>
        </div>
        <Button onClick={exportToCSV} disabled={models.length === 0} variant="outline" className={styles.exportBtn}>
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <Card className={styles.controlCard}>
        <CardContent className={styles.controlContent}>
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

              <Button onClick={handleFetch} disabled={isLoading} className={styles.fetchBtn}>
                {isLoading ? <Spinner size="sm" className="mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                Fetch Models
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className={styles.errorAlert}>
          <AlertTriangle className="w-5 h-5 mr-2" />
          {error}
        </div>
      )}

      <Card className={styles.dataCard}>
        <CardHeader>
          <CardTitle>Results ({models.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className={styles.loadingState}>
              <Spinner size="lg" />
              <p>Scraping with Apify & Atria LLM...</p>
            </div>
          ) : models.length > 0 ? (
            <DataTable 
              columns={columns} 
              data={models} 
            />
          ) : (
            <div className={styles.emptyState}>
              <p>No data fetched yet. Select a provider and click Fetch.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
