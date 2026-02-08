/**
 * VConectY - Acesso Remoto
 * Desenvolvido por: 100% Vagner Oliveira ~ FlasH
 * Todos os direitos reservados.
 */
import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client'
import { generateKeyPair, exportPublicKey, sha256 } from './security'

// COMPONENTES DE UI
const TitleBar = ({ minimize, close }) => (
    <div className="title-bar">
        <div className="title-bar-title">VConectY Direct</div>
        <div className="title-bar-controls">
            <div className="control-btn" onClick={minimize}>_</div>
            <div className="control-btn close" onClick={close}>✕</div>
        </div>
    </div>
);

const DPad = ({ dataChannelRef }) => {
    const moveTimer = useRef(null);

    const startMoving = (dx, dy) => {
        if (moveTimer.current) return;

        const sendMove = () => {
            if (dataChannelRef.current?.readyState === 'open') {
                dataChannelRef.current.send(JSON.stringify({ type: 'mouse-relative', dx, dy }));
            }
        };

        sendMove(); // Initial move
        moveTimer.current = setInterval(sendMove, 50); // Repeat every 50ms
    };

    const stopMoving = () => {
        if (moveTimer.current) {
            clearInterval(moveTimer.current);
            moveTimer.current = null;
        }
    };

    const handleCenterClick = () => {
        if (dataChannelRef.current?.readyState === 'open') {
            dataChannelRef.current.send(JSON.stringify({ type: 'mouse-down', button: 'left' }));
            setTimeout(() => {
                dataChannelRef.current.send(JSON.stringify({ type: 'mouse-up', button: 'left' }));
            }, 50);
        }
    };

    // Estilos do D-Pad ajustados para Mobile
    return (
        <div style={{
            position: 'fixed', bottom: '20px', right: '20px',
            width: '150px', height: '150px', background: 'rgba(0,0,0,0.6)',
            borderRadius: '50%', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
            gridTemplateRows: 'repeat(3, 1fr)', gap: '5px', padding: '10px',
            border: '2px solid rgba(255,255,255,0.4)', pointerEvents: 'auto',
            zIndex: 999999, boxShadow: '0 0 20px rgba(0,0,0,0.8)',
            touchAction: 'none'
        }}>
            <div />
            <button
                onMouseDown={() => startMoving(0, -15)} onMouseUp={stopMoving} onMouseLeave={stopMoving}
                onTouchStart={(e) => { e.preventDefault(); startMoving(0, -15); }} onTouchEnd={(e) => { e.preventDefault(); stopMoving(); }}
                style={{ background: '#444', color: 'white', border: 'none', borderRadius: '4px', fontSize: '24px' }}>▲</button>
            <div />

            <button
                onMouseDown={() => startMoving(-15, 0)} onMouseUp={stopMoving} onMouseLeave={stopMoving}
                onTouchStart={(e) => { e.preventDefault(); startMoving(-15, 0); }} onTouchEnd={(e) => { e.preventDefault(); stopMoving(); }}
                style={{ background: '#444', color: 'white', border: 'none', borderRadius: '4px', fontSize: '24px' }}>◀</button>
            <button
                onClick={handleCenterClick}
                onTouchStart={(e) => { e.preventDefault(); handleCenterClick(); }}
                style={{ background: '#4CAF50', color: 'white', border: 'none', borderRadius: '50%', fontWeight: 'bold' }}>OK</button>
            <button
                onMouseDown={() => startMoving(15, 0)} onMouseUp={stopMoving} onMouseLeave={stopMoving}
                onTouchStart={(e) => { e.preventDefault(); startMoving(15, 0); }} onTouchEnd={(e) => { e.preventDefault(); stopMoving(); }}
                style={{ background: '#444', color: 'white', border: 'none', borderRadius: '4px', fontSize: '24px' }}>▶</button>

            <div />
            <button
                onMouseDown={() => startMoving(0, 15)} onMouseUp={stopMoving} onMouseLeave={stopMoving}
                onTouchStart={(e) => { e.preventDefault(); startMoving(0, 15); }} onTouchEnd={(e) => { e.preventDefault(); stopMoving(); }}
                style={{ background: '#444', color: 'white', border: 'none', borderRadius: '4px', fontSize: '24px' }}>▼</button>
            <div />
        </div>
    );
};

