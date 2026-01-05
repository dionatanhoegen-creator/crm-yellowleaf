import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()

  try {
    // AQUI ESTÁ A CORREÇÃO:
    // Passamos a URL e a CHAVE manualmente para garantir que ele leia
    // Isso evita o erro de build na Vercel
    const supabase = createMiddlewareClient(
      { req, res },
      {
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
        supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      }
    )

    // Atualiza a sessão
    const {
      data: { session },
    } = await supabase.auth.getSession()

    const path = req.nextUrl.pathname

    // 1. Se NÃO tem sessão e tenta acessar qualquer coisa que NÃO seja login
    if (!session && path !== '/login') {
      const redirectUrl = req.nextUrl.clone()
      redirectUrl.pathname = '/login'
      return NextResponse.redirect(redirectUrl)
    }

    // 2. Se TEM sessão e tenta acessar o login
    if (session && path === '/login') {
      const redirectUrl = req.nextUrl.clone()
      redirectUrl.pathname = '/'
      return NextResponse.redirect(redirectUrl)
    }

  } catch (e) {
    // Se der erro, segue o jogo (não quebra o site)
    console.error('Erro no middleware:', e)
  }

  return res
}

export const config = {
  // Protege tudo, exceto arquivos de sistema (imagens, api, icones)
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}