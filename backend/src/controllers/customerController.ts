import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../config/db';

export const loginCustomerSchema = z.object({
  body: z.object({
    phoneNumber: z.string().regex(/^[6-9]\d{9}$/, {
      message: 'Mobile number must be a valid 10-digit Indian number starting with 6-9.',
    }),
    fullName: z.string().min(2, { message: 'Full name must be at least 2 characters long.' }).optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    address: z.string().optional(),
  }),
});

/**
 * Login or register a customer using phone number
 */
export const loginOrRegisterCustomer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { phoneNumber, fullName, latitude, longitude, address } = req.body;

    let customer = await prisma.customer.findUnique({
      where: { phoneNumber },
    });

    if (customer) {
      // Existing customer login. Let's optionally update location/address if provided.
      const updateData: any = {};
      if (latitude !== undefined) updateData.latitude = latitude;
      if (longitude !== undefined) updateData.longitude = longitude;
      if (address !== undefined) updateData.address = address;

      if (Object.keys(updateData).length > 0) {
        customer = await prisma.customer.update({
          where: { phoneNumber },
          data: updateData,
        });
      }

      res.status(200).json({
        success: true,
        message: `Welcome back, ${customer.fullName}!`,
        data: customer,
      });
      return;
    }

    // New customer registration
    const finalName = fullName || 'Guest Customer';
    customer = await prisma.customer.create({
      data: {
        phoneNumber,
        fullName: finalName,
        latitude: latitude || null,
        longitude: longitude || null,
        address: address || null,
      },
    });

    res.status(201).json({
      success: true,
      message: `Account created successfully! Welcome, ${customer.fullName}.`,
      data: customer,
    });
  } catch (error) {
    console.error('Error logging in customer:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process customer login.',
    });
  }
};
