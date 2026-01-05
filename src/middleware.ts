import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  // 1. AVISO DE VIDA
  console.log("🚨 MIDDLEWARE ACIONADO! Rota:", req.nextUrl.pathname)

  const res = NextResponse.next()
  
  // 2. TENTA CONECTAR
  const supabase = createMiddlewareClient({ req, res })
  const { data: { session } } = await supabase.auth.getSession()

  // 3. MOSTRA O QUE ACHOU
  console.log("🔎 Status da Sessão:", session ? "USUÁRIO LOGADO" : "NÃO LOGADO (ANÔNIMO)")

  // SE NÃO TIVER LOGADO E NÃO FOR A TELA DE LOGIN
  if (!session && req.nextUrl.pathname !== '/login') {
    console.log("🚫 BLOQUEIO ATIVADO: Redirecionando para /login")
    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = '/login'
    return NextResponse.redirect(redirectUrl)
  }

  return res
}

// VAMOS USAR UM MATCHER MAIS SIMPLES E DIRETO PARA TESTAR
export const config = {
  matcher: ['/', '/dashboard', '/admin/:path*'],
}