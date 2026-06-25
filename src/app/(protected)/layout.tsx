import { headers } from "next/headers";
import { auth } from "@/lib/auth";

import { redirect } from "next/navigation";
import { db } from "@/db/index";
import { usersTable } from "@/db/schema";
import { eq } from "drizzle-orm";

import { Toaster } from "sonner";
import { Sidebar } from "./components/sidebar";
import { Header } from "./components/header";


export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/login");
  }

  const [user] = await db
    .select({
      name: usersTable.name,
      email: usersTable.email,
      isActive: usersTable.isActive,
    })
    .from(usersTable)

    .where(eq(usersTable.id, session.user.id))
    .limit(1);

  if (!user || !user.isActive) {
    redirect("/login");
  }



  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header userName={user.name || user.email} />
        <main className="flex-1 overflow-y-auto">
          {children}
          <Toaster position="bottom-center" richColors theme="dark" />
        </main>
      </div>
    </div>
  );
}
