import { getCustomRepository, getRepository } from 'typeorm';

import TransactionsRepository from '../repositories/TransactionsRepository';

import AppError from '../errors/AppError';

import Transaction from '../models/Transaction';
import Category from '../models/Category';

interface Request {
  title: string;
  value: number;
  type: string;
  category: string;
}

class CreateTransactionService {
  public async execute({
    title,
    value,
    type,
    category,
  }: Request): Promise<Transaction> {
    const transactionsRepository = getCustomRepository(TransactionsRepository);
    const categoriesRepository = getRepository(Category);

    if (type !== 'outcome' && type !== 'income') {
      throw new AppError('The transaction has to be income or outcome');
    }

    let { total } = await transactionsRepository.getBalance();

    if (type === 'outcome') {
      total -= value;
    }

    if (total < 0) {
      throw new AppError('Insufficient balance to carry out this transaction');
    }

    const checkCategoriesExists = await categoriesRepository.findOne({
      where: { title: category },
    });

    if (!checkCategoriesExists) {
      const categoryNew = categoriesRepository.create({
        title: category,
      });

      await categoriesRepository.save(categoryNew);
    }

    const categoryId = await categoriesRepository.findOne({
      where: { title: category },
    });

    const transaction = transactionsRepository.create({
      title,
      value,
      type,
      category_id: categoryId?.id,
    });

    await transactionsRepository.save(transaction);

    return transaction;
  }
}

export default CreateTransactionService;
