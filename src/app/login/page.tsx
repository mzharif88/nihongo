import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4">
      <h1 className="text-3xl font-bold">
        日本語<span className="text-accent">Go!</span> JLPT
      </h1>
      <p className="mt-2 mb-8 text-muted">Sign in to continue studying.</p>
      <LoginForm />
      <p className="mt-6 text-xs text-muted">Private app. Accounts are created by the admin.</p>
    </main>
  );
}
