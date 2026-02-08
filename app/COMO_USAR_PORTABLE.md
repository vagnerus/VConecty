# VConectY - Aplicativo Portátil Completo

## 📦 Como Usar

### Opção 1: Usar Direto da Pasta (Recomendado)
1. Vá para: `C:\Users\Vagner\Desktop\VCONECTY\app\VConectY_Standalone`
2. Clique duas vezes em: **`VConectY.exe`**
3. Pronto! O app vai abrir conectado em `https://vconecty.onrender.com`

### Opção 2: Distribuir para Outros
1. Baixe o arquivo: **`VConectY-Portable.zip`** (~150-200MB)
2. Envie para outras pessoas
3. Elas devem:
   - Extrair o ZIP em qualquer pasta
   - Executar **`VConectY.exe`**

## ⚙️ Configuração

**Servidor padrão:** `https://vconecty.onrender.com`

Para mudar:
1. Abra o app
2. Clique na engrenagem ⚙️
3. Cole a nova URL
4. Feche o modal

## 🔍 Solução de Problemas

**Q: Por que não é um único .exe?**
R: O Electron precisa de arquivos de suporte (DLLs, recursos). Um único .exe seria muito pesado e lento para descompactar.

**Q: Posso copiar a pasta para um pendrive?**
R: Sim! Copie a pasta **VConectY_Standalone** inteira e execute de qualquer lugar.

**Q: Tela fica preta na conexão?**
R: Issue conhecida. Estamos trabalhando na correção.

## 📂 Estrutura

```
VConectY_Standalone/
├── VConectY.exe         (executável principal)
├── resources/
│   └── app/
│       ├── dist/        (frontend buildado)
│       ├── electron/    (código Electron)
│       └── package.json
├── *.dll                (bibliotecas necessárias)
├── *.pak                (recursos e traduções)
└── LEIA-ME.txt
```

---
**Versão:** 1.0  
**Data:** 2026-02-08  
**Tamanho:** ~200MB descompactado
