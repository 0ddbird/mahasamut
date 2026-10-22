import { AVATAR_LABELS } from '../avatars';
import type { AvatarId } from '../avatars';
import styles from './Avatar.module.scss';

interface AvatarProps {
  avatar: AvatarId;
  size?: 'small' | 'medium' | 'large';
}

/**
 * Displays a player's Thai-themed avatar from `/avatars/<id>.svg`.
 */
export function Avatar({ avatar, size = 'small' }: AvatarProps) {
  return (
    <img
      src={`/avatars/${avatar}.svg`}
      alt={AVATAR_LABELS[avatar]}
      className={styles.avatar}
      data-size={size}
    />
  );
}
