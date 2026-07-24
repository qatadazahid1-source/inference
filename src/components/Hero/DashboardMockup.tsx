import { useState } from 'react'
import styles from './DashboardMockup.module.css'

const providers = [
  { name: 'OpenAI GPT-4o',     cost: '$18,420', change: '+4.2%',  pct: 85, up: true  },
  { name: 'Anthropic Claude',  cost: '$11,230', change: '−2.1%',  pct: 52, up: false },
  { name: 'Google Gemini Pro', cost: '$7,840',  change: '+11.3%', pct: 36, up: true  },
  { name: 'Azure OpenAI',      cost: '$5,190',  change: '+1.8%',  pct: 24, up: true  },
  { name: 'Cohere Command',    cost: '$3,210',  change: '−5.4%',  pct: 15, up: false },
]

const providerData = [
  { name:'OpenAI',     initials:'OA', color:'#10a37f', status:'Active',   cost:'$18,420', change:'+4.2%',  up:true,  pct:85 },
  { name:'Anthropic',  initials:'AN', color:'#cc785c', status:'Active',   cost:'$11,230', change:'−2.1%', up:false, pct:52 },
  { name:'Google AI',  initials:'GA', color:'#4285f4', status:'Active',   cost:'$7,840',  change:'+11.3%', up:true,  pct:36 },
  { name:'Azure',      initials:'AZ', color:'#0078d4', status:'Active',   cost:'$5,190',  change:'+1.8%',  up:true,  pct:24 },
  { name:'Groq',       initials:'GQ', color:'#f55036', status:'Throttled',cost:'$3,210',  change:'−5.4%', up:false, pct:15 },
  { name:'Mistral',    initials:'MI', color:'#7c3aed', status:'Active',   cost:'$1,880',  change:'+2.1%',  up:true,  pct:9  },
]

const budgetData = [
  { team:'Engineering',   limit:9500,  spent:6935, pct:73 },
  { team:'Marketing AI',  limit:3000,  spent:2760, pct:92 },
  { team:'Data Science',  limit:5000,  spent:2100, pct:42 },
  { team:'Customer Ops',  limit:4000,  spent:3640, pct:91 },
]

const alertData = [
  { dot:'#ef4444', title:'GPT-4o Usage Spike', desc:'$847 in last 2hrs — 340% above normal', time:'2 min ago', unread:true },
  { dot:'#f59e0b', title:'Marketing Budget at 92%', desc:'$2,760 of $3,000 monthly limit spent', time:'1 hr ago', unread:true },
  { dot:'#f59e0b', title:'Customer Ops Budget at 91%', desc:'$3,640 of $4,000 monthly limit spent', time:'3 hrs ago', unread:true },
  { dot:'#22c55e', title:'Groq Integration Connected', desc:'Groq API successfully linked — tracking active', time:'Yesterday', unread:false },
  { dot:'#22c55e', title:'Monthly Report Generated', desc:'October ROI report ready for download', time:'2 days ago', unread:false },
]

const navItems = ['Overview','Providers','ROI Reports','Budgets','Alerts','Settings']

