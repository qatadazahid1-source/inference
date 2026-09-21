import React from 'react';
import styles from './LandingFaq.module.css';

export interface FaqItem {
  question: string;
  answer: string;
}

export const FAQ_DATA: FaqItem[] = [
  {
    question: 'Do I need to install a custom SDK to use Ordisum?',
    answer: 'No. You can change your API base URL to the Ordisum Gateway and use an Ordisum API key with standard OpenAI, Anthropic, or HTTP client libraries.'
  },
  {
    question: 'What happens when an application reaches its budget limit?',
    answer: 'Ordisum enforces pre-configured spending rules automatically. Requests can be throttled or rejected before exceeding the allocated budget limit.'
  },
  {
    question: 'Which AI providers are supported by Ordisum?',
    answer: 'Ordisum supports OpenAI, Anthropic, Google Gemini, Groq, Azure OpenAI, AWS Bedrock, Mistral, and Cohere out of the box.'
  },
  {
    question: 'Does Ordisum store or inspect prompt payload data?',
    answer: 'No. Ordisum stores only metadata required for cost, token, latency, and error rate telemetry. Your prompt and completion contents are never stored.'
  },
  {
    question: 'Is there a free trial?',
    answer: 'Yes — 14 days, no credit card required. You get full access to every feature.'
  },
  {
    question: 'Can I set different budgets for different teams?',
    answer: 'Yes. Budgets, alert thresholds, and project attribution are all configurable per team and per project, not just account-wide.'
  },
  {
    question: 'What does the integration actually involve?',
    answer: 'Two things: point your existing HTTP client at the Ordisum Gateway base URL, and use your Ordisum API key instead of calling providers directly. That\'s it. Nothing to install, no code to change beyond configuration.'
  }
];

export const LandingFaq: React.FC = () => {
  return (
    <section className={styles.section} id="faq">
      <div className={styles.header}>
        <h2 className={styles.title}>Clear technical answers</h2>
      </div>

      <dl className={styles.faqList}>
        {FAQ_DATA.map((item, idx) => (
          <div key={idx} className={styles.faqItem}>
            <dt className={styles.question}>{item.question}</dt>
            <dd className={styles.answer}>{item.answer}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
};
