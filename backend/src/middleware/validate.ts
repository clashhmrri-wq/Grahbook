import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';

export const validateRequest = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Formulate user-friendly validation error response.
        // Hindi-English (Hinglish) localized messages are added for primary user input validation errors.
        const errors = error.errors.map((err) => {
          let hinglishMessage = '';
          const path = err.path.join('.');

          if (path.includes('phoneNumber')) {
            hinglishMessage = 'Kripya sahi 10-digit mobile number enter karein (कृपया सही 10-digit मोबाइल नंबर दर्ज करें).';
          } else if (path.includes('pinCode')) {
            hinglishMessage = 'Kripya sahi 6-digit area PIN code enter karein (कृपया सही 6-digit एरिया पिन कोड दर्ज करें).';
          } else if (path.includes('shopName')) {
            hinglishMessage = 'Dukaan ka naam likhna jaroori hai (दुकान का नाम लिखना ज़रूरी है).';
          } else if (path.includes('ownerName')) {
            hinglishMessage = 'Owner ka naam likhna jaroori hai (मालिक का नाम लिखना ज़रूरी है).';
          } else if (path.includes('latitude') || path.includes('longitude')) {
            hinglishMessage = 'Kripya location allow karein taaki grahak aapki dukaan dhoondh sakein (कृपया लोकेशन अलाउ करें ताकि ग्राहक आपकी दुकान ढूंढ सकें).';
          }

          return {
            field: path,
            message: err.message,
            hinglishMessage: hinglishMessage || 'Kripya details sahi se fill karein.',
          };
        });

        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors,
        });
        return;
      }
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  };
};