export default function DashboardMockup() {
  const [activeTab, setActiveTab] = useState('Overview')

  const renderContent = () => {
    switch (activeTab) {
      case 'Overview':
        return (
          <>
            <div className={styles.metricsRow}>
              {[
                { label: 'TOTAL MONTHLY SPEND', value: '$47,892', sub: '+12.3% vs last month', green: false },
                { label: 'PROVEN ROI Q4',        value: '347%',   sub: '+89pts improvement',    green: true  },
                { label: 'ACTIVE PROVIDERS',     value: '12',     sub: '+3 added this month',   green: false },
              ].map(m => (
                <div key={m.label} className={styles.metricCard}>
                  <div className={styles.metricLabel}>{m.label}</div>
                  <div className={`${styles.metricValue} ${m.green ? styles.greenValue : ''}`}>{m.value}</div>
                  <div className={styles.metricSub}>{m.sub}</div>
                </div>
              ))}
            </div>
            <div className={styles.table}>
              <div className={styles.tableHead}>
                <span>PROVIDER COST BREAKDOWN — LAST 30 DAYS</span>
                <span className={styles.exportLink}>Export CSV</span>
              </div>
              {providers.map(p => (
                <div key={p.name} className={styles.tableRow}>
                  <div className={styles.providerCell}>
                    <span className={`${styles.dot} ${p.up ? styles.dotGreen : styles.dotAmber}`}/>
                    {p.name}
                  </div>
                  <div className={styles.barTrack}>
                    <div className={styles.barFill} style={{ width: `${p.pct}%` }}/>
                  </div>
                  <span className={styles.costCell}>{p.cost}</span>
                  <span className={`${styles.changeCell} ${p.up ? styles.changeUp : styles.changeDown}`}>
                    {p.change}
                  </span>
                </div>
              ))}
            </div>
            <div className={styles.alertStrip}>
              <span className={styles.alertDot}/>
              <span>GPT-4o usage spike detected · $847 in last 2 hrs</span>
              <a href="#" className={styles.alertLink}>View Details</a>
            </div>
          </>
        )

      case 'Providers':
        return (
          <>
            <div className={styles.tableHead}>
              <span>CONNECTED PROVIDERS</span>
              <span className={styles.providerBadge}>12 Active</span>
            </div>
            <div className={styles.providerList}>
              {providerData.map(p => (
                <div key={p.name} className={styles.providerRow}>
                  <div className={styles.providerInfo}>
                    <div className={styles.providerLogo} style={{ background: p.color }}>{p.initials}</div>
                    <div>
                      <div className={styles.providerName}>{p.name}</div>
                      <span className={`${styles.statusBadge} ${p.status === 'Active' ? styles.statusActive : styles.statusThrottled}`}>{p.status}</span>
                    </div>
                  </div>
                  <div className={styles.providerStats}>
                    <span className={styles.providerCost}>{p.cost}</span>
                    <span className={`${styles.providerChange} ${p.up ? styles.changeUp : styles.changeDown}`}>{p.change}</span>
                    <div className={styles.barTrack} style={{ width: '80px' }}>
                      <div className={styles.barFill} style={{ width: `${p.pct}%` }}/>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )

      case 'ROI Reports':
        return (
          <>
            <div className={styles.metricsRow}>
              <div className={styles.metricCard}>
                <div className={styles.metricLabel}>TOTAL VALUE GENERATED</div>
                <div className={styles.metricValue}>$86,080</div>
              </div>
              <div className={styles.metricCard}>
                <div className={styles.metricLabel}>AI INVESTMENT COST</div>
                <div className={styles.metricValue}>$24,830</div>
              </div>
              <div className={styles.metricCard}>
                <div className={styles.metricLabel}>NET ROI</div>
                <div className={`${styles.metricValue} ${styles.greenValue}`}>347%</div>
              </div>
            </div>
            <div className={styles.roiChart}>
              <div className={styles.tableHead}>
                <span>MONTHLY ROI TREND</span>
              </div>
              <div className={styles.roiBars}>
                {[40, 55, 48, 72, 88, 100].map((h, i) => (
                  <div key={i} className={styles.roiBar} style={{ height: `${h}px` }}>
                    <span>{['Jul','Aug','Sep','Oct','Nov','Dec'][i]}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className={styles.roiNote}>↗ ROI improved 89pts quarter-over-quarter</div>
          </>
        )

      case 'Budgets':
        return (
          <>
            <div className={styles.tableHead}>
              <span>BUDGET OVERVIEW</span>
              <span className={styles.budgetDate}>Oct 2024</span>
            </div>
            <div className={styles.budgetList}>
              {budgetData.map(b => {
                const color = b.pct > 90 ? '#ef4444' : b.pct >= 70 ? '#f59e0b' : '#22c55e'
                return (
                  <div key={b.team} className={styles.budgetRow}>
                    <div className={styles.budgetHeader}>
                      <span className={styles.budgetTeam}>{b.team}</span>
                      <span className={styles.budgetLimit}>Limit: ${b.limit.toLocaleString()}</span>
                    </div>
                    <div className={styles.budgetBar}>
                      <div style={{ width: `${b.pct}%`, background: color }}/>
                    </div>
                    <div className={styles.budgetFooter}>
                      <span className={styles.budgetSpent}>${b.spent.toLocaleString()} spent</span>
                      <span style={{ color }}>{b.pct}%</span>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className={styles.alertStrip} style={{ background:'rgba(245,158,11,0.08)', borderColor:'rgba(245,158,11,0.20)' }}>
              <span style={{ color:'#f59e0b' }}>⚠</span>
              <span>2 teams approaching budget limit this month</span>
            </div>
          </>
        )

      case 'Alerts':
        return (
          <>
            <div className={styles.tableHead}>
              <span>RECENT ALERTS</span>
              <span className={styles.unreadBadge}>4 unread</span>
            </div>
            <div className={styles.alertList}>
              {alertData.map((a, i) => (
                <div key={i} className={`${styles.alertCard} ${a.unread ? styles.alertUnread : ''}`}>
                  <div className={styles.alertInfo}>
                    <span className={styles.alertDot2} style={{ background: a.dot }} />
                    <div>
                      <div className={styles.alertTitle}>{a.title}</div>
                      <div className={styles.alertDesc}>{a.desc}</div>
                      <div className={styles.alertTime}>{a.time}</div>
                    </div>
                  </div>
                  <span className={styles.resolveLink}>Resolve</span>
                </div>
              ))}
            </div>
          </>
        )

      case 'Settings':
        return (
          <>
            <div className={styles.settingsGroup}>
              <div className={styles.settingsLabel}>WORKSPACE</div>
              <div className={styles.settingsRow}>
                <span>Organization</span>
                <span className={styles.settingsValue}>Acme Corp</span>
              </div>
              <div className={styles.settingsRow}>
                <span>Plan</span>
                <span className={styles.settingsValueGreen}>Professional</span>
              </div>
              <div className={styles.settingsRow}>
                <span>Billing Cycle</span>
                <span className={styles.settingsValueMuted}>Monthly</span>
              </div>
            </div>
            <div className={styles.settingsGroup}>
              <div className={styles.settingsLabel}>NOTIFICATIONS</div>
              <div className={styles.settingsRow}>
                <span>Email Alerts</span>
                <div className={styles.toggle + ' ' + styles.toggleOn}></div>
              </div>
              <div className={styles.settingsRow}>
                <span>Slack Alerts</span>
                <div className={styles.toggle + ' ' + styles.toggleOn}></div>
              </div>
              <div className={styles.settingsRow}>
                <span>SMS Alerts</span>
                <div className={styles.toggle}></div>
              </div>
            </div>
            <div className={styles.settingsGroup}>
              <div className={styles.settingsLabel}>API KEYS</div>
              <div className={styles.settingsRow}>
                <span>OpenAI</span>
                <span className={styles.apiKey}>sk-•••••••••••••4f2a<span className={styles.connectedDot}></span></span>
              </div>
              <div className={styles.settingsRow}>
                <span>Anthropic</span>
                <span className={styles.apiKey}>sk-ant-••••••••••2k9<span className={styles.connectedDot}></span></span>
              </div>
            </div>
          </>
        )

      default:
        return null
    }
  }

  return (
    <div className={styles.frame}>
      <div className={styles.chrome}>
        <div className={styles.dots}>
          <span className={styles.red}   />
          <span className={styles.amber} />
          <span className={styles.green} />
        </div>
        <div className={styles.urlBar}>app.inferenceintelligence.com</div>
      </div>

      <div className={styles.body}>
        <aside className={styles.sidebar}>
          <div className={styles.sidebarBrand}>II</div>
          {navItems.map((item) => (
            <div
              key={item}
              className={`${styles.navItem} ${activeTab === item ? styles.navActive : ''}`}
              onClick={() => setActiveTab(item)}
            >
              {item}
            </div>
          ))}
        </aside>

        <div className={styles.main} key={activeTab} style={{ animation: 'tabFade 180ms ease' }}>
          {renderContent()}
        </div>
      </div>
    </div>
  )
}