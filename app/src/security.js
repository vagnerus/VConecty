// Utilitários de Criptografia para o VCONECTY
// Implementa geração de chaves RSA-2048 e conversão para formato transportável (SPKI)

export const generateKeyPair = async () => {
    try {
        const keyPair = await window.crypto.subtle.generateKey(
            {
                name: "RSASSA-PKCS1-v1_5",
                modulusLength: 2048,
                publicExponent: new Uint8Array([1, 0, 1]),
                hash: "SHA-256",
            },
            true,
            ["sign", "verify"]
        );
        return keyPair;
    } catch (e) {
        console.error("Erro ao gerar chaves RSA:", e);
        return null;
    }
};

export const exportPublicKey = async (key) => {
    const exported = await window.crypto.subtle.exportKey(
        "spki",
        key
    );
    const exportedAsBase64 = window.btoa(
        String.fromCharCode(...new Uint8Array(exported))
    );
    return `-----BEGIN PUBLIC KEY-----\n${exportedAsBase64}\n-----END PUBLIC KEY-----`;
};

// Gera um "fingerprint" visual da chave para comparação humana (ex: "A1:B2:C3...")
export const getFingerprint = async (publicKeyString) => {
    if (!publicKeyString) return "Desconhecido";

    // Remove cabeçalhos
    const raw = publicKeyString
        .replace("-----BEGIN PUBLIC KEY-----", "")
        .replace("-----END PUBLIC KEY-----", "")
        .replace(/\n/g, "");

    // Hash SHA-256 simples da string (apenas para identificação visual)
    const msgBuffer = new TextEncoder().encode(raw);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join(':');
    return hashHex.slice(0, 23).toUpperCase(); // Retorna os primeiros bytes como fingerprint
};
