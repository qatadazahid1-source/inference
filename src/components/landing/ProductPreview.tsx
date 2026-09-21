import React from 'react';
import styles from './ProductPreview.module.css';

export const ProductPreview: React.FC = () => {
  const providerList = [
    'OpenAI',
    'Anthropic',
    'Google Gemini',
    'Groq',
    'Azure OpenAI',
    'AWS Bedrock',
    'Mistral AI'
  ];

  return (
    <section className={styles.previewSection} aria-label="Product Telemetry Demonstration">
      {/* Factual Provider Integration Evidence Bar */}
      <div className={styles.providerProofBar}>
        <span className={styles.providerProofLabel}>UNIFIED API GATEWAY SUPPORT FOR</span>
        <div className={styles.providerBadgeList}>
          {providerList.map((p, idx) => (
            <span key={idx} className={styles.providerBadge}>{p}</span>
          ))}
        </div>
      </div>

      {/* Main Operational Instrument Visual */}
      <div className={styles.previewCard}>
        <div className={styles.topBar}>
          <div className={styles.windowControls}>
            <span className={styles.controlDot} />
            <span className={styles.controlDot} />
            <span className={styles.controlDot} />
          </div>
          <span className={styles.title}>ORDISUM REFINED OBSERVABILITY INSTRUMENT</span>
          <div className={styles.statusIndicator}>
            <span className={styles.pulseDot} />
            <span>LIVE GATEWAY TELEMETRY</span>
          </div>
        </div>

        <div className={styles.body}>
          {/* KPI Pulse Row */}
          <div className={styles.kpiGrid}>
            <div className={styles.kpiTile}>
              <div className={styles.kpiLabel}>MONTHLY AGGREGATE SPEND</div>
              <div className={styles.kpiValue}>$14,820.40</div>
              <div className={styles.kpiSub}>-12.4% vs last period</div>
            </div>
            <div className={styles.kpiTile}>
              <div className={styles.kpiLabel}>BUDGET UTILIZATION</div>
              <div className={styles.kpiValue}>74.1%</div>
              <div className={styles.kpiSub}>Under $20,000 threshold</div>
            </div>
            <div className={styles.kpiTile}>
              <div className={styles.kpiLabel}>TOTAL GATEWAY REQUESTS</div>
              <div className={styles.kpiValue}>2.41M</div>
              <div className={styles.kpiSub}>Monitored live</div>
            </div>
            <div className={styles.kpiTile}>
              <div className={styles.kpiLabel}>ACTIVE API KEYS</div>
              <div className={styles.kpiValue}>38</div>
              <div className={styles.kpiSub}>Across 6 microservices</div>
            </div>
          </div>

          {/* Core Visual Grid */}
          <div className={styles.gridRow}>
            <div className={styles.chartCard}>
              <div className={styles.cardHeader}>
                <span className={styles.cardHeaderTitle}>DAILY SPEND DISTRIBUTION (30 DAYS)</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-text-tertiary)' }}>USD</span>
              </div>
              <div className={styles.sparklineRow}>
                {[45, 60, 52, 70, 85, 90, 65, 40, 50, 78, 92, 110, 95, 80, 85, 98, 120, 140, 115, 90, 85, 105, 130, 150, 125, 110, 95, 118, 135, 160].map((h, i) => (
                  <div
                    key={i}
                    className={`${styles.bar} ${i >= 24 ? styles.barActive : ''}`}
                    style={{ height: `${(h / 160) * 100}%` }}
                    title={`Day ${i + 1}: $${(h * 3.2).toFixed(2)}`}
                  />
                ))}
              </div>
            </div>

            <div className={styles.breakdownCard}>
              <div className={styles.cardHeader}>
                <span className={styles.cardHeaderTitle}>MODEL BREAKDOWN</span>
              </div>
              <div className={styles.breakdownList}>
                <div className={styles.breakdownItem}>
                  <span className={styles.modelName}>gpt-4o</span>
                  <span className={styles.modelCost}>$7,420.10</span>
                </div>
                <div className={styles.breakdownItem}>
                  <span className={styles.modelName}>claude-3-5-sonnet</span>
                  <span className={styles.modelCost}>$4,180.80</span>
                </div>
                <div className={styles.breakdownItem}>
                  <span className={styles.modelName}>gemini-1.5-pro</span>
                  <span className={styles.modelCost}>$1,890.30</span>
                </div>
                <div className={styles.breakdownItem}>
                  <span className={styles.modelName}>llama-3.3-70b</span>
                  <span className={styles.modelCost}>$1,329.20</span>
                </div>
              </div>
            </div>
          </div>

          {/* Primary Product Log Table (Promoted immediately below Hero) */}
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
                  <td><span className={styles.badgeSuccess}>200 PASSED</span></td>
                </tr>
                <tr>
                  <td>14:51:59.88</td>
                  <td className={styles.keyCell}>ii_sk_prod_search_04</td>
                  <td>anthropic / claude-3-5-sonnet</td>
                  <td>1,950 / 860 tk</td>
                  <td>610ms</td>
                  <td>$0.0253</td>
                  <td><span className={styles.badgeSuccess}>200 PASSED</span></td>
                </tr>
                <tr>
                  <td>14:51:57.12</td>
                  <td className={styles.keyCell}>ii_sk_dev_sandbox_02</td>
                  <td>groq / llama-3.3-70b</td>
                  <td>600 / 290 tk</td>
                  <td>110ms</td>
                  <td>$0.0006</td>
                  <td><span className={styles.badgeSuccess}>200 PASSED</span></td>
                </tr>
                <tr>
                  <td>14:51:54.30</td>
                  <td className={styles.keyCell}>ii_sk_batch_eval_09</td>
                  <td>openai / gpt-4o-mini</td>
                  <td>4,100 / 1,200 tk</td>
                  <td>380ms</td>
                  <td>$0.0011</td>
                  <td><span className={styles.badgeSuccess}>200 PASSED</span></td>
                </tr>
                <tr>
                  <td>14:51:50.05</td>
                  <td className={styles.keyCell}>ii_sk_temp_scraping</td>
                  <td>anthropic / claude-3-5-haiku</td>
                  <td>8,400 / 0 tk</td>
                  <td>15ms</td>
                  <td>$0.0000</td>
                  <td><span className={styles.badgeError}>429 THROTTLED</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
};

