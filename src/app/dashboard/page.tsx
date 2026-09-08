import { DashboardTabs } from "@/components/dashboard/DashboardTabs";
import { AdminOnly } from "@/components/AdminOnly";

export default function DashboardPage() {
  return (
    <AdminOnly>
      <DashboardTabs />
    </AdminOnly>
  );
}
