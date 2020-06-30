import { getCustomRepository } from 'typeorm';

import { isUuid } from 'uuidv4';

import TransactionsRepository from '../repositories/TransactionsRepository';

import AppError from '../errors/AppError';

interface Request {
  id: string;
}

class DeleteTransactionService {
  public async execute({ id }: Request): Promise<void> {
    const transactionsRepository = getCustomRepository(TransactionsRepository);

    if (!isUuid(id)) {
      throw new AppError('Invalid transaction ID!');
    }

    const transaction = await transactionsRepository.findOne({
      where: { id },
    });

    if (!transaction) {
      throw new AppError('Transaction not found!');
    }

    await transactionsRepository.delete(id);
  }
}

export default DeleteTransactionService;
