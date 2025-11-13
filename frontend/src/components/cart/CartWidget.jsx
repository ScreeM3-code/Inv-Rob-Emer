import React from 'react';
import { useCart } from './CartContext';
import { MailPlus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import CartPanel from './CartPanel';

export default function CartWidget() {
  const { cartItems } = useCart();

  return (
    <CartPanel>
      <button className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full shadow-lg flex items-center justify-center text-white hover:scale-110 transition-transform">
        <MailPlus className="w-7 h-7" />
        {cartItems.length > 0 && (
          <Badge className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full px-2">
            {cartItems.length}
          </Badge>
        )}
      </button>
    </CartPanel>
  );
}