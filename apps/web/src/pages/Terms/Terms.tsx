import { Link } from 'react-router-dom';
import { Navbar } from '../../components/Navbar';
import { Text } from '../../components/Text';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import styles from './Terms.module.scss';

export const Terms = () => {
  useDocumentTitle('Terms of Service');
  return (
    <div className={styles.page}>
      <Navbar />
      <div className={styles.content}>
        <Text variant="h1" className={styles.title}>
          Terms of Service
        </Text>
        <p className={styles.updated}>Last updated: March 6, 2025</p>

        <section className={styles.section}>
          <Text variant="h3" as="h2" className={styles.sectionTitle}>
            1. Acceptance of Terms
          </Text>
          <p>
            By accessing or using CampSight (&quot;the Service&quot;), you agree
            to be bound by these Terms of Service. If you do not agree to these
            terms, please do not use the Service.
          </p>
        </section>

        <section className={styles.section}>
          <Text variant="h3" as="h2" className={styles.sectionTitle}>
            2. Description of Service
          </Text>
          <p>
            CampSight is a service that monitors campsite availability on
            Recreation.gov and notifies users when campsites become available.
            The Service is provided as-is and relies on publicly available
            information from Recreation.gov.
          </p>
        </section>

        <section className={styles.section}>
          <Text variant="h3" as="h2" className={styles.sectionTitle}>
            3. User Accounts
          </Text>
          <p>
            You may sign in using your Google account. You are responsible for
            maintaining the confidentiality of your account and for all
            activities that occur under your account. You agree to notify us
            immediately of any unauthorized use of your account.
          </p>
        </section>

        <section className={styles.section}>
          <Text variant="h3" as="h2" className={styles.sectionTitle}>
            4. Acceptable Use
          </Text>
          <p>
            You agree to use the Service only for lawful purposes and in
            accordance with these Terms. You agree not to use the Service to
            violate any applicable laws, infringe on the rights of others, or
            interfere with the operation of the Service or Recreation.gov.
          </p>
        </section>

        <section className={styles.section}>
          <Text variant="h3" as="h2" className={styles.sectionTitle}>
            5. No Guarantee of Availability
          </Text>
          <p>
            CampSight monitors availability and sends notifications based on the
            data provided by Recreation.gov. We do not guarantee that
            campsites will be available when you receive a notification, or that
            you will be able to complete a reservation. Recreation.gov is
            operated by a third party and is subject to its own terms and
            conditions.
          </p>
        </section>

        <section className={styles.section}>
          <Text variant="h3" as="h2" className={styles.sectionTitle}>
            6. Limitation of Liability
          </Text>
          <p>
            To the fullest extent permitted by law, CampSight shall not be
            liable for any indirect, incidental, special, consequential, or
            punitive damages arising from your use of the Service. Our total
            liability shall not exceed the amount you paid for the Service in the
            twelve months preceding the claim, or one hundred dollars, whichever
            is greater.
          </p>
        </section>

        <section className={styles.section}>
          <Text variant="h3" as="h2" className={styles.sectionTitle}>
            7. Changes to the Service and Terms
          </Text>
          <p>
            We may modify or discontinue the Service at any time. We may also
            update these Terms from time to time. Continued use of the Service
            after changes constitutes acceptance of the modified Terms.
          </p>
        </section>

        <section className={styles.section}>
          <Text variant="h3" as="h2" className={styles.sectionTitle}>
            8. Contact
          </Text>
          <p>
            If you have questions about these Terms of Service, please contact
            us through the support options available in the Service.
          </p>
        </section>

        <Link to="/login" className={styles.backLink}>
          ← Back to sign in
        </Link>
      </div>
    </div>
  );
};
