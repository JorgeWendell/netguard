"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, User, Mail } from "lucide-react";
import Link from "next/link";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";

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
import { verifyInviteTokenAction } from "@/actions/verify-invite-token";
import { completeSignupAction } from "@/actions/complete-signup";
import { authClient } from "@/lib/auth-client";

const signupSchema = z
  .object({
    name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
    email: z.string().email("E-mail inválido"),
    password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
    confirmPassword: z.string(),
    token: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

type SignupFormValues = z.infer<typeof signupSchema>;

export function SignupForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [isInviteMode, setIsInviteMode] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      token: token || "",
    },
  });

  const { execute: verifyToken } = useAction(verifyInviteTokenAction, {
    onSuccess: ({ data }) => {
      if (data?.success && data.data) {
        setIsInviteMode(true);
        form.reset({
          name: data.data.name,
          email: data.data.email,
          password: "",
          confirmPassword: "",
          token: token || "",
        });
        setIsVerifying(false);
      } else {
        setIsInviteMode(false);
        setIsVerifying(false);
      }
    },
    onError: () => {
      setIsInviteMode(false);
      setIsVerifying(false);
    },
  });

  const { execute: completeSignup } = useAction(completeSignupAction, {
    onSuccess: ({ data }) => {
      if (data?.success) {
        toast.success("Senha cadastrada com sucesso!");
        router.push("/login");
      }
    },
    onError: ({ error }) => {
      toast.error(error.serverError || "Erro ao cadastrar senha");
      setIsLoading(false);
    },
    onExecute: () => {
      setIsLoading(true);
    },
    onSettled: () => {
      setIsLoading(false);
    },
  });

  useEffect(() => {
    if (token) {
      verifyToken({ token });
    } else {
      setIsVerifying(false);
    }
  }, [token, verifyToken]);

  const onSubmit = async (data: SignupFormValues) => {
    if (isInviteMode && data.token) {
      completeSignup({
        token: data.token,
        password: data.password,
      });
    } else {
      setIsLoading(true);
      try {
        const result = await authClient.signUp.email({
          email: data.email,
          password: data.password,
          name: data.name,
        });

        if (result.error) {
          form.setError("root", {
            message: result.error.message || "Erro ao criar conta",
          });
          setIsLoading(false);
          return;
        }

        if (result.data) {
          router.push("/dashboard");
        }
      } catch (error) {
        form.setError("root", {
          message: "Erro ao criar conta. Tente novamente.",
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  if (isVerifying) {
    return (
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-black/60 p-8 shadow-lg backdrop-blur-md">
        <div className="text-center">
          <p className="text-foreground">Verificando convite...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-white/10 bg-black/60 p-8 shadow-lg backdrop-blur-md">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white">
          {isInviteMode ? "Definir Senha" : "Criar Conta"}
        </h2>
        <p className="mt-2 text-sm text-white">
          {isInviteMode
            ? "Defina sua senha para finalizar o cadastro"
            : "Preencha os dados para criar sua conta"}
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-bold text-white">Nome</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type="text"
                      placeholder="Seu nome completo"
                      className="pr-10 text-white"
                      disabled={isInviteMode}
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
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-bold text-white">E-mail</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type="email"
                      placeholder="nome@empresa.com.br"
                      className="pr-10 text-white"
                      disabled={isInviteMode}
                      {...field}
                    />
                    <Mail className="text-muted-foreground absolute top-1/2 right-3 h-5 w-5 -translate-y-1/2" />
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

          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-bold text-white">
                  Confirmar Senha
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="pr-10 text-white"
                      {...field}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 h-auto w-auto -translate-y-1/2 p-0"
                    >
                      {showConfirmPassword ? (
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
            {isLoading
              ? isInviteMode
                ? "Cadastrando senha..."
                : "Criando conta..."
              : isInviteMode
                ? "Cadastrar Senha"
                : "Criar Conta"}
          </Button>
        </form>
      </Form>

      {!isInviteMode && (
        <div className="mt-6 text-center text-sm text-white">
          <p>
            Já tem uma conta?{" "}
            <Link href="/login" className="text-white hover:underline">
              Fazer login
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
