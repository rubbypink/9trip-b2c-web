import { redirect } from "next/navigation";

/**
 * Redirect /account to /account/profile by default.
 */
export default function AccountPage() {
  redirect("/account/profile");
}