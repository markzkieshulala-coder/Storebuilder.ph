import Link from "next/link";
import { CheckCircle } from "lucide-react";

interface Props {
  params: { subdomain: string; productId: string };
}

export default function CheckoutSuccessPage({ params }: Props) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 text-center" style={{ fontFamily: "'Google Sans',Roboto,Arial,system-ui,sans-serif" }}>
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-10 max-w-sm w-full">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: "#dcfce7" }}>
          <CheckCircle size={32} className="text-green-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Order placed!</h1>
        <p className="text-gray-500 text-sm leading-relaxed mb-8">
          Thank you for your purchase. The seller will contact you shortly to confirm your order and arrange delivery.
        </p>
        <Link
          href={`/sites/${params.subdomain}`}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm text-white transition-opacity hover:opacity-90"
          style={{ background: "#1877F2" }}
        >
          Back to store
        </Link>
      </div>
    </div>
  );
}
