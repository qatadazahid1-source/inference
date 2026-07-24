import { Outlet } from 'react-router-dom';
import { AdminSidebar } from './AdminSidebar';
import styles from './AdminLayout.module.css';

export function AdminLayout() {
  return (
    <div className={styles.layout}>
      <AdminSidebar />
      <main className={styles.main}>
        <header className={styles.topbar}>
          <div className={styles.topbarBadge}>Admin Platform</div>
          <h1 className={styles.topbarTitle}>Inference Intelligence Operator Control</h1>
        </header>
        <div className={styles.content}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
