import { useState } from 'react'
import type { CodeExample } from '../../../docs/content/index'
import styles from './CodeBlock.module.css'

function highlight(code: string, lang: string): string {
  if (lang === 'bash' || lang === 'shell') {
    return code
      .replace(/(#.*)/g, '<span class="cm">$1</span>')
      .replace(/(\$[\w_]+)/g, '<span class="cv">$1</span>')
  }
  if (lang === 'json') {
    return code
      .replace(/("[\w-]+")\s*:/g, '<span class="ck">$1</span>:')
      .replace(/:\s*(".*?")/g, ': <span class="cs">$1</span>')
      .replace(/:\s*(true|false|null)/g, ': <span class="cb">$1</span>')
      .replace(/:\s*(\d+)/g, ': <span class="cn">$1</span>')
  }
  if (lang === 'typescript' || lang === 'javascript') {
    return code
      .replace(/(\/\/.*)/g, '<span class="cm">$1</span>')
      .replace(/\b(const|let|var|function|return|import|export|from|interface|type|async|await)\b/g,
        '<span class="ck">$1</span>')
      .replace(/(".*?")/g, '<span class="cs">$1</span>')
      .replace(/(`.*?`)/gs, '<span class="cs">$1</span>')
  }
  return code
}

interface Props { example: CodeExample }

export default function CodeBlock({ example }: Props) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    await navigator.clipboard.writeText(example.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.topBar}>
        <div className={styles.dots}>
          <span className={styles.r}/><span className={styles.a}/><span className={styles.g}/>
        </div>
        {example.filename && (
          <span className={styles.filename}>{example.filename}</span>
        )}
        <span className={styles.lang}>{example.language}</span>
        <button className={styles.copy} onClick={copy}>
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>

      <pre className={styles.pre}>
        <code
          className={styles.code}
          dangerouslySetInnerHTML={{
            __html: highlight(
              example.code.replace(/</g, '&lt;').replace(/>/g, '&gt;'),
              example.language
            )
          }}
        />
      </pre>
    </div>
  )
}