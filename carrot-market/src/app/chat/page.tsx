import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateChatRoom } from "./actions";

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

export default async function ChatListPage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string; seller?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // URL 파라미터로 상품/판매자 정보가 있으면 채팅방 생성 또는 이동
  if (params.product && params.seller) {
    await getOrCreateChatRoom(params.product, params.seller);
    return null;
  }

  // 사용자의 채팅방 목록 조회
  const { data: chats } = await supabase
    .from("chats")
    .select(
      `
      *,
      products(id, title, price, product_images(image_url)),
      buyer:profiles!chats_buyer_id_fkey(id, nickname, avatar_url),
      seller:profiles!chats_seller_id_fkey(id, nickname, avatar_url)
    `
    )
    .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
    .order("created_at", { ascending: false });

  // 각 채팅방의 마지막 메시지와 읽지 않은 메시지 수 조회
  const chatsWithMessages = await Promise.all(
    (chats || []).map(async (chat) => {
      const { data: lastMessage } = await supabase
        .from("messages")
        .select("content, created_at, sender_id")
        .eq("chat_id", chat.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      const { count: unreadCount } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("chat_id", chat.id)
        .eq("is_read", false)
        .neq("sender_id", user.id);

      const otherUser =
        chat.buyer_id === user.id ? chat.seller : chat.buyer;
      const productImage = chat.products?.product_images?.[0]?.image_url;

      return {
        ...chat,
        lastMessage,
        unreadCount: unreadCount || 0,
        otherUser,
        productImage,
      };
    })
  );

  // 마지막 메시지 시간 기준으로 정렬
  chatsWithMessages.sort((a, b) => {
    const aTime = a.lastMessage?.created_at || a.created_at;
    const bTime = b.lastMessage?.created_at || b.created_at;
    return new Date(bTime).getTime() - new Date(aTime).getTime();
  });

  return (
    <div className="max-w-2xl mx-auto">
      <div className="px-4 py-4 border-b border-gray-200">
        <h1 className="text-xl font-bold">채팅</h1>
      </div>

      {chatsWithMessages.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-gray-500">아직 채팅 내역이 없습니다</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-200">
          {chatsWithMessages.map((chat) => (
            <Link
              key={chat.id}
              href={`/chat/${chat.id}`}
              className="flex gap-3 p-4 hover:bg-gray-50"
            >
              {/* 상대방 프로필 */}
              <div className="w-12 h-12 bg-gray-200 rounded-full overflow-hidden flex-shrink-0">
                {chat.otherUser?.avatar_url ? (
                  <img
                    src={chat.otherUser.avatar_url}
                    alt={chat.otherUser.nickname}
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

              {/* 채팅 정보 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium truncate">
                    {chat.otherUser?.nickname}
                  </span>
                  <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                    {chat.lastMessage
                      ? formatDate(chat.lastMessage.created_at)
                      : formatDate(chat.created_at)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500 truncate">
                    {chat.lastMessage?.content || "채팅을 시작해보세요"}
                  </p>
                  {chat.unreadCount > 0 && (
                    <span className="ml-2 px-2 py-0.5 bg-orange-500 text-white text-xs rounded-full flex-shrink-0">
                      {chat.unreadCount}
                    </span>
                  )}
                </div>
              </div>

              {/* 상품 이미지 */}
              <div className="w-12 h-12 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                {chat.productImage ? (
                  <img
                    src={chat.productImage}
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
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
