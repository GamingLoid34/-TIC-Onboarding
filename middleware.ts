import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PREFIXES = ["/admin", "/dashboard", "/mentor"];

function isProtected(pathname: string) {
  return PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: object }[]) {
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options as { path?: string })
        );
      },
    },
  });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (request.nextUrl.pathname === "/") {
    if (session) {
      const redirectRes = NextResponse.redirect(new URL("/dashboard", request.url));
      response.cookies.getAll().forEach((c) => redirectRes.cookies.set(c.name, c.value));
      return redirectRes;
    }
    const redirectRes = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.getAll().forEach((c) => redirectRes.cookies.set(c.name, c.value));
    return redirectRes;
  }

  if (request.nextUrl.pathname === "/login") {
    if (session) {
      const redirectRes = NextResponse.redirect(new URL("/dashboard", request.url));
      response.cookies.getAll().forEach((c) => redirectRes.cookies.set(c.name, c.value));
      return redirectRes;
    }
    return response;
  }

  if (isProtected(request.nextUrl.pathname) && !session) {
    const redirect = new URL("/login", request.url);
    redirect.searchParams.set("redirect", request.nextUrl.pathname);
    const redirectRes = NextResponse.redirect(redirect);
    response.cookies.getAll().forEach((c) => redirectRes.cookies.set(c.name, c.value));
    return redirectRes;
  }

  return response;
}

export const config = {
  matcher: ["/", "/admin/:path*", "/dashboard", "/dashboard/:path*", "/mentor", "/mentor/:path*", "/login", "/auth/callback"],
};
