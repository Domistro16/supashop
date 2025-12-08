import ComponentCard from "@/components/common/ComponentCard2";
import { DataTable } from "./DataTable2";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PageMeta from "@/components/common/PageMeta";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DownloadIcon, LayoutGrid, Table as TableIcon } from "lucide-react";
import { Invites, columns } from "./Columns2";
import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";

type ViewMode = "cards" | "table";

function getInitials(name?: string) {
  if (!name) return "IV";
  const pieces = name.trim().split(" ");
  const first = pieces[0]?.[0];
  const last = pieces[pieces.length - 1]?.[0];
  return `${first ?? ""}${last ?? ""}`.toUpperCase() || "IV";
}

export default function Invite() {
  const [data, setData] = useState<Invites[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [searchTerm, setSearchTerm] = useState("");

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

  const filteredInvites = useMemo(() => {
    const term = searchTerm.toLowerCase();
    if (!term) return data;
    return data.filter(
      (invite) =>
        invite.name?.toLowerCase().includes(term) ||
        invite.email?.toLowerCase().includes(term) ||
        invite.role?.toLowerCase().includes(term)
    );
  }, [data, searchTerm]);

  return (
    <div className="container mx-auto py-10">
      <PageMeta title="Staff Invites | Supashop" description="View and manage staff invitations" />
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
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              <div className="inline-flex items-center gap-1 bg-gray-100 dark:bg-gray-900/50 rounded-lg p-1 w-full md:w-auto">
                <Button
                  variant={viewMode === "cards" ? "default" : "ghost"}
                  className="flex-1 md:flex-none text-xs sm:text-sm"
                  onClick={() => setViewMode("cards")}
                >
                  <LayoutGrid className="h-4 w-4 mr-2" />
                  Invite view
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
            ) : filteredInvites.length === 0 ? (
              <div className="flex items-center justify-center py-10 text-gray-500 dark:text-gray-400">
                No invites match your search yet.
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filteredInvites.map((invite) => (
                  <div
                    key={invite.id}
                    className="rounded-xl border border-gray-200 dark:border-white/[0.05] bg-white dark:bg-white/[0.03] p-4 flex flex-col gap-3 shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-11 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-100 flex items-center justify-center font-semibold">
                        {getInitials(invite.name)}
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{invite.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{invite.email}</p>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-[11px]">{invite.role}</Badge>
                          <Badge
                            variant={invite.accepted ? "outline" : "secondary"}
                            className={`text-[11px] ${invite.accepted ? "text-emerald-700 border-emerald-200 dark:border-emerald-700 dark:text-emerald-200" : "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-100"}`}
                          >
                            {invite.accepted ? "Accepted" : "Pending"}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs sm:text-sm"
                        onClick={() => navigator.clipboard.writeText(invite.email)}
                      >
                        Copy email
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white"
                        onClick={() => navigator.clipboard.writeText(invite.id)}
                      >
                        Copy invite ID
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </ComponentCard>
    </div>
  );
}
