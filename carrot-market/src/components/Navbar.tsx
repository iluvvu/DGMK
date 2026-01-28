import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/(auth)/actions";

export default async function Navbar() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let profile = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("nickname")
      .eq("id", user.id)
      .single();
    profile = data;
  }

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex justify-between items-center h-14">
          <Link href="/" className="text-xl font-bold text-orange-500">
            당근마켓
          </Link>

          <div className="flex items-center gap-4">
            {user ? (
              <>
                <Link
                  href="/products/new"
                  className="text-sm text-gray-600 hover:text-orange-500"
                >
                  글쓰기
                </Link>
                <Link
                  href="/chat"
                  className="text-sm text-gray-600 hover:text-orange-500"
                >
                  채팅
                </Link>
                <span className="text-sm text-gray-600">
                  {profile?.nickname || "사용자"}님
                </span>
                <form action={signOut}>
                  <button
                    type="submit"
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    로그아웃
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm text-gray-600 hover:text-orange-500"
                >
                  로그인
                </Link>
                <Link
                  href="/signup"
                  className="text-sm px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                >
                  회원가입
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
