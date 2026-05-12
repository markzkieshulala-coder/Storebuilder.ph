import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Privacy Policy — Storebuilder.ph",
  description:
    "Privacy Policy for Storebuilder.ph. Learn how we collect, use, and protect your personal information under the Philippines' Data Privacy Act of 2012.",
};

const BLUE = "#1877F2";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Google Sans', Roboto, Arial, system-ui, sans-serif" }}>
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.svg" alt="Storebuilder.ph" width={30} height={30} />
            <span className="font-bold text-gray-900">Storebuilder<span style={{ color: BLUE }}>.ph</span></span>
          </Link>
          <div className="hidden md:flex items-center gap-7 text-sm font-medium text-gray-600">
            <Link href="/" className="hover:text-blue-600 transition-colors">Home</Link>
            <Link href="/about" className="hover:text-blue-600 transition-colors">About Us</Link>
            <Link href="/upgrade" className="hover:text-blue-600 transition-colors">Pricing</Link>
            <Link href="/contact" className="hover:text-blue-600 transition-colors">Contact</Link>
          </div>
          <Link href="/auth/register" className="px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ backgroundColor: BLUE }}>
            Get started free
          </Link>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-14">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-gray-500 text-sm mb-10">Last updated: January 1, 2025 · Effective immediately</p>

        <div className="prose prose-gray max-w-none space-y-10 text-sm leading-relaxed text-gray-700">
          <section>
            <p>
              <strong>Storebuilder.ph</strong> ("we," "us," or "our") respects your privacy and is committed to protecting your personal information. This Privacy Policy explains how we collect, use, store, and share your data when you use our AI-powered website builder. We comply with the Philippines&apos; <strong>Data Privacy Act of 2012 (Republic Act No. 10173)</strong>.
            </p>
          </section>

          {[
            {
              title: "1. Information We Collect",
              content: [
                "Account information: name, email address, and password (passwords are stored in hashed form only).",
                "Profile information: optional profile picture you choose to upload.",
                "Website content: the prompts, text, images, and configuration you enter into the editor and any websites you generate.",
                "Payment information: when you subscribe to Pro or Enterprise, billing details are collected and processed by our payment gateway (PayMongo). We do NOT store full card numbers ourselves.",
                "Usage data: anonymous analytics such as pages visited, generation counts, and device/browser information used to improve the service.",
                "Communications: if you contact us through the contact form, we keep the message and your contact details to respond.",
              ],
            },
            {
              title: "2. How We Use Your Information",
              content: [
                "To provide and operate the Storebuilder.ph service, including generating websites, saving your edits, and hosting your published sites.",
                "To process subscription payments and renewals through PayMongo.",
                "To send transactional emails (account confirmations, billing receipts, security alerts). We will not send marketing emails without your consent.",
                "To respond to your support requests and inquiries.",
                "To detect, prevent, and respond to fraud, abuse, or violations of our Terms of Service.",
                "To improve our product, including evaluating quality and reliability.",
              ],
            },
            {
              title: "3. AI Processing",
              content: [
                "When you generate or edit a website, the prompts and content you provide are sent to a third-party AI provider (our AI technology partner) for processing.",
                "We send only the data necessary to perform the request (your prompt and the website content being edited). We do not send your password, payment details, or personal account information.",
                "Our AI technology partner processes data in accordance with their own privacy and data-retention policies and, to our knowledge, does not use this data to train their public models.",
                "You are responsible for the content you submit. Do not include sensitive personal data of third parties in your prompts.",
              ],
            },
            {
              title: "4. Sharing of Information",
              content: [
                "We do NOT sell your personal data to anyone.",
                "We share data only with the service providers required to operate the platform: our hosting provider, our payment gateway (PayMongo), our email-delivery provider, and our AI technology partner.",
                "We may disclose information if compelled by a valid Philippine legal process (subpoena, court order, or government request) or to protect the rights, property, or safety of Storebuilder.ph, our users, or the public.",
                "If we are ever acquired or merged with another company, your information may be transferred as part of the transaction; we will notify you in advance.",
              ],
            },
            {
              title: "5. Cookies and Tracking",
              content: [
                "We use cookies and similar technologies for essential functions: keeping you signed in, remembering your editor session, and securing the application.",
                "We use anonymous analytics to understand how the product is used and improve it.",
                "You can disable cookies in your browser settings, but parts of the service (notably signing in) may stop working.",
              ],
            },
            {
              title: "6. Data Storage and Security",
              content: [
                "We store data on secure, encrypted cloud infrastructure.",
                "Passwords are stored using industry-standard one-way hashing — we cannot read your password.",
                "Payments are processed by PayMongo, a PCI-DSS compliant Philippine payment provider; we never see your full card number.",
                "While we apply reasonable safeguards, no online system is perfectly secure. We will notify you and the National Privacy Commission as required by law if a breach affects your personal data.",
              ],
            },
            {
              title: "7. Data Retention",
              content: [
                "Account and website data is retained for as long as your account is active.",
                "If you delete your account, your account data and websites are removed within 30 days. We may keep limited records (e.g. billing history) as required by Philippine tax law.",
                "You can request a full export or deletion of your data at any time through the contact form.",
              ],
            },
            {
              title: "8. Your Rights",
              content: [
                "Under the Data Privacy Act of 2012 you have the right to: (a) be informed, (b) access your data, (c) correct inaccurate data, (d) request erasure or blocking, (e) object to processing, (f) data portability, and (g) file a complaint with the National Privacy Commission.",
                "To exercise any of these rights, contact us through our contact form.",
                "We will respond to verified requests within a reasonable time, not longer than 15 business days.",
              ],
            },
            {
              title: "9. Children’s Privacy",
              content: [
                "Storebuilder.ph is intended for users 18 years of age or older. We do not knowingly collect personal information from anyone under 18.",
                "If you believe a minor has registered an account, please contact us and we will remove the account and associated data.",
              ],
            },
            {
              title: "10. International Transfers",
              content: [
                "Some of our service providers (such as cloud hosting and our AI technology partner) operate servers outside the Philippines.",
                "When data is transferred internationally we ensure the recipient maintains protections substantially similar to those required by the Data Privacy Act.",
              ],
            },
            {
              title: "11. Changes to This Policy",
              content: [
                "We may update this Privacy Policy from time to time. The “Last updated” date at the top of this page reflects the latest version.",
                "For material changes that affect how we use your personal information, we will notify registered users by email at least 14 days before the change takes effect.",
              ],
            },
            {
              title: "12. Contact Us",
              content: [
                "For privacy-related questions, data access requests, or complaints, please use our contact form:",
                "Contact form: https://storebuilder.ph/contact",
                "Location: Philippines",
                "We aim to respond to every privacy inquiry within 2 business days.",
              ],
            },
          ].map((section) => (
            <section key={section.title}>
              <h2 className="text-lg font-bold text-gray-900 mb-3" style={{ borderLeft: `3px solid ${BLUE}`, paddingLeft: "12px" }}>
                {section.title}
              </h2>
              <ul className="space-y-2">
                {section.content.map((item, i) => (
                  <li key={i} className="text-gray-600 leading-relaxed pl-3 border-l border-gray-100">
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8 px-4 text-center text-sm">
        <div className="flex flex-wrap justify-center gap-6 mb-4">
          <Link href="/" className="hover:text-white transition-colors">Home</Link>
          <Link href="/about" className="hover:text-white transition-colors">About</Link>
          <Link href="/upgrade" className="hover:text-white transition-colors">Pricing</Link>
          <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
          <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
          <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
        </div>
        <p className="text-gray-600 text-xs">© 2025 Storebuilder.ph · Built in the Philippines</p>
      </footer>
    </div>
  );
}
