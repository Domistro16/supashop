"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, MoreHorizontal } from "lucide-react";
import { useNavigate } from "@/lib/react-router-compat";
import { Button } from "../../components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";

// This type is used to define the shape of our data.
// You can use a Zod schema here if you want.
export type Transaction = {
  id: string;
  order_id: string;
  total_amount: string;
  created_at: string;
  staff_id: string;
  profit?: number; // Calculated profit for this transaction
  expectedProfit?: number;
  realizedProfit?: number;
  customer?: {
    id: string;
    name: string;
    phone?: string;
  } | null;
  // Payment tracking
  payment_type?: 'full' | 'installment';
  payment_method?: 'cash' | 'bank_transfer' | 'card';
  bank_name?: string;
  account_number?: string;
  amount_paid?: string | number;
  outstanding_balance?: string | number;
  payment_status?: 'completed' | 'pending';
  proof_of_payment?: string;
};

export const columns: ColumnDef<Transaction>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "order_id",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Order ID
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const navigate = useNavigate();
      return (
        <div
          className="font-medium hover:underline cursor-pointer"
          onClick={() => navigate(`/sales/${row.getValue("order_id")}`)}
        >
          #{row.getValue("order_id")}
        </div>
      );
    },
  },
  {
    accessorKey: "total_amount",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Amount
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const status = row.original.payment_status;
      const isPending = status === 'pending';

      return (
        <div className={`font-medium ${isPending ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400'}`}>
          {new Intl.NumberFormat("en-NG", {
            style: "currency",
            currency: "NGN",
          }).format(Number(row.getValue("total_amount")))}
        </div>
      );
    },
  },
  {
    accessorKey: "staff_id",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Sold By
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
  },
  {
    accessorKey: "customer",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Sold To
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const customer = row.getValue("customer") as Transaction["customer"];
      return (
        <div className="font-medium text-gray-700 dark:text-gray-300">
          {customer ? customer.name : '-'}
        </div>
      );
    },
  },
  {
    accessorKey: "created_at",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Created At
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      console.log(row.getValue("created_at"));
      const timestamp = new Date(row.getValue("created_at"));
      console.log(timestamp);
      const formatted = new Intl.DateTimeFormat("en-NG", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }).format(timestamp as any);

      console.log(formatted); // e.g. "Sep 4, 2025, 1:34:56 PM GMT+1"
      return <div className="font-medium">{formatted}</div>;
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const product = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(product.id)}
            >
              Copy Product ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Update Product</DropdownMenuItem>
            <DropdownMenuItem>View payment details</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
