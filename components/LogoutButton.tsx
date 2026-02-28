"use client";

import { Button } from "@/components/ui/button";
import { logout } from "@/lib/actions/auth.action";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/firebase/client";

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    try {
      await signOut(auth);
      await logout();
      router.push("/sign-in");
    } catch (error) {
      console.log(error);
    }
  }

  return (
    <Button onClick={handleLogout} className="ml-4">
      Logout
    </Button>
  );
}
