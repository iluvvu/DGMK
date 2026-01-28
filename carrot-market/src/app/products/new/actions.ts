"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function createProduct(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "로그인이 필요합니다." };
  }

  const title = formData.get("title") as string;
  const price = parseInt(formData.get("price") as string, 10);
  const description = formData.get("description") as string;
  const location = formData.get("location") as string;

  if (!title || title.trim().length === 0) {
    return { error: "제목을 입력해주세요." };
  }

  if (isNaN(price) || price < 0) {
    return { error: "올바른 가격을 입력해주세요." };
  }

  // 상품 등록
  const { data: product, error: productError } = await supabase
    .from("products")
    .insert({
      user_id: user.id,
      title: title.trim(),
      price,
      description: description?.trim() || null,
      location: location?.trim() || null,
    })
    .select()
    .single();

  if (productError) {
    return { error: "상품 등록에 실패했습니다: " + productError.message };
  }

  // 이미지 업로드 처리
  const images = formData.getAll("images") as File[];
  const validImages = images.filter(
    (img) => img instanceof File && img.size > 0
  );

  if (validImages.length > 0) {
    for (let i = 0; i < validImages.length; i++) {
      const image = validImages[i];
      const fileExt = image.name.split(".").pop();
      const fileName = `${product.id}/${Date.now()}_${i}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(fileName, image);

      if (uploadError) {
        console.error("Image upload error:", uploadError);
        continue;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("product-images").getPublicUrl(fileName);

      await supabase.from("product_images").insert({
        product_id: product.id,
        image_url: publicUrl,
        display_order: i,
      });
    }
  }

  redirect(`/products/${product.id}`);
}
