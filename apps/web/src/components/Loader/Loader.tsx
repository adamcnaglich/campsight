import styles from './Loader.module.scss';

export const Loader = () => (
  <div className={styles.container}>
    <div className={styles.spinner} aria-label="Loading" />
  </div>
);
