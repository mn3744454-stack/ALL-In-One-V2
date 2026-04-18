// Re-export of the shared multi-phone component preserved for back-compat
// with existing client-side imports. The implementation now lives at
// `src/components/shared/contact/MultiPhoneInput.tsx`.
//
// The shared component defaults `labelNamespace` to 'clients', so this
// re-export preserves the exact previous behavior with zero call-site changes.
export { MultiPhoneInput, type PhoneEntry } from "@/components/shared/contact/MultiPhoneInput";
