import { useParams } from 'react-router-dom';
import CustomerForm from '../../components/customers/CustomerForm';
import PageBreadcrumb from '../../components/common/PageBreadCrumb';
import PageMeta from '../../components/common/PageMeta';

export default function CustomerFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = id !== 'new';

  return (
    <>
      <PageMeta
        title={isEdit ? 'Edit Customer | Supashop' : 'Add Customer | Supashop'}
        description={isEdit ? 'Edit customer details' : 'Add a new customer'}
      />
      <div className="container mx-auto py-6">
        <div className="mb-6">
          <PageBreadcrumb
            pageTitle={isEdit ? 'Edit Customer' : 'Add Customer'}
          />
        </div>
        <CustomerForm customerId={isEdit ? id : undefined} />
      </div>
    </>
  );
}
