import { EntityAdmin } from "@/components/admin/EntityAdmin";
import { AdminOnly } from "@/components/AdminOnly";

export default function AdminPage() {
  return (
    <AdminOnly>
      <EntityAdmin />
    </AdminOnly>
  );
}
