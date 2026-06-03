import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../config/db';

// Validation schema for nearby search
export const nearbyShopsSchema = z.object({
  query: z.object({
    lat: z.string().transform((val) => parseFloat(val)),
    lng: z.string().transform((val) => parseFloat(val)),
    radius: z.string().optional().transform((val) => (val ? parseFloat(val) : 3.0)), // Default 3km radius
  }),
});

/**
 * Hyperlocal shop search.
 * Locates all shops within a specified radius (km) using the raw SQL Haversine formula.
 */
export const getNearbyShops = async (req: Request, res: Response): Promise<void> => {
  try {
    const { lat, lng, radius } = req.query as any;

    const parsedLat = parseFloat(lat as string);
    const parsedLng = parseFloat(lng as string);
    const parsedRadius = parseFloat((radius as string) || '3.0');

    if (isNaN(parsedLat) || isNaN(parsedLng)) {
      res.status(400).json({
        success: false,
        message: 'Valid lat (latitude) and lng (longitude) query parameters are required.',
      });
      return;
    }

    // Execute raw SQL Haversine query to find nearby stores and calculate distances.
    // Clamping via LEAST and GREATEST prevents float precision acos mathematical overflow errors.
    const nearbyShops: any[] = await prisma.$queryRaw`
      SELECT 
        id, 
        "shopName", 
        "ownerName", 
        "phoneNumber", 
        "pinCode", 
        address, 
        city, 
        latitude, 
        longitude, 
        "saasPlan",
        "saasStatus",
        (
          6371 * acos(
            LEAST(
              GREATEST(
                cos(radians(${parsedLat})) * cos(radians(latitude)) * cos(radians(longitude) - radians(${parsedLng})) + 
                sin(radians(${parsedLat})) * sin(radians(latitude)), 
                -1.0
              ), 
              1.0
            )
          )
        ) AS distance
      FROM "Shopkeeper"
      WHERE (
        6371 * acos(
          LEAST(
            GREATEST(
              cos(radians(${parsedLat})) * cos(radians(latitude)) * cos(radians(longitude) - radians(${parsedLng})) + 
              sin(radians(${parsedLat})) * sin(radians(latitude)), 
              -1.0
            ), 
            1.0
          )
        )
      ) <= ${parsedRadius}
      ORDER BY distance ASC;
    `;

    res.status(200).json({
      success: true,
      count: nearbyShops.length,
      data: nearbyShops,
    });
  } catch (error) {
    console.error('Error searching nearby shops:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search nearby shops.',
    });
  }
};

/**
 * Get shopkeeper profile details (for customers browsing a specific store)
 */
export const getShopDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const shop = await prisma.shopkeeper.findUnique({
      where: { id },
      select: {
        id: true,
        shopName: true,
        ownerName: true,
        phoneNumber: true,
        address: true,
        city: true,
        pinCode: true,
        latitude: true,
        longitude: true,
        createdAt: true,
      },
    });

    if (!shop) {
      res.status(404).json({
        success: false,
        message: 'Store not found.',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: shop,
    });
  } catch (error) {
    console.error('Error fetching shop details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch store details.',
    });
  }
};