const FullScreenSession = ({ videoRef, dataChannelRef, setDebugInfo, onDisconnect, onReconnect, status }) => {
    // Clipboard Sync (Client Side)
    useEffect(() => {
        const dc = dataChannelRef.current;
        if (!dc) return;

        const handleMessage = async (e) => {
            try {
                const data = JSON.parse(e.data);
                if (data.type === 'clipboard-update') {
                    console.log('[CLIPBOARD] Received update from host');
                    await navigator.clipboard.writeText(data.text);
                    // Optional: Show toast
                }
            } catch (err) {
                // Ignore non-JSON messages
            }
        };

        // Listen for DC messages (we need to hook into existing onmessage or add new listener if creating new DC?)
        // Note: The DC is created in handleWebRTC. We can't easily add listener here if ref changes.
        // BETTER APPROACH: Handle 'clipboard-update' in the existing onmessage handler in handleWebRTC.
        // But for sending 'paste', we can do it here.

    }, [dataChannelRef.current]);

    // Capture Paste (Ctrl+V) on the container
    useEffect(() => {
        const handlePaste = (e) => {
            const text = e.clipboardData.getData('text');
            if (text && dataChannelRef.current?.readyState === 'open') {
                console.log('[CLIPBOARD] Sending paste to host:', text.substring(0, 20) + '...');
                dataChannelRef.current.send(JSON.stringify({ type: 'clipboard-set', text }));
                e.preventDefault(); // Prevent double paste if input focused
            }
        };

        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, []);

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
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span>💻 Acesso Remoto</span>
                    <span style={{
                        padding: '2px 8px', borderRadius: '4px', fontSize: '12px',
                        background: status.includes('Conectado') ? 'green' : status.includes('instável') ? 'orange' : '#333'
                    }}>
                        {status}
                    </span>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    {!status.includes('Conectado') && !status.includes('Chamando') && (
                        <button className="btn-primary" onClick={onReconnect}>🔄 Reconectar</button>
                    )}
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

                    // Controle do Mouse
                    onMouseMove={(e) => {
                        // Throttle to 30ms (~33fps) for smoother control
                        const now = Date.now();
                        if (window.lastMouseMove && now - window.lastMouseMove < 30) return;
                        window.lastMouseMove = now;

                        const rect = e.currentTarget.getBoundingClientRect();
                        const x = (e.clientX - rect.left) / rect.width;
                        const y = (e.clientY - rect.top) / rect.height;

                        // Send via DataChannel if available (Client Remote)
                        if (dataChannelRef.current && dataChannelRef.current.readyState === 'open') {
                            dataChannelRef.current.send(JSON.stringify({ type: 'mouse-move', x, y }));
                        }
                        // Fallback to local electronAPI if DataChannel not ready OR if testing locally (Host Loopback?)
                        // But strictly for Client Remote, we use DataChannel.
                        // NOTE: If we are testing locally (Client=Host), this might loop.
                    }}
                    onMouseDown={(e) => {
                        e.preventDefault();
                        const button = e.button === 0 ? 'left' : e.button === 2 ? 'right' : 'middle';
                        if (dataChannelRef.current && dataChannelRef.current.readyState === 'open') {
                            dataChannelRef.current.send(JSON.stringify({ type: 'mouse-down', button }));
                        }
                    }}
                    onMouseUp={(e) => {
                        e.preventDefault();
                        const button = e.button === 0 ? 'left' : e.button === 2 ? 'right' : 'middle';
                        if (dataChannelRef.current && dataChannelRef.current.readyState === 'open') {
                            dataChannelRef.current.send(JSON.stringify({ type: 'mouse-up', button }));
                        }
                    }}

                    // Controle de Toque (Android)
                    onTouchStart={(e) => {
                        e.preventDefault();
                        const touch = e.touches[0];
                        const rect = e.currentTarget.getBoundingClientRect();
                        const x = (touch.clientX - rect.left) / rect.width;
                        const y = (touch.clientY - rect.top) / rect.height;

                        // Save start pos for tap detection
                        window.touchStartPos = { x, y, time: Date.now() };

                        if (dataChannelRef.current?.readyState === 'open') {
                            // Optional: Move mouse to start pos immediately?
                            dataChannelRef.current.send(JSON.stringify({ type: 'mouse-move', x, y }));
                        }
                    }}
                    onTouchMove={(e) => {
                        e.preventDefault();
                        e.stopPropagation();

                        const now = Date.now();
                        if (window.lastMouseMove && now - window.lastMouseMove < 16) return; // 60fps
                        window.lastMouseMove = now;

                        const rect = e.currentTarget.getBoundingClientRect();
                        const touch = e.touches[0];
                        if (!touch) return;

                        const x = (touch.clientX - rect.left) / rect.width;
                        const y = (touch.clientY - rect.top) / rect.height;

                        if (dataChannelRef.current?.readyState === 'open') {
                            const cmd = { type: 'mouse-move', x, y };
                            dataChannelRef.current.send(JSON.stringify(cmd));
                            setDebugInfo(prev => ({ dcStatus: 'open', lastCmd: 'move', cmdCount: prev.cmdCount + 1 }));
                            console.log('[TOUCH] Sent move:', x.toFixed(2), y.toFixed(2));
                        } else {
                            console.warn('[TOUCH] DataChannel not open');
                            setDebugInfo(prev => ({ ...prev, dcStatus: 'closed' }));
                        }
                    }}
                    onTouchEnd={(e) => {
                        e.preventDefault();
                        const now = Date.now();
                        const start = window.touchStartPos;

                        // Detect Tap (short duration, little movement)
                        if (start && (now - start.time < 300)) {
                            // It's a tap! Click.
                            if (dataChannelRef.current?.readyState === 'open') {
                                console.log('[TOUCH] Tap detected, sending click');
                                dataChannelRef.current.send(JSON.stringify({ type: 'mouse-down', button: 'left' }));
                                setTimeout(() => {
                                    dataChannelRef.current.send(JSON.stringify({ type: 'mouse-up', button: 'left' }));
                                }, 50);
                            }
                        }
                    }}

                    onClick={(e) => {
                        e.currentTarget.focus(); // Focus for keyboard events
                    }}
                    onContextMenu={(e) => e.preventDefault()}
                    onWheel={(e) => {
                        e.preventDefault();
                        const scrollX = e.deltaX;
                        const scrollY = -e.deltaY; // Invert for natural scroll
                        if (dataChannelRef.current && dataChannelRef.current.readyState === 'open') {
                            dataChannelRef.current.send(JSON.stringify({ type: 'scroll', x: scrollX, y: scrollY }));
                        }
                    }}

                    // Controle de Teclado
                    onKeyDown={(e) => {
                        e.preventDefault();
                        const modifiers = [];
                        if (e.ctrlKey) modifiers.push('control');
                        if (e.shiftKey) modifiers.push('shift');
                        if (e.altKey) modifiers.push('alt');
                        if (e.metaKey) modifiers.push('command');

                        if (dataChannelRef.current && dataChannelRef.current.readyState === 'open') {
                            dataChannelRef.current.send(JSON.stringify({
                                type: 'key-down',
                                key: e.key.toLowerCase(),
                                modifiers
                            }));
                        }
                    }}
                    onKeyUp={(e) => {
                        e.preventDefault();
                        const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
                        if (dataChannelRef.current && dataChannelRef.current.readyState === 'open') {
                            dataChannelRef.current.send(JSON.stringify({ type: 'key-up', key }));
                        }
                    }}
                />

                {/* Directional Controls (D-Pad) */}
                <DPad dataChannelRef={dataChannelRef} />

                {/* Visual indicator of DataChannel status */}
                <div style={{
                    position: 'absolute', top: '10px', left: '10px',
                    padding: '5px 10px', background: 'rgba(0,0,0,0.8)',
                    color: dataChannelRef.current?.readyState === 'open' ? '#0f0' : '#f00',
                    fontSize: '10px', borderRadius: '4px', zIndex: 10001,
                    border: '1px solid currentColor'
                }}>
                    📡 DC: {dataChannelRef.current?.readyState || 'none'}
                </div>

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

// AUXILIAR: Gerar ID de 9 Dígitos Aleatório (Estilo AnyDesk)
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

    // Determinar função inicial pela URL
    const params = new URLSearchParams(window.location.search);
    const isSession = params.get('mode') === 'session';
    const [role, setRole] = useState(isSession ? 'client' : null); // 'client' | 'host'

    // Modais e Interface
    const [showSettings, setShowSettings] = useState(false);
    const [requestModal, setRequestModal] = useState(null);
    const [recentConnections, setRecentConnections] = useState([]);

    // ESTADO DE DEBUG
    const [debugInfo, setDebugInfo] = useState({
        dcStatus: 'closed',
        lastCmd: 'none',
        cmdCount: 0
    });

    // Refs
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const peerConnection = useRef(null);
    const dataChannelRef = useRef(null);

    // File Transfer State
    const [transferProgress, setTransferProgress] = useState(null); // { filename, progress: 0-100, type: 'send'|'receive' }

    // Toast Notification State
    const [toast, setToast] = useState(null); // { message, type: 'success'|'error'|'info' }

    const showToast = (message, type = 'info') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    // License State
    const [license, setLicense] = useState(null); // { valid: true, type: 'trial|pro', remainingHours, hwid }
    const [activationKey, setActivationKey] = useState('');
    const [showActivationModal, setShowActivationModal] = useState(false);
    const [trialTimer, setTrialTimer] = useState('Calculando...');

    useEffect(() => {
        if (window.electronAPI?.checkLicense) {
            window.electronAPI.checkLicense().then(status => {
                console.log('[LICENSE] Status:', status);
                setLicense(status);
            });
        }
    }, []);

    // Timer Countdown
    useEffect(() => {
        if (!license || license.type !== 'trial') return;

        const updateTimer = () => {
            if (license.remainingHours <= 0) return setTrialTimer('Expirado');

            // We only have hours from backend, so we estimate. 
            // Better would be to have startDate in frontend, but we used remainingHours.
            // Let's just show Hours for now to avoid complexity without strict sync.
            setTrialTimer(`${license.remainingHours} Horas Restantes`);
        };

        updateTimer();
        const interval = setInterval(updateTimer, 60000); // 1 min update
        return () => clearInterval(interval);
    }, [license]);

    const handleActivate = async () => {
        if (!activationKey) return showToast('Digite o Serial!', 'error');
        if (window.electronAPI?.activateLicense) {
            const success = await window.electronAPI.activateLicense(activationKey.trim());
            if (success) {
                showToast('Ativado com Sucesso! 🚀', 'success');
                setLicense(prev => ({ ...prev, valid: true, type: 'pro' }));
                setShowActivationModal(false);
            } else {
                showToast('Serial Inválido!', 'error');
            }
        }
    };

    // Activation Modal Component
    const ActivationModal = () => (
        <div style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            background: 'rgba(0,0,0,0.9)', zIndex: 10000,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
            <div style={{
                background: '#222', padding: '30px', borderRadius: '10px',
                textAlign: 'center', border: '1px solid #4CAF50',
                maxWidth: '400px', width: '90%'
            }}>
                <h2 style={{ color: '#4CAF50' }}>🔐 Ativar VConectY PRO</h2>
                <div style={{ margin: '20px 0', padding: '15px', background: '#111', borderRadius: '5px' }}>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#888' }}>SEU HWID:</p>
                    <h3 style={{ margin: '5px 0', color: '#fff', letterSpacing: '1px' }}>{license?.hwid || 'Carregando...'}</h3>
                </div>

                <input
                    className="modern-input"
                    placeholder="AAAA-BBBB-CCCC-DDDD"
                    value={activationKey}
                    onChange={e => setActivationKey(e.target.value)}
                    style={{ textAlign: 'center', marginBottom: '15px', width: '100%', fontSize: '1.1rem' }}
                />

                <div style={{ display: 'flex', gap: '10px' }}>
                    <button className="btn-secondary" onClick={() => setShowActivationModal(false)} style={{ flex: 1 }}>Cancelar</button>
                    <button className="btn-primary" onClick={handleActivate} style={{ flex: 1 }}>ATIVAR</button>
                </div>
            </div>
        </div>
    );

    // LOCK SCREEN (If License Expired)
    if (license?.valid === false && license.type === 'expired') {
        return (
            <div style={{
                height: '100vh', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', background: '#111', color: 'white'
            }}>
                <h1 style={{ color: 'red', fontSize: '3rem' }}>TESTES FINALIZADOS</h1>
                <p style={{ fontSize: '1.2rem', opacity: 0.8 }}>O período de avaliação de 3 dias expirou.</p>

                <div style={{ margin: '30px 0', padding: '20px', background: '#222', borderRadius: '8px', textAlign: 'center' }}>
                    <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.6 }}>SEU CÓDIGO DE HARDWARE (HWID):</p>
                    <h2 style={{ letterSpacing: '2px', color: '#4CAF50', userSelect: 'all' }}>{license.hwid}</h2>
                    <p style={{ fontSize: '0.8rem', opacity: 0.5 }}>Envie este código para ativar sua licença.</p>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                    <input
                        className="modern-input"
                        placeholder="AAAA-BBBB-CCCC-DDDD"
                        value={activationKey}
                        onChange={e => setActivationKey(e.target.value)}
                        style={{ textAlign: 'center', letterSpacing: '1px' }}
                    />
                    <button className="btn-primary" onClick={handleActivate}>ATIVAR</button>
                </div>
            </div>
        );
    }

    // Verificação Inicial de Função
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('mode') === 'session') {
            console.log('[INIT] Modo de sessão detectado, forçando função cliente');
            setRole('client');
        }
    }, []);

    // Salvar ID permanentemente
    useEffect(() => {
        localStorage.setItem('vconecty_id', myId);
        localStorage.setItem('vconecty_pwd', myPassword);
    }, [myId, myPassword]);

    // Carregar conexões recentes
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

    // --- INICIALIZAÇÃO & LÓGICA DE TENTATIVAS ---
    // (Lógica corrigida será inserida aqui)
    const [retryCount, setRetryCount] = useState(0);
    const connectionTimeoutRef = useRef(null);

    useEffect(() => {
        // Connect to socket when URL changes
        const params = new URLSearchParams(window.location.search);
        const mode = params.get('mode');
        // Only connect if retryCount is 0
        if (retryCount === 0) {
            connectSocket(serverUrl);
        }
    }, [serverUrl]);



    // Efeito de Watchdog de Tentativas
    useEffect(() => {
        if (retryCount > 0 && retryCount <= 10) {
            console.log(`[RETRY] Tentativa ${retryCount}/10...`);
            if (socket && socket.connected) {
                // Wait small delay before retry
                const timer = setTimeout(() => initiateConnection(socket), 1500);
                return () => clearTimeout(timer);
            }
        } else if (retryCount > 10) {
            setStatus('Falha após 10 tentativas. Por favor, recarregue a página.');
        }
    }, [retryCount]);

    const initiateConnection = async (s) => {
        const params = new URLSearchParams(window.location.search);
        const target = params.get('target');
        const mode = params.get('mode');

        if (mode !== 'session' || !target) return;

        console.log('[SESSION] Iniciando fluxo de conexão para:', target);
        const pwd = params.get('password') || '';
        const passwordHash = pwd ? await sha256(pwd) : '';

        // Feedback visual
        setStatus(`Chamando ${target}...`); // Removido contador agressivo visualmente

        // Watchdog de Conexão: Aumentado para 10s e tentativas mais suaves
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = setTimeout(() => {
            // Se ainda não estiver conectado
            if (!peerConnection.current || peerConnection.current.connectionState !== 'connected') {
                console.warn('[WATCHDOG] Conexão demorou > 10s. Tentando reconectar...');
                setRetryCount(prev => prev + 1);
            }
        }, 10000); // 10 segundos timeout

        s.emit('client-connect', {
            targetId: target.replace(/\s/g, ''),
            from: myId.replace(/\s/g, ''),
            password: passwordHash // Envia hash para verificação
        });
        console.log('[SESSION] Pedido enviado com hash de senha:', passwordHash ? '(presente)' : '(vazio)');
    };

    const connectSocket = (url) => {
        if (socket) socket.disconnect();
        setStatus(`Conectando ao servidor...`);

        const cleanUrl = url.replace(/\/$/, "");
        const s = io(cleanUrl, {
            reconnectionAttempts: 20,
            autoConnect: true,
            transports: ['websocket', 'polling']
        });

        s.on('connect', async () => {
            setStatus('Online 🟢');
            s.emit('join-host', myId.replace(/\s/g, ''));
            console.log('[SOCKET] Connected, id:', myId);

            // Initial attempt
            // If it's the first time (retryCount === 0), initiate connection
            // Subsequent retries are handled by the useEffect watchdog
            if (retryCount === 0) {
                setTimeout(() => initiateConnection(s), 500);
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
        // SECURITY: Mobile/Web cannot act as HOST (Receive connections)
        if (!window.electronAPI) {
            console.warn('[AUTH] Ignorando pedido de conexão (Este dispositivo é apenas Cliente)');
            return;
        }

        const { from, password } = data;
        console.log('[AUTH] ==== Pedido de conexão recebido ===');
        console.log('[AUTH] From:', from);
        console.log('[AUTH] Password recebida:', password);
        console.log('[AUTH] Minha senha configurada:', myAccessPassword);

        // Verificar senha se configurada
        if (myAccessPassword) {
            console.log('[AUTH] Senha configurada! Validando...');
            const expectedHash = await sha256(myAccessPassword);
            console.log('[AUTH] Hash Esperado:', expectedHash);
            console.log('[AUTH] Hash Recebido:', password);

            // Comparação direta de strings
            if (password !== expectedHash) {
                console.log('[AUTH] ❌ SENHA INCORRETA! Rejeitando conexão.');
                // Opcional: Avisar o cliente que a senha falhou
                s.emit('connect-error', { target: from, message: "Senha Incorreta" });
                return;
            }
            console.log('[AUTH] ✅ Senha correta! Aceitando automaticamente.');
            setRole('host');
            setStatus('Conexão autenticada! Iniciando...');
            await startHostSession(from, s);
            return;
        } else {
            console.log('[AUTH] Nenhuma senha configurada, solicitando permissão.');
        }

        // Show Modal only if manual approval needed
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
        if (!targetId) {
            showToast("Digite o ID do Parceiro!", 'error');
            return;
        }
        const targetClean = targetId.replace(/\s/g, '');

        // Add to recent connections
        addToRecents(targetClean);

        // Open separate window for session
        // Open separate window for session (Desktop)
        if (window.electronAPI && window.electronAPI.createSessionWindow) {
            window.electronAPI.createSessionWindow(targetClean, targetPassword);
        } else {
            // Mobile / Web: Navigate in same window
            const url = new URL(window.location.href);
            url.searchParams.set('mode', 'session');
            url.searchParams.set('target', targetClean);
            if (targetPassword) url.searchParams.set('password', targetPassword);
            window.location.href = url.toString();
        }
    };

    const startHostSession = async (targetId, currentSocket) => {
        console.log('[HOST] Starting host session for target:', targetId);

        // Clean up existing peer connection if any
        if (peerConnection.current) {
            console.log('[HOST] Closing existing peer connection');
            peerConnection.current.close();
            peerConnection.current = null;
        }

        const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
        peerConnection.current = pc;

        pc.onicecandidate = e => e.candidate && currentSocket.emit('ice-candidate', { target: targetId, candidate: e.candidate });

        try {
            console.log('[HOST] Getting screen sources...');

            // SECURITY CHECK: Android cannot be HOST yet (needs MediaProjection plugin)
            if (!window.electronAPI || !window.electronAPI.getSources) {
                console.error('[HOST] CRITICAL: Cannot capture screen without Electron API!');
                alert("Erro: Este dispositivo (Android/Web) não pode transmitir a tela, apenas controlar.");
                currentSocket.emit('connect-error', { target: targetId, message: "Host incompatível (Android)" });
                return;
            }

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

            const dc = pc.createDataChannel("input");
            dataChannelRef.current = dc;

            dc.onopen = () => console.log('[HOST] DataChannel "input" OPEN');
            dc.onmessage = async (e) => {
                if (!window.electronAPI?.robotControl) {
                    console.error('[HOST] electronAPI.robotControl NOT AVAILABLE!');
                    return;
                }
                try {
                    const cmd = JSON.parse(e.data);

                    // Clipboard Set (Client -> Host)
                    if (cmd.type === 'clipboard-set') {
                        console.log('[CLIPBOARD] Writing to host clipboard');
                        window.electronAPI.writeClipboard(cmd.text);
                        showToast('📋 Clipboard do Host atualizado!', 'success');
                        return;
                    }

                    // File Transfer Slicing (Client -> Host)
                    if (cmd.type === 'file-start') {
                        console.log(`[FILE] Starting receive: ${cmd.filename}`);
                        if (window.electronAPI?.fileStart) {
                            const res = await window.electronAPI.fileStart(cmd.filename, cmd.size);
                            if (res.success) {
                                window.currentFileId = res.fileId;
                                window.fileTransferMeta = {
                                    totalChunks: cmd.totalChunks,
                                    currentChunk: 0,
                                    filename: cmd.filename
                                };
                                setTransferProgress({ filename: cmd.filename, progress: 0, type: 'receive' });
                            }
                        }
                        return;
                    }
                    if (cmd.type === 'file-chunk') {
                        if (window.currentFileId && window.electronAPI?.fileChunk) {
                            await window.electronAPI.fileChunk(window.currentFileId, cmd.chunkBase64);

                            // Update Progress
                            if (window.fileTransferMeta) {
                                window.fileTransferMeta.currentChunk++;
                                const percent = Math.min(100, Math.round((window.fileTransferMeta.currentChunk / window.fileTransferMeta.totalChunks) * 100));
                                setTransferProgress(prev => prev ? ({ ...prev, progress: percent }) : null);
                            }
                        }
                        return;
                    }
                    if (cmd.type === 'file-end') {
                        console.log(`[FILE] File receive completed.`);
                        if (window.currentFileId && window.electronAPI?.fileClose) {
                            await window.electronAPI.fileClose(window.currentFileId);
                            window.currentFileId = null;
                            window.fileTransferMeta = null;
                            setTransferProgress(null);
                            showToast('Arquivo recebido com sucesso!', 'success');
                        }
                        return;
                    }

                    // Legacy single-shot file transfer (Backward compatibility?)
                    // Keep or remove? Removing to enforce chunking.

                    console.log('[HOST] ✅ DataChannel CMD:', cmd.type, cmd);
                    window.electronAPI.robotControl(cmd);
                } catch (err) {
                    console.error('[HOST] Invalid robot command:', err);
                }
            };

            // Start Clipboard Polling (Host -> Client)
            let lastClipboard = '';
            const clipboardInterval = setInterval(async () => {
                try {
                    const text = await window.electronAPI.readClipboard();
                    if (text && text !== lastClipboard) {
                        lastClipboard = text;
                        console.log('[CLIPBOARD] Syncing to client...');
                        if (dc.readyState === 'open') {
                            dc.send(JSON.stringify({ type: 'clipboard-update', text }));
                        }
                    }
                } catch (e) {
                    // Ignore errors (e.g. if minimized or API not ready)
                }
            }, 1000);

            // Clean up interval on close
            dc.onclose = () => clearInterval(clipboardInterval);

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

    const iceCandidatesBuffer = useRef([]);

    const handleWebRTC = async (data, type, s) => {
        const pc = peerConnection.current;

        if (type === 'offer') {
            // Ignore duplicate offers if already negotiating
            if (pc && pc.signalingState !== 'stable') {
                console.log('[CLIENT] Ignoring duplicate offer, already negotiating');
                return;
            }

            console.log('[CLIENT] Received offer from:', data.from);
            setRole('client');

            // Clean up old PC
            if (peerConnection.current) {
                peerConnection.current.close();
            }

            const newPc = new RTCPeerConnection({
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' },
                    { urls: 'stun:stun2.l.google.com:19302' }
                ]
            });
            peerConnection.current = newPc;

            newPc.onicecandidate = e => {
                if (e.candidate) {
                    s.emit('ice-candidate', { target: data.from, candidate: e.candidate });
                }
            };

            newPc.ontrack = e => {
                console.log('[CLIENT] Received track:', e.track.kind);
                if (remoteVideoRef.current) {
                    remoteVideoRef.current.srcObject = e.streams[0];
                    remoteVideoRef.current.play().catch(console.error);
                }
            };

            // Connection state monitoring - Reset retry count on success
            newPc.onconnectionstatechange = () => {
                console.log('[WEBRTC] Connection State:', newPc.connectionState);
                if (newPc.connectionState === 'connected') {
                    setStatus('Conectado! 🚀');
                    // Connection successful, stop watchdog
                    if (connectionTimeoutRef.current) clearTimeout(connectionTimeoutRef.current);
                    setRetryCount(0);
                } else if (newPc.connectionState === 'failed' || newPc.connectionState === 'disconnected') {
                    setStatus('Conexão instável ou perdida...');
                }
            };

            // Setup DataChannel listener for CLIENT
            newPc.ondatachannel = (e) => {
                console.log('[CLIENT] DataChannel received:', e.channel.label);
                const dc = e.channel;
                dataChannelRef.current = dc;
                dc.onopen = () => {
                    console.log('[CLIENT] ✅ DataChannel OPEN');
                    setDebugInfo(prev => ({ ...prev, dcStatus: 'open' }));
                };
                dc.onclose = () => {
                    console.log('[CLIENT] ❌ DataChannel CLOSED');
                    setDebugInfo(prev => ({ ...prev, dcStatus: 'closed' }));
                };
                dc.onmessage = (msg) => {
                    try {
                        const data = JSON.parse(msg.data);
                        if (data.type === 'clipboard-update') {
                            console.log('[CLIPBOARD] Received update from host');
                            navigator.clipboard.writeText(data.text)
                                .then(() => showToast('📋 Copiado do PC!', 'success'))
                                .catch(err => console.error('Clipboard write failed', err));
                        }
                    } catch (e) { }
                    console.log('[CLIENT] DC Msg:', msg.data);
                };
            };

            // DEFINIR DESCRIÇÃO REMOTA !IMPORTANTE
            console.log('[CLIENT] Setting remote description...');
            await newPc.setRemoteDescription(new RTCSessionDescription(data.sdp));

            // Process buffered candidates
            while (iceCandidatesBuffer.current.length > 0) {
                const candidate = iceCandidatesBuffer.current.shift();
                console.log('[ICE] Adding buffered candidate');
                await newPc.addIceCandidate(candidate);
            }

            const answer = await newPc.createAnswer();
            await newPc.setLocalDescription(answer);
            s.emit('answer', { target: data.from, sdp: answer, from: myId.replace(/\s/g, '') });
            setStatus("Conectado! 💻");

        } else if (type === 'answer') {
            if (!pc) return;
            console.log('[HOST] Received answer');
            await pc.setRemoteDescription(data.sdp);

            // Process buffered candidates
            while (iceCandidatesBuffer.current.length > 0) {
                const candidate = iceCandidatesBuffer.current.shift();
                await pc.addIceCandidate(candidate);
            }

            setStatus("Transmitindo 📡");

        } else if (type === 'ice') {
            const candidate = new RTCIceCandidate(data.candidate);
            if (pc && pc.remoteDescription && pc.remoteDescription.type) {
                console.log('[ICE] Adding candidate immediately');
                await pc.addIceCandidate(candidate);
            } else {
                console.log('[ICE] Buffering candidate (no remote description yet)');
                iceCandidatesBuffer.current.push(candidate);
            }
        }
    };

    // --- RENDER ---
    return (
        <div className="app-wrapper">
            {/* FULLSCREEN SESSION MODE */}
            {role === 'client' && (
                <FullScreenSession
                    videoRef={remoteVideoRef}
                    dataChannelRef={dataChannelRef}
                    setDebugInfo={setDebugInfo}
                    status={status}
                    onReconnect={() => {
                        console.log('[SESSION] Reconectando...');
                        window.location.reload();
                    }}
                    onDisconnect={() => {
                        // Se estiver no Electron, fecha a janela
                        if (window.location.search.includes('mode=session') && window.electronAPI) {
                            window.electronAPI.close();
                        } else {
                            // Se estiver no browser, volta para a home limpando os parametros
                            window.location.href = '/';
                        }
                    }}
                />
            )}

            {/* File Transfer Controls (Client Only) */}
            {role === 'client' && debugInfo.dcStatus === 'open' && (
                <div style={{
                    position: 'fixed', bottom: 10, left: 10, zIndex: 6000,
                    display: 'flex', gap: '10px'
                }}>
                    <input
                        type="file"
                        id="file-upload"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                            const file = e.target.files[0];
                            if (file && dataChannelRef.current) {
                                const CHUNK_SIZE = 16 * 1024; // 16KB chunks
                                const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

                                const reader = new FileReader();
                                let offset = 0;
                                let chunkIndex = 0;

                                // Send Metadata
                                // 1. Send File Start Metadata
                                dataChannelRef.current.send(JSON.stringify({
                                    type: 'file-start',
                                    filename: file.name,
                                    size: file.size,
                                    totalChunks
                                }));

                                setTransferProgress({ filename: file.name, progress: 0, type: 'send' });
                                showToast(`Enviando ${file.name}...`, 'info');

                                const readNextChunk = () => {
                                    const slice = file.slice(offset, offset + CHUNK_SIZE);
                                    reader.readAsArrayBuffer(slice);
                                };

                                reader.onload = (evt) => {
                                    if (dataChannelRef.current?.readyState !== 'open') {
                                        setTransferProgress(null);
                                        return;
                                    }

                                    const arrayBuffer = evt.target.result;
                                    const base64 = btoa(
                                        new Uint8Array(arrayBuffer)
                                            .reduce((data, byte) => data + String.fromCharCode(byte), '')
                                    );

                                    // 2. Send Chunk
                                    dataChannelRef.current.send(JSON.stringify({
                                        type: 'file-chunk',
                                        chunkBase64: base64,
                                        chunkIndex
                                    }));

                                    offset += CHUNK_SIZE;
                                    chunkIndex++;

                                    // Update Progress
                                    const percent = Math.min(100, Math.round((offset / file.size) * 100));
                                    setTransferProgress(prev => prev ? ({ ...prev, progress: percent }) : null);

                                    if (offset < file.size) {
                                        // Send next chunk immediately (or use setTimeout(0) to yield)
                                        setTimeout(readNextChunk, 2);
                                    } else {
                                        // 3. Send File End
                                        dataChannelRef.current.send(JSON.stringify({
                                            type: 'file-end',
                                            totalChunks // Verification
                                        }));
                                        setTransferProgress(null);
                                        showToast('Envio concluído!', 'success');
                                    }
                                };

                                readNextChunk();
                            }
                        }}
                    />
                    <button
                        onClick={() => document.getElementById('file-upload').click()}
                        style={{
                            background: '#2196F3', color: 'white', border: 'none',
                            padding: '8px 16px', borderRadius: '4px', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '5px'
                        }}
                    >
                        📂 Enviar Arquivo
                    </button>
                </div>
            )}

            {/* PROGRESS BAR OVERLAY */}
            {transferProgress && (
                <div style={{
                    position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                    background: 'rgba(0,0,0,0.9)', padding: '20px', borderRadius: '8px',
                    color: 'white', zIndex: 9000, textAlign: 'center', minWidth: '300px',
                    boxShadow: '0 0 20px rgba(0,0,0,0.5)', border: '1px solid #333'
                }}>
                    <h3 style={{ margin: '0 0 10px 0', fontSize: '18px' }}>
                        {transferProgress.type === 'send' ? '📤 Enviando' : '📥 Recebendo'} Arquivo...
                    </h3>
                    <p style={{ margin: '0 0 15px 0', fontSize: '14px', opacity: 0.8 }}>{transferProgress.filename}</p>
                    <div style={{ width: '100%', height: '10px', background: '#333', borderRadius: '5px', overflow: 'hidden' }}>
                        <div style={{
                            width: `${transferProgress.progress}%`, height: '100%',
                            background: '#4CAF50', transition: 'width 0.2s ease-in-out'
                        }} />
                    </div>
                    <p style={{ margin: '10px 0 0 0', fontWeight: 'bold' }}>{transferProgress.progress}%</p>
                </div>
            )}

            {/* TOAST NOTIFICATION */}
            {toast && (
                <div style={{
                    position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
                    background: toast.type === 'error' ? '#f44336' : (toast.type === 'success' ? '#4CAF50' : '#2196F3'),
                    color: 'white', padding: '12px 24px', borderRadius: '4px',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.2)', zIndex: 10000,
                    display: 'flex', alignItems: 'center', gap: '10px',
                    minWidth: '200px', justifyContent: 'center'
                }}>
                    <span style={{ fontSize: '1.2em' }}>{toast.type === 'success' ? '✅' : (toast.type === 'error' ? '❌' : 'ℹ️')}</span>
                    <span style={{ fontWeight: 500 }}>{toast.message}</span>
                </div>
            )}


            {/* HEADER - Only show if NOT in session mode (native frame used there) */}
            {!window.location.search.includes('mode=session') && window.electronAPI && (
                <TitleBar minimize={() => window.electronAPI.minimize()} close={() => window.electronAPI.close()} />
            )}

            {/* SETTINGS MODAL REMOVED FOR PRODUCTION */}
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

            {/* SETTINGS MODAL REMOVED FOR PRODUCTION */}

            {/* MAIN APP CONTAINER - Only show if NOT in session role */}
            {role !== 'client' && (
                <div className="app-container">
                    <div style={{ textAlign: 'center', marginBottom: 20, position: 'relative' }}>
                        <h1 style={{ fontSize: '1.8rem', margin: 0 }}>VConectY <span style={{ color: '#4CAF50' }}>Global</span></h1>
                        <small>{status}</small>

                        {/* TRIAL STATUS BAR */}
                        {license?.type === 'trial' && (
                            <div style={{
                                marginTop: '10px',
                                background: '#333', padding: '8px', borderRadius: '5px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px',
                                border: '1px solid #555'
                            }}>
                                <span style={{ color: 'orange', fontWeight: 'bold' }}>⏳ DESCONTAGEM: {trialTimer}</span>
                                <button
                                    onClick={() => setShowActivationModal(true)}
                                    style={{
                                        background: '#4CAF50', color: 'white', border: 'none',
                                        padding: '4px 10px', borderRadius: '3px', cursor: 'pointer',
                                        fontWeight: 'bold', fontSize: '0.8rem'
                                    }}
                                >
                                    🔑 ATIVAR AGORA
                                </button>
                            </div>
                        )}

                        {license?.type === 'pro' && (
                            <div style={{
                                position: 'absolute', top: 0, right: 0,
                                color: '#4CAF50', fontSize: '10px', fontWeight: 'bold',
                                border: '1px solid #4CAF50', padding: '2px 6px', borderRadius: '4px'
                            }}>
                                PRO 💎
                            </div>
                        )}
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
            )}

            {/* CREDITS FOOTER */}
            <div style={{
                position: 'fixed',
                bottom: 10,
                right: 15,
                color: 'rgba(255,255,255,0.3)',
                fontSize: '12px',
                fontFamily: 'monospace',
                pointerEvents: 'none',
                userSelect: 'none',
                textShadow: '0px 1px 2px rgba(0,0,0,0.5)'
            }}>
                Dev Vagner Oliveira ~ FlasH
            </div>

            {/* DEBUG OVERLAY (Client Only) */}
            {role === 'client' && (
                <div style={{
                    position: 'fixed',
                    top: 10,
                    right: 140, // Avoid overlap with D-pad if any
                    background: 'rgba(0,0,0,0.8)',
                    color: '#0f0',
                    padding: '10px',
                    borderRadius: '5px',
                    fontFamily: 'monospace',
                    fontSize: '11px',
                    border: `2px solid ${debugInfo.dcStatus === 'open' ? '#0f0' : '#f00'}`,
                    zIndex: 9999
                }}>
                    <div>DC: <strong>{debugInfo.dcStatus.toUpperCase()}</strong></div>
                    <div>Cmd: {debugInfo.lastCmd} ({debugInfo.cmdCount})</div>
                    <button onClick={() => {
                        if (dataChannelRef.current?.readyState === 'open') {
                            dataChannelRef.current.send(JSON.stringify({ type: 'mouse-move', x: 0.5, y: 0.5 }));
                            alert('Comando de teste enviado! Mouse deveria ir para o centro.');
                        } else {
                            alert('DataChannel NÃO ESTÁ ABERTO! Conexão falhou.');
                        }
                    }} style={{
                        marginTop: '5px',
                        padding: '3px 6px',
                        fontSize: '10px',
                        cursor: 'pointer'
                    }}>
                        🎯 Test Mouse
                    </button>
                </div>
            )}

            {/* TEST CONTROLS PANEL (Client Only) */}
            {role === 'client' && debugInfo.dcStatus === 'open' && (
                <div style={{
                    position: 'fixed',
                    bottom: 60,
                    left: 10,
                    background: 'rgba(20,20,40,0.95)',
                    color: '#fff',
                    padding: '15px',
                    borderRadius: '8px',
                    border: '2px solid #4a9eff',
                    zIndex: 9998,
                    minWidth: '200px'
                }}>
                    <div style={{ marginBottom: '10px', fontWeight: 'bold', fontSize: '14px' }}>
                        🎮 Controles de Teste
                    </div>

                    <button onClick={() => {
                        dataChannelRef.current.send(JSON.stringify({ type: 'mouse-move', x: 0.1, y: 0.1 }));
                    }} style={{
                        width: '100%',
                        padding: '8px',
                        marginBottom: '5px',
                        background: '#4a9eff',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                    }}>
                        ↖️ Mouse para Canto Superior
                    </button>

                    <button onClick={() => {
                        dataChannelRef.current.send(JSON.stringify({ type: 'mouse-move', x: 0.5, y: 0.5 }));
                    }} style={{
                        width: '100%',
                        padding: '8px',
                        marginBottom: '5px',
                        background: '#4a9eff',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                    }}>
                        🎯 Mouse para Centro
                    </button>

                    <button onClick={() => {
                        dataChannelRef.current.send(JSON.stringify({ type: 'mouse-down', button: 'left' }));
                        setTimeout(() => {
                            dataChannelRef.current.send(JSON.stringify({ type: 'mouse-up', button: 'left' }));
                        }, 100);
                    }} style={{
                        width: '100%',
                        padding: '8px',
                        marginBottom: '5px',
                        background: '#ff9800',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                    }}>
                        🖱️ Click Esquerdo
                    </button>

                    <button onClick={() => {
                        dataChannelRef.current.send(JSON.stringify({ type: 'key-press', key: 'a' }));
                    }} style={{
                        width: '100%',
                        padding: '8px',
                        background: '#8bc34a',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                    }}>
                        ⌨️ Tecla "A"
                    </button>
                </div>
            )}
        </div>
    );
}

export default App;
