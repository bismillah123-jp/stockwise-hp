import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Truck, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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

  // Fetch phone models
  const { data: phoneModels } = useQuery({
    queryKey: ['phone-models'],
    queryFn: async (): Promise<PhoneModel[]> => {
      const { data, error } = await supabase
        .from('phone_models')
        .select('*')
        .order('brand', { ascending: true })
        .order('model', { ascending: true });
      
      if (error) throw error;
      return data || [];
    }
  });

  // Mutation for stock input
  const stockMutation = useMutation({
    mutationFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const quantity = parseInt(formData.quantity);

      if (!quantity || quantity <= 0) {
        throw new Error('Please enter a valid quantity');
      }

      // Check if entry exists for today
      const { data: existingEntry } = await supabase
        .from('stock_entries')
        .select('*')
        .eq('date', today)
        .eq('location_id', formData.location_id)
        .eq('phone_model_id', formData.phone_model_id)
        .eq('imei', formData.imei || null)
        .single();

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
        title: "Missing fields",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }
    stockMutation.mutate();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Input Type Selection */}
      <div className="flex gap-2 lg:col-span-2">
        <Button
          type="button"
          variant={inputType === 'add_stock' ? 'default' : 'outline'}
          onClick={() => setInputType('add_stock')}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Stock
        </Button>
        <Button
          type="button"
          variant={inputType === 'incoming' ? 'default' : 'outline'}
          onClick={() => setInputType('incoming')}
          className="flex items-center gap-2"
        >
          <Truck className="w-4 h-4" />
          Incoming HP
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="lg:col-span-2">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location">Location *</Label>
            <select
              id="location"
              value={formData.location_id}
              onChange={(e) => setFormData({...formData, location_id: e.target.value})}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
              required
            >
              <option value="">Select location</option>
              {locations?.map(location => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          </div>

          {/* Phone Model */}
          <div className="space-y-2">
            <Label htmlFor="phone_model">Phone Model *</Label>
            <select
              id="phone_model"
              value={formData.phone_model_id}
              onChange={(e) => setFormData({...formData, phone_model_id: e.target.value})}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
              required
            >
              <option value="">Select model</option>
              {phoneModels?.map(model => (
                <option key={model.id} value={model.id}>
                  {model.brand} {model.model} {model.storage_capacity} - {model.color}
                </option>
              ))}
            </select>
          </div>

          {/* IMEI */}
          <div className="space-y-2">
            <Label htmlFor="imei">IMEI</Label>
            <Input
              id="imei"
              value={formData.imei}
              onChange={(e) => setFormData({...formData, imei: e.target.value})}
              placeholder="Optional IMEI"
            />
          </div>

          {/* Quantity */}
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity *</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              value={formData.quantity}
              onChange={(e) => setFormData({...formData, quantity: e.target.value})}
              placeholder="Enter quantity"
              required
            />
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-2 mt-4">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => setFormData({...formData, notes: e.target.value})}
            placeholder="Optional notes..."
            rows={2}
          />
        </div>

        {/* Submit Button */}
        <div className="mt-6">
          <Button 
            type="submit" 
            disabled={stockMutation.isPending}
            className="flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {stockMutation.isPending ? 'Processing...' : 
              (inputType === 'add_stock' ? 'Add to Stock' : 'Record Incoming')}
          </Button>
        </div>
      </form>
    </div>
  );
}