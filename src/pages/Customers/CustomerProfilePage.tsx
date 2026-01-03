import { useParams, useNavigate } from '@/lib/react-router-compat';
import CustomerProfile from '../../components/customers/CustomerProfile';
import PageBreadcrumb from '../../components/common/PageBreadCrumb';
import PageMeta from '../../components/common/PageMeta';

export default function CustomerProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  if (!id) {
    navigate('/customers');
    return null;
  }

  return (
    <>
      <PageMeta
        title="Customer Profile | Supashop"
        description="View customer details"
      />
      <div className="container mx-auto py-6">
        <div className="mb-6">
          <PageBreadcrumb pageTitle="Customer Profile" />
        </div>
        <CustomerProfile customerId={id} />
      </div>
    </>
  );
}
