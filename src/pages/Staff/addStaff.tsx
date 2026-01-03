import { useEffect, useState } from "react";
import { useNavigate } from "@/lib/react-router-compat";
import ComponentCard from "@/components/common/ComponentCard2";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PageMeta from "@/components/common/PageMeta";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Copy, Check } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";
const formSchema = z.object({
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  roleId: z.string().min(1, {
    message: "Please select a role.",
  }),
});

export default function AddStaffs() {
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [credentialsDialogOpen, setCredentialsDialogOpen] = useState(false);
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null);
  const [copiedField, setCopiedField] = useState<'email' | 'password' | null>(null);
  const navigate = useNavigate();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      roleId: "",
    },
  });

  useEffect(() => {
    loadRoles();
  }, []);

  async function loadRoles() {
    try {
      setLoadingRoles(true);
      const rolesList = await api.roles.getAll();
      setRoles(rolesList);
    } catch (error) {
      console.error("Failed to load roles:", error);
      toast.error("Failed to load roles");
    } finally {
      setLoadingRoles(false);
    }
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setLoading(true);

      const result = await api.staff.invite({
        email: values.email,
        roleId: values.roleId,
      });

      if (result.isNewUser && result.tempPassword) {
        // Show credentials dialog for new users
        setCredentials({
          email: result.user.email,
          password: result.tempPassword,
        });
        setCredentialsDialogOpen(true);
        toast.success("Staff member created successfully!");
      } else {
        // Existing user added to shop
        toast.success("Staff member added to shop successfully!");
        navigate("/staff");
      }
    } catch (error: any) {
      console.error("Failed to invite staff:", error);
      toast.error(error.message || "Failed to send invitation");
    } finally {
      setLoading(false);
    }
  }

  async function copyToClipboard(text: string, field: 'email' | 'password') {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      toast.success(`${field === 'email' ? 'Email' : 'Password'} copied to clipboard!`);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      toast.error("Failed to copy to clipboard");
    }
  }

  function handleCredentialsDialogClose() {
    setCredentialsDialogOpen(false);
    setCredentials(null);
    setCopiedField(null);
    navigate("/staff");
  }
  return (
    <div className="container mx-auto py-3 sm:py-5">
      <PageMeta title="Add Staff | Supashop" description="Invite new staff members to your store" />
      <PageBreadcrumb pageTitle="Add Staff" />
      <ComponentCard title={"Staff Informaion"} className="text-[40px]">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row w-full gap-3 sm:gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="staff@example.com"
                        {...field}
                        className="w-full"
                      />
                    </FormControl>
                    <FormDescription>
                      Enter the email address of the staff member to invite.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="flex flex-col sm:flex-row w-full gap-3 sm:gap-4">
              <FormField
                control={form.control}
                name="roleId"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Role</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={loadingRoles}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full dark:bg-gray-900">
                          <SelectValue placeholder={loadingRoles ? "Loading roles..." : "Select a role"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectGroup>
                          {roles.map((role) => (
                            <SelectItem key={role.id} value={role.id}>
                              <div className="flex flex-col">
                                <span className="font-medium">{role.name}</span>
                                {role.description && (
                                  <span className="text-xs text-gray-500">{role.description}</span>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Select the role for this staff member. This determines their permissions.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="flex gap-3">
              <Button type="submit" disabled={loading || loadingRoles}>
                {loading ? "Sending invitation..." : "Send Invitation"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/staff")}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Form>
      </ComponentCard>

      {/* Credentials Dialog */}
      <Dialog open={credentialsDialogOpen} onOpenChange={(open) => {
        if (!open) handleCredentialsDialogClose();
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Staff Credentials</DialogTitle>
            <DialogDescription>
              Share these credentials with the staff member. They can change their password after logging in.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <div className="flex items-center gap-2">
                <Input
                  value={credentials?.email || ''}
                  readOnly
                  className="flex-1"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(credentials?.email || '', 'email')}
                  className="shrink-0"
                >
                  {copiedField === 'email' ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Temporary Password</label>
              <div className="flex items-center gap-2">
                <Input
                  value={credentials?.password || ''}
                  readOnly
                  className="flex-1 font-mono"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(credentials?.password || '', 'password')}
                  className="shrink-0"
                >
                  {copiedField === 'password' ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <div className="rounded-lg bg-yellow-50 dark:bg-yellow-900/20 p-3">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>Important:</strong> Make sure to copy and securely share these credentials with the staff member. They will not be shown again.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleCredentialsDialogClose}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
