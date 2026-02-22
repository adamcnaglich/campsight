import { Link } from 'react-router-dom';
import { Navbar } from '../../components/Navbar/Navbar';
import styles from './Home.module.scss';

export function Home() {
  return (
    <div className={styles.hero}>
      <Navbar />
      <div className={styles.content}>
        <h1 className={styles.heading}>
          All the best campsites,
          <br />
          at your fingertips
        </h1>
        <div className={styles.buttons}>
          <Link to="/add" className={styles.primaryBtn}>
            Start your first watch
          </Link>
          <a href="#learn-more" className={styles.secondaryBtn}>
            Learn more
          </a>
        </div>
      </div>
      <section id="learn-more" className={styles.learnMore}>
        <div className={styles.learnMoreInner}>
          <h2>Never miss a campsite opening</h2>
          <p>
            CampSight monitors availability on Recreation.gov and notifies you
            instantly when your favorite campsites become available. Set it up
            once and get email alerts the moment something opens up.
          </p>
        </div>
      </section>
    </div>
  );
}
