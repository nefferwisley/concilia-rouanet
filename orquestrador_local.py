#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
orquestrador_local.py — Orquestrador Automatizado Multi-Agentes com Modelo Maior (Qwen 2.5 Coder 7B)
"""

import sys
import json
import argparse
import requests
import subprocess
from pathlib import Path

# Garante compatibilidade UTF-8 no terminal Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

OLLAMA_URL = "http://localhost:11434"
MODEL_CODER_7B = "qwen2.5-coder:7b"
MODEL_VISION_7B = "qwen2.5vl:7b"
MODEL_FAST_1_5B = "qwen2.5-coder:1.5b"

def checar_status():
    print("[Orquestrador] Verificando conexoes do ecossistema...")
    try:
        r = requests.get(f"{OLLAMA_URL}/api/tags", timeout=5)
        if r.status_code == 200:
            models = [m["name"] for m in r.json().get("models", [])]
            print(f"[OK] Ollama Local ativo! Modelos carregados: {', '.join(models)}")
        else:
            print("[AVISO] Ollama respondeu com status:", r.status_code)
    except Exception as e:
        print(f"[ERRO] Ollama Local nao acessivel em {OLLAMA_URL}: {e}")

    try:
        res = subprocess.run(["opencode.ps1", "--version"], capture_output=True, text=True, shell=True)
        print(f"[OK] OpenCode CLI ativo! Versao: {res.stdout.strip()}")
    except Exception as e:
        print(f"[AVISO] OpenCode CLI: {e}")

def gerar_codigo_stream(prompt: str, model: str = MODEL_CODER_7B):
    print(f"\n[Hermes/Ollama] Ativando modelo MAIOR ({model}) com streaming ao vivo:\n")
    print("-" * 60)
    
    try:
        response = requests.post(
            f"{OLLAMA_URL}/api/generate",
            json={
                "model": model,
                "prompt": prompt,
                "stream": True,
                "keep_alive": "60m"
            },
            stream=True,
            timeout=600  # 10 minutos de timeout para o modelo 7B
        )
        
        if response.status_code != 200:
            print(f"\n[ERRO] Status {response.status_code}: {response.text}")
            return ""

        texto_completo = []
        for line in response.iter_lines():
            if line:
                data = json.loads(line.decode("utf-8"))
                pedaco = data.get("response", "")
                sys.stdout.write(pedaco)
                sys.stdout.flush()
                texto_completo.append(pedaco)
                if data.get("done", False):
                    break
        
        print("\n" + "-" * 60)
        return "".join(texto_completo)
        
    except requests.exceptions.Timeout:
        print(f"\n[ERRO] O modelo {model} demorou para carregar. Tente novamente.")
    except Exception as e:
        print(f"\n[ERRO] Falha ao comunicar com Ollama: {e}")
    return ""

def main():
    parser = argparse.ArgumentParser(description="Orquestrador Multi-Agente Rouanet")
    parser.add_argument("--status", action="store_true", help="Verificar status das ferramentas")
    parser.add_argument("--coder", type=str, help="Executar prompt via Qwen Coder 7B (Maior)")
    parser.add_argument("--vision", type=str, help="Executar prompt via Qwen Vision 7B")
    parser.add_argument("--fast", type=str, help="Executar prompt via Qwen 1.5B (Rapido)")
    parser.add_argument("prompt", nargs="*", help="Prompt direto para o modelo maior 7B")
    
    args = parser.parse_args()
    
    if args.status:
        checar_status()
    elif args.coder:
        gerar_codigo_stream(args.coder, MODEL_CODER_7B)
    elif args.vision:
        gerar_codigo_stream(args.vision, MODEL_VISION_7B)
    elif args.fast:
        gerar_codigo_stream(args.fast, MODEL_FAST_1_5B)
    elif args.prompt:
        prompt_str = " ".join(args.prompt)
        gerar_codigo_stream(prompt_str, MODEL_CODER_7B)
    else:
        checar_status()

if __name__ == "__main__":
    main()
