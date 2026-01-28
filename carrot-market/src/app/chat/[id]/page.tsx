import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ChatRoom from "@/components/ChatRoom";

function formatPrice(price: number) {
  return price.toLocaleString("ko-KR") + "원";
}

export default async function ChatDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 채팅방 정보 조회
  const { data: chat, error } = await supabase
    .from("chats")
    .select(
      `
      *,
      products(id, title, price, status, product_images(image_url)),
      buyer:profiles!chats_buyer_id_fkey(id, nickname, avatar_url),
      seller:profiles!chats_seller_id_fkey(id, nickname, avatar_url)
    `
    )
    .eq("id", id)
    .single();

  if (error || !chat) {
    notFound();
  }

  // 참여자 확인
  if (chat.buyer_id !== user.id && chat.seller_id !== user.id) {
    notFound();
  }

  // 메시지 목록 조회
  const { data: messages } = await supabase
    .from("messages")
    .select("*")
    .eq("chat_id", id)
    .order("created_at", { ascending: true });

  const otherUser = chat.buyer_id === user.id ? chat.seller : chat.buyer;
  const productImage = chat.products?.product_images?.[0]?.image_url;

  const statusLabel: Record<string, string> = {
    selling: "판매중",
    reserved: "예약중",
    sold: "판매완료",
  };

  return (
    <div className="max-w-2xl mx-auto flex flex-col h-screen">
      {/* 헤더 */}
      <div className="sticky top-14 bg-white border-b border-gray-200 px-4 py-3 z-10">
        <div className="flex items-center gap-3">
          <Link href="/chat" className="text-gray-600 hover:text-gray-900">
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
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </Link>
          <div className="w-10 h-10 bg-gray-200 rounded-full overflow-hidden">
            {otherUser?.avatar_url ? (
              <img
                src={otherUser.avatar_url}
                alt={otherUser.nickname}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <svg
                  className="w-5 h-5"
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
          <span className="font-medium">{otherUser?.nickname}</span>
        </div>
      </div>

      {/* 상품 정보 */}
      <Link
        href={`/products/${chat.products?.id}`}
        className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-200 hover:bg-gray-100"
      >
        <div className="w-12 h-12 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
          {productImage ? (
            <img
              src={productImage}
              alt={chat.products?.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <svg
                className="w-5 h-5"
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
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">
              {statusLabel[chat.products?.status] || "판매중"}
            </span>
          </div>
          <p className="font-medium truncate">{chat.products?.title}</p>
          <p className="text-sm font-bold">
            {formatPrice(chat.products?.price || 0)}
          </p>
        </div>
        <svg
          className="w-5 h-5 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </Link>

      {/* 채팅 영역 */}
      <ChatRoom
        chatId={id}
        currentUserId={user.id}
        initialMessages={messages || []}
      />
    </div>
  );
}
