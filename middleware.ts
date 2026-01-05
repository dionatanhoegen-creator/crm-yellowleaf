import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  // PEGA O CAMINHO ATUAL
  const path = req.nextUrl.pathname

  // LÓGICA DE PROTEÇÃO
  // Se NÃO estiver logado e tentar acessar /admin OU a página inicial (/)
  if (!session && (path.startsWith('/admin') || path === '/')) {
    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = '/login'
    return NextResponse.redirect(redirectUrl)
  }

  // Se JÁ estiver logado e tentar acessar /login
  if (session && path === '/login') {
    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = '/' // Redireciona para o Dashboard (Home)
    return NextResponse.redirect(redirectUrl)
  }

  return res
}

export const config = {
  // ADICIONAMOS A BARRA '/' AQUI NA LISTA
  matcher: ['/', '/admin/:path*', '/login'],
}