import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Transaction } from "@/page-components/Transaction/Columns";
import Badge from "../ui/badge/Badge";
import { formatCurrency } from "@/utils/formatters";

export default function RecentOrders({ orders }: { orders: Transaction[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white px-3 pb-2 pt-3 dark:border-gray-800 dark:bg-white/[0.03] sm:px-4 sm:pt-4">
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <h3 className="text-sm sm:text-base font-semibold text-gray-800 dark:text-white/90">
          Recent Orders
        </h3>
      </div>
      <div className="max-w-full overflow-x-auto">
        <Table>
          {/* Table Header */}
          <TableHeader className="border-gray-100 dark:border-gray-800 border-y">
            <TableRow>
              <TableHead className="py-2 font-medium text-gray-500 text-start text-[10px] sm:text-xs dark:text-gray-400">
                Order ID
              </TableHead>
              <TableHead className="py-2 font-medium text-gray-500 text-start text-[10px] sm:text-xs dark:text-gray-400">
                Customer
              </TableHead>
              <TableHead className="py-2 font-medium text-gray-500 text-end text-[10px] sm:text-xs dark:text-gray-400">
                Amount
              </TableHead>
              <TableHead className="py-2 font-medium text-gray-500 text-start text-[10px] sm:text-xs dark:text-gray-400">
                Status
              </TableHead>
            </TableRow>
          </TableHeader>

          {/* Table Body */}
          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-4 text-gray-500 text-xs">
                  No recent orders
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order) => (
                <TableRow key={order.order_id} className="">
                  <TableCell className="py-2">
                    <span className="font-medium text-gray-800 text-xs sm:text-sm dark:text-white/90">
                      #{order.order_id}
                    </span>
                  </TableCell>
                  <TableCell className="py-2 text-gray-500 text-xs sm:text-sm dark:text-gray-400">
                    {order.customer?.name || "Guest"}
                  </TableCell>
                  <TableCell className={`py-2 text-end text-xs sm:text-sm ${order.payment_status === 'pending' ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400'}`}>
                    {formatCurrency(Number(order.total_amount))}
                  </TableCell>
                  <TableCell className="py-2 text-xs sm:text-sm">
                    <div className={order.payment_status === 'completed' ? '' : ''}>
                      <Badge
                        color={order.payment_status === 'completed' ? 'success' : 'warning'}
                      >
                        {order.payment_status || 'completed'}
                      </Badge>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
