import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PageMeta from "@/components/common/PageMeta";
import { Button } from "@/components/ui/button";
import { useParams } from "react-router";
import { DataTable } from "./DataTable2";
import { columns, Item } from "./Columns2";
import Badge from "@/components/ui/badge/Badge";
import { Transaction } from "./Columns";
import { getSaleItems, getStaff } from "@/supabaseClient";
import { useEffect, useState, useRef } from "react";

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
  const printRef = useRef<HTMLDivElement>(null);

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

  const handlePrint = () => {
    window.print();
  };

  const currentCustomer = sale.length > 0 ? sale[0].customer : null;

  return (
    <div>
      <PageMeta
        title="Transaction Detail | Supashop"
        description="View detailed information about a transaction"
      />
      <PageBreadcrumb pageTitle="Single Transaction" />

      {/* Print-only styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-content, .print-content * {
            visibility: visible;
          }
          .print-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
          .print-header {
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid #000;
          }
          .print-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
          }
          .print-table th,
          .print-table td {
            border: 1px solid #000;
            padding: 8px;
            text-align: left;
          }
          .print-total {
            margin-top: 20px;
            text-align: right;
            font-weight: bold;
            font-size: 18px;
          }
        }
      `}</style>

      {/* Screen view */}
      <div
        className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]
                py-3 px-4 sm:px-6 md:px-8 lg:px-10
                flex flex-col md:flex-row md:items-center md:justify-between gap-3 no-print"
      >
        {/* Left section */}
        <div className="w-full text-gray-400 dark:text-gray-400 flex flex-col gap-2">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
            <h5 className="flex items-center gap-2 px-0 sm:px-3 sm:border-r sm:border-gray-500 dark:border-gray-600 text-base font-medium">
              Order ID: #{orderId}{" "}
              <Badge variant="light" color="success">
                Completed
              </Badge>
            </h5>
            <h5 className="text-sm sm:text-[15px]">
              Sold On: {formatted} By {staff}
            </h5>
          </div>
          {currentCustomer && (
            <div className="px-0 sm:px-3">
              <h5 className="text-sm sm:text-[15px] text-gray-600 dark:text-gray-300">
                Sold To: <span className="font-semibold text-gray-800 dark:text-white">{currentCustomer.name}</span>
                {currentCustomer.phone && (
                  <span className="ml-2 text-gray-500 dark:text-gray-400">• {currentCustomer.phone}</span>
                )}
              </h5>
            </div>
          )}
        </div>

        {/* Right section (buttons) */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <Button
            variant="default"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2"
            onClick={handlePrint}
          >
            Download Receipt
          </Button>
          <Button
            variant="outline"
            className="px-4 py-2"
            onClick={handlePrint}
          >
            Print Receipt
          </Button>
        </div>
      </div>

      {/* Print content */}
      <div className="print-content">
        <div className="print-header" style={{ display: 'none' }}>
          <h1 style={{ fontSize: '24px', marginBottom: '10px' }}>SUPASHOP</h1>
          <div style={{ fontSize: '14px', marginBottom: '5px' }}>
            <strong>Order ID:</strong> #{orderId}
          </div>
          <div style={{ fontSize: '14px', marginBottom: '5px' }}>
            <strong>Date:</strong> {formatted}
          </div>
          <div style={{ fontSize: '14px', marginBottom: '5px' }}>
            <strong>Sold By:</strong> {staff}
          </div>
          {currentCustomer && (
            <div style={{ fontSize: '14px', marginBottom: '5px' }}>
              <strong>Sold To:</strong> {currentCustomer.name}
              {currentCustomer.phone && ` (${currentCustomer.phone})`}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-gray-200 mt-7 bg-white py-4 px-5 dark:border-gray-800 dark:bg-white/[0.03] xl:px-10 xl:py-6 items-center">
          <div className="w-full">
            <h5 className="px-3 text-[20px] font-medium text-gray-800 dark:text-white/90">Order Details</h5>
          </div>
          <div className="mt-5">
            <DataTable columns={columns} data={items ? items : []} />
          </div>

          {/* Print-friendly table */}
          <table className="print-table" style={{ display: 'none' }}>
            <thead>
              <tr>
                <th>Product</th>
                <th>Quantity</th>
                <th>Unit Cost</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {items?.map((item, index) => (
                <tr key={index}>
                  <td>{item.product}</td>
                  <td>{item.quantity}</td>
                  <td>
                    {new Intl.NumberFormat("en-NG", {
                      style: "currency",
                      currency: "NGN",
                    }).format(item.unitCost)}
                  </td>
                  <td>
                    {new Intl.NumberFormat("en-NG", {
                      style: "currency",
                      currency: "NGN",
                    }).format(item.unitCost * item.quantity)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-end">
            <div className="mt-5">
              <h5 className="text-gray-800 dark:text-white/90">Order Summary</h5>
              <div className="flex gap-30 mt-3">
                <h5 className="text-gray-400 dark:text-gray-400 font-medium text-lg">Total</h5>
                <h5 className="text-gray-900 dark:text-white text-xl font-bold ml-8">
                  {new Intl.NumberFormat("en-NG", {
                    style: "currency",
                    currency: "NGN",
                  }).format(total)}
                </h5>
              </div>
            </div>
          </div>

          {/* Print-friendly total */}
          <div className="print-total" style={{ display: 'none' }}>
            Total: {new Intl.NumberFormat("en-NG", {
              style: "currency",
              currency: "NGN",
            }).format(total)}
          </div>
        </div>
      </div>
    </div>
  );
}
