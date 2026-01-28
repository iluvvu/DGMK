import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

function formatPrice(price: number) {
  return price.toLocaleString("ko-KR") + "원";
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  if (hours < 24) return `${hours}시간 전`;
  if (days < 7) return `${days}일 전`;
  return date.toLocaleDateString("ko-KR");
}

export default async function Home() {
  const supabase = await createClient();

  const { data: products } = await supabase
    .from("products")
    .select(`
      *,
      profiles(nickname),
      product_images(image_url)
    `)
    .eq("status", "selling")
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold">중고거래</h1>
      </div>

      {!products || products.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-gray-500 mb-4">아직 등록된 상품이 없습니다</p>
          <Link
            href="/products/new"
            className="inline-block px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
          >
            첫 상품 등록하기
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {products.map((product) => (
            <Link
              key={product.id}
              href={`/products/${product.id}`}
              className="flex gap-4 p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
            >
              <div className="w-28 h-28 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                {product.product_images?.[0]?.image_url ? (
                  <img
                    src={product.product_images[0].image_url}
                    alt={product.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <svg
                      className="w-10 h-10"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                )}
              </div>

              <div className="flex flex-col flex-grow">
                <h2 className="text-base font-medium text-gray-900 line-clamp-2">
                  {product.title}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {product.location || "위치 미설정"} · {formatDate(product.created_at!)}
                </p>
                <p className="text-lg font-bold mt-auto">
                  {formatPrice(product.price)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
