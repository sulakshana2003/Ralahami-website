// components/AdminLayout.tsx
import Link from "next/link";
import { useRouter } from "next/router";

const NavItem = ({ href, label, icon }: { href: string; label: string; icon?: React.ReactNode }) => {
  const { pathname } = useRouter();
  const active = pathname.startsWith(href);
  return (
    <Link
      href={href}
      className={[
        "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition",
        active
          ? "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200"
          : "text-neutral-700 hover:bg-neutral-100",
      ].join(" ")}
    >
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg ring-1 ring-neutral-200">
        {icon ?? "•"}
      </span>
      {label}
    </Link>
  );
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-100">
      {/* App bar background like the screenshot */}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-0 h-48 bg-gradient-to-b from-neutral-900 to-transparent" />

      <div className="relative z-10 mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 pb-12 pt-8 md:grid-cols-[260px,1fr] md:px-6 lg:px-8">
        {/* Sidebar */}
        <aside className="h-fit rounded-2xl border border-neutral-200 bg-white/90 p-5 shadow-sm backdrop-blur">
          <div className="mb-5 flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-neutral-900 text-white">◎</div>
            <div>
              <div className="text-base font-semibold">Ralahami Restaurant</div>
              <div className="text-xs text-neutral-500">Admin Panel</div>
            </div>
          </div>

          <nav className="space-y-1">
            {/* <NavItem href="/admin/dashboard" label="Dashboard" />
            <NavItem href="/admin/notifications" label="Notifications" />
            <NavItem href="/admin/employees" label="Employees" />
            <NavItem href="/admin/charts" label="Charts" />
            <NavItem href="/admin/graphs" label="Graphs" />
            <NavItem href="/admin/help" label="Help" />
            <NavItem href="/admin/support" label="Support" />
            <NavItem href="/admin/settings" label="Settings" /> */}
            {/* Your actual pages */}
            <div className="mt-4 border-t border-neutral-200 pt-4 text-xs font-medium text-neutral-500">Manage</div>
            <NavItem href="/admin/users" label="Users" />
            <NavItem href="/admin/products" label="Products" />
            {/* <NavItem href="/admin/orders" label="Orders" />
            <NavItem href="/admin/analytics" label="Analytics" /> */}
          </nav>
        </aside>

        {/* Main column with top bar + content container */}
        <section className="space-y-4">
          {/* Top bar */}
         {/*  <header className="flex items-center justify-between rounded-2xl border border-neutral-200 bg-white/90 px-5 py-4 shadow-sm backdrop-blur">
            <div className="flex items-center gap-6">
              <div className="text-lg font-semibold">Statistics</div>
              <div className="hidden text-sm text-neutral-500 md:block">Calendar</div>
              <div className="hidden text-sm text-neutral-500 md:block">Employees</div>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
                title="Help Bot"
              >
                💬 Help Bot
              </button>
              <button
                className="rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
                title="Notifications"
              >
                🔔
              </button>
            </div>
          </header> */}

          {/* Page content surface */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-0 shadow-sm">
            {children}
          </div>
        </section>
      </div>
    </div>
  );
}
