import Link from "next/link";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <nav className="flex gap-4 border-b border-gray-200 pb-4">
        <Link
          href="/admin/tasks"
          className="text-sm font-medium text-gray-600 transition hover:text-otic-primary"
        >
          Uppgifter & delmoment
        </Link>
        <Link
          href="/admin/users"
          className="text-sm font-medium text-gray-600 transition hover:text-otic-primary"
        >
          Användare
        </Link>
      </nav>
      {children}
    </div>
  );
}
