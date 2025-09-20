import { useState } from "react";
import { BarChart3, Package, TrendingUp, Plus, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddStockDialog } from "./AddStockDialog";
import { IncomingStockDialog } from "./IncomingStockDialog";

interface MobileNavigationProps {
  activeTab: 'dashboard' | 'table' | 'analytics';
  onTabChange: (tab: 'dashboard' | 'table' | 'analytics') => void;
}

export function MobileNavigation({ activeTab, onTabChange }: MobileNavigationProps) {
  const [addStockOpen, setAddStockOpen] = useState(false);
  const [incomingStockOpen, setIncomingStockOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'table', label: 'Stok', icon: Package },
    { id: 'analytics', label: 'Statistik', icon: TrendingUp }
  ];

  return (
    <>
      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50">
        <div className="flex items-center justify-around py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Button
                key={item.id}
                variant="ghost"
                size="sm"
                onClick={() => onTabChange(item.id as any)}
                className={`flex flex-col items-center gap-1 h-auto py-2 px-2 ${
                  activeTab === item.id ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs">{item.label}</span>
              </Button>
            );
          })}
          
          {/* Add Stock Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setAddStockOpen(true)}
            className="flex flex-col items-center gap-1 h-auto py-2 px-2 text-muted-foreground"
          >
            <Plus className="h-5 w-5" />
            <span className="text-xs">Tambah</span>
          </Button>
          
          {/* Incoming Stock Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIncomingStockOpen(true)}
            className="flex flex-col items-center gap-1 h-auto py-2 px-2 text-muted-foreground"
          >
            <Smartphone className="h-5 w-5" />
            <span className="text-xs">HP Datang</span>
          </Button>
        </div>
      </div>

      {/* Desktop Floating Action Buttons */}
      <div className="hidden md:block fixed bottom-6 right-6 z-50">
        <div className="flex flex-col gap-3">
          <Button
            onClick={() => setIncomingStockOpen(true)}
            className="h-12 w-12 rounded-full shadow-lg"
            size="icon"
          >
            <Smartphone className="h-5 w-5" />
          </Button>
          <Button
            onClick={() => setAddStockOpen(true)}
            className="h-14 w-14 rounded-full shadow-lg"
          >
            <Plus className="h-6 w-6" />
          </Button>
        </div>
      </div>

      <AddStockDialog open={addStockOpen} onOpenChange={setAddStockOpen} />
      <IncomingStockDialog open={incomingStockOpen} onOpenChange={setIncomingStockOpen} />
    </>
  );
}