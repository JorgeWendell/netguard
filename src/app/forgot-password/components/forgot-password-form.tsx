"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { ArrowLeft, Mail, RotateCcw } from "lucide-react";

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

const forgotPasswordSchema = z.object({
  email: z.string().email("E-mail inválido"),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const getConnectionErrorMessage = () => {
    const baseUrl =
      typeof window !== "undefined"
        ? window.location.origin
        : process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    return `Não foi possível conectar ao servidor. Verifique se a aplicação está rodando e se você está acessando pela URL correta (ex.: ${baseUrl}).`;
  };

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    setIsLoading(true);
    try {
      const result = await (authClient as any).forgetPassword({
        email: data.email,
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (result.error) {
        form.setError("root", {
          message: result.error.message || "Erro ao enviar instruções",
        });
        setIsLoading(false);
        return;
      }

      setIsSuccess(true);
    } catch (error) {
      const isNetworkError =
        error instanceof TypeError &&
        (error.message === "Failed to fetch" ||
          error.message.includes("Load failed"));
      const isConnectionRefused =
        error instanceof Error &&
        (error.message.includes("ERR_CONNECTION_REFUSED") ||
          error.message.includes("Connection refused"));
      form.setError("root", {
        message:
          isNetworkError || isConnectionRefused
            ? getConnectionErrorMessage()
            : "Erro ao enviar instruções. Tente novamente.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="w-full max-w-md rounded-2xl bg-slate-800/90 backdrop-blur-md p-8 shadow-lg">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-600/20">
            <Mail className="h-8 w-8 text-blue-600" />
          </div>
          <h2 className="mb-2 text-2xl font-bold text-white">
            Instruções Enviadas
          </h2>
          <p className="text-sm text-gray-300">
            Verifique seu e-mail para receber as instruções de redefinição de
            senha.
          </p>
        </div>
        <Link href="/login">
          <Button
            variant="outline"
            className="w-full border-gray-600 text-white hover:bg-gray-700"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para o Login
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md rounded-2xl bg-slate-800/90 backdrop-blur-md p-8 shadow-lg">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-600/20">
          <RotateCcw className="h-8 w-8 text-blue-600" />
        </div>
        <h2 className="mb-2 text-2xl font-bold text-white">
          Recuperar Senha
        </h2>
        <p className="text-sm text-gray-300">
          Insira seu e-mail cadastrado para receber as instruções de redefinição
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
                  E-mail Corporativo
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type="email"
                      placeholder="exemplo@empresa.com.br"
                      className="pr-10 text-white"
                      {...field}
                    />
                    <Mail className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {form.formState.errors.root && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {form.formState.errors.root.message}
            </div>
          )}

          <Button
            type="submit"
            className="w-full bg-blue-600 text-white hover:bg-blue-700"
            disabled={isLoading}
          >
            {isLoading ? "Enviando..." : "Enviar Instruções"}
          </Button>
        </form>
      </Form>

      <div className="mt-6 text-center">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para o Login
        </Link>
      </div>
    </div>
  );
}
