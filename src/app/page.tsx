import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentAppUser } from "@/lib/auth/server";
import { getDefaultRoute } from "@/lib/auth/roles";

export default async function HomePage() {
  const user = await getCurrentAppUser();
  if (user?.roles.length) {
    redirect(getDefaultRoute(user.roles));
  }

  return (
    <div className="flex flex-col items-center justify-center gap-8 py-12 text-center sm:py-20">
      <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
        Ötic Onboarding
      </h1>
      <p className="max-w-xl text-lg text-gray-600">
        Välkommen till onboarding för nya medarbetare på trafikledningscentralen
        Östgötatrafiken.
      </p>
      <div className="flex flex-wrap justify-center gap-4">
        <Link
          href="/login"
          className="rounded-xl bg-otic-primary px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-otic-primaryDark focus:outline-none focus:ring-2 focus:ring-otic-primary focus:ring-offset-2"
        >
          Logga in
        </Link>
      </div>
    </div>
  );
}
