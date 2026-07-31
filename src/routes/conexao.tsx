import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { defaultConfig, loadConfig, saveConfig } from "@/lib/fuel/config";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/conexao")({
  component: ConexaoPage,
});

function ConexaoPage() {
  const [cfg, setCfg] = useState(() => loadConfig());
  const [saved, setSaved] = useState(false);

  function onSave() {
    saveConfig(cfg);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="mx-auto max-w-xl space-y-6 px-4 py-8">
      <h1 className="font-display text-2xl font-semibold">Conexão WebPosto</h1>
      <Card>
        <CardHeader>
          <CardTitle>API Quality Automação</CardTitle>
          <CardDescription>
            Credenciais usadas para CAIXA / CAIXA_APRESENTADO / EMPRESAS
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="base">Base URL</Label>
            <Input
              id="base"
              value={cfg.webpostoBaseUrl}
              onChange={(e) =>
                setCfg({ ...cfg, webpostoBaseUrl: e.target.value })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="key">API Key (CHAVE)</Label>
            <Input
              id="key"
              value={cfg.webpostoApiKey}
              onChange={(e) =>
                setCfg({ ...cfg, webpostoApiKey: e.target.value })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="emp">Empresa padrão</Label>
            <Input
              id="emp"
              type="number"
              value={cfg.webpostoEmpresaCodigo}
              onChange={(e) =>
                setCfg({
                  ...cfg,
                  webpostoEmpresaCodigo: Number(e.target.value) || 0,
                })
              }
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={onSave}>{saved ? "Salvo" : "Salvar"}</Button>
            <Button
              variant="secondary"
              onClick={() => setCfg(defaultConfig())}
            >
              Restaurar padrão
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
