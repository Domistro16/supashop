import ComponentCard from "@/components/common/ComponentCard2";
import { DataTable } from "./DataTable2";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Button } from "@/components/ui/button";
import { DownloadIcon } from "lucide-react";
import { Invites, columns } from "./Columns2";
import { useEffect, useState } from "react";
import api from "@/lib/api";

export default function Invite() {
  const [data, setData] = useState<Invites[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInvites = async () => {
      try {
        setLoading(true);
        setError(null);
        const invites = await api.staff.getInvites();
        setData(invites);
      } catch (err) {
        console.error("Failed to fetch invites:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch invites");
      } finally {
        setLoading(false);
      }
    };

    fetchInvites();
  }, []);

  return (
    <div className="container mx-auto py-10">
      <PageBreadcrumb pageTitle="Invites" />
      <ComponentCard
        title="Invite List"
        className="text-[40px]"
        desc="View the invites you have sent for this store"
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
          <div className="flex justify-center items-center py-10">
            <p className="text-gray-500">Loading invites...</p>
          </div>
        ) : error ? (
          <div className="flex justify-center items-center py-10">
            <p className="text-red-500">Error: {error}</p>
          </div>
        ) : (
          <DataTable columns={columns} data={data} />
        )}
      </ComponentCard>
    </div>
  );
}
