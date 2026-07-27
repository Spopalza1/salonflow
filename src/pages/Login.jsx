import React from "react";
import { Link, Navigate } from "react-router-dom";
import { LogIn } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import LoginForm from "@/components/LoginForm";

export default function Login() {
  const urlParams = new URLSearchParams(window.location.search);
  const emailParam = urlParams.get('email');
  if (emailParam) {
    return <Navigate to={`/register${window.location.search}`} replace />;
  }

  return (
    <AuthLayout
      icon={LogIn}
      title="Welcome back"
      subtitle="Log in to your account"
      footer={
        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            Registration is by invitation only.
          </p>
          <Link to="/salon-signup" className="text-sm text-primary font-medium hover:underline block">
            Want to start your own salon? Sign up here →
          </Link>
        </div>
      }
    >
      <LoginForm />
    </AuthLayout>
  );
}