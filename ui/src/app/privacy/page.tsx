import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy · SANCTUM",
  description:
    "How Craft and Logic, Inc. collects, uses, and protects information when you use SANCTUM.",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" effectiveDate="April 16, 2026">
      <p>
        This Privacy Policy explains how <strong>Craft and Logic, Inc.</strong>{" "}
        (&ldquo;Craft/Logic,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or
        &ldquo;our&rdquo;), a Texas C Corporation, collects, uses, and protects
        information when you use the SANCTUM service available at{" "}
        <a href="https://sanctum.craftxlogic.com">sanctum.craftxlogic.com</a>{" "}
        (the &ldquo;Service&rdquo;). This policy applies only to the hosted
        Service we operate; it does not apply to self-hosted instances of the
        SANCTUM open-source software that you run on your own infrastructure.
      </p>

      <h2>1. Information We Collect</h2>
      <h3>Account information</h3>
      <p>
        When you create a workspace, we collect the username, email address (if
        provided), and a hashed password you supply. We do not store your
        password in plain text.
      </p>
      <h3>Workspace content</h3>
      <p>
        The Service stores content you choose to place in your workspace,
        including project and environment names, member records, SSH public
        keys, server hostnames, provision tokens, and role assignments. You are
        responsible for the contents you enter.
      </p>
      <h3>Operational data</h3>
      <p>
        When managed nodes or your browser communicate with the Service, we
        receive standard request metadata such as IP addresses, user agents,
        hostnames reported by provisioning scripts, and timestamps. We use this
        data to operate the Service, diagnose problems, and protect against
        abuse.
      </p>
      <h3>Billing information</h3>
      <p>
        If you subscribe to a paid plan, payment processing is handled by our
        payment provider (Stripe). We receive limited billing metadata such as
        subscription status, plan, and the last four digits of a card; we do not
        store full card numbers.
      </p>
      <h3>Cookies and similar technologies</h3>
      <p>
        We use a small number of cookies or local-storage entries needed to keep
        you signed in and remember workspace selections. We do not use
        third-party advertising cookies.
      </p>

      <h2>2. How We Use Information</h2>
      <ul>
        <li>To provide, secure, and maintain the Service.</li>
        <li>
          To authenticate users, serve provisioning scripts to machines you
          designate, and record heartbeats.
        </li>
        <li>To communicate with you about the Service, including security or service notices.</li>
        <li>To comply with applicable laws and enforce our Terms of Use.</li>
      </ul>
      <p>
        We do not sell personal information, and we do not share workspace
        content with third parties except as needed to operate the Service or
        as required by law.
      </p>

      <h2>3. How We Share Information</h2>
      <p>We share limited information only with:</p>
      <ul>
        <li>
          <strong>Service providers</strong> who host infrastructure, process
          payments, or send transactional email on our behalf, under
          confidentiality and data-protection obligations.
        </li>
        <li>
          <strong>Authorities</strong> when we are legally compelled, or where
          we believe in good faith that disclosure is necessary to protect the
          rights, property, or safety of users or the public.
        </li>
        <li>
          <strong>Successors</strong> in the event of a merger, acquisition, or
          asset sale, subject to equivalent privacy protections.
        </li>
      </ul>

      <h2>4. Data Retention</h2>
      <p>
        We keep account and workspace data for as long as your workspace is
        active. If you delete your workspace or account, we remove or anonymize
        associated data within a reasonable period, subject to backup cycles
        and any retention required by law. Aggregate, non-identifying logs may
        be retained longer for security and analytics.
      </p>

      <h2>5. Security</h2>
      <p>
        We use commercially reasonable administrative, technical, and physical
        safeguards to protect the Service, including encryption in transit
        (HTTPS), password hashing, and least-privilege access for operators.
        Provision tokens are treated as secrets and should be kept confidential
        by you; rotate them from the dashboard if compromised.
      </p>

      <h2>6. Your Rights</h2>
      <p>
        Depending on where you reside, you may have rights to access, correct,
        export, or delete your personal information. To exercise these rights,
        email us at{" "}
        <a href="mailto:support@craftxlogic.com">support@craftxlogic.com</a>.
        We will respond within the time required by applicable law.
      </p>

      <h2>7. Children&rsquo;s Privacy</h2>
      <p>
        The Service is not directed to children under 13, and we do not
        knowingly collect personal information from children. If you believe a
        child has provided information to us, please contact us so we can
        remove it.
      </p>

      <h2>8. International Users</h2>
      <p>
        The Service is operated from the United States. By using the Service
        from outside the United States, you understand that your information
        may be transferred to, stored, and processed in the United States.
      </p>

      <h2>9. Changes to This Policy</h2>
      <p>
        We may update this Privacy Policy from time to time. When we make
        material changes, we will update the &ldquo;Effective date&rdquo; above
        and, where appropriate, notify workspace owners by email or an in-app
        notice. Your continued use of the Service after an update constitutes
        acceptance of the revised policy.
      </p>

      <h2>10. Contact</h2>
      <p>
        Craft and Logic, Inc.
        <br />
        Attn: Privacy
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
