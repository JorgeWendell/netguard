import Image from "next/image";
import { LoginForm } from "./components/login-form";

export default function LoginPage() {
  return (
    <div className="dark relative flex min-h-screen">
      <div className="absolute inset-0 scale-100">
        <Image
          src="/screen.png"
          alt="Background"
          fill
          className="object-cover"
          priority
        />
      </div>
      <div className="relative z-10 hidden w-1/2 flex-col justify-between p-12 lg:flex">
        <div>
          <div className="mb-8 flex items-center gap-3">
            <Image
              src="/logo2.png"
              alt="Logo"
              width={200}
              height={200}
              priority
              unoptimized
            />
          </div>
        </div>
      </div>
      <div className="relative z-10 flex w-full items-center justify-center p-8 lg:w-1/2">
        <LoginForm />
      </div>
    </div>
  );
}
