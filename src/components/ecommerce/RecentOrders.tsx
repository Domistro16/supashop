import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";

// Define the TypeScript interface for the table rows
interface Product {
  id: string; // Unique identifier for each product
  name: string; // Product name
  variants: string; // Number of variants (e.g., "1 Variant", "2 Variants")
  category: string; // Category of the product
  price: number; // Price of the product (as a string with currency symbol)
  // status: string; // Status of the product
  /*   image: string; // URL or path to the product image */
}

// Define the table data using the interface

export default function RecentOrders({ items }: { items: Product[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white px-3 pb-2 pt-3 dark:border-gray-800 dark:bg-white/[0.03] sm:px-4 sm:pt-4">
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <h3 className="text-sm sm:text-base font-semibold text-gray-800 dark:text-white/90">
          Recent Orders
        </h3>

        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200">
            <svg
              className="stroke-current fill-white dark:fill-gray-800"
              width="14"
              height="14"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M2.29004 5.90393H17.7067"
                stroke=""
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M17.7075 14.0961H2.29085"
                stroke=""
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M12.0826 3.33331C13.5024 3.33331 14.6534 4.48431 14.6534 5.90414C14.6534 7.32398 13.5024 8.47498 12.0826 8.47498C10.6627 8.47498 9.51172 7.32398 9.51172 5.90415C9.51172 4.48432 10.6627 3.33331 12.0826 3.33331Z"
                fill=""
                stroke=""
                strokeWidth="1.5"
              />
              <path
                d="M7.91745 11.525C6.49762 11.525 5.34662 12.676 5.34662 14.0959C5.34661 15.5157 6.49762 16.6667 7.91745 16.6667C9.33728 16.6667 10.4883 15.5157 10.4883 14.0959C10.4883 12.676 9.33728 11.525 7.91745 11.525Z"
                fill=""
                stroke=""
                strokeWidth="1.5"
              />
            </svg>
            <span className="hidden sm:inline">Filter</span>
          </button>
          <button className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200">
            See all
          </button>
        </div>
      </div>
      <div className="max-w-full overflow-x-auto">
        <Table>
          {/* Table Header */}
          <TableHeader className="border-gray-100 dark:border-gray-800 border-y">
            <TableRow>
              <TableHead className="py-2 font-medium text-gray-500 text-start text-[10px] sm:text-xs dark:text-gray-400">
                Products
              </TableHead>
              <TableHead className="py-2 font-medium text-gray-500 text-start text-[10px] sm:text-xs dark:text-gray-400">
                Price
              </TableHead>
              <TableHead className="py-2 font-medium text-gray-500 text-start text-[10px] sm:text-xs dark:text-gray-400">
                Category
              </TableHead>
            </TableRow>
          </TableHeader>

          {/* Table Body */}

          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {items.map((product) => (
              <TableRow key={product.id} className="">
                <TableCell className="py-2">
                  <div className="flex items-center gap-2">
                    <div>
                      <p className="font-medium text-gray-800 text-xs sm:text-sm dark:text-white/90">
                        {product.name}
                      </p>
                      <span className="text-gray-500 text-[10px] sm:text-xs dark:text-gray-400">
                        {product.variants}
                      </span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="py-2 text-gray-500 text-xs sm:text-sm dark:text-gray-400">
                  ₦{product.price}
                </TableCell>
                <TableCell className="py-2 text-gray-500 text-xs sm:text-sm dark:text-gray-400">
                  {product.category}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
