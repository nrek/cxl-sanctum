import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Terms of Use · SANCTUM",
  description:
    "Terms of Use for the SANCTUM service operated by Craft and Logic, Inc.",
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Use" effectiveDate="April 16, 2026">
      <p>
        These Terms of Use (&ldquo;Terms&rdquo;) govern your access to and use
        of the SANCTUM service available at{" "}
        <a href="https://sanctum.craftxlogic.com">sanctum.craftxlogic.com</a>,
        operated by <strong>Craft and Logic, Inc.</strong> (&ldquo;Craft/Logic,&rdquo;
        &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;), a Texas C
        Corporation. By creating an account or using the Service, you agree to
        these Terms. If you do not agree, do not use the Service.
      </p>
      <p>
        These Terms apply only to the hosted Service we operate. The SANCTUM
        open-source software is separately licensed under the MIT License; if
        you self-host SANCTUM, your use of the source code is governed by that
        license rather than these Terms.
      </p>

      <h2>1. The Service</h2>
      <p>
        SANCTUM is an SSH-access orchestration service that lets you organize
        teams, SSH public keys, and managed servers, and distribute an
        idempotent provisioning script to machines you designate. You are
        solely responsible for the machines you connect to the Service and for
        any data you place in your workspace.
      </p>

      <h2>2. Accounts</h2>
      <p>
        You must provide accurate information when creating an account. You
        are responsible for maintaining the confidentiality of your credentials
        and provision tokens, and for all activity under your account. Notify
        us promptly at{" "}
        <a href="mailto:support@craftxlogic.com">support@craftxlogic.com</a> if
        you suspect unauthorized use.
      </p>

      <h2>3. Acceptable Use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Violate any applicable law or the rights of others;</li>
        <li>
          Use the Service to access, alter, or provision systems you do not
          own or are not authorized to administer;
        </li>
        <li>
          Attempt to probe, scan, or test the vulnerability of the Service, or
          to breach any security or authentication measures;
        </li>
        <li>
          Interfere with or disrupt the Service, including by overwhelming
          infrastructure or bypassing rate limits;
        </li>
        <li>
          Reverse engineer, decompile, or misuse the Service except as
          expressly permitted by applicable law or the MIT License for the
          underlying open-source software.
        </li>
      </ul>

      <h2>4. Your Content</h2>
      <p>
        You retain all rights to the content you place in your workspace
        (&ldquo;Your Content&rdquo;), including project data, member records,
        and SSH public keys. You grant us a limited license to host, process,
        and transmit Your Content solely as needed to provide the Service. You
        represent that you have the rights necessary to upload and use Your
        Content on the Service.
      </p>

      <h2>5. Fees and Billing</h2>
      <p>
        The Service may offer free and paid plans. Paid plans are billed in
        advance on a recurring basis by our payment processor. Except where
        required by law, fees are non-refundable. We may change prices or plan
        features; where practical, we will provide notice before a change takes
        effect. If a payment fails, we may suspend or downgrade paid features
        after reasonable notice.
      </p>

      <h2>6. Open-Source Software</h2>
      <p>
        The SANCTUM software is made available under the MIT License. Nothing
        in these Terms restricts your rights under that license to self-host,
        modify, or redistribute the software. These Terms govern only the
        hosted Service we operate.
      </p>

      <h2>7. Third-Party Services</h2>
      <p>
        The Service may integrate with third-party providers (for example,
        Stripe for payments). Your use of those providers is governed by their
        own terms and privacy notices, which we do not control.
      </p>

      <h2>8. Disclaimers</h2>
      <p>
        The Service is provided <strong>&ldquo;AS IS&rdquo; and
        &ldquo;AS AVAILABLE&rdquo;</strong> without warranties of any kind,
        whether express or implied, including warranties of merchantability,
        fitness for a particular purpose, non-infringement, or that the Service
        will be uninterrupted, secure, or error-free. You are responsible for
        maintaining backups, testing provisioning changes, and validating
        access outcomes on your own systems.
      </p>

      <h2>9. Limitation of Liability</h2>
      <p>
        To the fullest extent permitted by law, Craft/Logic and its officers,
        directors, employees, and agents will not be liable for any indirect,
        incidental, special, consequential, or punitive damages, or any loss
        of profits, revenue, data, or goodwill, arising out of or related to
        your use of the Service. Our total liability for any claim arising out
        of or relating to the Service will not exceed the greater of
        (a) US$100 or (b) the amount you paid us for the Service in the twelve
        (12) months preceding the event giving rise to the claim.
      </p>

      <h2>10. Indemnification</h2>
      <p>
        You will indemnify and hold harmless Craft/Logic from any claims,
        liabilities, damages, losses, and expenses (including reasonable
        attorneys&rsquo; fees) arising out of or related to your use of the
        Service, your content, or your violation of these Terms.
      </p>

      <h2>11. Suspension and Termination</h2>
      <p>
        You may stop using the Service and delete your workspace at any time.
        We may suspend or terminate your access if you materially breach these
        Terms, create risk for the Service or other users, or if we are
        required to do so by law. Upon termination, your right to use the
        Service ceases; sections that by their nature should survive will
        survive.
      </p>

      <h2>12. Governing Law and Venue</h2>
      <p>
        These Terms are governed by the laws of the State of Texas, without
        regard to its conflict-of-laws principles. Except where prohibited, any
        dispute arising out of or relating to these Terms or the Service will
        be brought exclusively in the state or federal courts located in
        Harris County, Texas, and you consent to the personal jurisdiction of
        those courts.
      </p>

      <h2>13. Changes to These Terms</h2>
      <p>
        We may update these Terms from time to time. Material changes will be
        indicated by updating the &ldquo;Effective date&rdquo; above and, where
        appropriate, notifying workspace owners. Your continued use of the
        Service after a change takes effect constitutes acceptance of the
        revised Terms.
      </p>

      <h2>14. Contact</h2>
      <p>
        Craft and Logic, Inc.
        <br />
        Enrique Gutierrez, CEO &amp; Founder
        <br />
        1321 Upland Dr., PMB 20350
        <br />
        Houston, Texas 77043, United States
        <br />
        <a href="mailto:support@craftxlogic.com">support@craftxlogic.com</a>
      </p>
    </LegalPage>
  );
}
