import { useState, useEffect, useRef } from 'react'
import io from 'socket.io-client'
import { generateKeyPair, exportPublicKey } from './security'

// UI COMPONENTS
const TitleBar = ({ minimize, close }) => (
    <div className="title-bar">
        <div className="title-bar-title">VConectY Direct</div>
        <div className="title-bar-controls">
            <div className="control-btn" onClick={minimize}>_</div>
            <div className="control-btn close" onClick={close}>✕</div>
        </div>
    </div>
);

const FullScreenSession = ({ videoRef, onDisconnect, status }) => (
    <div style={{
        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
        background: '#000', zIndex: 5000, display: 'flex', flexDirection: 'column'
    }}>
        <div style={{
            padding: '10px', background: 'rgba(0,0,0,0.8)', color: 'white',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            borderBottom: '1px solid #333'
        }}>
            <span>💻 Acesso Remoto - {status}</span>
            <div>
                <button className="btn-secondary" onClick={onDisconnect}>❌ Desconectar</button>
            </div>
        </div>
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
            <video
                ref={videoRef}
                autoPlay
                playsInline
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
            {status.includes('Conectando') && (
                <div style={{
                    position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                    color: 'white', textAlign: 'center'
                }}>
                    <h3>{status}</h3>
                    <div className="spinner"></div>
                </div>
            )}
        </div>
    </div>
);

// MAIN APP
// End of App
export default App;

// HELPER: Generate Random 9-Digit ID (AnyDesk Style)
const generateVConectYId = () => {
    const part1 = Math.floor(100 + Math.random() * 900);
    const part2 = Math.floor(100 + Math.random() * 900);
    const part3 = Math.floor(100 + Math.random() * 900);
    return `${part1} ${part2} ${part3}`;
};

