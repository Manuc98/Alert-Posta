import { redirect } from 'next/navigation'

export default function HomePage() {
  // Redirecionar para o dashboard
  redirect('/dashboard')
}
