import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  // ESSE LOG VAI APARECER NO PAINEL DA VERCEL SE O ARQUIVO ESTIVER SENDO LIDO
  console.log("🔴 MIDDLEWARE RODANDO NA ROTA: ", req.nextUrl.pathname)

  const res = NextResponse.next()
  
  try {
    const supabase = createMiddlewareClient({ req, res })
    const { data: { session } } = await supabase.auth.getSession()

    console.log("🔎 STATUS DA SESSÃO:", session ? "LOGADO" : "NÃO LOGADO")

    const path = req.nextUrl.pathname

    // Bloqueia se não tiver sessão e não for login
    if (!session && path !== '/login') {
      console.log("🚫 BLOQUEANDO ACESSO -> REDIRECIONANDO PARA LOGIN")
      const redirectUrl = req.nextUrl.clone()
      redirectUrl.pathname = '/login'
      return NextResponse.redirect(redirectUrl)
    }

    // Se já logado e tenta login
    if (session && path === '/login') {
      const redirectUrl = req.nextUrl.clone()
      redirectUrl.pathname = '/'
      return NextResponse.redirect(redirectUrl)
    }

  } catch (e) {
    console.error("❌ ERRO NO MIDDLEWARE:", e)
  }

  return res
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}