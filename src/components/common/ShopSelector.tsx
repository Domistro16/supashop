import { useAuth } from "@/auth";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Store } from "lucide-react";

export function ShopSelector() {
  const { shops, currentShop, setCurrentShop } = useAuth();

  if (shops.length <= 1) {
    return null; // Don't show selector if user only has one shop
  }

  return (
    <div className="flex items-center gap-2">
      <Store className="h-4 w-4 text-muted-foreground" />
      <Select
        value={currentShop?.id || ""}
        onValueChange={(value) => {
          setCurrentShop(value);
          window.location.reload(); // Reload to refresh data for new shop
        }}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Select a shop" />
        </SelectTrigger>
        <SelectContent>
          {shops.map((shop) => (
            <SelectItem key={shop.id} value={shop.id}>
              <div className="flex flex-col">
                <span className="font-medium">{shop.name}</span>
                <span className="text-xs text-muted-foreground capitalize">
                  {shop.role}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
