import { useEffect, useMemo, useState } from "react";
import ComponentCard from "@/components/common/ComponentCard2";
import { createColumns, Staff } from "./Columns";
import { DataTable } from "./DataTable";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PageMeta from "@/components/common/PageMeta";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { DownloadIcon, LayoutGrid, Table as TableIcon } from "lucide-react";
import { getProfiles } from "@/supabaseClient";
import api from "@/lib/api";
import { toast } from "sonner";
const managerImg = "/images/user/manager.jpg";
const ownerImg = "/images/user/owner.jpg";
const cashierImg = "/images/user/cashier.jpg";
const clerkImg = "/images/user/clerk.jpg";
const defaultUserImg = "/images/user/user-01.jpg";

type ViewMode = "cards" | "table";

function getInitials(name?: string) {
  if (!name) return "ST";
  const pieces = name.trim().split(" ");
  const first = pieces[0]?.[0];
  const last = pieces[pieces.length - 1]?.[0];
  return `${first ?? ""}${last ?? ""}`.toUpperCase() || "ST";
}

const roleImageMap: Record<string, string> = {
  manager: managerImg,
  admin: managerImg,
  owner: ownerImg,
  cashier: cashierImg,
  clerk: clerkImg,
};

function getAvatarForStaff(role?: string) {
  if (!role) return defaultUserImg;
  const key = role.toLowerCase();
  return roleImageMap[key] ?? defaultUserImg;
}

export default function Staffs() {
  const [data, setData] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState<Staff | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [searchTerm, setSearchTerm] = useState("");

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

  const filteredStaff = useMemo(() => {
    const term = searchTerm.toLowerCase();
    if (!term) return data;
    return data.filter(
      (staff) =>
        staff.name?.toLowerCase().includes(term) ||
        staff.email?.toLowerCase().includes(term) ||
        staff.role?.toLowerCase().includes(term)
    );
  }, [data, searchTerm]);

  return (
    <div className="container mx-auto py-3 sm:py-5">
      <PageMeta title="Staff | Supashop" description="Manage your store staff members" />
      <PageBreadcrumb pageTitle="Staffs" />
      <ComponentCard
        title="Staff List"
        className="text-[40px]"
        desc="View the staff in the store"
        buttons={
          <div className="flex items-center justify-between gap-1 md:gap-3 mb-2 md:mb-0 md:mr-3">
            <Button
              variant="outline"
              className="text-gray-400 flex-end py-2 md:py-2.5 text-[11px] md:text-[13px] flex items-center h-8 md:h-9"
            >
              Export <DownloadIcon className="ml-1 h-3.5 w-3.5" />
            </Button>
            <Button
              variant="default"
              className="text-white bg-blue-700 hover:bg-blue-800 flex-end py-2 md:py-2.5 text-[11px] md:text-[13px] h-8 md:h-9"
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
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              <div className="inline-flex items-center gap-1 bg-gray-100 dark:bg-gray-900/50 rounded-lg p-1 w-full md:w-auto">
                <Button
                  variant={viewMode === "cards" ? "default" : "ghost"}
                  className="flex-1 md:flex-none text-xs sm:text-sm"
                  onClick={() => setViewMode("cards")}
                >
                  <LayoutGrid className="h-4 w-4 mr-2" />
                  People view
                </Button>
                <Button
                  variant={viewMode === "table" ? "default" : "ghost"}
                  className="flex-1 md:flex-none text-xs sm:text-sm"
                  onClick={() => setViewMode("table")}
                >
                  <TableIcon className="h-4 w-4 mr-2" />
                  Table
                </Button>
              </div>
              {viewMode === "cards" && (
                <Input
                  placeholder="Search by name, email or role"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full md:w-72 h-9 text-sm dark:bg-gray-900"
                />
              )}
            </div>

            {viewMode === "table" ? (
              <DataTable columns={columns} data={data} />
            ) : filteredStaff.length === 0 ? (
              <div className="flex items-center justify-center py-10 text-gray-500 dark:text-gray-400">
                No staff match your search yet.
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filteredStaff.map((staff) => (
                  <div
                    key={staff.id}
                    className="rounded-xl border border-gray-200 dark:border-white/[0.05] bg-white dark:bg-white/[0.03] p-4 flex flex-col gap-3 shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-11 overflow-hidden rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-100 flex items-center justify-center font-semibold">
                        <img
                          src={getAvatarForStaff(staff.role)}
                          alt={`${staff.role || "Staff"} avatar`}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = defaultUserImg;
                          }}
                        />
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{staff.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{staff.email}</p>
                        <Badge variant="secondary" className="text-[11px]">{staff.role || "Staff"}</Badge>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs sm:text-sm"
                        onClick={() => navigator.clipboard.writeText(staff.email)}
                      >
                        Copy contact
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => handleDeleteClick(staff)}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
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
