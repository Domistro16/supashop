'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/context/UserContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Link as LinkIcon, Store, Star, Save, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

export default function ShopSettingsPage() {
    const { user, currentShop, shops, loading: userLoading } = useUser();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [shop, setShop] = useState<any>(null);
    const [products, setProducts] = useState<any[]>([]);
    const [formData, setFormData] = useState({
        heroTitle: '',
        heroSubtitle: '',
        primaryColor: 'blue',
        isStorefrontEnabled: true,
    });

    const shopId = currentShop?.id || shops?.[0]?.id;

    useEffect(() => {
        if (userLoading) return;

        if (!shopId) {
            setIsLoading(false);
            return;
        }

        const fetchData = async () => {
            // Fetch Shop Settings
            try {
                const shopRes = await fetch(`/api/shops/${shopId}`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
                });

                if (shopRes.ok) {
                    const shopData = await shopRes.json();
                    setShop(shopData);
                    setFormData({
                        heroTitle: shopData.heroTitle || '',
                        heroSubtitle: shopData.heroSubtitle || '',
                        primaryColor: shopData.primaryColor || 'blue',
                        isStorefrontEnabled: shopData.isStorefrontEnabled ?? true,
                    });
                } else {
                    console.error('Failed to fetch shop settings');
                }
            } catch (error) {
                console.error('Failed to load shop settings', error);
            }

            // Fetch Products
            try {
                // console.log('Fetching products for shopId:', shopId); // Removed console.log as per instruction to keep only the provided snippet
                const prodRes = await fetch(`/api/products?shopId=${shopId}`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                        'X-Shop-Id': shopId
                    }
                });
                // console.log('Product fetch status:', prodRes.status); // Removed console.log
                if (prodRes.ok) {
                    const prodData = await prodRes.json();
                    // console.log('Product data received:', prodData); // Removed console.log
                    // API returns array directly now
                    setProducts(Array.isArray(prodData) ? prodData : prodData.products || []);
                }
            } catch (error) {
                console.error('Failed to load products', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [shopId, userLoading]);

    const handleSaveSettings = async () => {
        setIsSaving(true);
        try {
            const res = await fetch(`/api/shops/${shopId}/settings`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                },
                body: JSON.stringify(formData)
            });

            if (!res.ok) throw new Error('Failed to update');
            toast.success('Storefront settings updated!');
        } catch (error) {
            toast.error('Failed to update settings');
        } finally {
            setIsSaving(false);
        }
    };

    const toggleFeatured = async (productId: string, currentStatus: boolean) => {
        try {
            // Optimistic update
            setProducts(products.map(p =>
                p.id === productId ? { ...p, isFeatured: !currentStatus } : p
            ));

            const res = await fetch(`/api/products/${productId}/featured`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                },
                body: JSON.stringify({ isFeatured: !currentStatus })
            });

            if (!res.ok) throw new Error('Failed to update');
            toast.success(currentStatus ? 'Removed from featured' : 'Added to featured');
        } catch (error) {
            // Revert on failure
            setProducts(products.map(p =>
                p.id === productId ? { ...p, isFeatured: currentStatus } : p
            ));
            toast.error('Failed to update status');
        }
    };

    if (userLoading || (isLoading && shopId)) return <div className="p-8">Loading settings...</div>;

    if (!shopId) return (
        <div className="p-8 text-center">
            <h2 className="text-xl font-semibold mb-2">No Shop Selected</h2>
            <p className="text-muted-foreground">Please select a shop to manage settings.</p>
        </div>
    );

    const isDev = process.env.NODE_ENV === 'development';
    const shopUrl = shop
        ? isDev
            ? `http://${shop.name}.localhost:3000`
            : `https://${shop.name}.supashop-ten.vercel.app`
        : '#';

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Online Store Settings</h1>
                    <p className="text-muted-foreground">Manage your storefront appearance and featured products.</p>
                </div>
                {shop && (
                    <Button variant="outline" asChild>
                        <a href={shopUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-4 h-4 mr-2" />
                            View Store
                        </a>
                    </Button>
                )}
            </div>

            <Tabs defaultValue="general" className="w-full">
                <TabsList>
                    <TabsTrigger value="general">General & Hero</TabsTrigger>
                    <TabsTrigger value="products">Featured Products</TabsTrigger>
                    {/* <TabsTrigger value="analytics">Analytics</TabsTrigger> */}
                </TabsList>

                {/* General Settings */}
                <TabsContent value="general" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Hero Configuration</CardTitle>
                            <CardDescription>
                                Customize the main banner of your storefront homepage.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between border-b pb-4">
                                <div className="space-y-0.5">
                                    <Label className="text-base">Enable Online Storefront</Label>
                                    <p className="text-sm text-muted-foreground">
                                        When disabled, your store will show a "Maintenance Mode" screen to visitors.
                                    </p>
                                </div>
                                <Switch
                                    checked={formData.isStorefrontEnabled}
                                    onCheckedChange={checked => setFormData({ ...formData, isStorefrontEnabled: checked })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="title">Hero Title</Label>
                                <Input
                                    id="title"
                                    placeholder="Welcome to our shop..."
                                    value={formData.heroTitle}
                                    onChange={e => setFormData({ ...formData, heroTitle: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="subtitle">Hero Subtitle</Label>
                                <Input
                                    id="subtitle"
                                    placeholder="Best prices, best quality..."
                                    value={formData.heroSubtitle}
                                    onChange={e => setFormData({ ...formData, heroSubtitle: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="color">Primary Theme Color</Label>
                                <select
                                    id="color"
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    value={formData.primaryColor}
                                    onChange={e => setFormData({ ...formData, primaryColor: e.target.value })}
                                >
                                    <option value="blue">Blue (Default)</option>
                                    <option value="purple">Purple</option>
                                    <option value="emerald">Emerald</option>
                                    <option value="orange">Orange</option>
                                    <option value="pink">Pink</option>
                                    <option value="neutral">Neutral (Black/Gray)</option>
                                </select>
                            </div>
                            <div className="pt-4">
                                <Button onClick={handleSaveSettings} disabled={isSaving}>
                                    <Save className="w-4 h-4 mr-2" />
                                    {isSaving ? 'Saving...' : 'Save Changes'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Featured Products */}
                <TabsContent value="products" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Featured Products</CardTitle>
                            <CardDescription>
                                Select products to highlight on your homepage.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Product Name</TableHead>
                                        <TableHead>Category</TableHead>
                                        <TableHead>Price</TableHead>
                                        <TableHead>Featured Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {products.map((product) => (
                                        <TableRow key={product.id}>
                                            <TableCell className="font-medium">{product.name}</TableCell>
                                            <TableCell>
                                                <Badge variant="secondary">{product.categoryName || 'Uncategorized'}</Badge>
                                            </TableCell>
                                            <TableCell>{new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(product.price)}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center space-x-2">
                                                    <Switch
                                                        checked={product.isFeatured}
                                                        onCheckedChange={() => toggleFeatured(product.id, product.isFeatured)}
                                                    />
                                                    <span className="text-sm text-muted-foreground">
                                                        {product.isFeatured ? 'Featured' : 'Standard'}
                                                    </span>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {products.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                                                No products found. Add products to your inventory first.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
