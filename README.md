# VConectY Acess

VConectY Acess é uma aplicação de acesso remoto segura, leve e eficiente, inspirada no AnyDesk. Utiliza tecnologia WebRTC para conexão P2P e criptografia RSA-2048/AES-256 para segurança total.

![VConnectY](https://via.placeholder.com/800x400?text=VConectY+Remote+Access)

## 🚀 Funcionalidades

- **Acesso Remoto Rápido**: Codec otimizado para transmissão de tela com baixa latência.
- **Segurança de Ponta a Ponta**: Criptografia assimétrica (RSA) para handshake e simétrica (AES) para dados.
- **Portátil**: Executável único, sem necessidade de instalação.
- **Configurável**: Permite alterar o servidor de sinalização (Rendezvous) dinamicamente.
- **Multiplataforma**: Construído com Tecnologias Web (Electron + React).

## 🛠️ Tecnologias Utilizadas

- **Frontend**: React + Vite
- **Backend (Electron)**: Electron JS (Main Process)
- **Servidor de Sinalização**: Node.js + Socket.io
- **Conectividade**: WebRTC (P2P), STUN (Google)
- **Criptografia**: Web Crypto API (RSA-OAEP, AES-GCM)

## 📦 Como Rodar o Projeto

### Pré-requisitos
- Node.js (v16 ou superior)
- NPM ou Yarn

### 1. Iniciar o Servidor de Sinalização (Rendezvous)
O servidor é responsável por conectar os pares (Peers) inicialmente.

```bash
cd server
npm install
node index.js
```
O servidor rodará em `http://localhost:3000`.

### 2. Rodar a Aplicação (Modo Desenvolvimento)

```bash
cd app
npm install
npm run electron:dev
```

## 🔨 Como Gerar o Executável

Para criar um executável único (Portable) para Windows:

```bash
cd app
npm run build   # Compila o React (Vite)
npm run dist    # Empacota com Electron Builder
```

O arquivo executável será gerado na pasta `app/release`.

## ⚙️ Configuração

No aplicativo, clique no botão **⚙️ Config** no canto superior direito para definir o endereço do Servidor de Sinalização (caso você esteja rodando o servidor em outra máquina da rede local ou na nuvem).

Exemplo: `http://192.168.1.50:3000`

## 📝 Créditos

Desenvolvido por **Vagner Oliveira ~ FlasH**.
