import Image from "next/image";
import Link from "next/link";
import { ForgotPasswordForm } from "./components/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#10141e] dark">
      <header className="flex items-center p-6">
        <div className="flex items-center gap-3">
          <Image
            src="/logo.png"
            alt="Logo"
            width={200}
            height={200}
            priority
            unoptimized
            
          />
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center p-6">
        <ForgotPasswordForm />
      </main>

      <footer className="flex items-center justify-between p-6 text-sm text-gray-400">
        
        <div className="flex gap-4">
          <Link href="/privacy" className="hover:text-white">
            Privacidade
          </Link>
          <Link href="/support" className="hover:text-white">
            Suporte
          </Link>
        </div>
      </footer>
    </div>
  );
}
