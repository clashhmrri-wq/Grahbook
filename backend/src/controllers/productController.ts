import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../config/db';

// Validation schema for creating a product
export const createProductSchema = z.object({
  body: z.object({
    shopkeeperId: z.string().uuid({ message: 'Valid shopkeeper ID is required.' }),
    name: z.string().min(2, { message: 'Product name must be at least 2 characters long.' }),
    description: z.string().optional(),
    price: z.number().positive({ message: 'Price must be a positive number.' }),
    stockQuantity: z.number().int().nonnegative({ message: 'Stock quantity cannot be negative.' }),
    category: z.string().min(2, { message: 'Category is required.' }),
    imageUrl: z.string().url().optional().or(z.literal('')),
  }),
});

// Validation schema for updating a product
export const updateProductSchema = z.object({
  body: z.object({
    name: z.string().min(2).optional(),
    description: z.string().optional(),
    price: z.number().positive().optional(),
    stockQuantity: z.number().int().nonnegative().optional(),
    category: z.string().optional(),
    imageUrl: z.string().url().optional().or(z.literal('')),
    isAvailable: z.boolean().optional(),
  }),
});

/**
 * Add a new product to shopkeeper inventory
 */
export const createProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { shopkeeperId, name, description, price, stockQuantity, category, imageUrl } = req.body;

    // Check if shopkeeper exists
    const shop = await prisma.shopkeeper.findUnique({
      where: { id: shopkeeperId },
    });

    if (!shop) {
      res.status(404).json({
        success: false,
        message: 'Shopkeeper not found. Please register first.',
      });
      return;
    }

    const newProduct = await prisma.product.create({
      data: {
        shopkeeperId,
        name,
        description,
        price,
        stockQuantity,
        category,
        imageUrl: imageUrl || null,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Product added successfully',
      data: newProduct,
    });
  } catch (error) {
    console.error('Error adding product:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add product. Please try again.',
    });
  }
};

/**
 * Get all products for a specific shopkeeper
 */
export const getShopkeeperProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { shopkeeperId } = req.query;

    if (!shopkeeperId || typeof shopkeeperId !== 'string') {
      res.status(400).json({
        success: false,
        message: 'shopkeeperId query parameter is required.',
      });
      return;
    }

    const products = await prisma.product.findMany({
      where: { shopkeeperId },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      success: true,
      data: products,
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch products.',
    });
  }
};

/**
 * Update an existing product (stock or price)
 */
export const updateProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const existingProduct = await prisma.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      res.status(404).json({
        success: false,
        message: 'Product not found.',
      });
      return;
    }

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: req.body,
    });

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: updatedProduct,
    });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update product.',
    });
  }
};

/**
 * Remove a product from inventory
 */
export const deleteProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const existingProduct = await prisma.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      res.status(404).json({
        success: false,
        message: 'Product not found.',
      });
      return;
    }

    await prisma.product.delete({
      where: { id },
    });

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete product.',
    });
  }
};
