import { useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    // Check if user is authenticated and redirect accordingly
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me')
        if (response.ok) {
          // User is authenticated, redirect to dashboard
          router.push('/dashboard')
        } else {
          // User is not authenticated, redirect to login
          router.push('/login')
        }
      } catch (error) {
        // On error, redirect to login
        router.push('/login')
      }
    }

    checkAuth()
  }, [router])

  return (
    <>
      <Head>
        <title>MeuDAds - Sistema de Gerenciamento de Anúncios</title>
      </Head>
      
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <h2 className="mt-4 text-xl font-semibold text-gray-700">
            Carregando...
          </h2>
          <p className="mt-2 text-gray-500">
            Redirecionando para o sistema
          </p>
        </div>
      </div>
    </>
  )
}
