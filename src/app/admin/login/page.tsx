import { UnifiedLoginForm } from "@/components/auth/UnifiedLoginForm";

// Kept only as the redirect target middleware/layout send an unauthenticated
// admin-panel visit to — it renders the exact same shared sign-in form as
// /affiliate/login, not a distinct "admin login" screen. Entering admin
// credentials here (or at /affiliate/login) routes to /admin either way.
export default function AdminLoginPage() {
  return <UnifiedLoginForm />;
}
