import { useEffect, useState } from "react";
import ComponentCard from "@/components/common/ComponentCard2";
import { createColumns, Staff } from "./Columns";
import { DataTable } from "./DataTable";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DownloadIcon } from "lucide-react";
import { getProfiles } from "@/supabaseClient";
import api from "@/lib/api";
import { toast } from "sonner";

export default function Staffs() {
  const [data, setData] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState<Staff | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  function handleDeleteClick(staff: Staff) {
    setStaffToDelete(staff);
    setDeleteDialogOpen(true);
  }

  async function handleDeleteConfirm() {
    if (!staffToDelete) return;

    try {
      setDeleting(true);
      await api.staff.remove(staffToDelete.id);
      toast.success("Staff member removed successfully");
      setDeleteDialogOpen(false);
      setStaffToDelete(null);
      await loadStaff(); // Reload the staff list
    } catch (error: any) {
      console.error("Failed to delete staff:", error);
      toast.error(error.message || "Failed to remove staff member");
    } finally {
      setDeleting(false);
    }
  }

  const columns = createColumns(handleDeleteClick);

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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove "{staffToDelete?.name}" from your shop. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? "Removing..." : "Remove Staff"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
