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
    id: "total",
    header: () => {
      return <div>Total</div>;
    },

    cell: ({ row }) => {
      const quantity = Number(row.getValue("quantity"));
      const unitCost = Number(row.getValue("unitCost"));
      const total = quantity * unitCost;
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
