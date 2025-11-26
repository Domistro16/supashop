import { useEffect, useState } from "react";
import ComponentCard from "@/components/common/ComponentCard2";
import { columns, Staff } from "./Columns";
import { DataTable } from "./DataTable";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Button } from "@/components/ui/button";
import { DownloadIcon } from "lucide-react";
import { getProfiles } from "@/supabaseClient";
import { toast } from "sonner";

export default function Staffs() {
  const [data, setData] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStaff();
  }, []);

  async function loadStaff() {
    try {
      setLoading(true);
      const result = await getProfiles();

      if (result && result.profiles) {
        // Map the profiles to the Staff type
        const staffList: Staff[] = result.profiles.map((profile: any) => ({
          id: profile.id,
          name: profile.name,
          email: profile.email,
          role: profile.role,
        }));

        setData(staffList);
      } else {
        setData([]);
      }
    } catch (error) {
      console.error("Failed to load staff:", error);
      toast.error("Failed to load staff members");
      setData([]);
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="container mx-auto py-10">
      <PageBreadcrumb pageTitle="Staffs" />
      <ComponentCard
        title="Staff List"
        className="text-[40px]"
        desc="View the staff in the store"
        buttons={
          <div className="flex items-center justify-between gap-1 md:gap-5 mb-2 md:mb-0 md:mr-5">
            <Button
              variant="outline"
              className="text-gray-400 flex-end md:py-6 text-[12px] md:text-[15px] flex items-center"
            >
              Export <DownloadIcon className="ml-1 h-4 w-4" />
            </Button>
            <Button
              variant="default"
              className="text-white bg-blue-700 hover:bg-blue-800 flex-end md:py-6 text-[12px] md:text-[15px]"
              onClick={() => (window.location.href = "/staff/add")}
            >
              Add Staff +
            </Button>
          </div>
        }
      >
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <p className="text-gray-500">Loading staff...</p>
          </div>
        ) : (
          <DataTable columns={columns} data={data} />
        )}
      </ComponentCard>
    </div>
  );
}
