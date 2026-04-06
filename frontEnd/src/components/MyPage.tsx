import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { LogoutButton } from './LogoutButton';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  User,
  Bell,
  ShoppingCart,
  Heart,
  Search,
  Package,
  FileText,
  CreditCard,
  Wallet,
  Download,
  Eye,
  Plus,
  Minus,
} from 'lucide-react';
import { ChatbotButton } from './ChatbotButton';
import {
  fetchOrders, fetchCancellations, fetchCart, fetchTaxInvoices, fetchPayments,
  updateCartItem, deleteCartItem,
  type Order, type OrderCancellation, type CartItem, type TaxInvoice, type Payment,
} from '../api';

// 이미지 import
import img1 from 'figma:asset/19e49e0900284b91c8363d4044be913cd97e16b9.png';
import img2 from 'figma:asset/a7ff756f68927275d5173e2efd38b483b0992f8d.png';
import img10 from 'figma:asset/28d322bb13587333bb411b6a213566bd07604045.png';

// ── Mock 데이터 (API 데이터 없을 때 fallback) ─────────────

type MockOrder = { id: string; product_name: string; price: number; quantity: number; status: string; created_at: string; image: string };
type MockCancellation = { id: string; type: string; product_name: string; price: number; quantity: number; status: string; reason: string; created_at: string; image: string };
type MockCartItem = { id: string; product_id: string; product_name: string; price: number; quantity: number; image: string };

const mockOrders: MockOrder[] = [
  { id: '1', product_name: '[씨케이] 중국산 씨케이감초 600g', price: 48000, quantity: 17, status: '배송완료', created_at: '2026-03-03T00:00:00', image: img1 },
  { id: '2', product_name: '[씨케이] 중국산 씨케이마황 450g', price: 32000, quantity: 17, status: '배송중', created_at: '2026-02-24T00:00:00', image: img2 },
  { id: '3', product_name: '[씨케이] 중국산 씨케이설복령 600g', price: 33000, quantity: 8, status: '배송중', created_at: '2026-02-24T00:00:00', image: img10 },
];

const mockCancellations: MockCancellation[] = [
  { id: '1', type: '반품', product_name: '[씨케이] 중국산 씨케이백출 500g', price: 45000, quantity: 10, status: '환불완료', reason: '제품 불량', created_at: '2026-02-20T00:00:00', image: img1 },
  { id: '2', type: '교환', product_name: '[씨케이] 국내산 씨케이복령 800g', price: 52000, quantity: 5, status: '교환완료', reason: '사이즈 변경', created_at: '2026-02-15T00:00:00', image: img2 },
];

const mockCartItems: MockCartItem[] = [
  { id: '1', product_id: 'mock-1', product_name: '[씨케이] 중국산 씨케이감초 600g', price: 48000, quantity: 5, image: img1 },
  { id: '2', product_id: 'mock-2', product_name: '[씨케이] 중국산 씨케이마황 450g', price: 32000, quantity: 3, image: img2 },
  { id: '3', product_id: 'mock-3', product_name: '[씨케이] 중국산 씨케이설복령 600g', price: 33000, quantity: 2, image: img10 },
];

const mockTaxInvoices: TaxInvoice[] = [
  { id: '1', invoice_number: 'TAX-2026-0305-001', amount: 816000, status: '발행완료', created_at: '2026-03-05T00:00:00' },
  { id: '2', invoice_number: 'TAX-2026-0225-002', amount: 920000, status: '발행완료', created_at: '2026-02-25T00:00:00' },
];

const mockPayments: Payment[] = [
  { id: '1', order_number: 'ORD-2026-0304-001', amount: 816000, method: '무통장입금', status: '입금완료', created_at: '2026-03-04T00:00:00' },
  { id: '2', order_number: 'ORD-2026-0224-002', amount: 920000, method: '무통장입금', status: '입금완료', created_at: '2026-02-24T00:00:00' },
];

// ── 헬퍼 ────────────────────────────────────────────────
const statusColor = (status: string) =>
  ['배송중', '환불완료', '입금완료'].includes(status) ? 'text-[#059669]' : 'text-gray-600';

