import { useState, useEffect, useRef } from 'react'
import io from 'socket.io-client'
import { generateKeyPair, exportPublicKey, sha256 } from './security'

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

const FullScreenSession = ({ videoRef, onDisconnect, status }) => {
    useEffect(() => {
        console.log('[FullScreenSession] Component mounted');
        console.log('[FullScreenSession] videoRef:', videoRef);
        console.log('[FullScreenSession] videoRef.current:', videoRef?.current);

        if (videoRef?.current) {
            const video = videoRef.current;
            console.log('[FullScreenSession] Video element exists!');
            console.log('[FullScreenSession] Video srcObject:', video.srcObject);
            console.log('[FullScreenSession] Video readyState:', video.readyState);
            console.log('[FullScreenSession] Video paused:', video.paused);

            // Force play if has stream
            if (video.srcObject && video.paused) {
                console.log('[FullScreenSession] Attempting to play video...');
                video.play().then(() => {
                    console.log('[FullScreenSession] Video playing!');
                }).catch(err => {
                    console.error('[FullScreenSession] Play failed:', err);
                });
            }
        } else {
            console.error('[FullScreenSession] Video element is NULL!');
        }
    }, [videoRef]);

    return (
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
            <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: '#111' }}>
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    tabIndex={0}
                    style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000', cursor: 'none' }}
                    onLoadedMetadata={(e) => {
                        console.log('[VIDEO] Metadata loaded!');
                        console.log('[VIDEO] Video dimensions:', e.target.videoWidth, 'x', e.target.videoHeight);
                    }}
                    onPlay={() => console.log('[VIDEO] Playing!')}
                    onError={(e) => console.error('[VIDEO] Error:', e)}
                    onCanPlay={() => console.log('[VIDEO] Can play!')}

                    // Mouse Control
                    onMouseMove={(e) => {
                        if (!window.electronAPI?.robotControl) return;
                        const rect = e.currentTarget.getBoundingClientRect();
                        const x = (e.clientX - rect.left) / rect.width;
                        const y = (e.clientY - rect.top) / rect.height;
                        window.electronAPI.robotControl({ type: 'mouse-move', x, y });
                    }}
                    onMouseDown={(e) => {
                        if (!window.electronAPI?.robotControl) return;
                        e.preventDefault();
                        const button = e.button === 0 ? 'left' : e.button === 2 ? 'right' : 'middle';
                        window.electronAPI.robotControl({ type: 'mouse-down', button });
                    }}
                    onMouseUp={(e) => {
                        if (!window.electronAPI?.robotControl) return;
                        e.preventDefault();
                        const button = e.button === 0 ? 'left' : e.button === 2 ? 'right' : 'middle';
                        window.electronAPI.robotControl({ type: 'mouse-up', button });
                    }}
                    onClick={(e) => {
                        e.currentTarget.focus(); // Focus for keyboard events
                    }}
                    onContextMenu={(e) => e.preventDefault()}
                    onWheel={(e) => {
                        if (!window.electronAPI?.robotControl) return;
                        e.preventDefault();
                        const scrollX = e.deltaX;
                        const scrollY = -e.deltaY; // Invert for natural scroll
                        window.electronAPI.robotControl({ type: 'scroll', x: scrollX, y: scrollY });
                    }}

                    // Keyboard Control
                    onKeyDown={(e) => {
                        if (!window.electronAPI?.robotControl) return;
                        e.preventDefault();
                        const modifiers = [];
                        if (e.ctrlKey) modifiers.push('control');
                        if (e.shiftKey) modifiers.push('shift');
                        if (e.altKey) modifiers.push('alt');
                        if (e.metaKey) modifiers.push('command');

                        const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
                        window.electronAPI.robotControl({
                            type: 'key-down',
                            key,
                            modifiers
                        });
                    }}
                    onKeyUp={(e) => {
                        if (!window.electronAPI?.robotControl) return;
                        e.preventDefault();
                        const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
                        window.electronAPI.robotControl({ type: 'key-up', key });
                    }}
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
};

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
        localStorage.getItem('vconecty_server') || 'https://vconecty.onrender.com'
    );

    // Connection State
    const [targetId, setTargetId] = useState('');
    const [targetPassword, setTargetPassword] = useState(''); // Password to connect
    const [myAccessPassword, setMyAccessPassword] = useState(
        localStorage.getItem('vconecty_access_pwd') || ''
    ); // My password for incoming connections
    const [socket, setSocket] = useState(null);
    const [status, setStatus] = useState('Desconectado');
    const [role, setRole] = useState(null); // 'client' | 'host'

    // Modals & UI
    const [showSettings, setShowSettings] = useState(false);
    const [requestModal, setRequestModal] = useState(null);

    // Recent Connections
    const [recentConnections, setRecentConnections] = useState([]);

    // Refs
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const peerConnection = useRef(null);

    // Save ID permanently
    useEffect(() => {
        localStorage.setItem('vconecty_id', myId);
        localStorage.setItem('vconecty_pwd', myPassword);
    }, [myId, myPassword]);

    // Load recent connections
    useEffect(() => {
        const saved = localStorage.getItem('vconecty_recents');
        if (saved) {
            try {
                setRecentConnections(JSON.parse(saved));
            } catch (e) {
                console.error('[RECENTS] Error loading:', e);
            }
        }
    }, []);

    // Add to recent connections
    const addToRecents = (id, name = null) => {
        const newRecent = {
            id,
            name: name || `PC ${id.substring(0, 7)}`,
            lastConnected: new Date().toISOString(),
            favorite: false
        };

        const updated = [newRecent, ...recentConnections.filter(r => r.id !== id)].slice(0, 10);
        setRecentConnections(updated);
        localStorage.setItem('vconecty_recents', JSON.stringify(updated));
    };

    // Toggle favorite
    const toggleFavorite = (id) => {
        const updated = recentConnections.map(r =>
            r.id === id ? { ...r, favorite: !r.favorite } : r
        );
        setRecentConnections(updated);
        localStorage.setItem('vconecty_recents', JSON.stringify(updated));
    };

    // Remove from recents
    const removeFromRecents = (id) => {
        const updated = recentConnections.filter(r => r.id !== id);
        setRecentConnections(updated);
        localStorage.setItem('vconecty_recents', JSON.stringify(updated));
    };

    // --- INITIALIZATION ---
    useEffect(() => {
        // Check URL Params for Mode
        const params = new URLSearchParams(window.location.search);
        const mode = params.get('mode');
        const target = params.get('target');

        if (mode === 'session' && target) {
            console.log('[SESSION MODE] Waiting for connection from:', target);
            setRole('client');
            setTargetId(target);
            setStatus(`Aguardando conexão de ${target}...`);
            // Just connect to server and wait for offer - don't initiate connection
            connectSocket(serverUrl, false, null);
        } else {
            // Normal Dashboard Mode
            connectSocket(serverUrl);
        }
    }, [serverUrl]);

    const connectSocket = (url) => {
        if (socket) socket.disconnect();
        setStatus(`Conectando ao servidor...`);

        // Handle localhost vs public URL
        const cleanUrl = url.replace(/\/$/, "");
        const s = io(cleanUrl, {
            reconnectionAttempts: 5,
            autoConnect: true,
            transports: ['websocket', 'polling']
        });

        s.on('connect', async () => {
            setStatus('Online 🟢');
            // Register my ID
            s.emit('join-host', myId.replace(/\s/g, ''));
            console.log('[SOCKET] Connected to server, joined as:', myId.replace(/\s/g, ''));

            // If in session mode, send connection request to target
            const params = new URLSearchParams(window.location.search);
            const mode = params.get('mode');
            const target = params.get('target');
            if (mode === 'session' && target) {
                console.log('[SESSION] Sending connection request to:', target);
                // Get password from URL if provided
                const pwd = params.get('password') || '';
                console.log('[SESSION] Senha da URL:', pwd);
                const passwordHash = pwd ? await sha256(pwd) : '';
                console.log('[SESSION] Hash da senha:', passwordHash);

                s.emit('client-connect', {
                    targetId: target.replace(/\s/g, ''),
                    from: myId.replace(/\s/g, ''),
                    password: passwordHash
                });
                console.log('[SESSION] Pedido enviado com password:', passwordHash);
                setStatus(`Chamando ${target}...`);
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

    const handleIncoming = async (data, s) => {
        const { from, password } = data;
        console.log('[AUTH] ==== Pedido de conexão recebido ===');
        console.log('[AUTH] From:', from);
        console.log('[AUTH] Password recebida:', password);
        console.log('[AUTH] Minha senha configurada:', myAccessPassword);

        // Verify password if set
        if (myAccessPassword) {
            console.log('[AUTH] Senha configurada! Validando...');
            const hash = await sha256(myAccessPassword);
            console.log('[AUTH] Hash esperado:', hash);
            console.log('[AUTH] Hash recebido:', password);

            if (password !== hash) {
                console.log('[AUTH] ❌ SENHA INCORRETA! Rejeitando conexão.');
                return; // Reject silently
            }
            console.log('[AUTH] ✅ Senha correta!');
        } else {
            console.log('[AUTH] Nenhuma senha configurada, aceitando.');
        }

        // Show Modal
        console.log('[AUTH] Mostrando modal de pedido');
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

        // Add to recent connections
        addToRecents(targetClean);

        // Open separate window for session
        if (window.electronAPI && window.electronAPI.createSessionWindow) {
            window.electronAPI.createSessionWindow(targetClean, targetPassword);
        } else {
            alert("Erro: API de janela não disponível.");
        }
    };

    const startHostSession = async (targetId, currentSocket) => {
        console.log('[HOST] Starting host session for target:', targetId);
        const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
        peerConnection.current = pc;

        pc.onicecandidate = e => e.candidate && currentSocket.emit('ice-candidate', { target: targetId, candidate: e.candidate });

        try {
            console.log('[HOST] Getting screen sources...');
            const sources = await window.electronAPI.getSources();
            console.log('[HOST] Found', sources.length, 'sources:', sources);

            if (sources.length === 0) {
                alert("Nenhuma tela disponível para captura!");
                return;
            }

            const source = sources[0];
            console.log('[HOST] Using source:', source.name);

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

            console.log('[HOST] Screen captured! Stream tracks:', stream.getTracks().length);
            stream.getTracks().forEach(t => {
                console.log('[HOST] Adding track:', t.kind, t.id);
                pc.addTrack(t, stream);
            });

            const offer = await pc.createOffer({
                offerToReceiveVideo: false,
                offerToReceiveAudio: false
            });

            await pc.setLocalDescription(offer);
            console.log('[HOST] Sending offer to:', targetId);
            currentSocket.emit('offer', { target: targetId, sdp: offer, from: myId.replace(/\s/g, '') });

            setStatus('Transmitindo...');
        } catch (e) {
            console.error('[HOST] Erro captura:', e);
            alert("Erro ao capturar tela: " + e.message);
        }
    };

    const handleWebRTC = async (data, type, s) => {
        const pc = peerConnection.current;
        if (!pc && type !== 'offer') return;

        if (type === 'offer') {
            console.log('[CLIENT] Received offer from:', data.from);
            const newPc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
            peerConnection.current = newPc;
            newPc.onicecandidate = e => e.candidate && s.emit('ice-candidate', { target: data.from, candidate: e.candidate });
            newPc.ontrack = e => {
                console.log('[CLIENT] Received track:', e.track.kind, 'streams:', e.streams.length);
                if (remoteVideoRef.current) {
                    console.log('[VIDEO] ==== Configurando stream no elemento de vídeo ====');
                    console.log('[VIDEO] Stream recebido:', e.streams[0]);
                    console.log('[VIDEO] Tracks no stream:', e.streams[0].getTracks());
                    console.log('[VIDEO] Elemento de vídeo:', remoteVideoRef.current);

                    remoteVideoRef.current.srcObject = e.streams[0];
                    console.log('[VIDEO] srcObject definido!');

                    // Explicitly play the video
                    remoteVideoRef.current.play().then(() => {
                        console.log('[VIDEO] ✅ Vídeo tocando!');
                    }).catch(err => {
                        console.error('[VIDEO] ❌ Erro ao tocar:', err);
                    });
                } else {
                    console.error('[CLIENT] remoteVideoRef is null!');
                }
            };

            await newPc.setRemoteDescription(data.sdp);
            const answer = await newPc.createAnswer();
            await newPc.setLocalDescription(answer);
            console.log('[CLIENT] Sending answer to:', data.from);
            s.emit('answer', { target: data.from, sdp: answer, from: myId.replace(/\s/g, '') });
            setStatus("Conectado! 💻");
        } else if (type === 'answer') {
            console.log('[HOST] Received answer');
            await pc.setRemoteDescription(data.sdp);
            setStatus("Transmitindo 📡");
        } else if (type === 'ice') {
            console.log('[ICE] Adding candidate');
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

                        {/* Access Password Config */}
                        <div style={{ marginTop: 15, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 15 }}>
                            <h4 style={{ fontSize: 13, opacity: 0.7, marginBottom: 8, textAlign: 'left' }}>🔐 Senha de Acesso</h4>
                            <input
                                type="password"
                                className="modern-input"
                                placeholder="Senha (opcional)"
                                value={myAccessPassword}
                                onChange={(e) => {
                                    setMyAccessPassword(e.target.value);
                                    localStorage.setItem('vconecty_access_pwd', e.target.value);
                                }}
                                style={{ fontSize: 13, padding: 8, width: '100%' }}
                            />
                            <small style={{ opacity: 0.5, fontSize: 10, marginTop: 5, display: 'block', textAlign: 'left' }}>
                                Proteja seu PC com senha obrigatória
                            </small>
                        </div>
                    </div>

                    {/* CONNECT CARD */}
                    <div className="card glass-card active-card">
                        <h3>Acessar Computador</h3>
                        <input
                            className="modern-input"
                            placeholder="Digite o ID do Parceiro (Ex: 123 456 789)"
                            value={targetId}
                            onChange={e => setTargetId(e.target.value)}
                            style={{ marginBottom: 10, fontSize: 18, textAlign: 'center' }}
                        />
                        <input
                            type="password"
                            className="modern-input"
                            placeholder="🔐 Senha (se necessário)"
                            value={targetPassword}
                            onChange={e => setTargetPassword(e.target.value)}
                            style={{ marginBottom: 20, fontSize: 14, textAlign: 'center' }}
                        />
                        <button className="btn-primary" onClick={connectToPartner}>CONECTAR</button>

                        {/* Recent Connections */}
                        {recentConnections.length > 0 && (
                            <div style={{ marginTop: 20, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 15 }}>
                                <h4 style={{ fontSize: 14, opacity: 0.7, marginBottom: 10 }}>Conexões Recentes</h4>
                                <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                                    {recentConnections
                                        .sort((a, b) => (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0))
                                        .map((conn, idx) => (
                                            <div key={idx} style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                padding: '8px 10px',
                                                background: 'rgba(255,255,255,0.05)',
                                                borderRadius: 6,
                                                marginBottom: 8,
                                                fontSize: 13
                                            }}>
                                                <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    <div style={{ fontWeight: 500 }}>{conn.name}</div>
                                                    <div style={{ opacity: 0.6, fontSize: 11 }}>{conn.id}</div>
                                                </div>
                                                <div style={{ display: 'flex', gap: 8 }}>
                                                    <button
                                                        onClick={() => toggleFavorite(conn.id)}
                                                        style={{
                                                            background: 'transparent',
                                                            border: 'none',
                                                            cursor: 'pointer',
                                                            fontSize: 16,
                                                            padding: 4
                                                        }}
                                                        title="Favoritar"
                                                    >
                                                        {conn.favorite ? '⭐' : '☆'}
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setTargetId(conn.id);
                                                            connectToPartner();
                                                        }}
                                                        style={{
                                                            background: '#4CAF50',
                                                            border: 'none',
                                                            borderRadius: 4,
                                                            color: 'white',
                                                            cursor: 'pointer',
                                                            fontSize: 11,
                                                            padding: '4px 8px'
                                                        }}
                                                        title="Conectar"
                                                    >
                                                        🔗
                                                    </button>
                                                    <button
                                                        onClick={() => removeFromRecents(conn.id)}
                                                        style={{
                                                            background: 'transparent',
                                                            border: 'none',
                                                            cursor: 'pointer',
                                                            fontSize: 14,
                                                            padding: 4,
                                                            opacity: 0.5
                                                        }}
                                                        title="Remover"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default App;
