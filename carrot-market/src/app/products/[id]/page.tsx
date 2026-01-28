import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function formatPrice(price: number) {
  return price.toLocaleString("ko-KR") + "원";
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: product, error } = await supabase
    .from("products")
    .select(
      `
      *,
      profiles(id, nickname, avatar_url),
      product_images(id, image_url, display_order)
    `
    )
    .eq("id", id)
    .single();

  if (error || !product) {
    notFound();
  }

  // 조회수 증가 (본인 상품이 아닐 경우에만)
  if (user?.id !== product.user_id) {
    await supabase
      .from("products")
      .update({ view_count: (product.view_count || 0) + 1 })
      .eq("id", id);
  }

  const images = product.product_images?.sort(
    (a: { display_order: number | null }, b: { display_order: number | null }) =>
      (a.display_order || 0) - (b.display_order || 0)
  );
  const isOwner = user?.id === product.user_id;

  const statusLabel = {
    selling: "판매중",
    reserved: "예약중",
    sold: "판매완료",
  };

  const statusColor = {
    selling: "bg-green-100 text-green-700",
    reserved: "bg-yellow-100 text-yellow-700",
    sold: "bg-gray-100 text-gray-500",
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* 이미지 슬라이더 */}
      <div className="aspect-square bg-gray-200 relative overflow-hidden">
        {images && images.length > 0 ? (
          <img
            src={images[0].image_url}
            alt={product.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <svg
              className="w-20 h-20"
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

        {/* 이미지 인디케이터 */}
        {images && images.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
            {images.map((_: unknown, index: number) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full ${
                  index === 0 ? "bg-white" : "bg-white/50"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      <div className="px-4 py-6">
        {/* 판매자 정보 */}
        <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
          <div className="w-12 h-12 bg-gray-200 rounded-full overflow-hidden">
            {product.profiles?.avatar_url ? (
              <img
                src={product.profiles.avatar_url}
                alt={product.profiles.nickname}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
            )}
          </div>
          <div>
            <p className="font-medium">{product.profiles?.nickname}</p>
            <p className="text-sm text-gray-500">
              {product.location || "위치 미설정"}
            </p>
          </div>
        </div>

        {/* 상품 정보 */}
        <div className="py-6 border-b border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`px-2 py-1 rounded text-xs font-medium ${
                statusColor[product.status as keyof typeof statusColor] ||
                statusColor.selling
              }`}
            >
              {statusLabel[product.status as keyof typeof statusLabel] ||
                "판매중"}
            </span>
          </div>
          <h1 className="text-xl font-bold mb-2">{product.title}</h1>
          <p className="text-sm text-gray-500 mb-4">
            {formatDate(product.created_at!)} · 조회 {product.view_count || 0}
          </p>
          <p className="text-2xl font-bold">{formatPrice(product.price)}</p>
        </div>

        {/* 상품 설명 */}
        {product.description && (
          <div className="py-6 border-b border-gray-200">
            <p className="whitespace-pre-wrap text-gray-800">
              {product.description}
            </p>
          </div>
        )}

        {/* 하단 버튼 */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3">
          <div className="max-w-2xl mx-auto flex items-center gap-4">
            <div className="flex-1">
              <p className="text-lg font-bold">{formatPrice(product.price)}</p>
            </div>
            {isOwner ? (
              <div className="flex gap-2">
                <Link
                  href={`/products/${id}/edit`}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  수정
                </Link>
              </div>
            ) : (
              <Link
                href={`/chat?product=${id}&seller=${product.user_id}`}
                className="px-8 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
              >
                채팅하기
              </Link>
            )}
          </div>
        </div>

        {/* 하단 버튼 영역 만큼 패딩 */}
        <div className="h-20" />
      </div>
    </div>
  );
}
