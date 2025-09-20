import { createClient } from "@supabase/supabase-js";
import { error } from "console";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!;
export const supabase = createClient(supabaseUrl, supabaseAnonKey);


type Product = {
  id: string;
  name: string;
  stock: number;
  price: string;
  created_at: string;
  category: string;
  dealer: string;
};

type Transaction = {
  id: string;
  order_id: string;
  total_amount: string;
  created_at: string;
  staff_id: string;
};
type Item = {
  product: string;
  quantity: number;
  unitCost: number;
};

export const getCategories = async () => {
  const { data, error } = await supabase.rpc("get_unique_categories");

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }

  return new Response(JSON.stringify({ categories: data }), { status: 200 });
};

export const getDealers = async () => {
  const { data, error } = await supabase.rpc("get_unique_dealers");

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }

  return new Response(JSON.stringify({ categories: data }), { status: 200 });
};

export const getProducts = async () => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const { data, error } = await supabase.rpc("get_products_for_user");

  if (!session?.access_token) {
    return [];
  }

  if (error) {
    console.error(error.message);
    return [];
  }
  console.log(data);

  const products: Product[] = data.map((item: any) => ({
    id: item.id,
    name: item.name,
    stock: item.stock,
    price: item.price,
    created_at: item.created_at,
    category: item.category_name,
    dealer: item.dealer,
  }));
  return products;
};

export const getStaff = async (id: string) => {
  console.log(id);
  const { data, error } = await supabase.rpc("get_staff_by_id", { _id: id });
  console.log(data);
  if (!error) return data.name;
};
export const getProduct = async (id: string) => {
  const { data, error } = await supabase.rpc("get_product_by_id", { _id: id });
  if (!error) return data;
};

export const getShop = async () => {
  const { data, error } = await supabase.rpc("get_shop_by_id");
  console.log(data);
  if (!error) return data;
};
export const getSales = async () => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const { data, error } = await supabase.rpc("get_sales_for_user");

  if (!session?.access_token) {
    return [];
  }

  if (error) {
    console.error(error.message);
    return [];
  }
  console.log(data);

  const transactions: Transaction[] = [];
  for (const item of data) {
    const staffName = await getStaff(item.staff_id);
    console.log(staffName);
    transactions.push({
      id: item.id,
      order_id: item.order_id,
      total_amount: item.total_amount,
      created_at: item.created_at,
      staff_id: staffName,
    });
  }
  console.log(transactions);
  return transactions;
};

export const getSaleItems = async (sale_id: string) => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const { data, error } = await supabase.rpc("get_sale_items_for_user", {
    _sale_id: sale_id,
  });

  if (!session?.access_token) {
    console.log("not authenticated");
    return [];
  }

  if (error) {
    console.error(error.message);
    return [];
  }
  console.log(data);

  const items: Item[] = [];
  for (const item of data) {
    const { name } = await getProduct(item.product_id);
    console.log(name);
    items.push({
      product: name,
      quantity: Number(item.quantity),
      unitCost: Number(item.price),
    });
  }

  console.log(items);
  return items;
};

export async function getRecentItems() {
  const { data, error } = await supabase.rpc("get_recent_items");
  console.log(data);
  if (!error) {
    const items = [];
    for (const item of data) {
      const { name, category_name } = await getProduct(item.product_id);
      console.log(category_name);
      items.push({
        id: item.id,
        name,
        category: category_name,
        variants: `${item.quantity} Variants`,
        price: Number(item.price),
      });
    }
    return items;
  }
}

export const addProduct = async (
  name: string,
  category: string,
  dealer: string,
  stock: number,
  price: number
) => {
  const { data, error } = await supabase.functions.invoke("dynamic-processor", {
    body: {
      name,
      category_name: category,
      dealer,
      stock,
      price,
    },
    method: "POST",
  });

  if (data) {
    return data;
  }
};
export async function getProfiles() {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(session?.access_token);
    if (authError || !user) {
      console.error("Error:", authError);
    }
    const { data: userProf, error: userError } = await supabase
      .from("profiles")
      .select("*")
      .eq("shop_id", user?.id)
      .single();
    const shop_id = userProf?.shop_id;
    const { data: profiles, error: prodError } = await supabase
      .from("profiles")
      .select("*")
      .eq("shop_id", shop_id);

    return { profiles, userProf };
  } catch (error) {
    console.error("Unexpected error", error);
  }
}

export const record_sale = async (items: Item[]) => {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(session?.access_token);
    if (authError || !user) {
      console.error("Error:", authError);
    }
    // 2️⃣ Parse body
    // items = [{ product_id, quantity, price }]
    const { data: profile, error: prodError } = await supabase
      .from("profiles")
      .select("id, shop_id")
      .eq("id", user?.id)
      .single();
    const shop_id = profile?.shop_id;
    if (!profile?.shop_id || !Array.isArray(items) || items.length === 0) {
      return console.error("Invlid Input");
    }
    // 3️⃣ Check products + stock
    let totalAmount = 0;
    for (const item of items) {
      const { product: product_id, quantity, unitCost: price } = item;
      if (!product_id || !quantity || quantity <= 0 || !price) {
        return console.error("Invalid Argument");
      }
      const { data: product, error: prodError } = await supabase
        .from("products")
        .select("id, stock, shop_id")
        .eq("shop_id", shop_id)
        .eq("id", product_id)
        .single();
      if (prodError || !product) {
        return console.error(`Product ${product_id} not found`);
      }
      if (product?.stock < quantity) {
        return console.error(`Insufficient stock for product ${product_id}`);
      }
      totalAmount += price * quantity;
    }
    // 4️⃣ Insert into `sales`
    const { data: sale, error: saleError } = await supabase
      .from("sales")
      .insert([
        {
          shop_id,
          staff_id: user?.id,
          total_amount: totalAmount,
        },
      ])
      .select()
      .single();
    if (saleError || !sale) {
      console.error("Sale creation failed", saleError);
    }
    // 5️⃣ Insert sale items + update stock
    const saleItems = items.map((item) => ({
      shop_id,
      sale_id: sale.id,
      product_id: item.product,
      quantity: item.quantity,
      price: item.unitCost,
    }));
    const { error: itemsError } = await supabase
      .from("sale_items")
      .insert(saleItems);
    if (itemsError) {
      console.error("Sale items insertion failed", itemsError);
    }
    // 6️⃣ Update product stocks
    for (const item of items) {
      const { data: product } = await supabase
        .from("products")
        .select("price, stock")
        .eq("id", item.product)
        .single();
      await supabase
        .from("products")
        .update({
          stock: product?.stock - item.quantity,
        })
        .eq("id", item.product);
    }
    await supabase.from("activity_logs").insert([
      {
        staff_id: user?.id,
        action: "record_sale",
        details: {
          sale,
          saleItems,
        },
        shop_id: shop_id,
      },
    ]);
    console.log("Sale recorded");
    return true;
  } catch (err) {
    return console.error("Unexpected error", err);
  }
};
