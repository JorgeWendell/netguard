"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, User, Fingerprint, Key } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { authClient } from "@/lib/auth-client";

const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
  rememberMe: z.boolean(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    try {
      const result = await authClient.signIn.email({
        email: data.email,
        password: data.password,
        rememberMe: data.rememberMe,
      });

      if (result.error) {
        form.setError("root", {
          message: result.error.message || "Erro ao fazer login",
        });
        setIsLoading(false);
        return;
      }

      if (result.data) {
        router.push("/dashboard");
        router.refresh();
      }
    } catch (error) {
      form.setError("root", {
        message: "Erro ao fazer login. Tente novamente.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md rounded-2xl border border-white/10 bg-black/60 p-8 shadow-lg backdrop-blur-md">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white">Acesse sua conta</h2>
        <p className="mt-2 text-sm text-white">
          Entre com suas credenciais para gerenciar a unidade.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-bold text-white">
                  Usuário ou E-mail
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type="email"
                      placeholder="nome@empresa.com.br"
                      className="pr-10 text-white"
                      {...field}
                    />
                    <User className="text-muted-foreground absolute top-1/2 right-3 h-5 w-5 -translate-y-1/2" />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-bold text-white">Senha</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="pr-10 text-white"
                      {...field}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 h-auto w-auto -translate-y-1/2 p-0"
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </Button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex items-center justify-between">
            <a
              href="/forgot-password"
              className="text-sm text-white hover:underline"
            >
              Esqueci minha senha
            </a>
          </div>

          {form.formState.errors.root && (
            <div className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
              {form.formState.errors.root.message}
            </div>
          )}

          <Button
            type="submit"
            className="w-full bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700"
            disabled={isLoading}
          >
            {isLoading ? "Entrando..." : "Acessar"}
          </Button>
        </form>
      </Form>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <span className="border-border w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase"></div>
      </div>

      <div className="mt-6 text-center text-xs text-white">
        <p>
          Ambiente Seguro. Ao entrar, você concorda com nossos{" "}
          <a href="/terms" className="text-white hover:underline">
            Termos de Uso
          </a>{" "}
          e{" "}
          <a href="/privacy" className="text-white hover:underline">
            Privacidade
          </a>
          .
        </p>
      </div>
    </div>
  );
}
