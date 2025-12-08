import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import ComponentCard from "@/components/common/ComponentCard2";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PageMeta from "@/components/common/PageMeta";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, Plus, Shield } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";

interface Permission {
  id: string;
  name: string;
  description?: string;
  category: string;
}

interface Role {
  id: string;
  name: string;
  description?: string;
  isSystem: boolean;
  permissions: Permission[];
  staffCount?: number;
}

export default function RolesManagement() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [permissionsByCategory, setPermissionsByCategory] = useState<Record<string, Permission[]>>({});
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    selectedPermissions: [] as string[],
  });
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [rolesData, permsData] = await Promise.all([
        api.roles.getAll(),
        api.roles.getPermissions(),
      ]);

      setRoles(rolesData);
      setPermissions(permsData.all);
      setPermissionsByCategory(permsData.byCategory);
    } catch (error: any) {
      console.error("Failed to load roles:", error);
      toast.error("Failed to load roles and permissions");
    } finally {
      setLoading(false);
    }
  }

  function openCreateDialog() {
    setEditingRole(null);
    setFormData({
      name: "",
      description: "",
      selectedPermissions: [],
    });
    setDialogOpen(true);
  }

  function openEditDialog(role: Role) {
    setEditingRole(role);
    setFormData({
      name: role.name,
      description: role.description || "",
      selectedPermissions: role.permissions.map((p) => p.id),
    });
    setDialogOpen(true);
  }

  function openDeleteDialog(role: Role) {
    setRoleToDelete(role);
    setDeleteDialogOpen(true);
  }

  async function handleSubmit() {
    if (!formData.name.trim()) {
      toast.error("Role name is required");
      return;
    }

    if (formData.selectedPermissions.length === 0) {
      toast.error("Please select at least one permission");
      return;
    }

    try {
      setSubmitting(true);

      if (editingRole) {
        // Update existing role
        await api.roles.update(editingRole.id, {
          name: formData.name,
          description: formData.description || undefined,
          permissionIds: formData.selectedPermissions,
        });
        toast.success("Role updated successfully");
      } else {
        // Create new role
        await api.roles.create({
          name: formData.name,
          description: formData.description || undefined,
          permissionIds: formData.selectedPermissions,
        });
        toast.success("Role created successfully");
      }

      setDialogOpen(false);
      await loadData();
    } catch (error: any) {
      console.error("Failed to save role:", error);
      toast.error(error.message || "Failed to save role");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!roleToDelete) return;

    try {
      await api.roles.delete(roleToDelete.id);
      toast.success("Role deleted successfully");
      setDeleteDialogOpen(false);
      setRoleToDelete(null);
      await loadData();
    } catch (error: any) {
      console.error("Failed to delete role:", error);
      toast.error(error.message || "Failed to delete role");
    }
  }

  function togglePermission(permissionId: string) {
    setFormData((prev) => ({
      ...prev,
      selectedPermissions: prev.selectedPermissions.includes(permissionId)
        ? prev.selectedPermissions.filter((id) => id !== permissionId)
        : [...prev.selectedPermissions, permissionId],
    }));
  }

  function selectAllInCategory(category: string) {
    const categoryPerms = permissionsByCategory[category] || [];
    const allSelected = categoryPerms.every((p) =>
      formData.selectedPermissions.includes(p.id)
    );

    setFormData((prev) => ({
      ...prev,
      selectedPermissions: allSelected
        ? prev.selectedPermissions.filter(
            (id) => !categoryPerms.find((p) => p.id === id)
          )
        : [
            ...prev.selectedPermissions,
            ...categoryPerms
              .map((p) => p.id)
              .filter((id) => !prev.selectedPermissions.includes(id)),
          ],
    }));
  }

  if (loading) {
    return (
      <div className="container mx-auto py-3 sm:py-5">
        <PageBreadcrumb pageTitle="Roles & Permissions" />
        <div className="flex items-center justify-center py-10 sm:py-16">
          <p className="text-gray-500">Loading roles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-3 sm:py-5">
      <PageMeta title="Roles & Permissions | Supashop" description="Manage roles and permissions for your staff" />
      <PageBreadcrumb pageTitle="Roles & Permissions" />

      <ComponentCard
        title="Role Management"
        className="text-[40px]"
        desc="Manage roles and permissions for your staff"
        buttons={
          <Button
            onClick={openCreateDialog}
            className="text-white bg-blue-700 hover:bg-blue-800 text-xs sm:text-sm h-8 sm:h-9"
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Create Role
          </Button>
        }
      >
        <div className="space-y-3">
          {roles.map((role) => (
            <div
              key={role.id}
              className="border rounded-lg p-3 sm:p-4 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                    <h3 className="text-sm sm:text-base font-semibold">{role.name}</h3>
                    {role.isSystem && (
                      <Badge variant="secondary" className="text-xs">
                        <Shield className="mr-1 h-3 w-3" />
                        System Role
                      </Badge>
                    )}
                    {role.staffCount !== undefined && role.staffCount > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {role.staffCount} staff member{role.staffCount !== 1 ? "s" : ""}
                      </Badge>
                    )}
                  </div>
                  {role.description && (
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {role.description}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1.5">
                    {role.permissions.map((permission) => (
                      <Badge
                        key={permission.id}
                        variant="outline"
                        className="text-xs"
                      >
                        {permission.name}
                      </Badge>
                    ))}
                  </div>
                </div>
                {!role.isSystem && (
                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(role)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openDeleteDialog(role)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </ComponentCard>

      {/* Create/Edit Role Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRole ? "Edit Role" : "Create New Role"}
            </DialogTitle>
            <DialogDescription>
              {editingRole
                ? "Update the role name, description, and permissions"
                : "Create a new role and assign permissions to it"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Role Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="e.g., Manager, Cashier, Inventory Clerk"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Brief description of this role"
              />
            </div>

            <div className="space-y-4">
              <Label>Permissions</Label>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Select the permissions this role should have
              </p>

              {Object.keys(permissionsByCategory).map((category) => (
                <div
                  key={category}
                  className="border rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold capitalize">{category}</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => selectAllInCategory(category)}
                    >
                      {permissionsByCategory[category].every((p) =>
                        formData.selectedPermissions.includes(p.id)
                      )
                        ? "Deselect All"
                        : "Select All"}
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {permissionsByCategory[category].map((permission) => (
                      <div
                        key={permission.id}
                        className="flex items-start space-x-2"
                      >
                        <Checkbox
                          id={permission.id}
                          checked={formData.selectedPermissions.includes(
                            permission.id
                          )}
                          onCheckedChange={() => togglePermission(permission.id)}
                        />
                        <div className="flex flex-col">
                          <label
                            htmlFor={permission.id}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            {permission.name}
                          </label>
                          {permission.description && (
                            <p className="text-xs text-gray-500 mt-1">
                              {permission.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting
                ? "Saving..."
                : editingRole
                ? "Update Role"
                : "Create Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the role "{roleToDelete?.name}".
              {roleToDelete?.staffCount && roleToDelete.staffCount > 0 ? (
                <span className="block mt-2 text-red-600 font-semibold">
                  Warning: {roleToDelete.staffCount} staff member
                  {roleToDelete.staffCount !== 1 ? "s are" : " is"} assigned to
                  this role. You must reassign them before deleting.
                </span>
              ) : (
                " This action cannot be undone."
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={
                roleToDelete?.staffCount !== undefined &&
                roleToDelete.staffCount > 0
              }
            >
              Delete Role
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
