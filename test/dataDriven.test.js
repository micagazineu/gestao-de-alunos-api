import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect } from 'chai';
import app from '../src/app.js';
import {
  loginAdmin,
  loginUsuario,
  cadastrarAluno,
  matricularAluno,
  registrarEntregaTrabalho,
} from './helpers/login.helper.js';
import { limparAlunosTeste } from './helpers/db.helper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carregando dados do arquivo JSON (Data-Driven Testing)
const testDataPath = path.join(__dirname, 'data', 'testData.json');
const testData = JSON.parse(fs.readFileSync(testDataPath, 'utf8'));

describe('Data-Driven Testing (DDT) - Gestão de Alunos API', () => {
  let adminToken;
  const emailsDataDriven = testData.alunosDataDriven.map((a) => a.email);

  before(async () => {
    // Limpa dados de execuções anteriores para garantir idempotência
    await limparAlunosTeste(emailsDataDriven);

    // Autentica como Administrador antes de executar os cenários data-driven
    const resultado = await loginAdmin(testData.admin);
    expect(resultado.status).to.equal(200);
    adminToken = resultado.token;
  });

  after(async () => {
    // Limpeza após finalizar a suíte de testes
    await limparAlunosTeste(emailsDataDriven);
  });

  describe('Cenários em lote (Data-Driven): Cadastro, Matrícula, Login e Entrega de Trabalho', () => {
    testData.alunosDataDriven.forEach((cenarioAluno, index) => {
      describe(`Aluno [${index + 1}]: ${cenarioAluno.nome}`, () => {
        let alunoIdCriado;
        let alunoTokenCriado;

        it(`[DDT] Deve cadastrar o aluno "${cenarioAluno.nome}" a partir do JSON`, async () => {
          const dadosCadastro = {
            nome: cenarioAluno.nome,
            email: cenarioAluno.email,
            matricula: cenarioAluno.matricula,
            senha: cenarioAluno.senha,
          };

          const resposta = await cadastrarAluno(adminToken, dadosCadastro);

          expect(resposta.status).to.equal(201);
          expect(resposta.body).to.have.property('id');
          expect(resposta.body.nome).to.equal(cenarioAluno.nome);
          expect(resposta.body.email).to.equal(cenarioAluno.email);
          expect(resposta.body.matricula).to.equal(cenarioAluno.matricula);
          expect(resposta.body.role).to.equal('aluno');
          expect(resposta.body).to.not.have.property('senha');

          alunoIdCriado = resposta.body.id;
        });

        it(`[DDT] Deve matricular o aluno "${cenarioAluno.nome}" na disciplina "${cenarioAluno.trabalho.disciplinaId}"`, async () => {
          expect(alunoIdCriado).to.exist;

          const resposta = await matricularAluno(
            adminToken,
            alunoIdCriado,
            cenarioAluno.trabalho.disciplinaId
          );

          expect(resposta.status).to.equal(201);
          expect(resposta.body.alunoId).to.equal(alunoIdCriado);
          expect(resposta.body.disciplinaId).to.equal(cenarioAluno.trabalho.disciplinaId);
        });

        it(`[DDT] Deve realizar login do aluno "${cenarioAluno.nome}" com credenciais do JSON`, async () => {
          const resultado = await loginUsuario({
            email: cenarioAluno.email,
            senha: cenarioAluno.senha,
          });

          expect(resultado.status).to.equal(200);
          expect(resultado.token).to.be.a('string').and.not.be.empty;
          expect(resultado.usuario.id).to.equal(alunoIdCriado);
          expect(resultado.usuario.role).to.equal('aluno');

          alunoTokenCriado = resultado.token;
        });

        it(`[DDT] Deve registrar a entrega do trabalho "${cenarioAluno.trabalho.titulo}" para o aluno`, async () => {
          expect(alunoTokenCriado).to.exist;

          const resposta = await registrarEntregaTrabalho(
            alunoTokenCriado,
            alunoIdCriado,
            cenarioAluno.trabalho
          );

          expect(resposta.status).to.equal(201);
          expect(resposta.body.alunoId).to.equal(alunoIdCriado);
          expect(resposta.body.disciplinaId).to.equal(cenarioAluno.trabalho.disciplinaId);
          expect(resposta.body.titulo).to.equal(cenarioAluno.trabalho.titulo);
          expect(resposta.body.descricao).to.equal(cenarioAluno.trabalho.descricao);
          expect(resposta.body.status).to.equal('entregue');
        });
      });
    });
  });

  describe('Cenários Negativos (Data-Driven): Validação de Campos Obrigatórios', () => {
    testData.cenariosValidacaoAluno.forEach((cenario, index) => {
      it(`[DDT Validação ${index + 1}] ${cenario.descricao}`, async () => {
        const resposta = await cadastrarAluno(adminToken, cenario.dados);

        expect(resposta.status).to.equal(cenario.statusEsperado);
        expect(resposta.body).to.have.property('error');
      });
    });

    testData.cenariosValidacaoTrabalho.forEach((cenario, index) => {
      it(`[DDT Validação Trabalho ${index + 1}] ${cenario.descricao}`, async () => {
        // Usa aluno do seed (Ana Souza) já existente e matriculada
        const loginAna = await loginUsuario({
          email: 'ana.souza@example.com',
          senha: '123456',
        });
        expect(loginAna.status).to.equal(200);

        const resposta = await registrarEntregaTrabalho(
          loginAna.token,
          loginAna.usuario.id,
          cenario.dados
        );

        expect(resposta.status).to.equal(cenario.statusEsperado);
        expect(resposta.body).to.have.property('error');
      });
    });
  });
});
