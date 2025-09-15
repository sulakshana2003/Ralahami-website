import DashboardLayout from "../components/DashboardLayout";

export default function AdminDashboard() {
  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold mb-6">Dashboard Overview</h1>

      {/* Stats Section */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard
          title="Total Orders"
          value="687.3k"
          change="-9.19%"
          positive={false}
        />
        <StatCard
          title="Total Returns"
          value="9.62k"
          change="+26.87%"
          positive={true}
        />
        <StatCard
          title="Avg. Sales Earnings"
          value="LKR 25,400"
          change="+3.51%"
          positive={true}
        />
        <StatCard
          title="Website Visits"
          value="87.94M"
          change="-1.05%"
          positive={false}
        />
      </div>

      {/* Revenue vs Expenses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Revenue Overview</h2>
          <p className="text-sm text-gray-600 mb-2">
            This will later show revenue vs expenses chart
          </p>
          <div className="h-40 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500">
            📊 Chart Placeholder
          </div>
        </div>
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Top Products</h2>
          <ul className="divide-y text-sm">
            <li className="py-2 flex justify-between">
              <span>Chicken Biryani</span> <span>LKR 45,000</span>
            </li>
            <li className="py-2 flex justify-between">
              <span>Rice & Curry</span> <span>LKR 38,000</span>
            </li>
            <li className="py-2 flex justify-between">
              <span>Fresh Juices</span> <span>LKR 12,500</span>
            </li>
          </ul>
        </div>
      </div>
    </DashboardLayout>
  );
}

function StatCard({
  title,
  value,
  change,
  positive,
}: {
  title: string;
  value: string;
  change: string;
  positive: boolean;
}) {
  return (
    <div className="bg-white rounded-xl shadow p-4">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
      <div
        className={`text-xs mt-1 ${
          positive ? "text-green-600" : "text-red-600"
        }`}
      >
        {change} since last month
      </div>
    </div>
  );
}
