import { Request, Response } from 'express';
import { z } from 'zod';
import { OAuth2Client } from 'google-auth-library';
import prisma from '../config/db';

const client = new OAuth2Client();

export const loginCustomerSchema = z.object({
  body: z.object({
    phoneNumber: z.string().regex(/^[6-9]\d{9}$/, {
      message: 'Mobile number must be a valid 10-digit Indian number starting with 6-9.',
    }),
    fullName: z.string().min(2, { message: 'Full name must be at least 2 characters long.' }).optional(),
    idToken: z.string().optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    address: z.string().optional(),
  }),
});

/**
 * Login or register a customer using phone number and Google OAuth Token validation
 */
export const loginOrRegisterCustomer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { phoneNumber, fullName, idToken, latitude, longitude, address } = req.body;

    let finalName = fullName || 'Guest Customer';

    // Verify Google ID Token (No mock verify)
    if (idToken) {
      try {
        const ticket = await client.verifyIdToken({
          idToken,
        });
        const payload = ticket.getPayload();
        if (payload) {
          if (payload.name) {
            finalName = payload.name;
          }
        }
      } catch (err) {
        console.error('Google verification ticket error:', err);
        res.status(401).json({
          success: false,
          message: 'Google authentication verification failed. Invalid token.',
        });
        return;
      }
    }

    let customer = await prisma.customer.findUnique({
      where: { phoneNumber },
    });

    if (customer) {
      // Existing customer login. Let's optionally update location/address/name if provided.
      const updateData: any = { fullName: finalName };
      if (latitude !== undefined) updateData.latitude = latitude;
      if (longitude !== undefined) updateData.longitude = longitude;
      if (address !== undefined) updateData.address = address;

      customer = await prisma.customer.update({
        where: { phoneNumber },
        data: updateData,
      });

      res.status(200).json({
        success: true,
        message: `Welcome back, ${customer.fullName}!`,
        data: customer,
      });
      return;
    }

    // New customer registration
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
