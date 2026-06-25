"use client";

import { useMemo, useState } from "react";
import { ShieldCheck, Trash2 } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";

import { importDeviceCertificateAction } from "@/actions/import-device-certificate";
import { removeDeviceCertificateAction } from "@/actions/remove-device-certificate";
import { updateDeviceCertificateAction } from "@/actions/update-device-certificate";
import type {
  AccessCertificateRow,
  AccessFileRow,
} from "@/services/mikrotik/access/fetch-access-data";
import { isCertificateImportFile } from "@/services/mikrotik/certificates";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

const selectClassName = cn(
  "border-input bg-background ring-offset-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm focus-visible:ring-1 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
);

type CertificatesTabProps = {
  deviceId: string;
  certificates: AccessCertificateRow[];
  files: AccessFileRow[];
  onRefresh: () => void;
};

function statusLabel(certificate: AccessCertificateRow): string {
  if (certificate.invalid) return "Inválido";
  if (certificate.expired) return "Expirado";
  if (certificate.trusted) return "Confiável";
  return "Não confiável";
}

export function CertificatesTab({
  deviceId,
  certificates,
  files,
  onRefresh,
}: CertificatesTabProps) {
  const [name, setName] = useState("");
  const [certFile, setCertFile] = useState("");
  const [keyFile, setKeyFile] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [trusted, setTrusted] = useState(true);

  const importableFiles = useMemo(
    () => files.filter((file) => isCertificateImportFile(file.name)),
    [files],
  );

  const certCandidates = useMemo(
    () =>
      importableFiles.filter((file) => {
        const lower = file.name.toLowerCase();
        return (
          lower.endsWith(".crt") ||
          lower.endsWith(".cer") ||
          lower.endsWith(".pem") ||
          lower.endsWith(".p12") ||
          lower.endsWith(".pfx") ||
          lower.endsWith(".der")
        );
      }),
    [importableFiles],
  );

  const keyCandidates = useMemo(
    () =>
      importableFiles.filter((file) => {
        const lower = file.name.toLowerCase();
        return lower.endsWith(".key") || lower.endsWith(".pem");
      }),
    [importableFiles],
  );

  const { execute: importCertificate, isExecuting: importing } = useAction(
    importDeviceCertificateAction,
    {
      onSuccess: () => {
        toast.success("Certificado importado");
        setName("");
        setCertFile("");
        setKeyFile("");
        setPassphrase("");
        onRefresh();
      },
      onError: ({ error }) => {
        toast.error(error.serverError ?? "Falha ao importar certificado");
      },
    },
  );

  const { execute: updateCertificate, isExecuting: updating } = useAction(
    updateDeviceCertificateAction,
    {
      onSuccess: () => {
        toast.success("Certificado atualizado");
        onRefresh();
      },
      onError: ({ error }) => {
        toast.error(error.serverError ?? "Falha ao atualizar certificado");
      },
    },
  );

  const { execute: removeCertificate, isExecuting: removing } = useAction(
    removeDeviceCertificateAction,
    {
      onSuccess: () => {
        toast.success("Certificado removido");
        onRefresh();
      },
      onError: ({ error }) => {
        toast.error(error.serverError ?? "Falha ao remover certificado");
      },
    },
  );

  const handleImport = () => {
    if (!name.trim() || !certFile) {
      toast.error("Informe o nome e selecione o arquivo do certificado");
      return;
    }

    importCertificate({
      deviceId,
      name: name.trim(),
      certificateFileName: certFile,
      keyFileName: keyFile || undefined,
      passphrase: passphrase || undefined,
      trusted,
    });
  };

  return (
    <div className="space-y-6 p-6">
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-100">
        <p className="font-medium">Fluxo recomendado</p>
        <p className="mt-1 text-blue-800 dark:text-blue-200">
          1. Envie o <strong>.crt</strong> e a <strong>.key</strong> na aba{" "}
          <strong>Arquivos</strong>. 2. Importe aqui usando os mesmos nomes de
          arquivo. 3. Use o certificado na aba OpenVPN ou em serviços do
          roteador.
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
        <h3 className="mb-3 text-sm font-semibold">Importar certificado</h3>

        {importableFiles.length === 0 ? (
          <p className="text-muted-foreground mb-4 text-sm">
            Nenhum arquivo de certificado no equipamento. Envie .crt e .key na
            aba Arquivos e clique em Atualizar.
          </p>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="cert-name">Nome no roteador</Label>
            <Input
              id="cert-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="cliente-vpn"
              className="font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cert-file">Arquivo do certificado</Label>
            <select
              id="cert-file"
              className={selectClassName}
              value={certFile}
              onChange={(e) => setCertFile(e.target.value)}
            >
              <option value="">Selecione</option>
              {certCandidates.map((file) => (
                <option key={file.name} value={file.name}>
                  {file.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="key-file">Arquivo da chave (opcional)</Label>
            <select
              id="key-file"
              className={selectClassName}
              value={keyFile}
              onChange={(e) => setKeyFile(e.target.value)}
            >
              <option value="">Mesmo arquivo / nenhum</option>
              {keyCandidates.map((file) => (
                <option key={file.name} value={file.name}>
                  {file.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cert-pass">Senha do arquivo (opcional)</Label>
            <Input
              id="cert-pass"
              type="password"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              placeholder="Para .p12 / .pfx"
            />
          </div>
          <div className="flex items-end gap-2 pb-2">
            <Checkbox
              id="cert-trusted"
              checked={trusted}
              onCheckedChange={(v) => setTrusted(v === true)}
            />
            <Label htmlFor="cert-trusted">Marcar como confiável</Label>
          </div>
        </div>

        <Button
          className="mt-4"
          disabled={importing || importableFiles.length === 0}
          onClick={handleImport}
        >
          <ShieldCheck className="mr-2 h-4 w-4" />
          {importing ? "Importando..." : "Importar certificado"}
        </Button>
      </div>

      {certificates.length === 0 ? (
        <p className="text-muted-foreground text-center text-sm">
          Nenhum certificado instalado no equipamento
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Common Name</TableHead>
              <TableHead>Chave</TableHead>
              <TableHead>Validade</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[180px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {certificates.map((certificate) => (
              <TableRow key={certificate.id}>
                <TableCell className="font-mono font-medium">
                  {certificate.name}
                </TableCell>
                <TableCell className="text-sm">
                  {certificate.commonName ?? "—"}
                </TableCell>
                <TableCell>
                  {certificate.hasPrivateKey ? "Sim" : "Não"}
                </TableCell>
                <TableCell className="text-sm">
                  {certificate.expiryDate ?? "—"}
                </TableCell>
                <TableCell>{statusLabel(certificate)}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={updating}
                      onClick={() =>
                        updateCertificate({
                          deviceId,
                          certificateId: certificate.id,
                          trusted: !certificate.trusted,
                        })
                      }
                    >
                      {certificate.trusted ? "Desconfiar" : "Confiar"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600"
                      disabled={removing}
                      onClick={() => {
                        if (
                          confirm(
                            `Remover o certificado "${certificate.name}"?`,
                          )
                        ) {
                          removeCertificate({
                            deviceId,
                            certificateId: certificate.id,
                          });
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
