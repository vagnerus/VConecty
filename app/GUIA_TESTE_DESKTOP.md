# 🖥️ Guia de Teste: Controle Desktop → Desktop

## ✅ O que Vamos Testar

Testar se o controle remoto funciona entre dois computadores Desktop usando a versão Electron.

---

## 🚀 Passo a Passo

### 1. Compilar a Versão Desktop

```bash
cd c:\Users\Vagner\Desktop\VCONECTY\app

# Build da aplicação web
npm run build

# Build do Electron
npm run dist
```

> Isso vai criar o executável em `release/win-unpacked/VConectY.exe`

---

### 2. Executar o Teste

#### **Opção A: Dois PCs Diferentes**
1. Copiar o executável para outro PC
2. Executar VConectY nos dois PCs
3. Anotar o ID de cada um
4. Conectar um ao outro

#### **Opção B: Mesmo PC (Simulação)**
1. Abrir 2 instâncias do VConectY no mesmo PC
2. Anotar os IDs gerados
3. Conectar uma à outra

---

### 3. Como Testar o Controle

**No PC que vai COMPARTILHAR a tela (HOST):**
- Apenas aguardar a conexão

**No PC que vai CONTROLAR (CLIENT):**
1. Digitar o ID do HOST
2. Clicar em CONECTAR
3. Quando o vídeo aparecer:
   - ✅ Mover o mouse → cursor do HOST deve mover
   - ✅ Clicar → cliques devem funcionar no HOST
   - ✅ Digitar → texto deve aparecer no HOST
   - ✅ Scroll → deve funcionar no HOST

---

## ⚠️ Problemas Conhecidos

### Se não funcionar:
1. **Vídeo não aparece**: Verificar se screen capture foi autorizado
2. **Não conecta**: Verificar servidor (https://vconecty.onrender.com)
3. **Mouse não move**: Controle remoto pode não estar ativado

---

## 🔧 Modo Desenvolvedor (Mais Fácil)

Se quiser testar rapidamente SEM compilar:

```bash
# Terminal 1
npm run dev

# Terminal 2
npm run electron:dev
```

Isso abre a versão de desenvolvimento. Você pode abrir 2 janelas e testar!

---

## 📱 E o Android?

Para fazer o Android controlar o PC, precisamos:
1. ✅ Backend funcionando (já temos)
2. ❌ Frontend com Data Channel (foi perdido)
3. ❌ UI adaptada para mobile

**Tempo estimado para implementar**: ~1-2 horas
