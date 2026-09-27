import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect } from 'chai';
import request from 'supertest';
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

describe('Fluxo Completo de Testes - Gestão de Alunos API', () => {
  let adminToken;
  let alunoId;
  let alunoToken;

  const dadosAdmin = testData.admin;
  const dadosAluno = testData.alunoFluxoPrincipal;
  const disciplina = testData.disciplinaPadrao;
  const dadosTrabalho = testData.trabalhoFluxoPrincipal;

  before(async () => {
    // Garante que qualquer registro residual do aluno seja removido antes de iniciar
    await limparAlunosTeste([dadosAluno.email]);
  });

  after(async () => {
    // Limpeza após a conclusão dos testes do fluxo completo
    await limparAlunosTeste([dadosAluno.email]);
  });

  describe('1. Autenticação como Administrador', () => {
    it('deve realizar login como administrador utilizando o Helper loginAdmin', async () => {
      const resultado = await loginAdmin(dadosAdmin);

      expect(resultado.status).to.equal(200);
      expect(resultado.token).to.be.a('string').and.not.be.empty;
      expect(resultado.usuario).to.be.an('object');
      expect(resultado.usuario.role).to.equal('admin');
      expect(resultado.usuario.email).to.equal(dadosAdmin.email);

      adminToken = resultado.token;
    });
  });

  describe('2. Cadastro de Aluno pelo Administrador', () => {
    it('deve cadastrar um novo aluno com sucesso usando token de admin', async () => {
      expect(adminToken, 'adminToken é necessário para cadastrar aluno').to.exist;

      const resposta = await cadastrarAluno(adminToken, dadosAluno);

      expect(resposta.status).to.equal(201);
      expect(resposta.body).to.have.property('id');
      expect(resposta.body.nome).to.equal(dadosAluno.nome);
      expect(resposta.body.email).to.equal(dadosAluno.email);
      expect(resposta.body.matricula).to.equal(dadosAluno.matricula);
      expect(resposta.body.role).to.equal('aluno');
      // Garante que a senha não seja retornada na resposta (sanitização)
      expect(resposta.body).to.not.have.property('senha');

      alunoId = resposta.body.id;
    });

    it('deve matricular o aluno cadastrado em uma disciplina para permitir entrega de trabalhos', async () => {
      expect(alunoId, 'alunoId é necessário para realizar matrícula').to.exist;

      const resposta = await matricularAluno(adminToken, alunoId, disciplina.id);

      expect(resposta.status).to.equal(201);
      expect(resposta.body).to.have.property('id');
      expect(resposta.body.alunoId).to.equal(alunoId);
      expect(resposta.body.disciplinaId).to.equal(disciplina.id);
    });
  });

  describe('3. Autenticação como Aluno', () => {
    it('deve realizar login como aluno utilizando o Helper loginUsuario', async () => {
      const resultado = await loginUsuario({
        email: dadosAluno.email,
        senha: dadosAluno.senha,
      });

      expect(resultado.status).to.equal(200);
      expect(resultado.token).to.be.a('string').and.not.be.empty;
      expect(resultado.usuario).to.be.an('object');
      expect(resultado.usuario.id).to.equal(alunoId);
      expect(resultado.usuario.role).to.equal('aluno');
      expect(resultado.usuario.email).to.equal(dadosAluno.email);

      alunoToken = resultado.token;
    });
  });

  describe('4. Registro da Entrega de Trabalho pelo Aluno', () => {
    it('deve registrar a entrega de um trabalho com sucesso', async () => {
      expect(alunoToken, 'alunoToken é necessário para registrar trabalho').to.exist;
      expect(alunoId, 'alunoId é necessário para registrar trabalho').to.exist;

      const resposta = await registrarEntregaTrabalho(alunoToken, alunoId, dadosTrabalho);

      expect(resposta.status).to.equal(201);
      expect(resposta.body).to.have.property('id');
      expect(resposta.body.alunoId).to.equal(alunoId);
      expect(resposta.body.disciplinaId).to.equal(dadosTrabalho.disciplinaId);
      expect(resposta.body.titulo).to.equal(dadosTrabalho.titulo);
      expect(resposta.body.descricao).to.equal(dadosTrabalho.descricao);
      expect(resposta.body.status).to.equal('entregue');
    });

    it('deve listar os trabalhos do aluno autenticado e confirmar a entrega registrada', async () => {
      const resposta = await request(app)
        .get(`/api/alunos/${alunoId}/trabalhos`)
        .set('Authorization', `Bearer ${alunoToken}`);

      expect(resposta.status).to.equal(200);
      expect(resposta.body).to.be.an('array');

      const trabalhoEntregue = resposta.body.find(
        (t) => t.titulo === dadosTrabalho.titulo && t.disciplinaId === dadosTrabalho.disciplinaId
      );

      expect(trabalhoEntregue).to.exist;
      expect(trabalhoEntregue.status).to.equal('entregue');
    });
  });
});
