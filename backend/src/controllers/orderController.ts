import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../config/db';

// Validation schema for creating an order
export const createOrderSchema = z.object({
  body: z.object({
    shopkeeperId: z.string().uuid({ message: 'Valid shopkeeper ID is required.' }),
    customerId: z.string().uuid({ message: 'Valid customer ID is required.' }),
    deliveryType: z.enum(['SELF_PICKUP', 'HOME_DELIVERY']),
    totalAmount: z.number().positive({ message: 'Total amount must be positive.' }),
    items: z.array(
      z.object({
        productId: z.string().uuid({ message: 'Valid product ID is required.' }),
        quantity: z.number().int().positive({ message: 'Quantity must be at least 1.' }),
        price: z.number().positive({ message: 'Price must be positive.' }),
      })
    ).min(1, { message: 'Order must contain at least one item.' }),
  }),
});

// Validation schema for order status updates
export const updateStatusSchema = z.object({
  body: z.object({
    status: z.enum(['ACCEPTED', 'PREPARING', 'READY', 'CANCELLED']),
  }),
});

// Validation schema for order completion
export const completeOrderSchema = z.object({
  body: z.object({
    otpCode: z.string().regex(/^\d{4}$/, { message: 'OTP code must be a 4-digit number.' }),
  }),
});

/**
 * Create a new customer order with secure handoff OTP
 */
export const createOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { shopkeeperId, customerId, deliveryType, totalAmount, items } = req.body;

    // Check if shopkeeper and customer exist
    const shop = await prisma.shopkeeper.findUnique({ where: { id: shopkeeperId } });
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });

    if (!shop || !customer) {
      res.status(404).json({
        success: false,
        message: 'Shopkeeper or Customer profile not found.',
      });
      return;
    }

    // Generate secure 4-digit handoff OTP
    const otpCode = Math.floor(1000 + Math.random() * 9000).toString();

    // Execute order creation in database transaction
    const newOrder = await prisma.$transaction(async (tx) => {
      // 1. Create Order entry
      const order = await tx.order.create({
        data: {
          shopkeeperId,
          customerId,
          deliveryType,
          totalAmount,
          status: 'RECEIVED',
          otpCode,
        },
      });

      // 2. Create OrderItems
      await Promise.all(
        items.map((item: any) =>
          tx.orderItem.create({
            data: {
              orderId: order.id,
              productId: item.productId,
              quantity: item.quantity,
              price: item.price,
            },
          })
        )
      );

      return order;
    });

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      otpCode: newOrder.otpCode, // Handoff OTP for verification
      data: newOrder,
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create order.',
    });
  }
};

/**
 * Get orders for a specific shopkeeper (active or history)
 */
export const getShopkeeperOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const { shopkeeperId, status } = req.query;

    if (!shopkeeperId || typeof shopkeeperId !== 'string') {
      res.status(400).json({
        success: false,
        message: 'shopkeeperId query parameter is required.',
      });
      return;
    }

    // Dynamic filters
    const filter: any = { shopkeeperId };
    if (status && typeof status === 'string') {
      filter.status = status;
    }

    const orders = await prisma.order.findMany({
      where: filter,
      include: {
        customer: {
          select: {
            fullName: true,
            phoneNumber: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      success: true,
      data: orders,
    });
  } catch (error) {
    console.error('Error fetching shopkeeper orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders.',
    });
  }
};

/**
 * Get orders for a specific customer
 */
export const getCustomerOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const { customerId } = req.query;

    if (!customerId || typeof customerId !== 'string') {
      res.status(400).json({
        success: false,
        message: 'customerId query parameter is required.',
      });
      return;
    }

    const orders = await prisma.order.findMany({
      where: { customerId },
      include: {
        shopkeeper: {
          select: {
            shopName: true,
            phoneNumber: true,
            address: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      success: true,
      data: orders,
    });
  } catch (error) {
    console.error('Error fetching customer orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders.',
    });
  }
};

/**
 * Update order preparation status (ACCEPTED, PREPARING, READY, CANCELLED)
 */
export const updateOrderStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const order = await prisma.order.findUnique({ where: { id } });

    if (!order) {
      res.status(404).json({
        success: false,
        message: 'Order not found.',
      });
      return;
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: { status },
    });

    res.status(200).json({
      success: true,
      message: `Order status updated to ${status}`,
      data: updatedOrder,
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update order status.',
    });
  }
};

/**
 * Verify customer's 4-digit handoff OTP to mark order as COMPLETED
 */
export const completeOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { otpCode } = req.body;

    const order = await prisma.order.findUnique({ where: { id } });

    if (!order) {
      res.status(404).json({
        success: false,
        message: 'Order not found.',
      });
      return;
    }

    // Verify OTP matches
    if (order.otpCode !== otpCode) {
      res.status(400).json({
        success: false,
        message: 'Invalid handoff verification OTP. Please try again.',
      });
      return;
    }

    const completedOrder = await prisma.order.update({
      where: { id },
      data: { status: 'COMPLETED' },
    });

    res.status(200).json({
      success: true,
      message: 'Order successfully verified and completed!',
      data: completedOrder,
    });
  } catch (error) {
    console.error('Error verifying order OTP completion:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to complete order handoff.',
    });
  }
};
