/**
 * VConectY - Kill Switch Routes
 * Sistema de bloqueio remoto de versões problemáticas
 */

const express = require('express');
const router = express.Router();

// Versões bloqueadas (banco de dados em produção)
const blacklistedVersions = [
    {
        version: '1.0.3',
        reason: 'Bug crítico de corrupção de dados',
        blockedAt: '2026-02-10T12:00:00Z',
        rollbackTo: '1.0.2'
    }
];

// Verificar se versão está bloqueada
router.get('/check/:version', (req, res) => {
    const { version } = req.params;

    const blocked = blacklistedVersions.find(b => b.version === version);

    if (blocked) {
        console.log(`[KILLSWITCH] ⚠️ Versão bloqueada solicitada: ${version}`);

        return res.json({
            blocked: true,
            version: blocked.version,
            reason: blocked.reason,
            rollbackTo: blocked.rollbackTo,
            message: `A versão ${version} contém problemas graves e não deve ser instalada.`
        });
    }

    res.json({
        blocked: false,
        version,
        message: 'Versão segura para instalação'
    });
});

// Obter lista de versões bloqueadas
router.get('/list', (req, res) => {
    res.json({
        count: blacklistedVersions.length,
        versions: blacklistedVersions
    });
});

// Bloquear nova versão (rota administrativa)
router.post('/block', (req, res) => {
    const { version, reason, rollbackTo } = req.body;

    // Validação simples
    if (!version || !reason) {
        return res.status(400).json({ error: 'Version e reason são obrigatórios' });
    }

    // Verificar se já está bloqueada
    const existing = blacklistedVersions.find(b => b.version === version);
    if (existing) {
        return res.status(409).json({ error: 'Versão já está bloqueada' });
    }

    blacklistedVersions.push({
        version,
        reason,
        rollbackTo: rollbackTo || null,
        blockedAt: new Date().toISOString()
    });

    console.log(`[KILLSWITCH] ❌ Nova versão bloqueada: ${version}`);

    res.json({
        success: true,
        message: `Versão ${version} foi bloqueada`,
        data: blacklistedVersions[blacklistedVersions.length - 1]
    });
});

// Desbloquear versão
router.delete('/unblock/:version', (req, res) => {
    const { version } = req.params;

    const index = blacklistedVersions.findIndex(b => b.version === version);

    if (index === -1) {
        return res.status(404).json({ error: 'Versão não está bloqueada' });
    }

    const removed = blacklistedVersions.splice(index, 1)[0];

    console.log(`[KILLSWITCH] ✅ Versão desbloqueada: ${version}`);

    res.json({
        success: true,
        message: `Versão ${version} foi desbloqueada`,
        data: removed
    });
});

module.exports = router;
