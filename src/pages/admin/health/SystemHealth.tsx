import { useState, useEffect } from 'react';
import { Activity, Database, Server, RefreshCw, AlertCircle, Key, CheckCircle, XCircle, Plug } from 'lucide-react';
import { adminService } from '../../../api/services/admin.service';
import { Card, CardContent } from '../../../components/ui/Card/Card';
import { DataTable } from '../../../components/ui/DataTable/DataTable';
import styles from './SystemHealth.module.css';

export function SystemHealthPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'audit' | 'failed'>('overview');
  
  const [health, setHealth] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [failedRequests, setFailedRequests] = useState<any[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchData = async () => {
    setIsRefreshing(true);
    try {
      const [hData, aData, fData] = await Promise.all([
        adminService.getSystemHealth(),
        adminService.getSystemAuditLog(),
        adminService.getSystemFailedRequests()
      ]);
      setHealth(hData);
      setAuditLogs(aData);
      setFailedRequests(fData);
    } catch (err) {
      console.error('Failed to fetch system data:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / (3600*24));
    const h = Math.floor(seconds % (3600*24) / 3600);
    const m = Math.floor(seconds % 3600 / 60);
    return `${d}d ${h}h ${m}m`;
  };

  const auditColumns = [
    { header: 'Date', accessorKey: 'created_at', cell: (val: string) => new Date(val).toLocaleString() },
    { header: 'Admin', accessorKey: 'users.full_name' },
    { header: 'Action', accessorKey: 'action' },
    { header: 'Target Org', accessorKey: 'organizations.name', cell: (val: string) => val || 'System' },
    { header: 'IP', accessorKey: 'ip_address' },
    { 
      header: 'Changes', 
      accessorKey: 'new_values', 
      cell: (val: any) => val ? <div className={styles.jsonBlock} title={JSON.stringify(val)}>{JSON.stringify(val)}</div> : '-' 
    }
  ];

  const failedReqColumns = [
    { header: 'Date', accessorKey: 'logged_at', cell: (val: string) => new Date(val).toLocaleString() },
    { header: 'Organization', accessorKey: 'organizations.name' },
    { header: 'Provider', accessorKey: 'provider', cell: (val: string) => <span style={{textTransform: 'capitalize'}}>{val}</span> },
    { header: 'Model', accessorKey: 'model' },
    { header: 'Latency', accessorKey: 'latency_ms', cell: (val: number) => `${val}ms` },
    { 
      header: 'Error', 
      accessorKey: 'error_message',
      cell: (val: string) => (
        <span style={{ color: '#ef4444', fontSize: '12px' }}>
          <AlertCircle size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
          {val || 'Unknown Error'}
        </span>
      )
    }
  ];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>System Health</h1>
          <p className={styles.subtitle}>Monitor backend servers, database latency, and global audit logs.</p>
        </div>
        <button 
          className={styles.btnSecondary} 
          onClick={fetchData}
          disabled={isRefreshing}
        >
          <RefreshCw size={16} className={isRefreshing ? 'spin' : ''} />
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <div className={styles.tabs}>
        <button 
          className={`${styles.tab} ${activeTab === 'overview' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'audit' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('audit')}
        >
          Audit Logs
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'failed' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('failed')}
        >
          Failed Requests
        </button>
      </div>

      {isLoading ? (
        <div>Loading system data...</div>
      ) : (
        <>
          {activeTab === 'overview' && health && (
            <div className={styles.grid}>
              {/* --- Core Requirements --- */}
              <div className={styles.statCard}>
                <div className={styles.statHeader}><Key size={16} /> Env Var check</div>
                <div className={styles.statValue}>
                  {health.security?.encryption_key_loaded ? (
                    <span style={{ color: '#22c55e', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <CheckCircle size={20} /> Loaded
                    </span>
                  ) : (
                    <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <XCircle size={20} /> Missing
                    </span>
                  )}
                </div>
                <div className={styles.statSub}>CREDENTIAL_ENCRYPTION_KEY</div>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statHeader}><Database size={16} /> Database (SELECT 1)</div>
                <div className={styles.statValue}>
                  {health.database?.supabase_connected ? (
                    <span style={{ color: '#22c55e', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <CheckCircle size={20} /> Connected
                    </span>
                  ) : (
                    <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <XCircle size={20} /> Unreachable
                    </span>
                  )}
                </div>
                <div className={styles.statSub}>Supabase PostgREST ({health.database?.latency_ms}ms)</div>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statHeader}><Plug size={16} /> Active Integrations</div>
                <div className={styles.statValue}>{health.kpis?.active_integrations_count || 0}</div>
                <div className={styles.statSub}>Across all organizations</div>
              </div>

              {/* --- Bonus Info --- */}
              <div className={styles.statCard}>
                <div className={styles.statHeader}><Server size={16} /> Server Uptime</div>
                <div className={styles.statValue}>{formatUptime(health.server?.uptime_seconds || 0)}</div>
                <div className={styles.statSub}>Node.js ({health.server?.platform})</div>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statHeader}><Activity size={16} /> Memory Usage</div>
                <div className={styles.statValue}>{health.server?.memory_usage_mb || 0} MB</div>
                <div className={styles.statSub}>{health.server?.free_memory_mb || 0} MB free of {health.server?.total_memory_mb || 0} MB</div>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statHeader}><Database size={16} /> Total Audit Events</div>
                <div className={styles.statValue}>{auditLogs.length}</div>
                <div className={styles.statSub}>Recent platform actions</div>
              </div>
            </div>
          )}

          {activeTab === 'audit' && (
            <Card>
              <CardContent style={{ padding: 0 }}>
                <DataTable data={auditLogs} columns={auditColumns} isLoading={false} />
              </CardContent>
            </Card>
          )}

          {activeTab === 'failed' && (
            <Card>
              <CardContent style={{ padding: 0 }}>
                <DataTable data={failedRequests} columns={failedReqColumns} isLoading={false} />
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
