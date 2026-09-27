import Aluno from '../../src/models/aluno.model.js';
import Matricula from '../../src/models/matricula.model.js';
import Trabalho from '../../src/models/trabalho.model.js';

/**
 * Limpa os dados de teste criados durante as execuções, preservando os dados do seed.
 * @param {string[]} emails Lista de e-mails de alunos criados nos testes
 */
export async function limparAlunosTeste(emails = []) {
  if (!emails || emails.length === 0) return;

  const alunos = await Aluno.find({ email: { $in: emails } });
  const alunoIds = alunos.map((a) => a._id);

  if (alunoIds.length > 0) {
    await Trabalho.deleteMany({ alunoId: { $in: alunoIds } });
    await Matricula.deleteMany({ alunoId: { $in: alunoIds } });
    await Aluno.deleteMany({ _id: { $in: alunoIds } });
  }
}

export default {
  limparAlunosTeste,
};
