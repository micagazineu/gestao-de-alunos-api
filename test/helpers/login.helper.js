import 'dotenv/config';
import request from 'supertest';
import app from '../../src/app.js';

/**
 * Helper para realizar login de Administrador.
 * Usa credenciais do .env ou padrão se não fornecidas.
 * @param {Object} [credentials]
 * @param {string} [credentials.email]
 * @param {string} [credentials.senha]
 * @returns {Promise<{ status: number, body: Object, token: string, usuario: Object, response: Object }>}
 */
export async function loginAdmin(credentials = {}) {
  const dados = {
    email: credentials.email || process.env.ADMIN_EMAIL || 'admin@escola.com',
    senha: credentials.senha || process.env.ADMIN_PASSWORD || 'admin123',
  };

  const response = await request(app)
    .post('/api/auth/login')
    .send(dados);

  return {
    status: response.status,
    body: response.body,
    token: response.body?.token,
    usuario: response.body?.usuario,
    response,
  };
}

/**
 * Helper para realizar login de Usuário (Aluno).
 * @param {Object} credentials
 * @param {string} credentials.email
 * @param {string} credentials.senha
 * @returns {Promise<{ status: number, body: Object, token: string, usuario: Object, response: Object }>}
 */
export async function loginUsuario(credentials = {}) {
  const dados = {
    email: credentials.email,
    senha: credentials.senha,
  };

  const response = await request(app)
    .post('/api/auth/login')
    .send(dados);

  return {
    status: response.status,
    body: response.body,
    token: response.body?.token,
    usuario: response.body?.usuario,
    response,
  };
}

/**
 * Alias para loginUsuario, garantindo suporte semântico a 'loginAluno'.
 */
export const loginAluno = loginUsuario;

/**
 * Helper para cadastrar um aluno como administrador.
 * @param {string} adminToken
 * @param {Object} dadosAluno
 * @returns {Promise<Object>} Resposta do supertest
 */
export async function cadastrarAluno(adminToken, dadosAluno) {
  return request(app)
    .post('/api/admin/alunos')
    .set('Authorization', `Bearer ${adminToken}`)
    .send(dadosAluno);
}

/**
 * Helper para matricular um aluno em uma disciplina como administrador.
 * @param {string} adminToken
 * @param {string} alunoId
 * @param {string} disciplinaId
 * @returns {Promise<Object>} Resposta do supertest
 */
export async function matricularAluno(adminToken, alunoId, disciplinaId) {
  return request(app)
    .post(`/api/admin/disciplinas/${disciplinaId}/matriculas`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ alunoId });
}

/**
 * Helper para registrar a entrega de um trabalho como aluno.
 * @param {string} alunoToken
 * @param {string} alunoId
 * @param {Object} dadosTrabalho
 * @returns {Promise<Object>} Resposta do supertest
 */
export async function registrarEntregaTrabalho(alunoToken, alunoId, dadosTrabalho) {
  return request(app)
    .post(`/api/alunos/${alunoId}/trabalhos`)
    .set('Authorization', `Bearer ${alunoToken}`)
    .send(dadosTrabalho);
}

export default {
  loginAdmin,
  loginUsuario,
  loginAluno,
  cadastrarAluno,
  matricularAluno,
  registrarEntregaTrabalho,
};
