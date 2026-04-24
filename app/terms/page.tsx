import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Terms of Service — Storebuilder.ph",
  description: "Terms of Service for Storebuilder.ph, the AI-powered website builder for the Philippines. Read our policies on user accounts, payments, intellectual property, and more.",
};

const BLUE = "#1877F2";

export default function TermsPage() {
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
            <Link href="/terms" className="transition-colors" style={{ color: BLUE }}>Terms</Link>
          </div>
          <Link href="/auth/register" className="px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ backgroundColor: BLUE }}>
            Get started free
          </Link>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-14">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Terms of Service</h1>
        <p className="text-gray-500 text-sm mb-10">Last updated: January 1, 2025 · Effective immediately</p>

        <div className="prose prose-gray max-w-none space-y-10 text-sm leading-relaxed text-gray-700">

          <section>
            <p>
              Welcome to <strong>Storebuilder.ph</strong> ("we," "us," or "our"), an AI-powered website builder operated by Mark Ocdenaria, based in the Philippines. By accessing or using our platform at <strong>storebuilder.ph</strong>, you ("User") agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, please do not use our services.
            </p>
          </section>

          {[
            {
              title: "1. User Accounts",
              content: [
                "You must be at least 13 years old to create an account on Storebuilder.ph.",
                "You are responsible for maintaining the confidentiality of your account credentials. Do not share your password with anyone.",
                "You agree to provide accurate, current, and complete information when registering. Providing false information may result in account termination.",
                "You are solely responsible for all activities that occur under your account.",
                "You must notify us immediately at Storebuilderph@gmail.com if you suspect any unauthorized use of your account.",
                "We reserve the right to suspend or terminate accounts that violate these Terms.",
              ],
            },
            {
              title: "2. Acceptable Use Policy",
              content: [
                "You may use Storebuilder.ph only for lawful purposes and in accordance with these Terms.",
                "You agree NOT to use our platform to: (a) create websites that promote illegal activities, hate speech, discrimination, or violence; (b) infringe on the intellectual property rights of others; (c) distribute malware, spam, or harmful content; (d) impersonate any person or entity; (e) violate any applicable Philippine laws or regulations.",
                "You agree not to attempt to gain unauthorized access to our systems, servers, or databases.",
                "We reserve the right to remove any website or content that violates these guidelines without prior notice.",
                "Commercial use of the platform is permitted, provided it complies with all applicable laws of the Republic of the Philippines.",
              ],
            },
            {
              title: "3. AI-Generated Content",
              content: [
                "Storebuilder.ph uses Claude AI (by Anthropic) to generate website content based on your prompts.",
                "While we strive for high-quality output, we do not guarantee the accuracy, completeness, or fitness for any particular purpose of AI-generated content.",
                "You are responsible for reviewing and editing all AI-generated content before publishing your website.",
                "You must not use our AI features to generate content that violates any laws or these Terms.",
                "AI generation credits (Free: 3 per month, Pro: 30 per day) are non-transferable and cannot be carried over.",
              ],
            },
            {
              title: "4. Payments and Refund Policy",
              content: [
                "Pro subscriptions are processed securely through PayMongo, a PCI-compliant Philippine payment gateway.",
                "Accepted payment methods include GCash, Maya, GoTyme Bank, credit/debit cards (Visa, Mastercard), and BancNet.",
                "Pro Monthly: ₱499 per month, billed monthly. Pro Yearly: ₱4,299 per year, billed annually.",
                "Subscriptions auto-renew unless cancelled before the renewal date. You may cancel anytime from your dashboard.",
                "ALL PAYMENTS ARE FINAL AND NON-REFUNDABLE. We do not offer refunds for any reason, including but not limited to unused AI credits, partial months, or change of mind.",
                "AI generation credits are consumed immediately upon use and cannot be refunded under any circumstances.",
                "By completing your purchase, you acknowledge and agree to this no-refund policy. Please review your selection carefully before purchasing.",
                "We reserve the right to modify pricing with 30 days advance notice to existing subscribers.",
              ],
            },
            {
              title: "5. Intellectual Property",
              content: [
                "Your Content: You retain all intellectual property rights to content you create, upload, or provide through Storebuilder.ph. By using our service, you grant us a limited license to host and display your content solely for the purpose of providing our services.",
                "Our Platform: All rights, title, and interest in the Storebuilder.ph platform — including its source code, design, trademarks, and proprietary technology — are owned by us and protected under Philippine and international intellectual property laws.",
                "AI-Generated Content: Content generated by our AI tools based on your prompts is provided to you for your use. We do not claim ownership of your generated websites.",
                "You may not copy, modify, or reverse-engineer any part of our platform.",
              ],
            },
            {
              title: "6. Limitation of Liability",
              content: [
                "TO THE MAXIMUM EXTENT PERMITTED BY PHILIPPINE LAW, STOREBUILDER.PH SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF THE PLATFORM.",
                "Our total liability to you for any claims arising from these Terms or your use of the service shall not exceed the amount you paid us in the three (3) months preceding the claim.",
                "We do not guarantee uninterrupted, error-free service. We may suspend the service for maintenance, updates, or unforeseen circumstances.",
                "We are not responsible for the content published on websites created using our platform. You are solely responsible for your website's content and compliance with all applicable laws.",
                "We do not guarantee search engine rankings or business results from using our platform.",
              ],
            },
            {
              title: "7. Privacy",
              content: [
                "Our collection and use of personal information is governed by our Privacy Policy, which is incorporated into these Terms by reference.",
                "By using Storebuilder.ph, you consent to the collection and processing of your personal data as described in our Privacy Policy.",
                "We comply with the Philippines' Data Privacy Act of 2012 (Republic Act No. 10173).",
              ],
            },
            {
              title: "8. Governing Law and Jurisdiction",
              content: [
                "These Terms shall be governed by and construed in accordance with the laws of the Republic of the Philippines.",
                "Any disputes arising from these Terms or your use of Storebuilder.ph shall be subject to the exclusive jurisdiction of the competent courts of the Philippines.",
                "Before initiating legal proceedings, both parties agree to attempt to resolve disputes amicably through good-faith negotiation for a period of thirty (30) days.",
              ],
            },
            {
              title: "9. Changes to These Terms",
              content: [
                "We reserve the right to update these Terms at any time. We will notify registered users via email and post a notice on our website at least 14 days before major changes take effect.",
                "Your continued use of the platform after changes take effect constitutes your acceptance of the revised Terms.",
              ],
            },
            {
              title: "10. Contact Us",
              content: [
                "If you have any questions about these Terms, please contact us:",
                "Email: Storebuilderph@gmail.com",
                "Location: Philippines",
                "We will respond to your inquiry within 2 business days.",
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
        </div>
        <p className="text-gray-600 text-xs">© 2025 Storebuilder.ph · Built with 💙 in the Philippines</p>
      </footer>
    </div>
  );
}