function App() {
    // Identity
    const [myId, setMyId] = useState(localStorage.getItem('vconecty_id') || generateVConectYId());
    const [myPassword, setMyPassword] = useState(localStorage.getItem('vconecty_pwd') || Math.random().toString(36).slice(-4));

    // Server
    const [serverUrl, setServerUrl] = useState(
        localStorage.getItem('vconecty_server') || 'https://vconecty-server-demo.onrender.com' // Placeholder/Default
    );

    // Connection State
    const [targetId, setTargetId] = useState('');
    const [targetPassword, setTargetPassword] = useState(''); // No longer used for auth in this simpler version, but nice to handle
    const [socket, setSocket] = useState(null);
    const [status, setStatus] = useState('Desconectado');
    const [role, setRole] = useState(null); // 'client' | 'host'

    // Modals & UI
    const [showSettings, setShowSettings] = useState(false);
    const [requestModal, setRequestModal] = useState(null);

    // Refs
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const peerConnection = useRef(null);

    // Save ID permanently
    useEffect(() => {
        localStorage.setItem('vconecty_id', myId);
        localStorage.setItem('vconecty_pwd', myPassword);
    }, [myId, myPassword]);

    // --- INITIALIZATION ---
    useEffect(() => {
        // Check URL Params for Mode
        const params = new URLSearchParams(window.location.search);
        const mode = params.get('mode');
        const target = params.get('target');

        if (mode === 'session' && target) {
            setRole('client');
            setTargetId(target);
            // Connect socket then auto-connect to partner
            connectSocket(serverUrl, true, target);
        } else {
            // Normal Dashboard Mode
            connectSocket(serverUrl);
        }
    }, [serverUrl]);

    const connectSocket = (url, autoConnectToTarget = false, targetStr = null) => {
        if (socket) socket.disconnect();
        setStatus(`Conectando ao servidor...`);

        // Handle localhost vs public URL
        const cleanUrl = url.replace(/\/$/, "");
        const s = io(cleanUrl, {
            reconnectionAttempts: 5,
            autoConnect: true,
            transports: ['websocket', 'polling']
        });

        s.on('connect', () => {
            setStatus('Online 🟢');
            // Register my ID
            s.emit('join-host', myId.replace(/\s/g, ''));

            if (autoConnectToTarget && targetStr) {
                // Trigger connection immediately for session window
                console.log("Auto-connecting to:", targetStr);
                s.emit('client-connect', {
                    targetId: targetStr.replace(/\s/g, ''),
                    from: myId
                });
                setStatus(`Chamando ${targetStr}...`);
            }
        });

        s.on('connect_error', (e) => setStatus(`Offline 🔴 (${e.message})`));

        // Signaling ...
        s.on('incoming-connection', (data) => handleIncoming(data, s));
        s.on('offer', (d) => handleWebRTC(d, 'offer', s));
        s.on('answer', (d) => handleWebRTC(d, 'answer', s));
        s.on('ice-candidate', (d) => handleWebRTC(d, 'ice', s));

        setSocket(s);
    };

    const handleIncoming = (data, s) => {
        const { from } = data;
        console.log("Recebido pedido de:", from);
        // Show Modal
        setRequestModal({ from, socket: s });
        if (window.electronAPI) window.electronAPI.minimize(); // Focus hack
    };

    const acceptConnection = async () => {
        if (!requestModal) return;
        const { from, socket } = requestModal;

        setRole('host');
        setStatus('Preparando Transmissão...');
        setRequestModal(null);

        await startHostSession(from, socket);
    };

    const connectToPartner = () => {
        if (!targetId) return alert("Digite o ID do Parceiro!");
        const targetClean = targetId.replace(/\s/g, '');

        addToRecents(targetClean);

        // Open separate window for session
        if (window.electronAPI && window.electronAPI.createSessionWindow) {
            window.electronAPI.createSessionWindow(targetClean);
        } else {
            alert("Erro: API de janela não disponível.");
        }
    };

    const startHostSession = async (targetId, currentSocket) => {
        const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
        peerConnection.current = pc;

        pc.onicecandidate = e => e.candidate && currentSocket.emit('ice-candidate', { target: targetId, candidate: e.candidate });

        try {
            const sources = await window.electronAPI.getSources();
            const source = sources[0];

            const stream = await navigator.mediaDevices.getUserMedia({
                audio: false,
                video: {
                    mandatory: {
                        chromeMediaSource: 'desktop',
                        chromeMediaSourceId: source.id,
                        maxWidth: 1920,
                        maxHeight: 1080
                    }
                }
            });

            stream.getTracks().forEach(t => pc.addTrack(t, stream));

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            currentSocket.emit('offer', { target: targetId, sdp: offer });

            setStatus('Transmitindo...');
        } catch (e) {
            console.error(e);
            alert("Erro captura: " + e.message);
        }
    };

    const handleWebRTC = async (data, type, s) => {
        const pc = peerConnection.current;
        if (!pc && type !== 'offer') return;

        if (type === 'offer') {
            const newPc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
            peerConnection.current = newPc;
            newPc.onicecandidate = e => e.candidate && s.emit('ice-candidate', { target: data.from, candidate: e.candidate });
            newPc.ontrack = e => {
                if (remoteVideoRef.current) remoteVideoRef.current.srcObject = e.streams[0];
            };

            await newPc.setRemoteDescription(data.sdp);
            const answer = await newPc.createAnswer();
            await newPc.setLocalDescription(answer);
            s.emit('answer', { target: data.from, sdp: answer });
            setStatus("Conectado! 💻");
        } else if (type === 'answer') {
            await pc.setRemoteDescription(data.sdp);
            setStatus("Transmitindo 📡");
        } else if (type === 'ice') {
            await pc.addIceCandidate(data.candidate);
        }
    };

    // --- RENDER ---
    return (
        <div className="app-wrapper">
            {/* FULLSCREEN SESSION MODE */}
            {role === 'client' && (
                <FullScreenSession
                    videoRef={remoteVideoRef}
                    status={status}
                    onDisconnect={() => {
                        if (window.location.search.includes('mode=session')) {
                            window.electronAPI.close();
                        } else {
                            window.location.reload();
                        }
                    }}
                />
            )}

            {/* HEADER - Only show if NOT in session mode (native frame used there) */}
            {!window.location.search.includes('mode=session') && (
                <TitleBar minimize={() => window.electronAPI.minimize()} close={() => window.electronAPI.close()} />
            )}

            {/* REQUEST MODAL */}
            {requestModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.9)', zIndex: 9999,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <div className="glass-card" style={{ padding: 40, textAlign: 'center', border: '2px solid #4CAF50' }}>
                        <h1>🔔 Pedido de Conexão!</h1>
                        <p style={{ fontSize: 18 }}>ID <strong>{requestModal.from}</strong> quer conectar.</p>
                        <div style={{ marginTop: 20, display: 'flex', gap: 20, justifyContent: 'center' }}>
                            <button className="btn-secondary" style={{ background: 'red' }} onClick={() => setRequestModal(null)}>BLOQUEAR</button>
                            <button className="btn-primary" style={{ fontSize: 18, padding: '10px 40px' }} onClick={acceptConnection}>ACEITAR</button>
                        </div>
                    </div>
                </div>
            )}

            {/* SETTINGS MODAL */}
            {showSettings && (
                <div className="settings-modal" style={{
                    position: 'absolute', top: 40, right: 10, width: 300,
                    background: 'rgba(20,20,30,0.95)', border: '1px solid #444',
                    borderRadius: 8, padding: 15, zIndex: 1000, color: 'white'
                }}>
                    <h3>Configuração de Servidor</h3>
                    <div className="form-group">
                        <label>URL do Servidor</label>
                        <input
                            type="text"
                            value={serverUrl}
                            onChange={(e) => {
                                setServerUrl(e.target.value);
                                localStorage.setItem('vconecty_server', e.target.value);
                            }}
                            className="modern-input"
                        />
                        <small style={{ color: '#aaa', fontSize: 10 }}>Padrão: Render / Localhost:3000</small>
                    </div>
                    <button onClick={() => setShowSettings(false)} className="btn-secondary" style={{ width: '100%', marginTop: 10 }}>Fechar</button>
                </div>
            )}

            <div className="app-container">
                <div style={{ textAlign: 'center', marginBottom: 20, position: 'relative' }}>
                    <h1 style={{ fontSize: '1.8rem', margin: 0 }}>VConectY <span style={{ color: '#4CAF50' }}>Global</span></h1>
                    <small>{status}</small>
                    <button onClick={() => setShowSettings(!showSettings)} style={{ position: 'absolute', right: 0, top: 0, background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 20 }}>⚙️</button>
                </div>

                <div className="main-grid">
                    {/* MY ID CARD */}
                    <div className="card glass-card">
                        <h3>Meu Endereço</h3>
                        <div className="code-display" style={{ fontSize: 32, textAlign: 'center', margin: '20px 0', letterSpacing: 2 }}>
                            {myId}
                        </div>
                        <p style={{ fontSize: 12, opacity: 0.7, textAlign: 'center' }}>Seu ID fixo para conexões globais.</p>
                    </div>

                    {/* CONNECT CARD */}
                    <div className="card glass-card active-card">
                        <h3>Acessar Computador</h3>
                        <input
                            className="modern-input"
                            placeholder="Digite o ID do Parceiro (Ex: 123 456 789)"
                            value={targetId}
                            onChange={e => setTargetId(e.target.value)}
                            style={{ marginBottom: 20, fontSize: 18, textAlign: 'center' }}
                        />
                        <button className="btn-primary" onClick={connectToPartner}>CONECTAR</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
