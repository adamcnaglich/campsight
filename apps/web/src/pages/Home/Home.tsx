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

      <section className={styles.featuresSection}>
        <div className={styles.featuresInner}>
          <div className={styles.feature}>
            <div className={styles.featureIcon}>🔍</div>
            <h3>Search Any Campground</h3>
            <p>
              Browse thousands of campgrounds and campsites across the United States on Recreation.gov. 
              From popular national parks to hidden gems, find the perfect spot for your next adventure.
            </p>
          </div>
          <div className={styles.feature}>
            <div className={styles.featureIcon}>⚡</div>
            <h3>Real-Time Monitoring</h3>
            <p>
              CampSight checks availability every 15 minutes around the clock. When a spot opens up at 
              your watched campsites, you'll know immediately—giving you the edge over other campers.
            </p>
          </div>
          <div className={styles.feature}>
            <div className={styles.featureIcon}>📧</div>
            <h3>Instant Email Alerts</h3>
            <p>
              Get notified the moment availability changes. Our email alerts include all the details 
              you need, with a direct link to book on Recreation.gov before the spot is gone.
            </p>
          </div>
        </div>
      </section>

      <section className={styles.howItWorks}>
        <div className={styles.howItWorksInner}>
          <h2>How It Works</h2>
          <div className={styles.steps}>
            <div className={styles.step}>
              <div className={styles.stepNumber}>1</div>
              <h4>Sign in with Google</h4>
              <p>Quick and secure authentication to get you started in seconds.</p>
            </div>
            <div className={styles.step}>
              <div className={styles.stepNumber}>2</div>
              <h4>Search for your campsite</h4>
              <p>Find campgrounds by name or browse by facility. Add your desired dates and number of nights.</p>
            </div>
            <div className={styles.step}>
              <div className={styles.stepNumber}>3</div>
              <h4>Start watching</h4>
              <p>CampSight begins monitoring availability automatically. You can watch as many campsites as you need.</p>
            </div>
            <div className={styles.step}>
              <div className={styles.stepNumber}>4</div>
              <h4>Get notified & book</h4>
              <p>Receive an email alert when a site becomes available. Click through to Recreation.gov and book immediately.</p>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.whySection}>
        <div className={styles.whyInner}>
          <h2>Why CampSight?</h2>
          <div className={styles.whyContent}>
            <p>
              Popular campsites at national parks and recreation areas book up months in advance. 
              But cancellations happen all the time—often just days or weeks before the trip. 
              These last-minute openings disappear fast, usually within minutes.
            </p>
            <p>
              Constantly refreshing Recreation.gov is frustrating and time-consuming. CampSight does 
              the monitoring for you, checking availability 24/7 so you don't have to. When that perfect 
              campsite opens up, you'll be the first to know.
            </p>
            <p>
              Whether you're planning a family vacation at Yosemite, a weekend getaway in the Rockies, 
              or a coastal camping trip, CampSight helps you secure the sites that would otherwise be impossible to book.
            </p>
          </div>
        </div>
      </section>

      <section className={styles.ctaSection}>
        <div className={styles.ctaInner}>
          <h2>Ready to find your perfect campsite?</h2>
          <p>Start monitoring availability in minutes—completely free.</p>
          <Link to="/add" className={styles.ctaButton}>
            Create Your First Watch
          </Link>
        </div>
      </section>
    </div>
  );
}
