import { getCustomRepository, getRepository, In } from 'typeorm';
import csv from 'csv-parse';
import fs from 'fs';
import path from 'path';

import Transaction from '../models/Transaction';
import Category from '../models/Category';

import TransactionsRepository from '../repositories/TransactionsRepository';

import upload from '../config/upload';

interface Request {
  fileName: string;
}

interface TransactionsDTO {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}

class ImportTransactionsService {
  async execute({ fileName }: Request): Promise<Transaction[]> {
    const transactionsRepository = getCustomRepository(TransactionsRepository);
    const categoriesRepository = getRepository(Category);

    const filePath = fs.createReadStream(
      path.resolve(upload.directory, fileName),
    );

    const transactions: TransactionsDTO[] = [];

    const categories: string[] = [];

    filePath
      .pipe(
        csv({
          from_line: 2,
        }),
      )
      .on('data', async data => {
        const [title, type, value, category] = data.map((row: string) =>
          row.trim(),
        );

        if (!title || !type || !value) return;

        categories.push(category);
        transactions.push({ title, type, value, category });
      });

    await new Promise(resolve => filePath.on('end', resolve));

    const checkCategoriesExists = await categoriesRepository.find({
      where: {
        title: In(categories),
      },
    });

    const existsCategories = checkCategoriesExists.map(
      (category: Category) => category.title,
    );

    const addCategories = categories
      .filter(category => !existsCategories.includes(category))
      .filter((value, index, self) => self.indexOf(value) === index);

    const newCategories = categoriesRepository.create(
      addCategories.map(title => ({
        title,
      })),
    );

    await categoriesRepository.save(newCategories);
    const allCategories = [...newCategories, ...checkCategoriesExists];

    const newsTransactions = transactionsRepository.create(
      transactions.map(transaction => ({
        title: transaction.title,
        type: transaction.type,
        value: transaction.value,
        category: allCategories.find(
          category => category.title === transaction.category,
        ),
      })),
    );

    await transactionsRepository.save(newsTransactions);

    await fs.promises.unlink(path.resolve(upload.directory, fileName));

    return newsTransactions;
  }
}

export default ImportTransactionsService;
