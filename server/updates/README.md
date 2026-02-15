# Guia de Publicação de Atualizações VConectY

## 📦 Processo de Release

### 1. Construir Nova Versão

#### Desktop (Electron)
```bash
cd c:\Users\Vagner\Desktop\VCONECTY\app
npm run dist
```
O executável será gerado em: `app/release/VConectY-Portable.exe`

#### Android (APK)
```bash
cd c:\Users\Vagner\Desktop\VCONECTY
.\GERAR_APK.bat
```
O APK será gerado em: `app/android/app/build/outputs/apk/debug/app-debug.apk`

---

### 2. Atualizar Números de Versão

#### Desktop
Editar `app/package.json`:
```json
{
  "version": "1.1.0"  // Incrementar versão
}
```

#### Android
Editar `app/android/app/build.gradle`:
```gradle
versionCode 3        // Incrementar código (número inteiro)
versionName "1.1.0"  // Incrementar versão
```

---

### 3. Renomear Arquivos

#### Desktop
Renomear executável para incluir versão:
```
VConectY-Portable.exe → VConectY-Portable-1.1.0.exe
```

#### Android
Renomear APK para incluir versão:
```
app-debug.apk → VConectY-v1.1.0.apk
```

---

### 4. Fazer Upload para Servidor

Fazer upload dos arquivos para:
- Desktop: `server/updates/desktop/VConectY-Portable-X.X.X.exe`
- Android: `server/updates/android/VConectY-vX.X.X.apk`

**Opções de Upload:**
- Via FTP/SFTP para o servidor
- Via painel de controle do Render
- Via GitHub e deploy automático

---

### 5. Atualizar Arquivos JSON

#### Desktop: `server/updates/desktop/latest.json`
```json
{
  "version": "1.1.0",
  "releaseDate": "2026-02-XX",
  "downloadUrl": "https://vconecty.onrender.com/updates/desktop/VConectY-Portable-1.1.0.exe",
  "releaseNotes": "- Nova funcionalidade X\n- Correção de bug Y",
  "mandatory": false
}
```

#### Android: `server/updates/android/latest.json`
```json
{
  "version": "1.1.0",
  "versionCode": 3,
  "releaseDate": "2026-02-XX",
  "downloadUrl": "https://vconecty.onrender.com/updates/android/VConectY-v1.1.0.apk",
  "changelog": "- Nova funcionalidade X\n- Correção de bug Y",
  "mandatory": false,
  "minVersion": "1.0.0"
}
```

---

### 6. Testar Atualização

1. Instalar versão antiga (1.0.0)
2. Aguardar 1 minuto (primeira verificação automática)
3. Confirmar que notificação aparece
4. Testar download e instalação

---

## ⚠️ Checklist de Release

- [ ] Versão atualizada no código (`package.json` e `build.gradle`)
- [ ] Build executado sem erros
- [ ] Executável/APK testado manualmente
- [ ] Arquivo renomeado com número de versão correto
- [ ] Upload para servidor concluído
- [ ] Arquivo `latest.json` atualizado
- [ ] URL de download validada (acessível via browser)
- [ ] Changelog documentado
- [ ] Teste de atualização automática realizado

---

## 🚀 Versionamento Semântico

Use o formato `MAJOR.MINOR.PATCH`:

- **MAJOR**: Mudanças incompatíveis na API (ex: 1.0.0 → 2.0.0)
- **MINOR**: Nova funcionalidade compatível (ex: 1.0.0 → 1.1.0)
- **PATCH**: Correções de bugs (ex: 1.0.0 → 1.0.1)

---

## 🔐 Segurança (Futuro)

Para produção, considere:
- Assinar APKs com certificado válido
- Usar HTTPS para todos os downloads
- Implementar verificação de hash SHA256
- Configurar CSP (Content Security Policy)
