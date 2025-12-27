import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../../src/types';

// Mock Prisma Client before importing the middleware
const mockShopFindMany = jest.fn();
const mockStaffShopFindMany = jest.fn();

jest.mock('@prisma/client', () => {
  return {
    PrismaClient: jest.fn().mockImplementation(() => ({
      shop: {
        findMany: mockShopFindMany,
      },
      staffShop: {
        findMany: mockStaffShopFindMany,
      },
    })),
  };
});

// Import middleware after mocking Prisma
import ensureShopAccess from '../../src/middleware/ensureShopAccess';

describe('ensureShopAccess middleware', () => {
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    mockShopFindMany.mockClear();
    mockStaffShopFindMany.mockClear();

    // Setup Express mocks
    mockRequest = {
      user: {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
      },
      params: {},
      body: {},
      query: {},
      headers: {},
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    nextFunction = jest.fn();
  });

  describe('Missing user', () => {
    it('should return 401 if req.user is missing', async () => {
      delete mockRequest.user;

      await ensureShopAccess(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Authentication required',
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });

  describe('Missing shopId', () => {
    it('should return 400 if shopId is not provided in any source', async () => {
      await ensureShopAccess(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Shop ID is required',
        message: 'Provide shopId in params, body, query, or x-shop-id header',
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });

  describe('User without shop access', () => {
    it('should return 403 if user does not have access to the shop', async () => {
      const shopId = 'shop-unauthorized';
      mockRequest.params = { shopId };
      
      // Mock Prisma to return empty arrays (user has no shops)
      mockShopFindMany.mockResolvedValue([]);
      mockStaffShopFindMany.mockResolvedValue([]);

      await ensureShopAccess(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Access denied',
        message: 'You do not have access to this shop',
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });

  describe('Valid user and shop access', () => {
    it('should call next() when user has access via owned shop', async () => {
      const shopId = 'shop-123';
      mockRequest.params = { shopId };

      // Mock Prisma: user owns the shop
      mockShopFindMany.mockResolvedValue([{ id: shopId }]);
      mockStaffShopFindMany.mockResolvedValue([]);

      await ensureShopAccess(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
      expect(mockRequest.shopId).toBe(shopId);
      expect(mockRequest.user?.shopIds).toContain(shopId);
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should call next() when user has access via staff shop', async () => {
      const shopId = 'shop-456';
      mockRequest.body = { shopId };

      // Mock Prisma: user is staff of the shop
      mockShopFindMany.mockResolvedValue([]);
      mockStaffShopFindMany.mockResolvedValue([{ shopId }]);

      await ensureShopAccess(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
      expect(mockRequest.shopId).toBe(shopId);
      expect(mockRequest.user?.shopIds).toContain(shopId);
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should extract shopId from query parameters', async () => {
      const shopId = 'shop-789';
      mockRequest.query = { shopId };

      mockShopFindMany.mockResolvedValue([{ id: shopId }]);
      mockStaffShopFindMany.mockResolvedValue([]);

      await ensureShopAccess(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
      expect(mockRequest.shopId).toBe(shopId);
    });

    it('should extract shopId from x-shop-id header', async () => {
      const shopId = 'shop-header';
      mockRequest.headers = { 'x-shop-id': shopId };

      mockShopFindMany.mockResolvedValue([{ id: shopId }]);
      mockStaffShopFindMany.mockResolvedValue([]);

      await ensureShopAccess(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
      expect(mockRequest.shopId).toBe(shopId);
    });

    it('should prioritize params over body, query, and headers', async () => {
      const shopId = 'shop-params';
      mockRequest.params = { shopId };
      mockRequest.body = { shopId: 'shop-body' };
      mockRequest.query = { shopId: 'shop-query' };
      mockRequest.headers = { 'x-shop-id': 'shop-header' };

      mockShopFindMany.mockResolvedValue([{ id: shopId }]);
      mockStaffShopFindMany.mockResolvedValue([]);

      await ensureShopAccess(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
      expect(mockRequest.shopId).toBe(shopId);
    });

    it('should include both owned and staff shops in shopIds', async () => {
      const ownedShopId = 'shop-owned';
      const staffShopId = 'shop-staff';
      mockRequest.params = { shopId: ownedShopId };

      mockShopFindMany.mockResolvedValue([{ id: ownedShopId }]);
      mockStaffShopFindMany.mockResolvedValue([{ shopId: staffShopId }]);

      await ensureShopAccess(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
      expect(mockRequest.user?.shopIds).toContain(ownedShopId);
      expect(mockRequest.user?.shopIds).toContain(staffShopId);
      expect(mockRequest.user?.shopIds?.length).toBe(2);
    });
  });

  describe('Error handling', () => {
    it('should return 500 if Prisma query fails', async () => {
      const shopId = 'shop-123';
      mockRequest.params = { shopId };

      // Mock Prisma to throw an error
      mockShopFindMany.mockRejectedValue(new Error('Database error'));

      await ensureShopAccess(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Failed to verify shop access',
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });
});

