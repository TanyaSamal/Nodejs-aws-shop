import { APIGatewayProxyResult } from "aws-lambda";
import { Product } from "./models/product";
import { Stock } from "./models/stock";

// Response formatter
export const formatResponse = (statusCode: number, body: any): APIGatewayProxyResult => {
  return {
    statusCode,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  };
};

export const validateProductData = (data: any): data is Product => {
  if (!data.title || typeof data.title !== 'string' || data.title.length === 0) {
    throw new Error('Invalid or missing title');
  }
  
  if (!data.description || typeof data.description !== 'string'|| data.description.length === 0) {
    throw new Error('Invalid or missing description');
  }
  
  if (!data.price || typeof data.price !== 'number' || data.price < 0) {
    throw new Error('Invalid or missing price. Price must be a positive number');
  }
  
  return true;
};


export const validateStockData = (data: any): data is Stock => {
  if (typeof data.count !== 'number' || data.count < 0) {
    throw new Error('Invalid count. Count must be a non-negative number');
  }

  return true;
}
