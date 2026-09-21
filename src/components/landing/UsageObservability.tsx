import React from 'react';
import { ShieldAlert, KeyRound, Bell, Gauge, Layers, Activity } from 'lucide-react';
import styles from './UsageObservability.module.css';

export const UsageObservability: React.FC = () => {
  const capabilities = [
    {
      icon: <ShieldAlert size={15} />,
      title: 'Hard Budget Enforcement',
      body: 'Automated spending caps per workspace or key. Intercepts and throttles gateway requests with HTTP 429 before limits are exceeded.',
      tag: 'PRE-LIMIT INTERCEPTION'
    },
    {
      icon: <KeyRound size={15} />,
      title: 'Scoped Proxy Gateway Keys',
      body: 'Issue scoped proxy keys (`ii_sk_...`) with model restrictions, custom rate limits, and instant one-click revocation.',
      tag: 'GRANULAR ATTRIBUTION'
    },
    {
      icon: <Bell size={15} />,
      title: 'Automated Anomaly Alerts',
      body: 'Real-time notifications for spend spikes, high error rates, or unusual token surges delivered via Webhook, Slack, and Email.',
      tag: 'INSTANT DISPATCH'
    },
    {
      icon: <Gauge size={15} />,
      title: 'Latency vs. Cost Benchmarking',
      body: 'Compare end-to-end response latency, cost per 1K tokens, and TTFT across providers to optimize model selection for every workload.',
      tag: 'REAL-TIME BENCHMARKS'
    },
    {
      icon: <Layers size={15} />,
      title: 'Multi-Provider Routing',
      body: 'Unified proxy gateway supporting OpenAI, Anthropic, Google Gemini, Groq, Azure OpenAI, Mistral, and AWS Bedrock.',
      tag: 'UNIFIED GATEWAY'
    }
  ];

  const providerBreakdown = [
    { name: 'openai / gpt-4o', promptTokens: '42.1M', completionTokens: '18.4M', pct: 45, cost: '$7,420.10' },
    { name: 'anthropic / claude-3-5-sonnet', promptTokens: '31.5M', completionTokens: '14.2M', pct: 30, cost: '$4,180.80' },
    { name: 'google / gemini-1.5-pro', promptTokens: '12.8M', completionTokens: '9.4M', pct: 15, cost: '$1,890.30' },
    { name: 'groq / llama-3.3-70b', promptTokens: '7.8M', completionTokens: '6.6M', pct: 10, cost: '$1,329.20' }
  ];

  return (
    <section className={styles.section} id="features">
      <div className={styles.header}>
        <h2 className={styles.title}>
          Real-time AI API cost control &amp; token telemetry
        </h2>
        <p className={styles.subtitle}>
          Every request is captured at the edge, attributed to scoped gateway keys, and bounded by automated budget enforcement.
        </p>
      </div>

      <div className={styles.container}>
        {/* Dominant Product Visualization (Left Column) */}
        <div className={styles.instrumentCard}>
          <div className={styles.instrumentTopBar}>
            <div className={styles.instrumentTitle}>
              <Activity size={14} style={{ color: 'var(--color-text-tertiary)' }} />
              <span>GATEWAY REQUEST TELEMETRY INSTRUMENT</span>
            </div>
            <div className={styles.statusIndicator}>
              <span className={styles.pulseDot} />
              <span>STREAMING LIVE</span>
            </div>
          </div>

          <div className={styles.instrumentBody}>
            {/* Operational Summary Grid */}
            <div className={styles.metricsGrid}>
              <div className={styles.metricTile}>
                <div className={styles.metricLabel}>TOTAL SPEND (30D)</div>
                <div className={styles.metricValue}>$14,820.40</div>
                <div className={styles.metricSub}>
                  <span className={styles.badgeSuccess}>-12.4% vs prev</span>
                </div>
              </div>

              <div className={styles.metricTile}>
                <div className={styles.metricLabel}>TOKEN VOLUME</div>
                <div className={styles.metricValue}>142.8M</div>
                <div className={styles.metricSub}>94.2M prompt / 48.6M comp</div>
              </div>

              <div className={styles.metricTile}>
                <div className={styles.metricLabel}>AVG GATEWAY LATENCY</div>
                <div className={styles.metricValue}>340ms</div>
                <div className={styles.metricSub}>
                  <span className={styles.badgeSignal}>0.8ms proxy overhead</span>
                </div>
              </div>

              <div className={styles.metricTile}>
                <div className={styles.metricLabel}>BUDGET CAP STATUS</div>
                <div className={styles.metricValue}>74.1%</div>
                <div className={styles.metricSub}>
                  <span className={styles.badgeSuccess}>ENFORCING ($20k cap)</span>
                </div>
              </div>
            </div>

            {/* Provider Token & Cost Distribution */}
            <div className={styles.vizRow}>
              <div className={styles.vizHeader}>
                <span className={styles.vizHeaderTitle}>PROVIDER TOKEN &amp; COST ATTRIBUTION</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-text-tertiary)' }}>
                  PROMPT / COMPLETION BREAKDOWN
                </span>
              </div>
              <div className={styles.providerDistributionBars}>
                {providerBreakdown.map((item, idx) => (
                  <div key={idx} className={styles.providerBarItem}>
                    <div className={styles.providerBarMeta}>
                      <span className={styles.providerName}>{item.name}</span>
                      <span className={styles.providerStats}>
                        {item.promptTokens} P + {item.completionTokens} C &bull; {item.cost}
                      </span>
                    </div>
                    <div className={styles.barTrack}>
                      <div className={styles.barFillPrompt} style={{ width: `${item.pct * 0.7}%` }} title="Prompt tokens" />
                      <div className={styles.barFillCompletion} style={{ width: `${item.pct * 0.3}%` }} title="Completion tokens" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Live Telemetry Request Log */}
            <div className={styles.tableContainer}>
              <div className={styles.tableHeader}>
                <span className={styles.tableTitle}>LIVE GATEWAY REQUEST LOG STREAM</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-text-tertiary)' }}>
                  REAL-TIME REQUESTS
                </span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className={styles.logTable}>
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Gateway Key Label</th>
                      <th>Provider / Model</th>
                      <th>Tokens (P / C)</th>
                      <th>Latency</th>
                      <th>Cost</th>
                      <th>Enforcement</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>14:52:01.04</td>
                      <td className={styles.keyCell}>ii_sk_prod_agent_01</td>
                      <td>openai / gpt-4o</td>
                      <td>1,020 / 400 tk</td>
                      <td>420ms</td>
                      <td>$0.0142</td>
                      <td><span className={styles.statusPillSuccess}>200 PASSED</span></td>
                    </tr>
                    <tr>
                      <td>14:51:59.88</td>
                      <td className={styles.keyCell}>ii_sk_prod_search_04</td>
                      <td>anthropic / claude-3-5-sonnet</td>
                      <td>1,950 / 860 tk</td>
                      <td>610ms</td>
                      <td>$0.0253</td>
                      <td><span className={styles.statusPillSuccess}>200 PASSED</span></td>
                    </tr>
                    <tr>
                      <td>14:51:57.12</td>
                      <td className={styles.keyCell}>ii_sk_dev_sandbox_02</td>
                      <td>groq / llama-3.3-70b</td>
                      <td>600 / 290 tk</td>
                      <td>110ms</td>
                      <td>$0.0006</td>
                      <td><span className={styles.statusPillSuccess}>200 PASSED</span></td>
                    </tr>
                    <tr>
                      <td>14:51:54.30</td>
                      <td className={styles.keyCell}>ii_sk_batch_eval_09</td>
                      <td>openai / gpt-4o-mini</td>
                      <td>4,100 / 1,200 tk</td>
                      <td>380ms</td>
                      <td>$0.0011</td>
                      <td><span className={styles.statusPillSuccess}>200 PASSED</span></td>
                    </tr>
                    <tr>
                      <td>14:51:50.05</td>
                      <td className={styles.keyCell}>ii_sk_temp_scraping</td>
                      <td>anthropic / claude-3-5-haiku</td>
                      <td>8,400 / 0 tk</td>
                      <td>15ms</td>
                      <td>$0.0000</td>
                      <td><span className={styles.statusPillError}>429 THROTTLED</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Secondary Capabilities Matrix (Right Column / Side Rail) */}
        <div className={styles.capabilityRail}>
          <h3 className={styles.railTitle}>INFRASTRUCTURE CAPABILITIES</h3>
          {capabilities.map((cap, idx) => (
            <div key={idx} className={styles.capabilityCard}>
              <div className={styles.capHeader}>
                <div className={styles.capIcon}>{cap.icon}</div>
                <h4 className={styles.capTitle}>{cap.title}</h4>
              </div>
              <p className={styles.capBody}>{cap.body}</p>
              <span className={styles.capTag}>{cap.tag}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

