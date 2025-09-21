import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Minus, Truck, Smartphone, MapPin } from 'lucide-react';
import { AddStockDialog } from './AddStockDialog';
import { IncomingStockDialog } from './IncomingStockDialog';
import { AddPhoneModelDialog } from './AddPhoneModelDialog';
import { AddLocationDialog } from './AddLocationDialog';

export function FabMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [dialog, setDialog] = useState<string | null>(null);

  const actions = [
    {
      label: 'Tambah Stok',
      icon: Plus,
      dialog: 'addStock',
      color: 'bg-green-500 hover:bg-green-600',
    },
    {
      label: 'HP Datang',
      icon: Truck,
      dialog: 'incomingStock',
      color: 'bg-blue-500 hover:bg-blue-600',
    },
    {
      label: 'Tambah Model HP',
      icon: Smartphone,
      dialog: 'addPhoneModel',
      color: 'bg-purple-500 hover:bg-purple-600',
    },
    {
      label: 'Tambah Lokasi',
      icon: MapPin,
      dialog: 'addLocation',
      color: 'bg-yellow-500 hover:bg-yellow-600',
    },
  ];

  return (
    <>
      <div className="fixed bottom-24 right-6 z-50 md:bottom-6">
        <div className="relative flex flex-col items-center gap-2">
          {isOpen &&
            actions.map((action, index) => (
              <div
                key={index}
                className="transition-all duration-300"
                style={{
                  transform: `translateY(-${(index + 1) * 4}rem)`,
                  opacity: 1,
                }}
              >
                <Button
                  className={`w-12 h-12 rounded-full shadow-lg ${action.color}`}
                  onClick={() => setDialog(action.dialog)}
                >
                  <action.icon className="h-6 w-6 text-white" />
                </Button>
              </div>
            ))}
          <Button
            className="w-16 h-16 rounded-full shadow-xl bg-primary hover:bg-primary/90"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? (
              <Minus className="h-8 w-8" />
            ) : (
              <Plus className="h-8 w-8" />
            )}
          </Button>
        </div>
      </div>

      {dialog === 'addStock' && <AddStockDialog open={true} onOpenChange={() => setDialog(null)} />}
      {dialog === 'incomingStock' && <IncomingStockDialog open={true} onOpenChange={() => setDialog(null)} />}
      {dialog === 'addPhoneModel' && <AddPhoneModelDialog open={true} onOpenChange={() => setDialog(null)} />}
      {dialog === 'addLocation' && <AddLocationDialog open={true} onOpenChange={() => setDialog(null)} />}
    </>
  );
}
