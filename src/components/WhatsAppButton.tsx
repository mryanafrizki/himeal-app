import { WHATSAPP_URL } from "@/lib/constants";

interface WhatsAppButtonProps {
  message?: string;
}

export default function WhatsAppButton({ message }: WhatsAppButtonProps) {
  const href = message
    ? `${WHATSAPP_URL}?text=${encodeURIComponent(message)}`
    : WHATSAPP_URL;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="w-full h-14 bg-[#25D366] rounded-full flex items-center justify-center gap-3 active:scale-[0.98] transition-transform shadow-lg shadow-[#25D366]/10"
    >
      <span
        className="material-symbols-outlined text-[#01391c]"
        style={{ fontVariationSettings: "'FILL' 1" }}
      >
        phone
      </span>
      <span className="font-headline font-extrabold text-[#01391c] uppercase tracking-tight">Hubungi Kami</span>
    </a>
  );
}
