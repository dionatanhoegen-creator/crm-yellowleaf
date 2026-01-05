import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  // Atualiza a sessão (isso é crucial para o Supabase ver o cookie)
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const path = req.nextUrl.pathname

  // SE NÃO TIVER LOGADO E NÃO FOR A PÁGINA DE LOGIN
  if (!session && path !== '/login') {
    // Manda pro login
    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = '/login'
    return NextResponse.redirect(redirectUrl)
  }

  // SE JÁ TIVER LOGADO E TENTAR ENTRAR NO LOGIN
  if (session && path === '/login') {
    // Manda pro Dashboard (Home)
    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = '/'
    return NextResponse.redirect(redirectUrl)
  }

  return res
}

export const config = {
  matcher: [
    /*
     * Matcher poderoso:
     * Protege TODAS as rotas do site, EXCETO:
     * - api (rotas de api)
     * - _next/static (arquivos estáticos)
     * - _next/image (otimização de imagens)
     * - favicon.ico (ícone do site)
     * - login (a própria página de login)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|login).*)',
  ],
}