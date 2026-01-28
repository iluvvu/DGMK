"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function getOrCreateChatRoom(productId: string, sellerId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "로그인이 필요합니다." };
  }

  if (user.id === sellerId) {
    return { error: "본인 상품에는 채팅할 수 없습니다." };
  }

  // 기존 채팅방 확인
  const { data: existingChat } = await supabase
    .from("chats")
    .select("id")
    .eq("product_id", productId)
    .eq("buyer_id", user.id)
    .eq("seller_id", sellerId)
    .single();

  if (existingChat) {
    redirect(`/chat/${existingChat.id}`);
  }

  // 새 채팅방 생성
  const { data: newChat, error } = await supabase
    .from("chats")
    .insert({
      product_id: productId,
      buyer_id: user.id,
      seller_id: sellerId,
    })
    .select()
    .single();

  if (error) {
    return { error: "채팅방 생성에 실패했습니다: " + error.message };
  }

  redirect(`/chat/${newChat.id}`);
}

export async function sendMessage(chatId: string, content: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "로그인이 필요합니다." };
  }

  if (!content || content.trim().length === 0) {
    return { error: "메시지를 입력해주세요." };
  }

  // 채팅방 참여자인지 확인
  const { data: chat } = await supabase
    .from("chats")
    .select("buyer_id, seller_id")
    .eq("id", chatId)
    .single();

  if (!chat) {
    return { error: "채팅방을 찾을 수 없습니다." };
  }

  if (chat.buyer_id !== user.id && chat.seller_id !== user.id) {
    return { error: "이 채팅방에 참여할 권한이 없습니다." };
  }

  const { error } = await supabase.from("messages").insert({
    chat_id: chatId,
    sender_id: user.id,
    content: content.trim(),
  });

  if (error) {
    return { error: "메시지 전송에 실패했습니다: " + error.message };
  }

  return { success: true };
}

export async function markMessagesAsRead(chatId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  await supabase
    .from("messages")
    .update({ is_read: true })
    .eq("chat_id", chatId)
    .neq("sender_id", user.id)
    .eq("is_read", false);
}
