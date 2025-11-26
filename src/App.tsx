import { BrowserRouter as Router, Routes, Route } from "react-router";
import SignIn from "./pages/AuthPages/SignIn";
import SignUp from "./pages/AuthPages/SignUp";
import NotFound from "./pages/OtherPage/NotFound";
import UserProfiles from "./pages/UserProfiles";
import Videos from "./pages/UiElements/Videos";
import Images from "./pages/UiElements/Images";
import Alerts from "./pages/UiElements/Alerts";
import Badges from "./pages/UiElements/Badges";
import Avatars from "./pages/UiElements/Avatars";
import Buttons from "./pages/UiElements/Buttons";
import LineChart from "./pages/Charts/LineChart";
import BarChart from "./pages/Charts/BarChart";
import Calendar from "./pages/Calendar";
import BasicTables from "./pages/Tables/BasicTables";
import FormElements from "./pages/Forms/FormElements";
import Blank from "./pages/Blank";
import AppLayout from "./layout/AppLayout";
import { ScrollToTop } from "./components/common/ScrollToTop";
import Home from "./pages/Dashboard/Home";
import Products from "./pages/Products/product";
import Transactions from "./pages/Transaction/transaction";
import AddProducts from "./pages/Products/addProduct";
import Single from "./pages/Transaction/single";
import Staffs from "./pages/Staff/staff";
import AddStaffs from "./pages/Staff/addStaff";
import Invite from "./pages/Staff/invites";
import RolesManagement from "./pages/Roles/index";
import Login from "./pages/AuthPages/login";
import { AuthProvider, useAuth } from "./auth";

import { useEffect, useState } from "react";

import { Navigate } from "react-router";
import {
  getProducts,
  getProfiles,
  getRecentItems,
  getSales,
  getShop,
} from "./supabaseClient";
import { Product } from "./pages/Products/Columns";
import { Transaction } from "./pages/Transaction/Columns";
const ProtectedPage = ({}) => {
  const { user } = useAuth();
  console.log("user at ProtectedPage: ", user);

  if (!user) {
    return <Navigate to="/signin" replace />;
  }

  return <AppLayout />;
};

export default function App() {
  const [products, setProducts] = useState<Product[]>();
  const [sales, setSales] = useState<Transaction[]>();
  const [shop, setShop] = useState<any>();
  const [recent, setRecent] = useState<any[]>();
  const [staffs, setStaffs] = useState<any[]>();
  const [user, setUser] = useState<any[]>();
  useEffect(() => {
    async function callProducts() {
      const data = await getProducts();
      setProducts(data);
    }
    async function callSales() {
      const data = await getSales();
      setSales(data);
    }
    async function callShop() {
      const data = await getShop();
      setShop(data);
    }
    async function callItems() {
      const data = await getRecentItems();
      setRecent(data);
    }
    async function callProfiles() {
      const result = await getProfiles();
      if (result) {
        const { profiles, userProf } = result;
        // now both exist
        if (profiles || userProf) {
          setStaffs(profiles!);
          setUser(userProf);
        }
      }
    }
    callProfiles();
    callItems();
    callShop();
    callSales();
    callProducts();
  }, []);

  return (
    <>
      <AuthProvider>
        <Router>
          <ScrollToTop />
          <Routes>
            {/* Dashboard Layout */}
            <Route path="/" element={<ProtectedPage />}>
              <Route
                index
                path="/"
                element={
                  <Home
                    sales={sales ? sales : []}
                    shop={
                      shop
                        ? shop
                        : {
                            target: 0,
                          }
                    }
                    items={recent ? recent : []}
                  />
                }
              />

              {/* Others Page */}
              <Route path="/profile" element={<UserProfiles />} />
              <Route path="/calendar" element={<Calendar />} />
              <Route
                path="/products"
                element={<Products products={products ? products : []} />}
              />
              <Route path="/products/add" element={<AddProducts />} />
              <Route
                path="/transactions"
                element={<Transactions sales={sales ? sales : []} />}
              />
              <Route
                path="/transaction/:orderId"
                element={<Single transactions={sales ? sales : []} />}
              />
              <Route path="/staff" element={<Staffs />} />
              <Route path="/staff/add" element={<AddStaffs />} />
              <Route path="/staff/invites" element={<Invite />} />
              <Route path="/roles" element={<RolesManagement />} />
              <Route path="/blank" element={<Blank />} />

              {/* Forms */}
              <Route path="/form-elements" element={<FormElements />} />

              {/* Tables */}
              <Route path="/basic-tables" element={<BasicTables />} />

              {/* Ui Elements */}
              <Route path="/alerts" element={<Alerts />} />
              <Route path="/avatars" element={<Avatars />} />
              <Route path="/badge" element={<Badges />} />
              <Route path="/buttons" element={<Buttons />} />
              <Route path="/images" element={<Images />} />
              <Route path="/videos" element={<Videos />} />

              {/* Charts */}
              <Route path="/line-chart" element={<LineChart />} />
              <Route path="/bar-chart" element={<BarChart />} />
            </Route>

            {/* Auth Layout */}
            <Route path="/signin" element={<SignIn />} />
            <Route path="/auth" element={<Login />} />
            <Route path="/signup" element={<SignUp />} />

            {/* Fallback Route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Router>
      </AuthProvider>
    </>
  );
}
