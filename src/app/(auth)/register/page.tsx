
import { AuthCard } from "@/components/auth/auth-card";
import { RegisterForm } from "@/components/auth/register-form";

export default function RegisterPage() {
  return (
    <AuthCard
      title="Create an Account"
      description="Get started with TeachyTally by creating a new account."
      footerText="Already have an account?"
      footerLink="/login"
      footerLinkText="Log In"
    >
      <RegisterForm />
    </AuthCard>
  );
}
