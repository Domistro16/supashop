import PageBreadcrumb from "../components/common/PageBreadCrumb";
import UserMetaCard from "../components/UserProfile/UserMetaCard";
import UserInfoCard from "../components/UserProfile/UserInfoCard";
import UserAddressCard from "../components/UserProfile/UserAddressCard";
import PageMeta from "../components/common/PageMeta";
import { useUser } from "@/context/UserContext";
import { useEffect, useState } from "react";
import api, { Shop } from "@/lib/api";

export default function UserProfiles() {
  const { user, currentShop, loading } = useUser();
  const [shopData, setShopData] = useState<Shop | null>(null);
  const [loadingShop, setLoadingShop] = useState(true);
  
  useEffect(() => {
    const fetchShopData = async () => {
      try {
        setLoadingShop(true);
        const data = await api.shops.getCurrent();
        setShopData(data);
      } catch (error) {
        console.error('Failed to fetch shop data:', error);
      } finally {
        setLoadingShop(false);
      }
    };

    if (user) {
      fetchShopData();
    }
  }, [user]);
  
  if (loading || !user) {
    return (
      <>
        <PageMeta
          title="Profile | Dashboard"
          description="User profile page"
        />
        <PageBreadcrumb pageTitle="Profile" />
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
          <div className="flex justify-center items-center py-10">
            <p className="text-gray-500">Loading profile...</p>
          </div>
        </div>
      </>
    );
  }

  const userName = user.name || "User";
  const userEmail = user.email || "";
  const userRole = currentShop?.role || "staff";

  return (
    <>
      <PageMeta
        title="Profile | Dashboard"
        description="User profile page"
      />
      <PageBreadcrumb pageTitle="Profile" />
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
        <h3 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90 lg:mb-7">
          Profile
        </h3>
        <div className="space-y-6">
          <UserMetaCard userName={userName} userRole={userRole} />
          <UserInfoCard userName={userName} userEmail={userEmail} userRole={userRole} />
          {loadingShop ? (
            <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
              <p className="text-center text-gray-500">Loading shop information...</p>
            </div>
          ) : shopData && shopData.owner ? (
            <UserAddressCard 
              shopName={shopData.name}
              shopAddress={shopData.address || null}
              ownerName={shopData.owner.name}
              ownerEmail={shopData.owner.email}
            />
          ) : (
            <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
              <p className="text-center text-gray-500">Shop information unavailable</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
