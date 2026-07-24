import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import styles from './Navbar.module.css'

interface NavLink {
  label: string
  href: string
  disabled: boolean
}

const links: NavLink[] = [
  { label: 'Products',     href: '#features',     disabled: false },
  { label: 'Integrations', href: '#integrations',  disabled: false },
  { label: 'Pricing',      href: '#pricing',       disabled: false },
  { label: 'Docs',         href: '/docs/overview', disabled: false },
]

const Navbar: React.FC = () => {
  const navigate = useNavigate()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 70)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
  }, [menuOpen])

  return (
    <nav className={`${styles.nav} ${scrolled ? styles.scrolled : ''}`}>
      <div className={styles.inner}>
        <Link to="/" className={styles.logo}>
          <span className={styles.logoMark}>i∞</span>
          Inference Intelligence
        </Link>

        <ul className={styles.links}>
          {links.map(item => (
            <li key={item.label}>
              {item.disabled ? (
                <span
                  className={styles.linkDisabled}
                >
                  {item.label}
                </span>
              ) : item.href.startsWith('/') ? (
                <Link
                  to={item.href}
                  className={styles.link}
                >
                  {item.label}
                </Link>
              ) : (
                <a
                  key={item.label}
                  href={item.href}
                  className={styles.link}
                  onClick={(e) => {
                    e.preventDefault()
                    const target = document.querySelector(item.href)
                    if (target) {
                      target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start',
                      })
                    }
                  }}
                >
                  {item.label}
                </a>
              )}
            </li>
          ))}
        </ul>

        <div className={styles.actions}>
          <button className={styles.signIn} onClick={() => navigate('/auth/signin')}>
            Sign In
          </button>
          <Link to="/signup" className={styles.cta}>
            Start Free Trial
          </Link>
        </div>

        <button
          className={styles.hamburger}
          onClick={() => setMenuOpen(true)}
          aria-label="Open menu"
        >
          <span /><span /><span />
        </button>
      </div>

      {menuOpen && (
        <div className={styles.mobileMenu}>
          <button
            className={styles.mobileClose}
            onClick={() => setMenuOpen(false)}
          >
            ×
          </button>
          {links.map(item => (
            item.disabled ? (
              <span
                key={item.label}
                className={styles.linkDisabled}
              >
                {item.label}
              </span>
            ) : item.href.startsWith('/') ? (
              <Link
                to={item.href}
                className={styles.mobileLink}
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </Link>
            ) : (
              <a
                key={item.label}
                href={item.href}
                className={styles.mobileLink}
                onClick={() => {
                  const target = document.querySelector(item.href)
                  if (target) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }
                  setMenuOpen(false)
                }}
              >
                {item.label}
              </a>
            )
          ))}
          <Link to="/signup" className={styles.cta} style={{marginTop:'24px'}} onClick={() => setMenuOpen(false)}>
            Start Free Trial
          </Link>
        </div>
      )}
    </nav>
  )
}

export default Navbar