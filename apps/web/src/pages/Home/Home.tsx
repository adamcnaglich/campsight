import { Link } from 'react-router-dom';
import { Navbar } from '../../components/Navbar';
import { Text } from '../../components/Text';
import { Button } from '../../components/Button';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import styles from './Home.module.scss';

export const Home = () => {
  useDocumentTitle('Home');
  return (
    <div className={styles.hero}>
      <Navbar />
      <div className={styles.content}>
        <Text variant="h1" className={styles.heading}>
          All the best campsites,
          <br />
          at your fingertips
        </Text>
        <div className={styles.buttons}>
          <Button
            as={({ children, className, ...props }) => (
              <Link to="/new" className={className} {...props}>
                {children}
              </Link>
            )}
            variant="primary"
            size="large"
          >
            Start your first watch
          </Button>
          <Button
            as={({ children, className, ...props }) => (
              <a href="#learn-more" className={className} {...props}>
                {children}
              </a>
            )}
            variant="outline"
            size="large"
          >
            Learn more
          </Button>
        </div>
      </div>
      <section id="learn-more" className={styles.learnMore}>
        <div className={styles.learnMoreInner}>
          <Text variant="h2">Never miss a campsite opening</Text>
          <Text variant="body">
            CampSight monitors availability on Recreation.gov and notifies you
            instantly when your favorite campsites become available. Set it up
            once and get email alerts the moment something opens up.
          </Text>
        </div>
      </section>

      <section className={styles.featuresSection}>
        <div className={styles.featuresInner}>
          <div className={styles.feature}>
            <div className={styles.featureIcon}>🔍</div>
            <Text variant="h3">Search Any Campground</Text>
            <Text variant="body">
              Browse thousands of campgrounds and campsites across the United
              States on Recreation.gov. From popular national parks to hidden
              gems, find the perfect spot for your next adventure.
            </Text>
          </div>
          <div className={styles.feature}>
            <div className={styles.featureIcon}>⚡</div>
            <Text variant="h3">Real-Time Monitoring</Text>
            <Text variant="body">
              CampSight checks availability every 15 minutes around the clock.
              When a spot opens up at your watched campsites, you'll know
              immediately—giving you the edge over other campers.
            </Text>
          </div>
          <div className={styles.feature}>
            <div className={styles.featureIcon}>📧</div>
            <Text variant="h3">Instant Email Alerts</Text>
            <Text variant="body">
              Get notified the moment availability changes. Our email alerts
              include all the details you need, with a direct link to book on
              Recreation.gov before the spot is gone.
            </Text>
          </div>
        </div>
      </section>

      <section className={styles.howItWorks}>
        <div className={styles.howItWorksInner}>
          <Text variant="h2">How It Works</Text>
          <div className={styles.steps}>
            <div className={styles.step}>
              <div className={styles.stepNumber}>1</div>
              <Text variant="h4">Sign in with Google</Text>
              <Text variant="body">
                Quick and secure authentication to get you started in seconds.
              </Text>
            </div>
            <div className={styles.step}>
              <div className={styles.stepNumber}>2</div>
              <Text variant="h4">Search for your campsite</Text>
              <Text variant="body">
                Find campgrounds by name or browse by facility. Add your desired
                dates and number of nights.
              </Text>
            </div>
            <div className={styles.step}>
              <div className={styles.stepNumber}>3</div>
              <Text variant="h4">Start watching</Text>
              <Text variant="body">
                CampSight begins monitoring availability automatically. You can
                watch as many campsites as you need.
              </Text>
            </div>
            <div className={styles.step}>
              <div className={styles.stepNumber}>4</div>
              <Text variant="h4">Get notified & book</Text>
              <Text variant="body">
                Receive an email alert when a site becomes available. Click
                through to Recreation.gov and book immediately.
              </Text>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.whySection}>
        <div className={styles.whyInner}>
          <Text variant="h2">Why CampSight?</Text>
          <div className={styles.whyContent}>
            <Text variant="body">
              Popular campsites at national parks and recreation areas book up
              months in advance. But cancellations happen all the time—often
              just days or weeks before the trip. These last-minute openings
              disappear fast, usually within minutes.
            </Text>
            <Text variant="body">
              Constantly refreshing Recreation.gov is frustrating and
              time-consuming. CampSight does the monitoring for you, checking
              availability 24/7 so you don't have to. When that perfect campsite
              opens up, you'll be the first to know.
            </Text>
            <Text variant="body">
              Whether you're planning a family vacation at Yosemite, a weekend
              getaway in the Rockies, or a coastal camping trip, CampSight helps
              you secure the sites that would otherwise be impossible to book.
            </Text>
          </div>
        </div>
      </section>

      <section className={styles.ctaSection}>
        <div className={styles.ctaInner}>
          <Text variant="h2">Ready to find your perfect campsite?</Text>
          <Text variant="body">
            Start monitoring availability in minutes—completely free.
          </Text>
          <Button
            as={({ children, className, ...props }) => (
              <Link to="/new" className={className} {...props}>
                {children}
              </Link>
            )}
            variant="primary"
            className={styles.ctaSectionBtn}
          >
            Create Your First Watch
          </Button>
        </div>
      </section>
    </div>
  );
};
