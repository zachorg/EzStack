import { Product } from "../types";
import { ezAuthProduct } from "./ezauth";
import { ezSmsProduct } from "./ezsms";

// Central registry of all products
// To add a new product: create a new file in this directory and import it here
export const PRODUCTS: Product[] = [
  ezAuthProduct,
  ezSmsProduct,
  // Add new products here as they become available
];

