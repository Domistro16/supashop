"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, MoreHorizontal } from "lucide-react";

import { Button } from "../../components/ui/button.tsx";

// This type is used to define the shape of our data.
// You can use a Zod schema here if you want.
export type Item = {
  product: string;
  quantity: number;
  unitCost: number;
  discountPercent?: number; // Optional discount percentage
};

export const columns: ColumnDef<Item>[] = [
  {
    id: "s/n",
    header: () => <div>S/N</div>,
    cell: ({ row }) => row.index + 1,
  },
  {
    accessorKey: "product",
    header: () => {
      return <div>Products</div>;
    },
  },
  {
    accessorKey: "quantity",
    header: () => {
      return <div>Quantity</div>;
    },
  },
  {
    accessorKey: "unitCost",
    header: () => {
      return <div>Unit Cost</div>;
    },
    cell: ({ row }) => {
      return (
        <div className="font-medium">
          {new Intl.NumberFormat("en-NG", {
            style: "currency",
            currency: "NGN",
          }).format(row.getValue("unitCost"))}
        </div>
      );
    },
  },
  {
    accessorKey: "discountPercent",
    header: () => {
      return <div>Discount</div>;
    },
    cell: ({ row }) => {
      const discount = row.original.discountPercent ?? 0;
      if (discount === 0) {
        return <div className="text-gray-400">-</div>;
      }
      return (
        <div className="font-medium text-green-600 dark:text-green-400">
          {discount}%
        </div>
      );
    },
  },
  {
    id: "total",
    header: () => {
      return <div>Total</div>;
    },

    cell: ({ row }) => {
      const quantity = Number(row.getValue("quantity"));
      const unitCost = Number(row.getValue("unitCost"));
      const discount = row.original.discountPercent ?? 0;
      const subtotal = quantity * unitCost;
      const discountAmount = (subtotal * discount) / 100;
      const total = subtotal - discountAmount;
      return (
        <div className="font-medium">
          {new Intl.NumberFormat("en-NG", {
            style: "currency",
            currency: "NGN",
          }).format(total)}
        </div>
      );
    },
  },
];
