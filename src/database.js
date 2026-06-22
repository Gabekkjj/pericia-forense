const fs = require('fs').promises;
const path = require('path');

const dbName = process.env.NODE_ENV === 'test' ? 'db.test.json' : 'db.json';
const dbPath = path.join(__dirname, dbName);

const dbPadrao = { casos: [], suspeitos: [], evidencias: [], proxCasoId: 1, proxSuspeitoId: 1, proxEvidenciaId: 101 };

async function conectarDB() {
    try {
        const data = await fs.readFile(dbPath, 'utf8');
        return JSON.parse(data);
    } catch (erro) {
        await salvarDB(dbPadrao);
        return dbPadrao;
    }
}

async function salvarDB(dados) {
    await fs.writeFile(dbPath, JSON.stringify(dados, null, 2));
}

async function resetarDBTestes() {
    if (process.env.NODE_ENV === 'test') {
        await salvarDB(dbPadrao);
    }
}

module.exports = { conectarDB, salvarDB, resetarDBTestes };