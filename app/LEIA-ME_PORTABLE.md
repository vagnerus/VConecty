# VConectY Portable - Instruções

## 📦 Como Usar a Versão Portátil

A versão portátil do VConectY funciona diretamente da pasta, sem necessidade de instalação.

### Requisitos
- Windows 10/11
- A pasta completa do projeto com todas as dependências

### Executar o App

**Opção 1 - Duplo Clique:**
1. Vá até: `C:\Users\Vagner\Desktop\VCONECTY\app`
2. Clique duas vezes em: **`VConectY_Portable.bat`**

**Opção 2 - Modo Desenvolvedor (com hot-reload):**
1. Clique duas vezes em: **`TESTAR_VCONECTY.bat`**

### Distribuir para Outros

Para compartilhar com outros usuários:

1. **Copie toda a pasta `app`** para um local seguro
2. **Certifique-se de incluir:**
   - ✅ pasta `node_modules` (completa)
   - ✅ pasta `dist` (build do frontend)
   - ✅ pasta `electron` (arquivos do Electron)
   - ✅ `package.json`
   - ✅ `VConectY_Portable.bat`

3. **Compacte em ZIP** e distribua

4. **Usuário final:**
   - Extrair o ZIP
   - Executar `VConectY_Portable.bat`

### Configuração

**Servidor padrão:** `https://vconecty.onrender.com`

Para mudar:
1. Abra o app
2. Clique na engrenagem ⚙️
3. Cole a nova URL
4. Feche o modal

### Problemas Conhecidos

- ⚠️ Tela preta na transmissão (issue no WebRTC)
- A conexão funciona mas o vídeo não renderiza

### Tamanho

A pasta portátil ocupará aproximadamente **400-500MB** devido aos node_modules do Electron.

---

**Versão:** 1.0  
**Data:** 2026-02-08
