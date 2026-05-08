import { Search, ChevronDown, ChevronUp, User, Heart, Bell, ShoppingCart, Loader2 } from 'lucide-react';
import { ProductCard } from './ProductCard';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Link } from 'react-router';
import { useState, useEffect, useMemo } from 'react';
import { LogoutButton } from './LogoutButton';
import { fetchHerbs, type HerbItem } from '../api';
import { useCartCount } from '../hooks/useCartCount';
import { useChatContext } from './ProtectedRoute';

const originCategories = [
  { id: 'domestic', label: '국내산' },
  { id: 'china', label: '중국산' },
  { id: 'vietnam', label: '베트남산' },
];

// 원산지 표시 텍스트 생성
const getOriginLabel = (origin: string): string => {
  if (!origin) return '';
  const lower = origin.toLowerCase();
  if (lower.includes('국내') || lower.includes('한국') || lower.includes('대한민국')) return '국내산';
  if (lower.includes('중국')) return '중국산';
  if (lower.includes('베트남')) return '베트남산';
  if (lower.includes('인도네시아')) return '인도네시아산';
  return origin;
};

// 원산지 국가명 추출
const getOriginCountry = (origin: string): string => {
  if (!origin) return '';
  const lower = origin.toLowerCase();
  if (lower.includes('국내') || lower.includes('한국') || lower.includes('대한민국')) return '대한민국';
  if (lower.includes('중국')) return '중국';
  if (lower.includes('베트남')) return '베트남';
  if (lower.includes('인도네시아')) return '인도네시아';
  return origin;
};

