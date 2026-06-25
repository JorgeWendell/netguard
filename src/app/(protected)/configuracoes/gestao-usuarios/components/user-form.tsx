"use client";

import { useState, useEffect } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { createUserAction } from "@/actions/create-user";
import { updateUserAction } from "@/actions/update-user";


const userFormSchema = z.object({
  name: z.string().min(3, "O nome deve ter pelo menos 3 caracteres"),
  email: z.string().email("Email inválido"),
  password: z
    .union([
      z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
      z.literal(""),
    ])
    .optional(),
  isActive: z.boolean(),
});

type UserFormValues = z.infer<typeof userFormSchema>;

type User = {
  id: string;
  name: string;
  email: string;
  isActive: boolean;

};



type UserFormProps = {
  user?: User | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
};

export function UserForm({
  user,
  open: controlledOpen,
  onOpenChange,
  trigger,
}: UserFormProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false); 
  const isEditMode = !!user;
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      isActive: true,
    },
  });

  useEffect(() => {
    if (user && open) {
      form.reset({
        name: user.name,
        email: user.email,
        password: "",
        isActive: user.isActive,
      });
    } else if (!user && open) {
      form.reset({
        name: "",
        email: "",
        password: "",
        isActive: true,
      });
    }
  }, [user, open, form]);

  const { execute: createUser } = useAction(createUserAction, {
    onSuccess: ({ data }) => {
      if (data?.success) {
        toast.success("Usuário cadastrado com sucesso!");
        form.reset({
          name: "",
          email: "",
          password: "",
          isActive: true,
        });
        setOpen(false);
        window.dispatchEvent(new Event("user-created"));
      } else if (data?.error) {
        toast.error(data.error);
      }
    },
    onError: ({ error }) => {
      toast.error(error.serverError || "Erro ao cadastrar usuário");
    },
    onExecute: () => {
      setIsSubmitting(true);
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  const { execute: updateUser } = useAction(updateUserAction, {
    onSuccess: ({ data }) => {
      if (data?.success) {
        toast.success("Usuário atualizado com sucesso!");
        form.reset();
        setOpen(false);
        window.dispatchEvent(new Event("user-created"));
      }
    },
    onError: ({ error }) => {
      toast.error(error.serverError || "Erro ao atualizar usuário");
    },
    onExecute: () => {
      setIsSubmitting(true);
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  const onSubmit = (data: UserFormValues) => {
    if (isEditMode && user) {
      updateUser({
        id: user.id,
        name: data.name,
        email: data.email,
        isActive: data.isActive,
        ...(data.password ? { password: data.password } : {}),
      });
    } else {
      if (!data.password || data.password.length < 6) {
        form.setError("password", {
          message: "A senha deve ter pelo menos 6 caracteres",
        });
        return;
      }
      createUser({
        name: data.name,
        email: data.email,
        password: data.password,
        isActive: data.isActive,
      });
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      form.reset();
    }
  };

  const dialogContent = (
    <DialogContent className="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>
          {isEditMode ? "Editar Usuário" : "Cadastrar Usuário"}
        </DialogTitle>
        <DialogDescription>
          {isEditMode
            ? "Altere os dados do usuário"
            : "Preencha os dados para cadastrar um novo usuário"}
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-4"
        >
          <FormField<UserFormValues, "name">
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: João Silva" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField<UserFormValues, "email">
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="Ex: joao@example.com"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField<UserFormValues, "password">
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {isEditMode ? "Nova senha (opcional)" : "Senha"}
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder={
                        isEditMode
                          ? "Deixe em branco para manter a atual"
                          : "Mínimo 6 caracteres"
                      }
                      autoComplete="new-password"
                      {...field}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword((p) => !p)}
                      aria-label={
                        showPassword ? "Ocultar senha" : "Mostrar senha"
                      }
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField<UserFormValues, "isActive">
            control={form.control}
            name="isActive"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-y-0 space-x-3 rounded-md border p-4">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Usuário Ativo</FormLabel>
                </div>
              </FormItem>
            )}
          />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? isEditMode
                  ? "Atualizando..."
                  : "Cadastrando..."
                : isEditMode
                  ? "Atualizar"
                  : "Cadastrar"}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  );

  if (trigger) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        {dialogContent}
      </Dialog>
    );
  }

  // Se não tem trigger mas tem open controlado (modo edição), não mostra botão
  if (controlledOpen !== undefined) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        {dialogContent}
      </Dialog>
    );
  }

  // Modo padrão: mostra botão para cadastrar
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>Cadastrar Usuário</Button>
      </DialogTrigger>
      {dialogContent}
    </Dialog>
  );
}
