import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import shopkeeperRoutes from './routes/shopkeeperRoutes';
import productRoutes from './routes/productRoutes';
import shopRoutes from './routes/shopRoutes';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for frontend connectivity
app.use(cors());

// Parse JSON request payloads
app.use(express.json());

// Base Route
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'GrahakBook Hyperlocal Platform Core'
  });
});

// Mount Routes
app.use('/api/shopkeepers', shopkeeperRoutes);
app.use('/api/products', productRoutes);
app.use('/api/shops', shopRoutes);

// Global Error Handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled Server Error:', err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal server error occurred.',
    hinglishMessage: 'Kuchh technical problem aayi hai, kripya baad mein dobara koshish karein (कुछ टेक्निकल प्रॉब्लम आयी है, कृपया बाद में दोबारा कोशिश करें).'
  });
});

// Start Express Server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`=================================================`);
    console.log(`🚀 GrahakBook Core Backend Service Running on Port ${PORT}`);
    console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`=================================================`);
  });
}

export default app;
