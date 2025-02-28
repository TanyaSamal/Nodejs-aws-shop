export interface Product {
  id?: string,
  title: string,
  description: string,
  price: number
}

export interface ProductInStock extends Product {
  count: number
}
