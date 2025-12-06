
import { AuthCard } from "@/components/auth/auth-card";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Forgot Password"
      description="Enter your email to receive a password reset link."
      footerText="Remembered your password?"
      footerLink="/login"
      footerLinkText="Log In"
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
