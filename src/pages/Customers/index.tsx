import { useNavigate } from 'react-router-dom';
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
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-between mb-6">
          <PageBreadcrumb pageTitle="Customers" />
          <button
            onClick={() => navigate('/customers/new')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <svg
              className="w-5 h-5"
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
