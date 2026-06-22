```markdown
# Sistema Forense de Analise Genetica (S.F.A.G)

Bem-vindo ao repositorio do Sistema Forense. Uma aplicacao web desenvolvida em Node.js focada no gerenciamento de casos criminais e cruzamento automatizado de material genetico (DNA).

## Funcionalidades

- Gestao de Casos (Dossies): Criacao e exclusao em cascata de investigacoes, garantindo integridade referencial no banco de dados.
- Registro de Alvos e Evidencias: Cadastro de suspeitos e provas biologicas, com validacao estrita de dominio (Padrao forense de exatamente 8 nucleotideos: A, T, C, G).
- Motor de Analise: Cruzamento laboratorial individual ou varredura em lote (Batch Processing) para deteccao de compatibilidades.
- Automacao de Eventos (Triggers): Indiciamento imediato de suspeitos compativeis e encerramento automatico de casos resolvidos.
- Interface UI/UX: Front-end dark mode minimalista, construido com Flexbox e tipografia monoespacada.

## Tecnologias Utilizadas

- Back-end: Node.js, Express
- Front-end: HTML5, CSS3, JavaScript (Vanilla API Fetch)
- Persistencia de Dados: File System assincrono (fs.promises) estruturado em JSON.
- Qualidade de Codigo: Jest e Supertest (100% de Cobertura de Testes).

## Como Executar o Projeto

# 1. Pre-requisitos
Certifique-se de ter o Node.js instalado em seu ambiente local.

# 2. Instalacao das Dependencias
Abra o terminal na pasta raiz do projeto e instale as dependencias necessarias:

```bash
npm install

```

# 3. Execucao da Suite de Testes

O projeto conta com testes de Unidade, Integracao e Sistema (E2E). Para rodar os testes e verificar o Code Coverage:

```bash
npm test

```

# 4. Iniciando o Servidor

Para iniciar a aplicacao e acessar a interface:

```bash
node src/server.js

```

Apos iniciar, abra o navegador e acesse: http://localhost:3000

---

Desenvolvido por Gabriel Bastos Hintz como requisito para a disciplina de Teste de Software.