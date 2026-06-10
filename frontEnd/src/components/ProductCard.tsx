import { useState } from 'react';
import { Link } from 'react-router';
import { ShoppingCart, Check } from 'lucide-react';
import { addToCart } from '../api';

interface ProductCardProps {
  id: string;
  name: string;
  price: string;
  image: string;
  availableSellers: number;
}

export function ProductCard({
  id,
  name,
  price,
  image,
  availableSellers,
}: ProductCardProps) {
  const [cartLoading, setCartLoading] = useState(false);
  const [cartAdded, setCartAdded] = useState(false);

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (cartLoading) return;
    setCartLoading(true);
    try {
      const priceValue = parseInt(price.replace(/[^\d]/g, ''), 10) || 0;
      await addToCart({ product_id: id, product_name: name, price: priceValue, quantity: 1 });
      window.dispatchEvent(new Event('cart-updated'));
      setCartAdded(true);
      setTimeout(() => setCartAdded(false), 2000);
    } catch {
      alert('장바구니 추가에 실패했습니다.');
    } finally {
      setCartLoading(false);
    }
  };

  return (
    <Link to={`/product/${id}`}>
      <div className="bg-white rounded-[12px] border border-gray-200 shadow-sm hover:shadow-md transition-all overflow-hidden cursor-pointer group">
        {/* Product Image */}
        <div className="w-full aspect-[4/3] overflow-hidden bg-gray-100">
          <img
            src={image}
            alt={name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>

        {/* Product Info */}
        <div className="p-3">
          <h3 className="text-[#191F28] font-semibold text-base mb-2 leading-tight">
            {name}
          </h3>

          {/* Available Sellers Count */}
          <div className="text-xs text-gray-500 mb-2">
            재고 보유 판매처 {availableSellers}곳
          </div>

          {/* Price */}
          <div className="mb-3">
            <div className="text-lg font-semibold text-[#059669]">
              {price}
              <span className="text-sm font-normal text-gray-500 ml-1">부터</span>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-2">
            <button
              className="flex-1 py-2 flex items-center justify-center text-sm transition-all text-gray-700 border border-gray-200 rounded-lg hover:text-[#059669] hover:bg-gray-50 hover:border-[#059669]"
            >
              <span>상세정보</span>
            </button>
            <button
              onClick={handleAddToCart}
              disabled={cartLoading}
              className={`flex-1 py-2 flex items-center justify-center gap-1.5 text-sm transition-all text-white rounded-lg border ${
                cartAdded
                  ? 'bg-[#047857] border-[#047857]'
                  : 'bg-[#059669] border-[#059669] hover:bg-[#047857] hover:border-[#047857]'
              }`}
            >
              {cartAdded ? <Check className="w-4 h-4" /> : <ShoppingCart className="w-4 h-4" />}
              <span>{cartAdded ? '담김!' : '장바구니'}</span>
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}
