import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PageMeta from "@/components/common/PageMeta";
import { Button } from "@/components/ui/button";
import { useParams } from "react-router";
import { DataTable } from "./DataTable2";
import { columns, Item } from "./Columns2";
import Badge from "@/components/ui/badge/Badge";
import { Transaction } from "./Columns";
import { getSaleItems, getStaff } from "@/supabaseClient";
import { useEffect, useState } from "react";

function getData(): Item[] {
  // Fetch data from your API here.
  return [
    {
      product: "Cups",
      quantity: 100,
      unitCost: 100,
    },
    {
      product: "Cups",
      quantity: 100,
      unitCost: 100,
    },
    {
      product: "Cups",
      quantity: 100,
      unitCost: 100,
    },
  ];
}

export default function Single({
  transactions,
}: {
  transactions: Transaction[];
}) {
  const { orderId } = useParams<string>();

  const sale = transactions.filter((t) => t.order_id == orderId);

  const [items, setItems] = useState<Item[]>();
  const [total, setTotal] = useState(0);
  const [formatted, setFormatted] = useState("");
  const [staff, setStaff] = useState("");

  useEffect(() => {
    if (sale.length == 0) return;
    function getStaffName() {
      setStaff(sale[0].staff_id);
    }

    getStaffName();
  });
  useEffect(() => {
    if (sale.length == 0) return;

    const date = new Intl.DateTimeFormat("en-NG", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(sale[0].created_at));

    setFormatted(date);
  }, [sale]);
  useEffect(() => {
    async function callItems() {
      if (sale.length == 0 || items) return;
      const data = await getSaleItems(sale[0].id);

      setItems(data);

      if (data.length > 0) {
        let totalAmount = 0;
        for (const item of data) {
          totalAmount += item.unitCost * item.quantity;
        }
        setTotal(totalAmount);
      }
    }
    callItems();
  }, [sale]);
  return (
    <div>
      <PageMeta
        title="React.js Blank Dashboard | TailAdmin - Next.js Admin Dashboard Template"
        description="This is React.js Blank Dashboard page for TailAdmin - React.js Tailwind CSS Admin Dashboard Template"
      />
      <PageBreadcrumb pageTitle="Single Transaction" />
      <div
        className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] 
                py-3 px-4 sm:px-6 md:px-8 lg:px-10 
                flex flex-col md:flex-row md:items-center md:justify-between gap-3"
      >
        {/* Left section */}
        <div className="w-full text-gray-400 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
          <h5 className="flex items-center gap-2 px-0 sm:px-3 sm:border-r sm:border-gray-500 text-base font-medium">
            Order ID: #{orderId}{" "}
            <Badge variant="light" color="success">
              Completed
            </Badge>
          </h5>
          <h5 className="text-sm sm:text-[15px]">
            Sold On: {formatted} By {staff}
          </h5>
        </div>

        {/* Right section (buttons) */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <Button
            variant="default"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2"
          >
            View Receipt
          </Button>
          <Button variant="outline" className="px-4 py-2">
            Print Receipt
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 mt-7 bg-white py-4 px-5 dark:border-gray-800 dark:bg-white/[0.03] xl:px-10 xl:py-6 items-center">
        <div className="w-full">
          <h5 className="px-3 text-[20px] font-medium">Order Details</h5>
        </div>
        <div className="mt-5">
          <DataTable columns={columns} data={items ? items : []} />
        </div>
        <div className="flex justify-end">
          <div className="mt-5">
            <h5>Order Summary</h5>
            <div className="flex gap-30 mt-3">
              <h5 className="text-gray-400 font-medium text-lg">Total</h5>
              <h5 className="text-white text-xl">
                {new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "NGN",
                }).format(total)}
              </h5>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
