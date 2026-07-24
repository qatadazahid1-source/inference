import React from 'react';
import useScrollReveal from '../../hooks/useScrollReveal';
import styles from './IntegrationsSection.module.css';

interface Integration {
  name: string;
  dotColor: string;
  isComingSoon?: boolean;
}

const aiProviders: Integration[] = [
  {name:'OpenAI', dotColor:'var(--accent)'},
  {name:'Anthropic', dotColor:'var(--green)'},
  {name:'Google AI', dotColor:'var(--amber)'},
  {name:'Azure OpenAI', dotColor:'var(--accent)'},
  {name:'AWS Bedrock', dotColor:'var(--amber)'},
  {name:'Cohere', dotColor:'var(--cyan)'},
  {name:'Mistral', dotColor:'var(--accent)'},
  {name:'Groq', dotColor:'var(--green)'},
  {name:'Replicate', dotColor:'var(--text-2)'},
  {name:'Hugging Face', dotColor:'var(--amber)'},
  {name:'Vertex AI', dotColor:'var(--accent)'},
  {name:'40+ more →', dotColor:'', isComingSoon:true},
];

const bizTools: string[] = [
  'Slack','Jira','Asana','Notion',
  'Salesforce','Power BI','Tableau','Zapier',
];

const IntegrationsSection: React.FC = () => {
  const sectionRef = useScrollReveal();

  return (
    <section id="integrations" ref={sectionRef} className={`${styles.section} reveal`}>
      <div className={styles.container}>
        <span className={styles.label}>INTEGRATIONS</span>
        <h2 className={styles.headline}>Connect your entire AI stack</h2>
        
        <div className={styles.providers}>
          {aiProviders.map((provider) => (
            <div
              key={provider.name}
              className={`${styles.provider} ${provider.isComingSoon ? styles.comingSoon : ''}`}
            >
              {provider.dotColor && (
                <span className={styles.dot} style={{ background: provider.dotColor }} />
              )}
              <span className={styles.providerName}>{provider.name}</span>
            </div>
          ))}
        </div>

        <div className={styles.divider} />

        <div className={styles.tools}>
          <span className={styles.toolsLabel}>Also works with</span>
          <div className={styles.toolList}>
            {bizTools.map((tool) => (
              <span key={tool} className={styles.tool}>{tool}</span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default IntegrationsSection;