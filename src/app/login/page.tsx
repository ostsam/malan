import { LoginForm } from "@/components/login-form"

export default function LoginPage() {
  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-2">
        <a href="/" className="flex items-center self-center font-medium">
          <img src="/logo.svg" alt="Malan Logo" className="h-12 w-auto" />
          <span className="text-2xl font-semibold">Malan</span>
        </a>
        <LoginForm />
      </div>
    </div>
  )
}
