import { useState, useRef, useEffect } from 'react';
import { axiosClient } from '../../../../lib/axios';
import { Terminal, Download, Loader2 } from 'lucide-react';
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
  const [logs, setLogs] = useState<string[]>(['Welcome to Portkey Pricing Sync Terminal.', 'Type "help" for a list of commands.']);
  const [isSyncing, setIsSyncing] = useState(false);
  const [models, setModels] = useState<FetchedModel[]>([]);
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

  const runSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setModels([]);
    
    addLog('> sync');
    addLog('Initiating sync with Portkey GitHub repository...');
    addLog('Please wait, this might take up to 60 seconds...');

    try {
      const response = await axiosClient.post('/api/admin/pricing/run-portkey-sync');
      
      if (response.data.logs) {
        response.data.logs.forEach((logLine: string) => addLog(logLine));
      }
      
      if (response.data.models) {
        setModels(response.data.models);
        addLog(`\n✅ Sync complete. Successfully loaded ${response.data.models.length} models.`);
      }
    } catch (err: any) {
      addLog(`\n❌ Error: ${err.message || 'Failed to execute sync script.'}`);
    } finally {
      setIsSyncing(false);
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
    } else if (cmd === 'help') {
      addLog('> help');
      addLog('Available commands:');
      addLog('  sync  - Fetch all provider pricing from Portkey GitHub');
      addLog('  clear - Clear the terminal and data table');
      addLog('  help  - Show this help message');
    } else if (cmd === 'sync') {
      runSync();
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
          <h1 className={styles.title}>Portkey Sync Terminal</h1>
          <p className={styles.subtitle}>Direct GitHub Sync (USD per 1K Tokens)</p>
        </div>
        <button 
          className={styles.exportBtn} 
          onClick={exportToCSV}
          disabled={models.length === 0}
        >
          <Download size={16} /> Export CSV
        </button>
      </div>

      {/* Terminal UI */}
      <div className={styles.terminalContainer}>
        <div className={styles.terminalHeader}>
          <Terminal size={16} /> ordisum@portkey-sync:~
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
              placeholder="Type a command (sync, clear, help)..."
              disabled={isSyncing}
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
