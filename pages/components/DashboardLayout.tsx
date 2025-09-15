// components/DashboardLayout.tsx
import { ReactNode } from "react";
import {
  FiBox,
  FiUsers,
  FiClipboard,
  FiTrendingUp,
  FiCalendar,
  FiHome,
} from "react-icons/fi";
import Link from "next/link";
import { useRouter } from "next/router";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const navItems = [
    { label: "Dashboard", href: "/admin/dashboard", icon: <FiHome /> },
    { label: "Products", href: "/admin/products", icon: <FiBox /> },
    {
      label: "Reservations",
      href: "/admin/reservations",
      icon: <FiCalendar />,
    },
    { label: "Employees", href: "/admin/employees", icon: <FiUsers /> },
    { label: "Inventory", href: "/admin/inventory", icon: <FiClipboard /> },
    { label: "Finance", href: "/admin/finance", icon: <FiTrendingUp /> },
  ];

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-[#111827] text-white flex flex-col">
        <div className="p-6 font-bold text-xl tracking-wide">
          🍴 Ralahami Admin
        </div>
        <nav className="flex-1">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <div
                className={`flex items-center gap-3 px-6 py-3 cursor-pointer hover:bg-gray-800 ${
                  router.pathname === item.href ? "bg-gray-900" : ""
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </div>
            </Link>
          ))}
        </nav>
        <div className="p-6 text-sm text-gray-400">
          © {new Date().getFullYear()} Ralahami.lk
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Topbar */}
        <header className="h-16 bg-white border-b flex items-center justify-between px-6">
          <div className="font-semibold text-lg">Admin Dashboard</div>
          <div className="flex items-center gap-4">
            <input
              type="text"
              placeholder="Search..."
              className="px-3 py-1 rounded-lg border text-sm"
            />
            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center font-bold">
              SA
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 p-6">{children}</div>
      </main>
    </div>
  );
}