const formatDate = (iso: string) => iso.slice(0, 10).replace(/-/g, '.');

type MenuTab = 'orders' | 'statements' | 'cancellations' | 'cart' | 'taxInvoices' | 'payments';

export function MyPage() {
  const [activeTab, setActiveTab] = useState<MenuTab>('orders');
  const [selectedYear, setSelectedYear] = useState('2026');

  // 실제 데이터 state (API 성공 시 채워짐, 빈 배열이면 mock 사용)
  const [orders, setOrders] = useState<(Order & { image?: string })[]>([]);
  const [cancellations, setCancellations] = useState<(OrderCancellation & { image?: string })[]>([]);
  const [cartItems, setCartItems] = useState<(CartItem & { image?: string })[]>([]);
  const [taxInvoices, setTaxInvoices] = useState<TaxInvoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.allSettled([
      fetchOrders(),
      fetchCancellations(),
      fetchCart(),
      fetchTaxInvoices(),
      fetchPayments(),
    ]).then(([ord, can, cart, tax, pay]) => {
      setOrders(ord.status === 'fulfilled' && ord.value.length > 0 ? ord.value : mockOrders);
      setCancellations(can.status === 'fulfilled' && can.value.length > 0 ? can.value : mockCancellations);
      setCartItems(cart.status === 'fulfilled' && cart.value.length > 0 ? cart.value : mockCartItems);
      setTaxInvoices(tax.status === 'fulfilled' && tax.value.length > 0 ? tax.value : mockTaxInvoices);
      setPayments(pay.status === 'fulfilled' && pay.value.length > 0 ? pay.value : mockPayments);
      setLoaded(true);
    });
  }, []);

  // 장바구니 수량 변경
  const handleCartQty = async (id: string, delta: number) => {
    const item = cartItems.find(i => i.id === id);
    if (!item) return;
    const newQty = Math.max(1, item.quantity + delta);
    // mock 항목이면 로컬만 변경
    if (id.length < 10) {
      setCartItems(prev => prev.map(i => i.id === id ? { ...i, quantity: newQty } : i));
      return;
    }
    try {
      const updated = await updateCartItem(id, newQty);
      setCartItems(prev => prev.map(i => i.id === id ? { ...i, ...updated } : i));
    } catch {
      setCartItems(prev => prev.map(i => i.id === id ? { ...i, quantity: newQty } : i));
    }
  };

  // 장바구니 삭제
  const handleCartDelete = async (id: string) => {
    if (id.length >= 10) {
      try { await deleteCartItem(id); } catch { /* ignore */ }
    }
    setCartItems(prev => prev.filter(i => i.id !== id));
  };

  // 연도 필터
  const filterByYear = <T extends { created_at: string }>(items: T[]) =>
    selectedYear === 'all' ? items : items.filter(i => i.created_at.startsWith(selectedYear));

  const years = ['2026', '2025', '2024', '2023', '2022', '2021'];

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      {/* Navigation Bar */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-6">
            {/* Logo */}
            <Link to="/">
              <h1 className="text-3xl font-bold cursor-pointer transition-colors">
                <span className="text-[#059669] hover:text-[#047857]">Palantiny</span>
              </h1>
            </Link>

            {/* Search Bar */}
            <div className="flex-1 max-w-2xl">
              <div className="relative">
                <Input
                  placeholder="한약재 제품 검색..."
                  className="w-full h-11 pl-4 pr-12 border-gray-300 rounded-[12px]"
                />
                <Button className="absolute right-1 top-1/2 -translate-y-1/2 h-9 px-4 bg-[#059669] hover:bg-[#047857] text-white rounded-[8px]">
                  <Search className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Right Side Icons */}
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-600 hover:text-[#059669]"
              >
                <User className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-600 hover:text-[#059669]"
              >
                <Heart className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-600 hover:text-[#059669]"
              >
                <Bell className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="relative text-gray-600 hover:text-[#059669]"
              >
                <ShoppingCart className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 bg-[#059669] text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  0
                </span>
              </Button>
              <LogoutButton />
              <ChatbotButton />
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-[1200px] mx-auto px-6 py-8">
        <div className="grid grid-cols-[260px_1fr] gap-6">
          {/* Left Sidebar */}
          <div className="space-y-2">
            {/* MY 쇼핑 */}
            <div className="bg-white rounded-[12px] border border-gray-200 p-4">
              <h3 className="text-sm font-bold text-[#191F28] mb-3">주문 관리</h3>
              <div className="space-y-1">
                <button
                  onClick={() => setActiveTab('orders')}
                  className={`w-full text-left px-3 py-2 text-sm rounded-[8px] transition-colors ${
                    activeTab === 'orders'
                      ? 'bg-[#059669]/10 text-[#059669] font-semibold'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  주문 목록
                </button>
                <button
                  onClick={() => setActiveTab('cancellations')}
                  className={`w-full text-left px-3 py-2 text-sm rounded-[8px] transition-colors ${
                    activeTab === 'cancellations'
                      ? 'bg-[#059669]/10 text-[#059669] font-semibold'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  취소/반품/교환/환불 내역
                </button>
                <button
                  onClick={() => setActiveTab('cart')}
                  className={`w-full text-left px-3 py-2 text-sm rounded-[8px] transition-colors ${
                    activeTab === 'cart'
                      ? 'bg-[#059669]/10 text-[#059669] font-semibold'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  장바구니
                </button>
              </div>
            </div>

            {/* MY 세무 */}
            <div className="bg-white rounded-[12px] border border-gray-200 p-4">
              <h3 className="text-sm font-bold text-[#191F28] mb-3">세무 관리</h3>
              <div className="space-y-1">
                <button
                  onClick={() => setActiveTab('statements')}
                  className={`w-full text-left px-3 py-2 text-sm rounded-[8px] transition-colors ${
                    activeTab === 'statements'
                      ? 'bg-[#059669]/10 text-[#059669] font-semibold'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  거래명세서
                </button>
                <button
                  onClick={() => setActiveTab('payments')}
                  className={`w-full text-left px-3 py-2 text-sm rounded-[8px] transition-colors ${
                    activeTab === 'payments'
                      ? 'bg-[#059669]/10 text-[#059669] font-semibold'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  입금 내역
                </button>
                <button
                  onClick={() => setActiveTab('taxInvoices')}
                  className={`w-full text-left px-3 py-2 text-sm rounded-[8px] transition-colors ${
                    activeTab === 'taxInvoices'
                      ? 'bg-[#059669]/10 text-[#059669] font-semibold'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  세금계산서 발행내역
                </button>
              </div>
            </div>
          </div>

          {/* Right Content Area */}
          <div className="bg-white rounded-[12px] border border-gray-200 p-8">
            {/* Header */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-[#191F28]">
                {activeTab === 'orders' && '주문 목록'}
                {activeTab === 'statements' && '거래명세서'}
                {activeTab === 'cancellations' && '취소/반품/교환/환불 내역'}
                {activeTab === 'cart' && '장바구니 목록'}
                {activeTab === 'taxInvoices' && '세금계산서 발행내역'}
                {activeTab === 'payments' && '입금 내역'}
              </h2>
            </div>

            {/* Year Filter */}
            <div className="flex gap-2 mb-6 pb-4 border-b border-gray-200">
              <Button
                size="sm"
                className={`rounded-[20px] px-4 ${
                  selectedYear === 'all'
                    ? 'bg-[#059669] text-white hover:bg-[#047857]'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                onClick={() => setSelectedYear('all')}
              >
                전체 보기
              </Button>
              {years.map((year) => (
                <Button
                  key={year}
                  size="sm"
                  className={`rounded-[20px] px-4 ${
                    selectedYear === year
                      ? 'bg-[#059669] text-white hover:bg-[#047857]'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  onClick={() => setSelectedYear(year)}
                >
                  {year}
                </Button>
              ))}
            </div>

            {/* Content based on active tab */}
            {activeTab === 'orders' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-[#191F28]">
                    주문 내역
                  </h3>
                  <button className="text-sm text-[#059669] hover:text-[#047857] font-medium">
                    주문 상세보기 →
                  </button>
                </div>

                {/* Order Cards */}
                {filterByYear(orders).map((order) => (
                  <div
                    key={order.id}
                    className="border border-gray-200 rounded-[12px] p-6"
                  >
                    <div className="flex items-start gap-4">
                      {/* Product Image */}
                      <div className="w-20 h-20 bg-gray-100 rounded-[8px] overflow-hidden">
                        <img
                          src={(order as { image?: string }).image ?? ''}
                          alt={order.product_name}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Product Info */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <span
                              className={`inline-block text-sm font-semibold mb-1 ${statusColor(order.status)}`}
                            >
                              {order.status}
                            </span>
                            <h4 className="font-medium text-[#191F28]">
                              {order.product_name}
                            </h4>
                            <p className="text-sm text-gray-500 mt-1">
                              {formatDate(order.created_at)} | {order.quantity}개 | ₩
                              {order.price.toLocaleString()}
                            </p>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2 mt-4">
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-gray-300 text-gray-700 hover:bg-gray-50 rounded-[8px]"
                          >
                            <Package className="w-4 h-4 mr-1" />
                            배송 조회
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-gray-300 text-gray-700 hover:bg-gray-50 rounded-[8px]"
                          >
                            교환·반품 신청
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-gray-300 text-gray-700 hover:bg-gray-50 rounded-[8px]"
                          >
                            리뷰 작성하기
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'statements' && (
              <div className="space-y-4">
                <p className="text-gray-600 mb-6">
                  거래명세서를 확인하고 다운로드할 수 있습니다.
                </p>

                {filterByYear(orders).map((order) => (
                  <div
                    key={order.id}
                    className="border border-gray-200 rounded-[12px] p-5 hover:border-[#059669]/30 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <FileText className="w-5 h-5 text-[#059669]" />
                        <div>
                          <h4 className="font-medium text-[#191F28] mb-1">
                            {formatDate(order.created_at)} 거래명세서
                          </h4>
                          <p className="text-sm text-gray-500">
                            {order.product_name} 외 {order.quantity}건
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-lg font-semibold text-[#191F28]">
                          ₩{(order.price * order.quantity).toLocaleString()}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-gray-300 text-gray-700 hover:bg-gray-50 rounded-[8px] ml-4"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          보기
                        </Button>
                        <Button
                          size="sm"
                          className="bg-[#059669] hover:bg-[#047857] text-white rounded-[8px]"
                        >
                          <Download className="w-4 h-4 mr-1" />
                          다운로드
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'cancellations' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-[#191F28]">
                    취소/반품/교환/환불 내역
                  </h3>
                  <button className="text-sm text-[#059669] hover:text-[#047857] font-medium">
                    상세보기 →
                  </button>
                </div>

                {/* Cancellation Cards */}
                {filterByYear(cancellations).map((cancellation) => (
                  <div
                    key={cancellation.id}
                    className="border border-gray-200 rounded-[12px] p-6"
                  >
                    <div className="flex items-start gap-4">
                      {/* Product Image */}
                      <div className="w-20 h-20 bg-gray-100 rounded-[8px] overflow-hidden">
                        <img
                          src={(cancellation as { image?: string }).image ?? ''}
                          alt={cancellation.product_name}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Product Info */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <span
                              className={`inline-block text-sm font-semibold mb-1 ${statusColor(cancellation.status)}`}
                            >
                              [{cancellation.type}] {cancellation.status}
                            </span>
                            <h4 className="font-medium text-[#191F28]">
                              {cancellation.product_name}
                            </h4>
                            <p className="text-sm text-gray-500 mt-1">
                              {formatDate(cancellation.created_at)} | {cancellation.quantity}개 | ₩
                              {cancellation.price.toLocaleString()}
                            </p>
                            <p className="text-sm text-gray-500 mt-1">
                              사유: {cancellation.reason}
                            </p>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2 mt-4">
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-gray-300 text-gray-700 hover:bg-gray-50 rounded-[8px]"
                          >
                            <Package className="w-4 h-4 mr-1" />
                            배송 조회
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-gray-300 text-gray-700 hover:bg-gray-50 rounded-[8px]"
                          >
                            교환·반품 신청
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-gray-300 text-gray-700 hover:bg-gray-50 rounded-[8px]"
                          >
                            리뷰 작성하기
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'cart' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-[#191F28]">
                    장바구니 목록
                  </h3>
                  <button className="text-sm text-[#059669] hover:text-[#047857] font-medium">
                    상세보기 →
                  </button>
                </div>

                {/* Cart Cards */}
                {cartItems.map((item) => (
                  <div
                    key={item.id}
                    className="border border-gray-200 rounded-[12px] p-6"
                  >
                    <div className="flex items-start gap-4">
                      {/* Product Image */}
                      <div className="w-20 h-20 bg-gray-100 rounded-[8px] overflow-hidden">
                        <img
                          src={(item as { image?: string }).image ?? ''}
                          alt={item.product_name}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Product Info */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-medium text-[#191F28]">
                              {item.product_name}
                            </h4>
                            <p className="text-sm text-gray-500 mt-1">
                              ₩{item.price.toLocaleString()}
                            </p>
                          </div>

                          {/* Quantity Controls */}
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-8 h-8 p-0 rounded-[6px]"
                              onClick={() => handleCartQty(item.id, -1)}
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            <span className="w-8 text-center font-medium">{item.quantity}</span>
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-8 h-8 p-0 rounded-[6px]"
                              onClick={() => handleCartQty(item.id, 1)}
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                            <span className="ml-2 font-semibold text-[#191F28]">
                              ₩{(item.price * item.quantity).toLocaleString()}
                            </span>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2 mt-4">
                          <Button
                            size="sm"
                            className="bg-[#059669] hover:bg-[#047857] text-white rounded-[8px]"
                          >
                            주문하기
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-300 text-red-600 hover:bg-red-50 rounded-[8px]"
                            onClick={() => handleCartDelete(item.id)}
                          >
                            삭제
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'taxInvoices' && (
              <div className="space-y-4">
                <p className="text-gray-600 mb-6">
                  발행된 세금계산서를 확인하고 다운로드할 수 있습니다.
                </p>

                {filterByYear(taxInvoices).map((invoice) => (
                  <div
                    key={invoice.id}
                    className="border border-gray-200 rounded-[12px] p-5 hover:border-[#059669]/30 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <CreditCard className="w-5 h-5 text-[#059669]" />
                        <div>
                          <h4 className="font-medium text-[#191F28] mb-1">
                            {invoice.invoice_number}
                          </h4>
                          <p className="text-sm text-gray-500">
                            발행일: {formatDate(invoice.created_at)} | 상태:{' '}
                            <span className="text-[#059669] font-medium">
                              {invoice.status}
                            </span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-lg font-semibold text-[#191F28]">
                          ₩{invoice.amount.toLocaleString()}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-gray-300 text-gray-700 hover:bg-gray-50 rounded-[8px] ml-4"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          보기
                        </Button>
                        <Button
                          size="sm"
                          className="bg-[#059669] hover:bg-[#047857] text-white rounded-[8px]"
                        >
                          <Download className="w-4 h-4 mr-1" />
                          다운로드
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'payments' && (
              <div className="space-y-4">
                <p className="text-gray-600 mb-6">
                  입금 내역을 확인할 수 있습니다.
                </p>

                {filterByYear(payments).map((payment) => (
                  <div
                    key={payment.id}
                    className="border border-gray-200 rounded-[12px] p-5 hover:border-[#059669]/30 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Wallet className="w-5 h-5 text-[#059669]" />
                        <div>
                          <h4 className="font-medium text-[#191F28] mb-1">
                            주문번호: {payment.order_number}
                          </h4>
                          <p className="text-sm text-gray-500">
                            입금일: {formatDate(payment.created_at)} | 결제수단: {payment.method} |
                            상태:{' '}
                            <span className="text-[#059669] font-medium">
                              {payment.status}
                            </span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-lg font-semibold text-[#191F28]">
                          ₩{payment.amount.toLocaleString()}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-gray-300 text-gray-700 hover:bg-gray-50 rounded-[8px] ml-4"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          상세보기
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}