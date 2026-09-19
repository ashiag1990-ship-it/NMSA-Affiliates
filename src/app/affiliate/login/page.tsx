import { UnifiedLoginForm } from "@/components/auth/UnifiedLoginForm";

// The one sign-in page for the whole app — affiliates and admins share it.
// See UnifiedLoginForm for how it decides where to send a successful login.
export default function LoginPage() {
  return <UnifiedLoginForm />;
}
