import { Product } from '../models/product';
import { PRODUCTS } from '../mocks/products';

const getProductById = async (id: string): Promise<Product | undefined> => {
  return PRODUCTS.find(product => product.id === id);
};

const getAllProducts = async (): Promise<Product[]> => {
  return PRODUCTS;
};

export { getProductById, getAllProducts };
