import { Outlet } from 'react-router-dom';
import { SettingsSidebar } from '../../../components/settings/SettingsSidebar/SettingsSidebar';
import styles from './SettingsLayout.module.css';

export function SettingsLayout() {
  return (
    <div className={styles.layout}>
      <SettingsSidebar />
      <div className={styles.content}>
        <Outlet />
      </div>
    </div>
  );
}
