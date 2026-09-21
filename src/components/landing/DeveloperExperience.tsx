import React from 'react';
import styles from './DeveloperExperience.module.css';

export const DeveloperExperience: React.FC = () => {
  return (
    <section className={styles.section} id="developer">
      <div className={styles.card}>
        <div className={styles.left}>
          <h2 className={styles.title}>
            One line of configuration.<br />Zero SDK lock-in.
          </h2>
          <p className={styles.description}>
            Route your requests through Ordisum's high-performance proxy gateway. Works out of the box with standard OpenAI, Anthropic, or HTTP client libraries.
          </p>
          <div className={styles.bulletList}>
            <div className={styles.bullet}>
              <span className={styles.bulletDot} />
              <span>Full compatibility with official provider SDKs</span>
            </div>
            <div className={styles.bullet}>
              <span className={styles.bulletDot} />
              <span>Minimal-overhead proxy routing</span>
            </div>
            <div className={styles.bullet}>
              <span className={styles.bulletDot} />
              <span>Instant key rotation without code redeployments</span>
            </div>
          </div>
        </div>

        <div className={styles.right}>
          <div className={styles.codeBox}>
            <span className={styles.comment}># Replace your provider endpoint with Ordisum Gateway</span>
            <br /><br />
            <span className={styles.keyword}>import</span> <span className={styles.variable}>OpenAI</span> <span className={styles.keyword}>from</span> <span className={styles.string}>'openai'</span>;
            <br /><br />
            <span className={styles.keyword}>const</span> <span className={styles.variable}>client</span> = <span className={styles.keyword}>new</span> <span className={styles.variable}>OpenAI</span>(&#123;
            <br />
            &nbsp;&nbsp;<span className={styles.variable}>apiKey</span>: <span className={styles.string}>process.env.ORDISUM_API_KEY</span>, <span className={styles.comment}>// ii_sk_live_...</span>
            <br />
            &nbsp;&nbsp;<span className={styles.variable}>baseURL</span>: <span className={styles.string}>'https://api.ordisum.com/v1'</span>
            <br />
            &#125;);
            <br /><br />
            <span className={styles.comment}>// Call any supported model — telemetry logged automatically</span>
            <br />
            <span className={styles.keyword}>const</span> <span className={styles.variable}>completion</span> = <span className={styles.keyword}>await</span> <span className={styles.variable}>client</span>.chat.completions.create(&#123;
            <br />
            &nbsp;&nbsp;<span className={styles.variable}>model</span>: <span className={styles.string}>'gpt-4o'</span>,
            <br />
            &nbsp;&nbsp;<span className={styles.variable}>messages</span>: [&#123; <span className={styles.variable}>role</span>: <span className={styles.string}>'user'</span>, <span className={styles.variable}>content</span>: <span className={styles.string}>'Execute query'</span> &#125;]
            <br />
            &#125;);
          </div>
        </div>
      </div>
    </section>
  );
};
