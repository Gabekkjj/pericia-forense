const express = require('express');
const path = require('path');
const { conectarDB, salvarDB } = require('./database');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

function validarAmostraBiologica(dna) {
    const padraoForense = /^[ATCG]{8}$/i; 
    if (!padraoForense.test(dna)) {
        throw new Error("O DNA deve ter EXATAMENTE 8 nucleotideos (A, T, C, G).");
    }
    return true;
}

function calcularCompatibilidade(dnaSuspeito, dnaEvidencia) {
    validarAmostraBiologica(dnaSuspeito);
    validarAmostraBiologica(dnaEvidencia);
    return dnaSuspeito.toUpperCase() === dnaEvidencia.toUpperCase();
}

app.get('/api/dados', async (req, res) => {
    const db = await conectarDB();
    res.status(200).json(db);
});

app.post('/casos', async (req, res) => {
    try {
        const { titulo } = req.body;
        if (!titulo) throw new Error("Titulo do caso e obrigatorio.");
        const db = await conectarDB();
        const novoCaso = { id: db.proxCasoId++, titulo, status: "Aberto" };
        db.casos.push(novoCaso);
        await salvarDB(db);
        return res.status(201).json(novoCaso);
    } catch (erro) {
        return res.status(400).json({ erro: erro.message });
    }
});

app.delete('/casos/:id', async (req, res) => {
    const db = await conectarDB();
    const id = parseInt(req.params.id);
    const index = db.casos.findIndex(c => c.id === id);
    if (index === -1) return res.status(404).json({ erro: "Caso nao encontrado" });
    
    db.casos.splice(index, 1);
    db.suspeitos = db.suspeitos.filter(s => s.casoId !== id);
    db.evidencias = db.evidencias.filter(e => e.casoId !== id);
    
    await salvarDB(db);
    return res.status(204).send();
});

app.post('/suspeitos', async (req, res) => {
    try {
        const { nome, dnaCadastrado, casoId } = req.body;
        if (!casoId) throw new Error("O suspeito deve estar vinculado a um caso.");
        validarAmostraBiologica(dnaCadastrado);
        
        const db = await conectarDB();
        const novoSuspeito = { id: db.proxSuspeitoId++, casoId: parseInt(casoId), nome, status: "Investigado", dnaCadastrado: dnaCadastrado.toUpperCase() };
        db.suspeitos.push(novoSuspeito);
        await salvarDB(db);
        return res.status(201).json(novoSuspeito);
    } catch (erro) {
        return res.status(400).json({ erro: erro.message });
    }
});

app.post('/evidencias', async (req, res) => {
    try {
        const { tipo, dnaColetado, casoId } = req.body;
        if (!casoId) throw new Error("A evidencia deve estar vinculada a um caso.");
        validarAmostraBiologica(dnaColetado);

        const db = await conectarDB();
        const novaEvidencia = { id: db.proxEvidenciaId++, casoId: parseInt(casoId), tipo, dnaColetado: dnaColetado.toUpperCase(), analisada: false };
        db.evidencias.push(novaEvidencia);
        await salvarDB(db);
        return res.status(201).json(novaEvidencia);
    } catch (erro) {
        return res.status(400).json({ erro: erro.message });
    }
});

app.delete('/suspeitos/:id', async (req, res) => {
    const db = await conectarDB();
    const index = db.suspeitos.findIndex(s => s.id === parseInt(req.params.id));
    if (index === -1) return res.status(404).json({ erro: "Suspeito nao encontrado" });
    db.suspeitos.splice(index, 1);
    await salvarDB(db);
    return res.status(204).send();
});

app.delete('/evidencias/:id', async (req, res) => {
    const db = await conectarDB();
    const index = db.evidencias.findIndex(e => e.id === parseInt(req.params.id));
    if (index === -1) return res.status(404).json({ erro: "Evidencia nao encontrada" });
    db.evidencias.splice(index, 1);
    await salvarDB(db);
    return res.status(204).send();
});

app.post('/pericia/analisar', async (req, res) => {
    try {
        const { suspeitoId, evidenciaId } = req.body;
        const db = await conectarDB();
        const suspeito = db.suspeitos.find(s => s.id === suspeitoId);
        const evidencia = db.evidencias.find(e => e.id === evidenciaId);

        if (!suspeito || !evidencia) throw new Error("Registros nao localizados.");
        if (evidencia.analisada) throw new Error("Evidencia ja processada.");

        const compatibilidade = calcularCompatibilidade(suspeito.dnaCadastrado, evidencia.dnaColetado);
        
        if (compatibilidade) {
            suspeito.status = "Indiciado";
            const caso = db.casos.find(c => c.id === suspeito.casoId);
            if(caso) caso.status = "Fechado";
        }
        
        evidencia.analisada = true;
        await salvarDB(db);

        return res.status(200).json({ resultado: compatibilidade ? "POSITIVO" : "NEGATIVO" });
    } catch (erro) {
        return res.status(400).json({ erro: erro.message });
    }
});

app.post('/pericia/analisar-lote', async (req, res) => {
    try {
        const { casoId } = req.body;
        if (!casoId) throw new Error("ID do caso é obrigatório.");
        
        const db = await conectarDB();
        
        const suspeitosCaso = db.suspeitos.filter(s => s.casoId === parseInt(casoId));
        const evidenciasCaso = db.evidencias.filter(e => e.casoId === parseInt(casoId) && !e.analisada);
        
        let matches = 0;

        evidenciasCaso.forEach(evidencia => {
            suspeitosCaso.forEach(suspeito => {
                if(calcularCompatibilidade(suspeito.dnaCadastrado, evidencia.dnaColetado)) {
                    suspeito.status = "Indiciado";
                    matches++;
                }
            });
            evidencia.analisada = true;
        });

        if (matches > 0) {
            const caso = db.casos.find(c => c.id === parseInt(casoId));
            if(caso) caso.status = "Fechado";
        }

        await salvarDB(db);
        return res.status(200).json({ mensagem: `Lote processado. ${matches} cruzamentos positivos encontrados.` });
    } catch (erro) {
        return res.status(400).json({ erro: erro.message });
    }
});

module.exports = { app, calcularCompatibilidade, validarAmostraBiologica };