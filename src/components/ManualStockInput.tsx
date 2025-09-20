import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Truck, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AddLocationDialog } from "./AddLocationDialog";
import { AddPhoneModelDialog } from "./AddPhoneModelDialog";

interface ManualStockInputProps {
  onSuccess?: () => void;
}

interface PhoneModel {
  id: string;
  brand: string;
  model: string;
  storage_capacity: string | null;
  color: string | null;
}

interface Location {
  id: string;
  name: string;
}

export function ManualStockInput({ onSuccess }: ManualStockInputProps) {
  const [inputType, setInputType] = useState<'add_stock' | 'incoming'>('add_stock');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [formData, setFormData] = useState({
    location_id: '',
    phone_model_id: '',
    imei: '',
    quantity: '',
    notes: ''
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch locations
  const { data: locations } = useQuery({
    queryKey: ['locations'],
    queryFn: async (): Promise<Location[]> => {
      const { data, error } = await supabase
        .from('stock_locations')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch unique brands
  const { data: brands } = useQuery({
    queryKey: ['brands'],
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from('phone_models')
        .select('brand')
        .order('brand');
      
      if (error) throw error;
      const uniqueBrands = [...new Set(data?.map(item => item.brand) || [])];
      return uniqueBrands;
    }
  });

  // Fetch phone models for selected brand
  const { data: phoneModels } = useQuery({
    queryKey: ['phone-models', selectedBrand],
    queryFn: async (): Promise<PhoneModel[]> => {
      if (!selectedBrand) return [];
      
      const { data, error } = await supabase
        .from('phone_models')
        .select('*')
        .eq('brand', selectedBrand)
        .order('model', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedBrand
  });

  // Mutation for stock input
  const stockMutation = useMutation({
    mutationFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const quantity = parseInt(formData.quantity);

      if (!quantity || quantity <= 0) {
        throw new Error('Masukkan jumlah yang valid');
      }

      // Check if entry exists for today
      const { data: existingEntry } = await supabase
        .from('stock_entries')
        .select('*')
        .eq('date', today)
        .eq('location_id', formData.location_id)
        .eq('phone_model_id', formData.phone_model_id)
        .eq('imei', formData.imei || null)
        .maybeSingle();

      if (existingEntry) {
        // Update existing entry
        const updateData = inputType === 'add_stock' 
          ? { 
              add_stock: existingEntry.add_stock + quantity,
              morning_stock: existingEntry.morning_stock + quantity,
              notes: formData.notes || existingEntry.notes
            }
          : { 
              incoming: existingEntry.incoming + quantity,
              notes: formData.notes || existingEntry.notes
            };

        const { error } = await supabase
          .from('stock_entries')
          .update(updateData)
          .eq('id', existingEntry.id);

        if (error) throw error;
      } else {
        // Create new entry
        const newEntry = {
          date: today,
          location_id: formData.location_id,
          phone_model_id: formData.phone_model_id,
          imei: formData.imei || null,
          morning_stock: inputType === 'add_stock' ? quantity : 0,
          night_stock: 0, // Will be calculated by trigger
          incoming: inputType === 'incoming' ? quantity : 0,
          add_stock: inputType === 'add_stock' ? quantity : 0,
          returns: 0,
          sold: 0,
          adjustment: 0,
          notes: formData.notes || null
        };

        const { error } = await supabase
          .from('stock_entries')
          .insert(newEntry);

        if (error) throw error;
      }

      // Log transaction
      await supabase
        .from('stock_transactions_log')
        .insert({
          stock_entry_id: existingEntry?.id || null, // This could be improved with the actual ID
          transaction_type: inputType,
          quantity: quantity,
          previous_night_stock: existingEntry?.night_stock || 0,
          new_night_stock: existingEntry ? 
            (inputType === 'add_stock' ? existingEntry.night_stock + quantity : existingEntry.night_stock + quantity) :
            quantity,
          notes: formData.notes || null
        });
    },
    onSuccess: () => {
      toast({
        title: "Stock updated successfully",
        description: `${inputType === 'add_stock' ? 'Added stock' : 'Incoming HP recorded'} for ${formData.quantity} units.`,
      });
      
      // Reset form
      setSelectedBrand('');
      setFormData({
        location_id: '',
        phone_model_id: '',
        imei: '',
        quantity: '',
        notes: ''
      });

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['stock-entries'] });
      
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "Error updating stock",
        description: error.message || "An error occurred while updating stock.",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.location_id || !formData.phone_model_id || !formData.quantity) {
      toast({
        title: "Field belum lengkap",
        description: "Mohon isi semua field yang wajib diisi.",
        variant: "destructive",
      });
      return;
    }
    stockMutation.mutate();
  };

  return (
    <div className="space-y-6">
      {/* Input Type Selection */}
      <div className="flex flex-col sm:flex-row gap-2">
        <Button
          type="button"
          variant={inputType === 'add_stock' ? 'default' : 'outline'}
          onClick={() => setInputType('add_stock')}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Tambah Stok
        </Button>
        <Button
          type="button"
          variant={inputType === 'incoming' ? 'default' : 'outline'}
          onClick={() => setInputType('incoming')}
          className="flex items-center gap-2"
        >
          <Truck className="w-4 h-4" />
          HP Datang
        </Button>
      </div>

      {/* Management Actions */}
      <div className="flex flex-col sm:flex-row gap-2 p-4 bg-muted/50 rounded-lg">
        <AddLocationDialog />
        <AddPhoneModelDialog />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location">Lokasi *</Label>
            <Select 
              value={formData.location_id} 
              onValueChange={(value) => setFormData({...formData, location_id: value})}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih lokasi" />
              </SelectTrigger>
              <SelectContent>
                {locations?.map(location => (
                  <SelectItem key={location.id} value={location.id}>
                    {location.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Brand Selection */}
          <div className="space-y-2">
            <Label htmlFor="brand">Merk *</Label>
            <Select 
              value={selectedBrand} 
              onValueChange={(value) => {
                setSelectedBrand(value);
                setFormData({...formData, phone_model_id: ''});
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih merk" />
              </SelectTrigger>
              <SelectContent>
                {brands?.map(brand => (
                  <SelectItem key={brand} value={brand}>
                    {brand}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Phone Model */}
          <div className="space-y-2">
            <Label htmlFor="phone_model">Model HP *</Label>
            <Select 
              value={formData.phone_model_id} 
              onValueChange={(value) => setFormData({...formData, phone_model_id: value})}
              disabled={!selectedBrand}
            >
              <SelectTrigger>
                <SelectValue placeholder={!selectedBrand ? "Pilih merk dulu" : "Pilih model"} />
              </SelectTrigger>
              <SelectContent>
                {phoneModels?.map(model => (
                  <SelectItem key={model.id} value={model.id}>
                    {model.model} {model.storage_capacity} - {model.color}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* IMEI */}
          <div className="space-y-2">
            <Label htmlFor="imei">IMEI</Label>
            <Input
              id="imei"
              value={formData.imei}
              onChange={(e) => setFormData({...formData, imei: e.target.value})}
              placeholder="IMEI (opsional)"
            />
          </div>

          {/* Quantity */}
          <div className="space-y-2">
            <Label htmlFor="quantity">Jumlah *</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              value={formData.quantity}
              onChange={(e) => setFormData({...formData, quantity: e.target.value})}
              placeholder="Masukkan jumlah"
              required
            />
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-2 col-span-full">
          <Label htmlFor="notes">Catatan</Label>
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => setFormData({...formData, notes: e.target.value})}
            placeholder="Catatan opsional..."
            rows={2}
          />
        </div>

        {/* Submit Button */}
        <div className="col-span-full">
          <Button 
            type="submit" 
            disabled={stockMutation.isPending || !selectedBrand}
            className="w-full sm:w-auto flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {stockMutation.isPending ? 'Memproses...' : 
              (inputType === 'add_stock' ? 'Tambah ke Stok' : 'Catat HP Datang')}
          </Button>
        </div>
      </form>
    </div>
  );
}