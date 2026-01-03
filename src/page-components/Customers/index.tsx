import { useNavigate } from '@/lib/react-router-compat';
import CustomerList from '../../components/customers/CustomerList';
import PageBreadcrumb from '../../components/common/PageBreadCrumb';
import PageMeta from '../../components/common/PageMeta';

export default function CustomersPage() {
  const navigate = useNavigate();

  return (
    <>
      <PageMeta
        title="Customers | Supashop"
        description="Manage your customers"
      />
      <div className="container mx-auto py-3 sm:py-5">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <PageBreadcrumb pageTitle="Customers" />
          <button
            onClick={() => navigate('/customers/new')}
            className="px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1.5"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add Customer
          </button>
        </div>
        <CustomerList />
      </div>
    </>
  );
}
