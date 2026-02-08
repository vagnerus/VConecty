# VConectY - Guia de Teste

## 🧪 Como Testar o Sistema Completo

### Teste 1: Conexão Básica (SEM senha)
1. Abra VConectY-Portable.exe em 2 PCs
2. **PC Host:** Copie seu ID
3. **PC Cliente:** Cole o ID e clique CONECTAR
4. ✅ **Resultado esperado:** Vídeo aparece e você consegue mover o mouse

### Teste 2: Sistema de Senha
#### Configurar Senha no Host:
1. **PC Host:** Configure senha "teste123" em "🔐 Senha de Acesso"
2. Copie seu ID

#### Conectar COM senha:
3. **PC Cliente:** Cole o ID
4. **IMPORTANTE:** Digite "teste123" no campo de senha
5. Clique CONECTAR
6. ✅ **Resultado esperado:** Conecta normalmente

#### Conectar SEM senha (deve falhar):
7. **PC Cliente:** Cole o ID
8. **NÃO** digite senha ou digite senha errada
9. Clique CONECTAR
10. ❌ **Resultado esperado:** Conexão rejeitada (silenciosamente)

### Teste 3: Histórico e Favoritos
1. Conecte em um PC
2. Desconecte
3. ✅ **Resultado esperado:** PC aparece em "Conexões Recentes"
4. Clique na ⭐ para favoritar
5. Clique no 🔗 para reconectar rapidamente

## 🐛 Problemas Relatados

### Problema 1: Vídeo não aparece
**Sintoma:** Tela preta, sem vídeo
**Possível causa:** WebRTC não está capturando/transmitindo
**Debug:** Abrir DevTools (Ctrl+Shift+I) e ver console

### Problema 2: Senha não é pedida
**Sintoma:** Campo de senha não aparece ou senha não valida
**Solução:** Rebuild completo feito

## 📝 Checklist de Funcionalidades
- [ ] Vídeo WebRTC transmite
- [ ] Mouse remoto funciona
- [ ] Teclado remoto funciona  
- [ ] Campo de senha aparece
- [ ] Senha CORRETA conecta
- [ ] Senha ERRADA rejeita
- [ ] Histórico salva conexões
- [ ] Favoritos funcionam
- [ ] Quick connect funciona
