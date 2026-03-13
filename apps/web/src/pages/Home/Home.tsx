import { Link } from 'react-router-dom';
import {
  Search,
  Bell,
  MapPin,
  Eye,
  Clock,
  Mail,
  Tent,
  Mountain,
  TreePine,
  ArrowRight,
  Binoculars,
  Map,
  CalendarRange,
  Zap,
  Shield,
  Smartphone,
} from 'lucide-react';
import { Navbar } from '../../components/Navbar';
import { Text } from '../../components/Text';
import { Button } from '../../components/Button';
import { useTheme } from '../../context/ThemeContext';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import styles from './Home.module.scss';

export const Home = () => {
  const { resolvedTheme } = useTheme();
  useDocumentTitle('CampSight — Never Miss a Campsite Opening');

  return (
    <div className={styles.page}>
      <Navbar />

      {/* ── Hero ──────────────────────────────────────────────── */}
      <section className={styles.hero}>
        <div className={styles.heroOverlay} />
        <div className={styles.heroContent}>
          <span className={styles.heroBadge}>
            <Zap size={14} />
            Monitoring Recreation.gov 24/7
          </span>
          <h1 className={styles.heroHeading}>
            Stop refreshing.
            <br />
            <span className={styles.heroAccent}>Start camping.</span>
          </h1>
          <p className={styles.heroSub}>
            CampSight watches Recreation.gov for you and sends instant alerts
            when your dream campsites open up. Never miss a cancellation again.
          </p>
          <div className={styles.heroCtas}>
            <Button
              as={({ children, className, ...props }: any) => (
                <Link to="/login" className={className} {...props}>
                  {children}
                </Link>
              )}
              variant="primary"
              size="large"
              icon={<ArrowRight size={18} />}
            >
              Get Started Free
            </Button>
            <Button
              as={({ children, className, ...props }: any) => (
                <a href="#how-it-works" className={className} {...props}>
                  {children}
                </a>
              )}
              variant="outline"
              size="large"
              className={styles.heroOutlineBtn}
            >
              See How It Works
            </Button>
          </div>
          <div className={styles.heroStats}>
            <div className={styles.heroStat}>
              <span className={styles.heroStatValue}>15 min</span>
              <span className={styles.heroStatLabel}>Check interval</span>
            </div>
            <div className={styles.heroStatDivider} />
            <div className={styles.heroStat}>
              <span className={styles.heroStatValue}>250k+</span>
              <span className={styles.heroStatLabel}>Campsites tracked</span>
            </div>
            <div className={styles.heroStatDivider} />
            <div className={styles.heroStat}>
              <span className={styles.heroStatValue}>24/7</span>
              <span className={styles.heroStatLabel}>Monitoring</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Problem / Solution ────────────────────────────────── */}
      <section className={styles.problemSection}>
        <div className={styles.sectionInner}>
          <div className={styles.problemGrid}>
            <div className={styles.problemCard}>
              <Text variant="h3" className={styles.problemTitle}>
                The problem
              </Text>
              <Text variant="body" className={styles.problemText}>
                Popular campsites at national parks book up months in advance.
                Cancellations happen daily — but those openings vanish within
                minutes. Constantly refreshing Recreation.gov is exhausting and
                unreliable.
              </Text>
            </div>
            <div className={styles.solutionCard}>
              <Text variant="h3" className={styles.solutionTitle}>
                The solution
              </Text>
              <Text variant="body" className={styles.solutionText}>
                CampSight monitors availability around the clock and notifies
                you the moment a spot opens. Set it up once, then go about your
                life — we'll handle the watching.
              </Text>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────── */}
      <section className={styles.featuresSection}>
        <div className={styles.sectionInner}>
          <Text variant="h2" className={styles.sectionHeading}>
            Everything you need to land the perfect site
          </Text>
          <p className={styles.sectionSub}>
            From discovery to booking — CampSight covers every step.
          </p>
          <div className={styles.featuresGrid}>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <Search size={24} />
              </div>
              <Text variant="h4">Smart Search</Text>
              <Text variant="body">
                Search thousands of campgrounds and campsites across
                Recreation.gov with real-time autocomplete. Find by recreation
                area or campground name.
              </Text>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <Eye size={24} />
              </div>
              <Text variant="h4">Multi-Site Watches</Text>
              <Text variant="body">
                Track multiple campsites in a single watch. Pick your preferred
                sites, set your date range, and let CampSight monitor them all
                at once.
              </Text>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <Clock size={24} />
              </div>
              <Text variant="h4">15-Minute Checks</Text>
              <Text variant="body">
                Availability is checked every 15 minutes, 24 hours a day. When a
                cancellation happens, you'll know before most people even notice.
              </Text>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <Mail size={24} />
              </div>
              <Text variant="h4">Instant Email Alerts</Text>
              <Text variant="body">
                Get notified the moment a site opens up. Each alert includes
                campsite details and a direct link to book on Recreation.gov.
              </Text>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <Map size={24} />
              </div>
              <Text variant="h4">Interactive Maps</Text>
              <Text variant="body">
                Explore campgrounds and individual campsites on Google Maps.
                See exact locations, select sites visually, and plan your trip
                with confidence.
              </Text>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <MapPin size={24} />
              </div>
              <Text variant="h4">Nearby Discovery</Text>
              <Text variant="body">
                See available campgrounds near you automatically. CampSight
                detects your location and surfaces open sites in your area for
                the next 30 days.
              </Text>
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Works ──────────────────────────────────────── */}
      <section id="how-it-works" className={styles.howSection}>
        <div className={styles.sectionInner}>
          <Text variant="h2" className={styles.sectionHeading}>
            Up and running in minutes
          </Text>
          <p className={styles.sectionSub}>
            Four simple steps between you and your next camping trip.
          </p>
          <div className={styles.timeline}>
            <div className={styles.timelineLine} />
            <div className={styles.timelineStep}>
              <div className={styles.timelineDot}>
                <Shield size={20} />
              </div>
              <span className={styles.timelineNum}>01</span>
              <Text variant="h4">Sign in with Google</Text>
              <Text variant="body">
                One-click authentication. No passwords, no forms.
              </Text>
            </div>
            <div className={styles.timelineStep}>
              <div className={styles.timelineDot}>
                <Binoculars size={20} />
              </div>
              <span className={styles.timelineNum}>02</span>
              <Text variant="h4">Find your campsite</Text>
              <Text variant="body">
                Search by name, browse campgrounds, and pick exact sites with
                our guided flow.
              </Text>
            </div>
            <div className={styles.timelineStep}>
              <div className={styles.timelineDot}>
                <CalendarRange size={20} />
              </div>
              <span className={styles.timelineNum}>03</span>
              <Text variant="h4">Set your dates</Text>
              <Text variant="body">
                Choose check-in and check-out. Monitoring starts immediately.
              </Text>
            </div>
            <div className={styles.timelineStep}>
              <div className={styles.timelineDot}>
                <Bell size={20} />
              </div>
              <span className={styles.timelineNum}>04</span>
              <Text variant="h4">Get notified & book</Text>
              <Text variant="body">
                Email alert the moment a site opens. Click through and book.
              </Text>
            </div>
          </div>
        </div>
      </section>

      {/* ── Search Preview ──────────────────────────────────────── */}
      <section className={styles.previewSection}>
        <div className={styles.sectionInner}>
          <Text variant="h2" className={styles.sectionHeading}>
            Find any campsite in seconds
          </Text>
          <p className={styles.sectionSub}>
            Search thousands of campgrounds across Recreation.gov with
            real-time autocomplete. Browse by recreation area, explore on the
            map, and pick the exact sites you want.
          </p>
          <div className={styles.previewImageWrap}>
            <img
              src={
                resolvedTheme === 'dark'
                  ? '/search-dark.jpg'
                  : '/search-light.jpg'
              }
              alt="CampSight search interface showing campground results and map"
              className={styles.previewImage}
            />
          </div>
        </div>
      </section>

      {/* ── Why CampSight ─────────────────────────────────────── */}
      <section className={styles.whySection}>
        <div className={styles.sectionInner}>
          <Text variant="h2" className={styles.sectionHeading}>
            Why campers choose CampSight
          </Text>
          <div className={styles.whyGrid}>
            <div className={styles.whyItem}>
              <Zap size={20} className={styles.whyIcon} />
              <div>
                <Text variant="h5">Lightning fast alerts</Text>
                <Text variant="body-sm" className={styles.whyText}>
                  15-minute check cycles mean you hear about openings before the
                  crowd.
                </Text>
              </div>
            </div>
            <div className={styles.whyItem}>
              <Tent size={20} className={styles.whyIcon} />
              <div>
                <Text variant="h5">Multi-site tracking</Text>
                <Text variant="body-sm" className={styles.whyText}>
                  Watch several campsites at once — one watch covers your entire
                  wish list.
                </Text>
              </div>
            </div>
            <div className={styles.whyItem}>
              <Mountain size={20} className={styles.whyIcon} />
              <div>
                <Text variant="h5">National parks & beyond</Text>
                <Text variant="body-sm" className={styles.whyText}>
                  Covers every campground on Recreation.gov — from Yosemite to
                  hidden gems.
                </Text>
              </div>
            </div>
            <div className={styles.whyItem}>
              <TreePine size={20} className={styles.whyIcon} />
              <div>
                <Text variant="h5">Location-aware</Text>
                <Text variant="body-sm" className={styles.whyText}>
                  Discover available campgrounds near you automatically, no
                  searching required.
                </Text>
              </div>
            </div>
            <div className={styles.whyItem}>
              <Smartphone size={20} className={styles.whyIcon} />
              <div>
                <Text variant="h5">Works on any device</Text>
                <Text variant="body-sm" className={styles.whyText}>
                  Fully responsive — manage watches from your phone, tablet, or
                  desktop.
                </Text>
              </div>
            </div>
            <div className={styles.whyItem}>
              <Shield size={20} className={styles.whyIcon} />
              <div>
                <Text variant="h5">Secure & private</Text>
                <Text variant="body-sm" className={styles.whyText}>
                  Google Sign-In only. We never store passwords or share your
                  data.
                </Text>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────── */}
      <section className={styles.ctaSection}>
        <div className={styles.ctaInner}>
          <Tent size={40} className={styles.ctaIcon} />
          <Text variant="h2" className={styles.ctaHeading}>
            Ready to land your perfect campsite?
          </Text>
          <Text variant="body" className={styles.ctaSub}>
            Start monitoring availability in minutes — completely free.
          </Text>
          <Button
            as={({ children, className, ...props }: any) => (
              <Link to="/login" className={className} {...props}>
                {children}
              </Link>
            )}
            variant="primary"
            size="large"
            className={styles.ctaBtn}
            icon={<ArrowRight size={18} />}
          >
            Create Your Free Account
          </Button>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────── */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerBrand}>
            <span className={styles.footerLogo}>🏕️ CampSight</span>
            <Text variant="body-sm" className={styles.footerTagline}>
              Never miss a campsite opening.
            </Text>
          </div>
          <div className={styles.footerLinks}>
            <Link to="/terms">Terms</Link>
            <Link to="/login">Sign In</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
