import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "@/lib/react-router-compat";

interface CommandResult {
  id: string;
  category: string;
  title: string;
  subtitle?: string;
  icon: string;
  path?: string;
  action?: () => void;
  badge?: string;
  keywords?: string[];
}

export function useCommandPalette(query: string) {
  const [isLoading, setIsLoading] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const navigate = useNavigate();

  // Load data when component mounts
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);

      // Load data from localStorage or API
      const productsData = JSON.parse(localStorage.getItem("products") || "[]");
      const customersData = JSON.parse(localStorage.getItem("customers") || "[]");
      const transactionsData = JSON.parse(localStorage.getItem("sales") || "[]");
      const staffData = JSON.parse(localStorage.getItem("staff") || "[]");

      setProducts(productsData);
      setCustomers(customersData);
      setTransactions(transactionsData);
      setStaff(staffData);
    } catch (error) {
      console.error("Failed to load data for command palette:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Navigation commands - memoized to prevent recreating on every render
  const navigationCommands = useMemo<CommandResult[]>(() => [
    {
      id: "nav-dashboard",
      category: "Navigation",
      title: "Dashboard",
      subtitle: "Go to dashboard",
      icon: "📊",
      path: "/",
      keywords: ["home", "dashboard", "overview"],
    },
    {
      id: "nav-products",
      category: "Navigation",
      title: "Products",
      subtitle: "View all products",
      icon: "📦",
      path: "/products",
      keywords: ["products", "inventory", "items"],
    },
    {
      id: "nav-transactions",
      category: "Navigation",
      title: "Transactions",
      subtitle: "View all transactions",
      icon: "💰",
      path: "/transaction",
      keywords: ["transactions", "sales", "orders", "history"],
    },
    {
      id: "nav-customers",
      category: "Navigation",
      title: "Customers",
      subtitle: "View all customers",
      icon: "👥",
      path: "/customers",
      keywords: ["customers", "clients", "buyers"],
    },
    {
      id: "nav-staff",
      category: "Navigation",
      title: "Staff",
      subtitle: "View all staff members",
      icon: "👤",
      path: "/staff",
      keywords: ["staff", "employees", "team", "users"],
    },
    {
      id: "nav-suppliers",
      category: "Navigation",
      title: "Suppliers",
      subtitle: "View all suppliers",
      icon: "🏭",
      path: "/suppliers",
      keywords: ["suppliers", "vendors", "dealers"],
    },
    {
      id: "nav-roles",
      category: "Navigation",
      title: "Roles & Permissions",
      subtitle: "Manage roles and permissions",
      icon: "🔐",
      path: "/roles",
      keywords: ["roles", "permissions", "access", "security"],
    },
    {
      id: "nav-reports",
      category: "Navigation",
      title: "Sales Report",
      subtitle: "View sales analytics",
      icon: "📈",
      path: "/sales-report",
      keywords: ["reports", "analytics", "insights", "stats"],
    },
  ], []);

  // Action commands - memoized to prevent recreating on every render
  const actionCommands = useMemo<CommandResult[]>(() => [
    {
      id: "action-add-product",
      category: "Actions",
      title: "Add Product",
      subtitle: "Create a new product",
      icon: "➕",
      path: "/products/add",
      keywords: ["add product", "new product", "create product"],
    },
    {
      id: "action-add-customer",
      category: "Actions",
      title: "Add Customer",
      subtitle: "Create a new customer",
      icon: "➕",
      path: "/customers/add",
      keywords: ["add customer", "new customer", "create customer"],
    },
    {
      id: "action-add-staff",
      category: "Actions",
      title: "Add Staff",
      subtitle: "Invite a new staff member",
      icon: "➕",
      path: "/staff/add",
      keywords: ["add staff", "new staff", "invite staff"],
    },
    {
      id: "action-add-supplier",
      category: "Actions",
      title: "Add Supplier",
      subtitle: "Create a new supplier",
      icon: "➕",
      path: "/suppliers/add",
      keywords: ["add supplier", "new supplier", "create supplier"],
    },
    {
      id: "action-create-sale",
      category: "Actions",
      title: "Create Sale",
      subtitle: "Record a new sale",
      icon: "🛒",
      action: () => {
        navigate("/products");
        // The Create Sale button will be clicked programmatically after navigation
        setTimeout(() => {
          const createSaleButton = document.querySelector('[class*="Create Sale"]') as HTMLButtonElement;
          createSaleButton?.click();
        }, 100);
      },
      keywords: ["create sale", "new sale", "record sale", "sell"],
    },
  ], [navigate]);

  // Search results
  const results = useMemo(() => {
    const searchQuery = query.toLowerCase().trim();

    if (!searchQuery) {
      // Show popular commands when no query
      return [
        ...navigationCommands.slice(0, 5),
        ...actionCommands.slice(0, 3),
      ];
    }

    const allResults: CommandResult[] = [];

    // Search navigation commands
    navigationCommands.forEach((cmd) => {
      const matchScore = getMatchScore(searchQuery, cmd);
      if (matchScore > 0) {
        allResults.push({ ...cmd, matchScore } as any);
      }
    });

    // Search action commands
    actionCommands.forEach((cmd) => {
      const matchScore = getMatchScore(searchQuery, cmd);
      if (matchScore > 0) {
        allResults.push({ ...cmd, matchScore } as any);
      }
    });

    // Search products
    products.forEach((product) => {
      const title = product.name?.toLowerCase() || "";
      const category = product.category?.toLowerCase() || "";
      const price = product.price?.toString() || "";

      if (
        title.includes(searchQuery) ||
        category.includes(searchQuery) ||
        price.includes(searchQuery)
      ) {
        allResults.push({
          id: `product-${product.id}`,
          category: "Products",
          title: product.name,
          subtitle: `${product.category} • ₦${Number(product.price).toLocaleString()}`,
          icon: "📦",
          path: `/products`,
          badge: `Stock: ${product.stock}`,
          matchScore: title.startsWith(searchQuery) ? 3 : 1,
        } as any);
      }
    });

    // Search customers
    customers.forEach((customer) => {
      const name = customer.name?.toLowerCase() || "";
      const email = customer.email?.toLowerCase() || "";
      const phone = customer.phone?.toLowerCase() || "";

      if (
        name.includes(searchQuery) ||
        email.includes(searchQuery) ||
        phone.includes(searchQuery)
      ) {
        allResults.push({
          id: `customer-${customer.id}`,
          category: "Customers",
          title: customer.name,
          subtitle: customer.email || customer.phone,
          icon: "👤",
          path: `/customers/${customer.id}`,
          matchScore: name.startsWith(searchQuery) ? 3 : 1,
        } as any);
      }
    });

    // Search transactions
    transactions.forEach((transaction) => {
      const id = transaction.id?.toLowerCase() || "";
      const amount = transaction.total_amount?.toString() || "";
      const date = new Date(transaction.created_at).toLocaleDateString();

      if (id.includes(searchQuery) || amount.includes(searchQuery)) {
        allResults.push({
          id: `transaction-${transaction.id}`,
          category: "Transactions",
          title: `Transaction #${transaction.id.slice(0, 8)}`,
          subtitle: `₦${Number(transaction.total_amount).toLocaleString()} • ${date}`,
          icon: "💳",
          path: `/transaction/${transaction.id}`,
          matchScore: id.startsWith(searchQuery) ? 3 : 1,
        } as any);
      }
    });

    // Search staff
    staff.forEach((member) => {
      const name = member.name?.toLowerCase() || "";
      const email = member.email?.toLowerCase() || "";
      const role = member.role?.toLowerCase() || "";

      if (
        name.includes(searchQuery) ||
        email.includes(searchQuery) ||
        role.includes(searchQuery)
      ) {
        allResults.push({
          id: `staff-${member.id}`,
          category: "Staff",
          title: member.name,
          subtitle: member.email,
          icon: "👨‍💼",
          badge: member.role,
          matchScore: name.startsWith(searchQuery) ? 3 : 1,
        } as any);
      }
    });

    // Sort by match score (higher is better)
    allResults.sort((a: any, b: any) => (b.matchScore || 0) - (a.matchScore || 0));

    // Limit results to 20
    return allResults.slice(0, 20);
  }, [query, products, customers, transactions, staff, navigationCommands, actionCommands]);

  return { results, isLoading };
}

function getMatchScore(query: string, command: CommandResult): number {
  const title = command.title.toLowerCase();
  const subtitle = command.subtitle?.toLowerCase() || "";
  const keywords = command.keywords || [];

  // Exact match
  if (title === query) return 5;

  // Starts with
  if (title.startsWith(query)) return 4;

  // Contains in title
  if (title.includes(query)) return 3;

  // Keyword match
  for (const keyword of keywords) {
    if (keyword.includes(query)) return 2;
  }

  // Contains in subtitle
  if (subtitle.includes(query)) return 1;

  return 0;
}
