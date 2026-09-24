import { useState, useRef, useEffect } from 'react';
import { axiosClient } from '../../../../lib/axios';
import { Terminal, Download, Loader2, Database } from 'lucide-react';
import styles from './PortkeyDashboard.module.css';

interface FetchedModel {
  provider: string;
  model: string;
  input_usd_per_1k: number | null;
  output_usd_per_1k: number | null;
  cache_read_usd_per_1k: number | null;
  cache_write_usd_per_1k: number | null;
}

export function PortkeyDashboard() {
  const [command, setCommand] = useState('');
  const [logs, setLogs] = useState<string[]>(['Welcome to Pricing Sync Terminal.', 'Type "help" for a list of commands.']);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [models, setModels] = useState<FetchedModel[]>([]);
  const [lastSyncedSource, setLastSyncedSource] = useState<'portkey' | 'openrouter' | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll terminal
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, msg]);
  };

  const runSync = async (source: 'portkey' | 'openrouter') => {
    if (isSyncing) return;
    setIsSyncing(true);
    setModels([]);
    setLastSyncedSource(null);
    
    addLog(`> ${source === 'portkey' ? 'sync' : 'openrouter sync'}`);
    addLog(`Initiating sync with ${source === 'portkey' ? 'Portkey GitHub repository' : 'OpenRouter API'}...`);
    addLog('Please wait, this might take up to 60 seconds...');

    try {
      const endpoint = source === 'portkey' 
        ? '/api/admin/pricing/run-portkey-sync' 
        : '/api/admin/pricing/run-openrouter-sync';
        
      const response = await axiosClient.post(endpoint);
      
      if (response.data.logs) {
        response.data.logs.forEach((logLine: string) => addLog(logLine));
      }
      
      if (response.data.models) {
        setModels(response.data.models);
        setLastSyncedSource(source);
        addLog(`\n✅ Sync complete. Successfully loaded ${response.data.models.length} models.`);
      }
    } catch (err: any) {
      addLog(`\n❌ Error: ${err.message || 'Failed to execute sync script.'}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const runApply = async (sourceOverride?: 'portkey' | 'openrouter') => {
    if (isApplying) return;
    
    const sourceToApply = sourceOverride || lastSyncedSource;
    
    if (!sourceToApply || models.length === 0) {
      addLog(`> ${sourceOverride === 'openrouter' ? 'openrouter apply' : 'apply'}`);
      addLog('❌ Error: No synced models found to apply. Run "sync" or "openrouter sync" first.');
      return;
    }

    setIsApplying(true);
    addLog(`> ${sourceToApply === 'portkey' ? 'apply' : 'openrouter apply'}`);
    addLog(`Analyzing differences and applying ${sourceToApply} updates to database...`);
    
    try {
      const endpoint = sourceToApply === 'portkey' 
        ? '/api/admin/pricing/apply-portkey-sync'
        : '/api/admin/pricing/apply-openrouter-sync';
        
      const response = await axiosClient.post(endpoint);
      
      if (response.data.success) {
        addLog(`✅ Auto-Apply Complete!`);
        addLog(`- ${response.data.updatedCount} existing models updated`);
        addLog(`- ${response.data.insertedCount} new models added`);
        addLog(`Total models processed: ${response.data.totalProcessed}`);
      } else {
        addLog(`❌ Failed: ${response.data.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      addLog(`❌ Error: ${err.message || 'Failed to apply to DB.'}`);
    } finally {
      setIsApplying(false);
    }
  };

  const handleCommand = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = command.trim().toLowerCase();
    setCommand('');

    if (!cmd) return;

    if (cmd === 'clear') {
      setLogs([]);
      setModels([]);
      setLastSyncedSource(null);
    } else if (cmd === 'help') {
      addLog('> help');
      addLog('Available commands:');
      addLog('  sync              - Fetch pricing from Portkey GitHub');
      addLog('  apply             - Apply synced Portkey models to database');
      addLog('  openrouter sync   - Fetch pricing from OpenRouter API');
      addLog('  openrouter apply  - Apply synced OpenRouter models to database');
      addLog('  clear             - Clear the terminal and data table');
      addLog('  help              - Show this help message');
    } else if (cmd === 'sync') {
      runSync('portkey');
    } else if (cmd === 'openrouter sync') {
      runSync('openrouter');
    } else if (cmd === 'apply') {
      runApply('portkey');
    } else if (cmd === 'openrouter apply') {
      runApply('openrouter');
    } else {
      addLog(`> ${cmd}`);
      addLog(`Unknown command: ${cmd}. Type "help" for a list of commands.`);
    }
  };

  const exportToCSV = () => {
    if (models.length === 0) return;
    const headers = ['Provider', 'Model', 'Input ($/1K)', 'Output ($/1K)', 'Cache Read ($/1K)', 'Cache Write ($/1K)'];
    const csvContent = [
      headers.join(','),
      ...models.map(m => 
        `"${m.provider}","${m.model}",${m.input_usd_per_1k || ''},${m.output_usd_per_1k || ''},${m.cache_read_usd_per_1k || ''},${m.cache_write_usd_per_1k || ''}`
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
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Pricing Sync Terminal</h1>
          <p className={styles.subtitle}>Unified Hub for Portkey & OpenRouter Pricing</p>
        </div>
        <div className={styles.headerActions}>
          <button 
            className={styles.applyBtn} 
            onClick={() => runApply()}
            disabled={models.length === 0 || isApplying || isSyncing}
          >
            {isApplying ? <Loader2 size={16} className={styles.spin} /> : <Database size={16} />}
            Apply to DB
          </button>
          <button 
            className={styles.exportBtn} 
            onClick={exportToCSV}
            disabled={models.length === 0}
          >
            <Download size={16} /> Export CSV
          </button>
        </div>
      </div>

      {/* Terminal UI */}
      <div className={styles.terminalContainer}>
        <div className={styles.terminalHeader}>
          <Terminal size={16} /> ordisum@pricing-sync:~
        </div>
        
        <div className={styles.terminalBody}>
          <div className={styles.logs}>
            {logs.map((log, i) => (
              <div key={i} className={log.includes('Error') || log.includes('FAILED') ? styles.logError : log.startsWith('>') ? styles.logCommand : styles.logLine}>
                {log}
              </div>
            ))}
            {isSyncing && (
              <div className={styles.logLine}>
                <Loader2 size={12} className={styles.spin} /> 
                <span style={{marginLeft: '8px'}}>Executing sync script...</span>
              </div>
            )}
            <div ref={logsEndRef} />
          </div>

          <form onSubmit={handleCommand} className={styles.inputForm}>
            <span className={styles.prompt}>$</span>
            <input
              type="text"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              className={styles.terminalInput}
              placeholder="Type a command (sync, apply, clear, help)..."
              disabled={isSyncing || isApplying}
              autoFocus
              autoComplete="off"
            />
          </form>
        </div>
      </div>

      {/* Data Table */}
      {models.length > 0 && (
        <div className={styles.dataCard}>
          <div className={styles.dataCardHeader}>
            Results ({models.length} models)
          </div>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Provider</th>
                  <th>Model</th>
                  <th>Input ($/1K)</th>
                  <th>Output ($/1K)</th>
                  <th>Cache Read</th>
                  <th>Cache Write</th>
                </tr>
              </thead>
              <tbody>
                {models.map((m, i) => (
                  <tr key={i}>
                    <td><span className={styles.providerBadge}>{m.provider}</span></td>
                    <td><code>{m.model}</code></td>
                    <td>{m.input_usd_per_1k !== null ? `$${m.input_usd_per_1k}` : '-'}</td>
                    <td>{m.output_usd_per_1k !== null ? `$${m.output_usd_per_1k}` : '-'}</td>
                    <td>{m.cache_read_usd_per_1k !== null ? `$${m.cache_read_usd_per_1k}` : '-'}</td>
                    <td>{m.cache_write_usd_per_1k !== null ? `$${m.cache_write_usd_per_1k}` : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
