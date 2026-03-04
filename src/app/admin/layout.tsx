import Link from "next/link";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <nav className="flex flex-wrap gap-3 border-b border-gray-200/80 pb-4">
        <Link
          href="/admin/tasks"
          className="min-h-[44px] flex items-center rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100 hover:text-otic-primary touch-manipulation"
        >
          Uppgifter & delmoment
        </Link>
        <Link
          href="/admin/users"
          className="min-h-[44px] flex items-center rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100 hover:text-otic-primary touch-manipulation"
        >
          Användare
        </Link>
      </nav>
      {children}
    </div>
  );
}
