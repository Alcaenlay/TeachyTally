
import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <AuthCard
      title="Welcome Back"
      description="Log in to your TeachyTally account to continue."
      footerText="Don't have an account?"
      footerLink="/register"
      footerLinkText="Sign up"
    >
      <LoginForm />
    </AuthCard>
  );
}
