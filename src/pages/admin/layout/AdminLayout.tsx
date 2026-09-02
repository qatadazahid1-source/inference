import { Outlet } from 'react-router-dom';
import { AdminSidebar } from './AdminSidebar';
import { PrivateNoIndex } from '../../../components/seo/PrivateNoIndex';
import styles from './AdminLayout.module.css';

export function AdminLayout() {
  return (
    <div className={styles.layout}>
      <PrivateNoIndex />
      <AdminSidebar />
      <main className={styles.main}>
        <header className={styles.topbar}>
          <div className={styles.topbarBadge}>Admin Platform</div>
          <h1 className={styles.topbarTitle}>Ordisum Operator Control</h1>
        </header>
        <div className={styles.content}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
