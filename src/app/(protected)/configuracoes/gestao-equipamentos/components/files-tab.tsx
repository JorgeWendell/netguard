"use client";

import { useRef, useState } from "react";
import { Download, FileUp, Import, Trash2 } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";

import { importDeviceFileAction } from "@/actions/import-device-file";
import { removeDeviceFileAction } from "@/actions/remove-device-file";
import type { AccessFileRow } from "@/services/mikrotik/access/fetch-access-data";
import { formatFileSize, MAX_UPLOAD_BYTES } from "@/services/mikrotik/file-limits";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

type FilesTabProps = {
  deviceId: string;
  files: AccessFileRow[];
  onRefresh: () => void;
};

const methodLabel: Record<string, string> = {
  api: "API direta",
  fetch: "HTTP fetch",
  ftp: "FTP",
};

export function FilesTab({ deviceId, files, onRefresh }: FilesTabProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const { execute: removeFile, isExecuting: removing } = useAction(
    removeDeviceFileAction,
    {
      onSuccess: () => {
        toast.success("Arquivo removido");
        onRefresh();
      },
      onError: ({ error }) => {
        toast.error(error.serverError ?? "Falha ao remover arquivo");
      },
    },
  );

  const { execute: importFile, isExecuting: importing } = useAction(
    importDeviceFileAction,
    {
      onSuccess: () => {
        toast.success("Script .rsc importado");
        onRefresh();
      },
      onError: ({ error }) => {
        toast.error(error.serverError ?? "Falha ao importar arquivo");
      },
    },
  );

  const uploadFile = async (file: File) => {
    if (file.size > MAX_UPLOAD_BYTES) {
      toast.error(
        `Arquivo excede ${Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))}MB`,
      );
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`/api/mikrotik/devices/${deviceId}/files`, {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as {
        success?: boolean;
        error?: string;
        method?: string;
        fileName?: string;
      };

      if (!response.ok || !payload.success) {
        throw new Error(payload.error ?? "Falha no upload");
      }

      toast.success(
        `Arquivo enviado via ${methodLabel[payload.method ?? ""] ?? payload.method}`,
      );
      onRefresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Falha ao enviar arquivo",
      );
    } finally {
      setIsUploading(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  };

  const handleFiles = (fileList: FileList | null) => {
    const file = fileList?.[0];
    if (file) {
      void uploadFile(file);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div
        className={cn(
          "rounded-lg border border-dashed p-6 text-center transition-colors",
          dragOver
            ? "border-primary bg-primary/5"
            : "border-slate-300 dark:border-slate-600",
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
      >
        <FileUp className="mx-auto mb-2 h-8 w-8 text-slate-400" />
        <p className="mb-1 text-sm font-medium">
          Arraste um arquivo ou clique para enviar
        </p>
        <p className="text-muted-foreground mb-4 text-xs">
          Até {Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))}MB · API, fetch ou
          FTP automático
        </p>
        <div>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            id="mikrotik-file-upload"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <Button
            type="button"
            disabled={isUploading}
            variant="outline"
            onClick={() => inputRef.current?.click()}
          >
            {isUploading ? "Enviando..." : "Selecionar arquivo"}
          </Button>
        </div>
      </div>

      {files.length === 0 ? (
        <p className="text-muted-foreground text-center text-sm">
          Nenhum arquivo no equipamento
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Tamanho</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Criado</TableHead>
              <TableHead className="w-[220px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {files.map((file) => (
              <TableRow key={file.name}>
                <TableCell className="font-mono text-sm">{file.name}</TableCell>
                <TableCell>{formatFileSize(file.size)}</TableCell>
                <TableCell>{file.type ?? "—"}</TableCell>
                <TableCell className="text-sm">
                  {file.creationTime ?? "—"}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      asChild
                    >
                      <a
                        href={`/api/mikrotik/devices/${deviceId}/files?name=${encodeURIComponent(file.name)}`}
                        download
                      >
                        <Download className="h-4 w-4" />
                      </a>
                    </Button>
                    {file.name.toLowerCase().endsWith(".rsc") && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={importing}
                        onClick={() => {
                          if (
                            confirm(
                              `Importar o script "${file.name}" no equipamento?`,
                            )
                          ) {
                            importFile({
                              deviceId,
                              fileName: file.name,
                            });
                          }
                        }}
                      >
                        <Import className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600"
                      disabled={removing}
                      onClick={() => {
                        if (
                          confirm(`Remover o arquivo "${file.name}" do equipamento?`)
                        ) {
                          removeFile({
                            deviceId,
                            fileName: file.name,
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
