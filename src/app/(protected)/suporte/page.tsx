import { Mail, Phone, MessageCircle, Info } from "lucide-react";
import Link from "next/link";

export default function SuportePage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Suporte
        </h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Canais para abrir chamados, tirar dúvidas e acompanhar atendimentos.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex items-start gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/40">
            <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Suporte por e-mail
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Envie dúvidas, solicitações e relatos de erro.
            </p>
            <p className="mt-2 text-sm font-medium text-blue-600 dark:text-blue-400">
              <a href="mailto:info@adelbr.tech">info@adelbr.tech</a>
            </p>
          </div>
        </div>

        <div className="flex items-start gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
            <MessageCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Canal rápido (WhatsApp)
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Para atendimento rápido em horário comercial.
            </p>
            <Link
              href="https://wa.me/5511973920743"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center justify-center rounded-full bg-emerald-600 px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400"
            >
              Abrir WhatsApp
            </Link>
          </div>
        </div>

        <div className="flex items-start gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-900/40">
            <Info className="h-5 w-5 text-slate-700 dark:text-slate-300" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Base de conhecimento
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Consulte documentação, tutoriais e perguntas frequentes.
            </p>
            <p className="mt-2 text-sm font-medium">
              <Link
                href="#"
                className="text-blue-600 hover:underline dark:text-blue-400"
              >
                (em breve)
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
