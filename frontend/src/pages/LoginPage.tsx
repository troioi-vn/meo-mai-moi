import LoginForm from '@/components/LoginForm'

export default function LoginPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="w-full max-w-md p-8 space-y-8 bg-card rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold text-center text-card-foreground">
          Login
        </h1>
        <LoginForm />
      </div>
    </div>
  )
}
