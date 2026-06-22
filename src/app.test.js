process.env.NODE_ENV = 'test';
const request = require('supertest');
const fs = require('fs').promises;
const path = require('path');
const { app, calcularCompatibilidade, validarAmostraBiologica } = require('./app');
const { resetarDBTestes } = require('./database');

beforeAll(async () => {
    await resetarDBTestes();
});

describe('Testes de Unidade (Motor Forense)', () => {
    it('Deve validar nucleotideos corretos com 8 caracteres', () => {
        expect(() => validarAmostraBiologica("ATCGATCG")).not.toThrow();
    });

    it('Deve rejeitar strings com menos ou mais de 8 caracteres', () => {
        expect(() => validarAmostraBiologica("ATCG")).toThrow("EXATAMENTE 8 nucleotideos");
    });
});

describe('Testes de Integracao e Tratamento de Erros', () => {
    let casoId;

    it('Deve simular erro de leitura e recriar o banco de dados', async () => {
        const dbPath = path.join(__dirname, 'db.test.json');
        await fs.unlink(dbPath).catch(() => {}); 
        const res = await request(app).get('/api/dados');
        expect(res.statusCode).toBe(200);
    });

    it('Deve barrar cadastros incompletos (Erros 400)', async () => {
        expect((await request(app).post('/casos').send({})).statusCode).toBe(400);
        expect((await request(app).post('/suspeitos').send({})).statusCode).toBe(400);
        expect((await request(app).post('/evidencias').send({})).statusCode).toBe(400);
        expect((await request(app).post('/pericia/analisar-lote').send({})).statusCode).toBe(400); 
    });

    it('Deve criar registros iniciais com sucesso', async () => {
        const resCaso = await request(app).post('/casos').send({ titulo: "Caso Cobertura" });
        casoId = resCaso.body.id;
        await request(app).post('/suspeitos').send({ nome: "Hacker", dnaCadastrado: "AAAAAAAA", casoId });
        await request(app).post('/evidencias').send({ tipo: "Digital", dnaColetado: "AAAAAAAA", casoId });
    });

    it('Deve deletar suspeito e evidencia INDIVIDUALMENTE com sucesso (204)', async () => {
        const resS = await request(app).post('/suspeitos').send({ nome: "Deletado", dnaCadastrado: "AAAAAAAA", casoId });
        const resE = await request(app).post('/evidencias').send({ tipo: "Fio", dnaColetado: "AAAAAAAA", casoId });
        
        expect((await request(app).delete(`/suspeitos/${resS.body.id}`)).statusCode).toBe(204);
        expect((await request(app).delete(`/evidencias/${resE.body.id}`)).statusCode).toBe(204);
    });

    it('Deve excluir caso e testar exclusoes em cascata e erros', async () => {
        expect((await request(app).delete(`/casos/${casoId}`)).statusCode).toBe(204);
        expect((await request(app).delete('/casos/999')).statusCode).toBe(404);
        expect((await request(app).delete('/suspeitos/999')).statusCode).toBe(404);
        expect((await request(app).delete('/evidencias/999')).statusCode).toBe(404);
    });
});

describe('Testes de Sistema: Cruzamento e Fechamento', () => {
    let idCaso, idS, idE;

    beforeAll(async () => {
        const c = await request(app).post('/casos').send({ titulo: "Caso Final" });
        idCaso = c.body.id;
        const s = await request(app).post('/suspeitos').send({ nome: "Culpado", dnaCadastrado: "CCCCCCCC", casoId: idCaso });
        idS = s.body.id;
        const e = await request(app).post('/evidencias').send({ tipo: "Arma", dnaColetado: "CCCCCCCC", casoId: idCaso });
        idE = e.body.id;
    });

    it('Deve analisar individualmente, fechar o caso e barrar re-analise', async () => {
        const res = await request(app).post('/pericia/analisar').send({ suspeitoId: idS, evidenciaId: idE });
        expect(res.statusCode).toBe(200);
        
        const dbCheck = await request(app).get('/api/dados');
        const casoFechado = dbCheck.body.casos.find(c => c.id === idCaso);
        expect(casoFechado.status).toBe("Fechado");

        expect((await request(app).post('/pericia/analisar').send({ suspeitoId: idS, evidenciaId: idE })).statusCode).toBe(400);
        expect((await request(app).post('/pericia/analisar').send({ suspeitoId: 999, evidenciaId: 999 })).statusCode).toBe(400);
    });

    it('Deve varrer em lote COM MATCH POSITIVO para cobrir a contagem', async () => {
        await request(app).post('/evidencias').send({ tipo: "Luva", dnaColetado: "CCCCCCCC", casoId: idCaso });
        const resLote = await request(app).post('/pericia/analisar-lote').send({ casoId: idCaso });
        
        expect(resLote.statusCode).toBe(200);
        expect(resLote.body.mensagem).toContain("1");
    });
});