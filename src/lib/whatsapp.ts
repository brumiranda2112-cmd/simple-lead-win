/**
 * Opens WhatsApp Web/App with the given phone number.
 * Strips non-digits, ensures country code (defaults to +55 Brazil).
 */
export function openWhatsApp(phone: string, message?: string) {
  let digits = phone.replace(/\D/g, '');
  // Add Brazil country code if not present
  if (digits.length <= 11) {
    digits = '55' + digits;
  }
  const url = message
    ? `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
    : `https://wa.me/${digits}`;
  window.open(url, '_blank');
}
