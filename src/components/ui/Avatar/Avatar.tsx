import styles from './Avatar.module.css';

interface AvatarProps {
  src?: string;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function Avatar({ src, name, size = 'md' }: AvatarProps) {
  return (
    <div className={`${styles.avatar} ${styles[size]}`}>
      {src ? (
        <img src={src} alt={name} className={styles.image} />
      ) : (
        <span>{getInitials(name)}</span>
      )}
    </div>
  );
}
