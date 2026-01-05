import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()

  try {
    // ⚠️ AQUI ESTÁ O PULO DO GATO:
    // Passamos a URL e a CHAVE manualmente para garantir que ele leia
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

    // Lógica de proteção
    // Se NÃO tem sessão e NÃO está no login -> Manda pro Login
    if (!session && path !== '/login') {
      const redirectUrl = req.nextUrl.clone()
      redirectUrl.pathname = '/login'
      return NextResponse.redirect(redirectUrl)
    }

    // Se TEM sessão e tenta ir no login -> Manda pra Home
    if (session && path === '/login') {
      const redirectUrl = req.nextUrl.clone()
      redirectUrl.pathname = '/'
      return NextResponse.redirect(redirectUrl)
    }
  } catch (e) {
    // Se der erro, não derruba o site, apenas segue
    console.error('Erro no middleware:', e)
  }

  return res
}

export const config = {
  // Protege tudo exceto arquivos estáticos e API
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}