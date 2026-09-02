import { Outlet } from 'react-router-dom';
import { SettingsSidebar } from '../../../components/settings/SettingsSidebar/SettingsSidebar';
import { PrivateNoIndex } from '../../../components/seo/PrivateNoIndex';
import styles from './SettingsLayout.module.css';

export function SettingsLayout() {
  return (
    <div className={styles.layout}>
      <PrivateNoIndex />
      <SettingsSidebar />
      <div className={styles.content}>
        <Outlet />
      </div>
    </div>
  );
}