export function BuyerDashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrigins, setSelectedOrigins] = useState<string[]>([]);
  const [expandedFilters, setExpandedFilters] = useState({
    origin: true,
  });
  const [sortBy, setSortBy] = useState('default');
  const [herbs, setHerbs] = useState<HerbItem[]>([]);
  const cartCount = useCartCount();
  const { isChatOpen } = useChatContext();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const PAGE_SIZE = 30;
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchHerbs()
      .then((data) => {
        setHerbs(data.herbs);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const toggleOriginFilter = (id: string) => {
    setSelectedOrigins(prev =>
      prev.includes(id) ? prev.filter(o => o !== id) : [...prev, id]
    );
  };

  // 카테고리별 필터링 + 정렬
  const filteredProducts = useMemo(() => herbs
    .filter((herb) => {
      // 검색어 필터 (name, manufacturer, origin)
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        herb.name.toLowerCase().includes(term) ||
        (herb.manufacturer ?? '').toLowerCase().includes(term) ||
        (herb.origin ?? '').toLowerCase().includes(term);

      // 원산지 필터
      const originCountry = getOriginCountry(herb.origin);
      const matchesOrigin = selectedOrigins.length === 0 ||
        (selectedOrigins.includes('domestic') && originCountry === '대한민국') ||
        (selectedOrigins.includes('china') && originCountry === '중국') ||
        (selectedOrigins.includes('vietnam') && originCountry === '베트남');

      return matchesSearch && matchesOrigin;
    })
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name, 'ko');
      if (sortBy === 'manufacturer') return (a.manufacturer ?? '').localeCompare(b.manufacturer ?? '', 'ko');
      if (sortBy === 'origin') return (a.origin ?? '').localeCompare(b.origin ?? '', 'ko');
      return 0;
    }),
  [herbs, searchTerm, selectedOrigins, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedProducts = filteredProducts.slice(
    (safeCurrentPage - 1) * PAGE_SIZE,
    safeCurrentPage * PAGE_SIZE
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedOrigins, sortBy]);

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

            {/* Search Bar - 중앙 */}
            <div className="flex-1 max-w-2xl">
              <div className="relative">
                <Input
                  placeholder="한약재 제품 검색..."
                  className="w-full h-11 pl-4 pr-12 border-gray-300 rounded-[12px]"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Button
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-9 px-4 bg-[#059669] hover:bg-[#047857] text-white rounded-[8px]"
                >
                  <Search className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Right Side Icons */}
            <div className="flex items-center gap-4">
              <Link to="/mypage">
                <Button variant="ghost" size="sm" className="text-gray-600 hover:text-[#059669]">
                  <User className="w-5 h-5" />
                </Button>
              </Link>
              <Button variant="ghost" size="sm" className="text-gray-600 hover:text-[#059669]">
                <Heart className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="sm" className="text-gray-600 hover:text-[#059669]">
                <Bell className="w-5 h-5" />
              </Button>
              <Link to="/mypage">
                <Button variant="ghost" size="sm" className="relative text-gray-600 hover:text-[#059669]">
                  <ShoppingCart className="w-5 h-5" />
                  {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-[#059669] text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {cartCount > 99 ? '99+' : cartCount}
                    </span>
                  )}
                </Button>
              </Link>
              <LogoutButton />
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content with Sidebar */}
      <div className="max-w-[1600px] mx-auto px-6 py-6">
        <div className="flex gap-6">
          {/* Left Sidebar - Filters */}
          <div className="w-56 flex-shrink-0">
            <div className="bg-white rounded-[8px] border border-gray-200 overflow-hidden sticky top-6">
              {/* 분류 항목 헤더 */}
              <div className="bg-[#059669] text-white px-4 py-3">
                <h2 className="font-bold text-base">분류 항목</h2>
              </div>

              <div className="p-4">
                {/* 원산지 */}
                <div>
                  <button
                    onClick={() => setExpandedFilters({ ...expandedFilters, origin: !expandedFilters.origin })}
                    className="flex items-center justify-between w-full text-sm font-semibold text-[#191F28] mb-2"
                  >
                    <span>원산지</span>
                    {expandedFilters.origin ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  {expandedFilters.origin && (
                    <div className="space-y-1 ml-1">
                      {originCategories.map((category) => (
                        <label
                          key={category.id}
                          className={`flex items-center gap-2.5 cursor-pointer group px-2 py-1.5 rounded-[6px] transition-colors ${
                            selectedOrigins.includes(category.id)
                              ? 'bg-[#059669]/5 text-[#059669]'
                              : 'hover:bg-gray-50 text-gray-700'
                          }`}
                        >
                          <div className="relative flex items-center justify-center">
                            <input
                              type="checkbox"
                              checked={selectedOrigins.includes(category.id)}
                              onChange={() => toggleOriginFilter(category.id)}
                              className="sr-only peer"
                            />
                            <div className={`w-4 h-4 rounded transition-all ${
                              selectedOrigins.includes(category.id)
                                ? 'border-2 border-[#059669] bg-[#059669]'
                                : 'border-2 border-gray-300 group-hover:border-[#059669]'
                            }`}>
                              {selectedOrigins.includes(category.id) && (
                                <svg className="w-full h-full text-white" viewBox="0 0 16 16" fill="none">
                                  <path d="M13 4L6 11L3 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              )}
                            </div>
                          </div>
                          <span className={`text-sm transition-colors ${
                            selectedOrigins.includes(category.id) ? 'font-medium' : ''
                          }`}>
                            {category.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Content - Products */}
          <div className="flex-1">
            {/* 상단 탭과 정렬 */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Button
                  className="h-10 px-6 bg-[#059669] hover:bg-[#047857] text-white rounded-[8px] text-sm"
                >
                  모든 항목
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Sort by:</span>
                <select
                  className="h-10 px-3 border border-gray-300 rounded-[8px] text-sm bg-white text-gray-700"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="default">기본순</option>
                  <option value="name">이름순</option>
                  <option value="manufacturer">제조사순</option>
                  <option value="origin">원산지순</option>
                </select>
              </div>
            </div>

            {/* Loading / Error */}
            {loading && (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-[#059669]" />
                <span className="ml-3 text-gray-500">약재 목록을 불러오는 중...</span>
              </div>
            )}

            {error && (
              <div className="text-center py-12">
                <p className="text-red-500">{error}</p>
                <Button
                  className="mt-4 bg-[#059669] hover:bg-[#047857] text-white"
                  onClick={() => {
                    setLoading(true);
                    setError(null);
                    fetchHerbs()
                      .then((data) => { setHerbs(data.herbs); setLoading(false); })
                      .catch((err) => { setError(err.message); setLoading(false); });
                  }}
                >
                  다시 시도
                </Button>
              </div>
            )}

            {/* Product Grid - 챗봇 열리면 4열, 닫히면 5열 */}
            {!loading && !error && (
              <div className={`grid gap-4 ${isChatOpen ? 'grid-cols-4' : 'grid-cols-5'}`}>
                {paginatedProducts.map((herb) => (
                  <ProductCard
                    key={herb.id}
                    id={herb.id}
                    name={herb.name}
                    origin={getOriginLabel(herb.origin)}
                    manufacturer={herb.manufacturer}
                  />
                ))}
              </div>
            )}

            {/* 페이지 번호 navigation */}
            {!loading && !error && totalPages > 1 && (
              <Pagination
                currentPage={safeCurrentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            )}

            {/* 결과 없을 때 */}
            {!loading && !error && filteredProducts.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">검색 결과가 없습니다.</p>
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}

function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  const windowSize = 2;
  const start = Math.max(1, currentPage - windowSize);
  const end = Math.min(totalPages, currentPage + windowSize);
  const pages: number[] = [];
  for (let p = start; p <= end; p++) pages.push(p);

  const btnBase =
    "min-w-[36px] h-9 px-3 rounded-md text-sm transition-colors";
  const btnInactive = `${btnBase} bg-white text-gray-700 hover:bg-gray-100 border border-gray-200`;
  const btnActive = `${btnBase} bg-[#059669] text-white border border-[#059669]`;
  const btnDisabled = `${btnBase} bg-gray-50 text-gray-300 border border-gray-100 cursor-not-allowed`;

  return (
    <div className="flex items-center justify-center gap-1 mt-6 mb-4 flex-wrap">
      <button
        type="button"
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage <= 1}
        className={currentPage <= 1 ? btnDisabled : btnInactive}
      >
        이전
      </button>

      {start > 1 && (
        <>
          <button
            type="button"
            onClick={() => onPageChange(1)}
            className={btnInactive}
          >
            1
          </button>
          {start > 2 && <span className="px-1 text-gray-400">…</span>}
        </>
      )}

      {pages.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onPageChange(p)}
          className={p === currentPage ? btnActive : btnInactive}
        >
          {p}
        </button>
      ))}

      {end < totalPages && (
        <>
          {end < totalPages - 1 && <span className="px-1 text-gray-400">…</span>}
          <button
            type="button"
            onClick={() => onPageChange(totalPages)}
            className={btnInactive}
          >
            {totalPages}
          </button>
        </>
      )}

      <button
        type="button"
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage >= totalPages}
        className={currentPage >= totalPages ? btnDisabled : btnInactive}
      >
        다음
      </button>
    </div>
  );
}
