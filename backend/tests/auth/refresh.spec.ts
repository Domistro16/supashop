import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../../src/types';
import * as authController from '../../src/controllers/auth.controller';
import * as tokenLib from '../../src/lib/token';
import { PrismaClient } from '@prisma/client';

// Mock Prisma Client
const mockUserFindUnique = jest.fn();
const mockRefreshTokenCreate = jest.fn();
const mockRefreshTokenFindUnique = jest.fn();
const mockRefreshTokenUpdateMany = jest.fn();

jest.mock('@prisma/client', () => {
  return {
    PrismaClient: jest.fn().mockImplementation(() => ({
      user: {
        findUnique: mockUserFindUnique,
      },
      refreshToken: {
        create: mockRefreshTokenCreate,
        findUnique: mockRefreshTokenFindUnique,
        updateMany: mockRefreshTokenUpdateMany,
      },
    })),
  };
});

// Mock token utilities
jest.mock('../../src/lib/token', () => ({
  createRefreshToken: jest.fn(),
  verifyRefreshToken: jest.fn(),
  rotateRefreshToken: jest.fn(),
  revokeRefreshToken: jest.fn(),
}));

// Mock auth utilities
jest.mock('../../src/utils/auth', () => ({
  generateToken: jest.fn((payload) => `access-token-${payload.userId}`),
  comparePassword: jest.fn(),
  hashPassword: jest.fn(),
}));

describe('Refresh Token Flow', () => {
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRequest = {
      cookies: {},
      body: {},
    };

    mockResponse = {
      cookie: jest.fn().mockReturnThis(),
      clearCookie: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  describe('POST /api/auth/refresh', () => {
    it('should return 401 if refresh token cookie is missing', async () => {
      mockRequest.cookies = {};

      await authController.refreshToken(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Refresh token not provided',
      });
    });

    it('should return 401 if refresh token is invalid', async () => {
      mockRequest.cookies = { refreshToken: 'invalid-token' };
      (tokenLib.verifyRefreshToken as jest.Mock).mockResolvedValue(null);

      await authController.refreshToken(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Invalid or expired refresh token',
      });
    });

    it('should return 401 if user not found', async () => {
      const refreshToken = 'valid-token';
      const userId = 'user-123';
      mockRequest.cookies = { refreshToken };

      (tokenLib.verifyRefreshToken as jest.Mock).mockResolvedValue({
        id: 'token-id',
        userId,
        token: refreshToken,
        revoked: false,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      });

      mockUserFindUnique.mockResolvedValue(null);

      await authController.refreshToken(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'User not found',
      });
    });

    it('should rotate token and return new access token on valid refresh token', async () => {
      const refreshToken = 'valid-token';
      const userId = 'user-123';
      const newRefreshToken = 'new-refresh-token';
      mockRequest.cookies = { refreshToken };

      const mockUser = {
        id: userId,
        email: 'test@example.com',
        name: 'Test User',
      };

      (tokenLib.verifyRefreshToken as jest.Mock).mockResolvedValue({
        id: 'token-id',
        userId,
        token: refreshToken,
        revoked: false,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      });

      mockUserFindUnique.mockResolvedValue(mockUser);

      (tokenLib.rotateRefreshToken as jest.Mock).mockResolvedValue({
        token: newRefreshToken,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      await authController.refreshToken(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      // Verify token rotation was called
      expect(tokenLib.rotateRefreshToken).toHaveBeenCalledWith(
        refreshToken,
        userId
      );

      // Verify new refresh token cookie is set
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'refreshToken',
        newRefreshToken,
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'lax',
          secure: false, // Not in production
          maxAge: 30 * 24 * 60 * 60 * 1000,
          path: '/',
        })
      );

      // Verify access token is returned
      expect(mockResponse.json).toHaveBeenCalledWith({
        token: expect.stringContaining('access-token-'),
      });
    });

    it('should set secure cookie in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const refreshToken = 'valid-token';
      const userId = 'user-123';
      const newRefreshToken = 'new-refresh-token';
      mockRequest.cookies = { refreshToken };

      const mockUser = {
        id: userId,
        email: 'test@example.com',
        name: 'Test User',
      };

      (tokenLib.verifyRefreshToken as jest.Mock).mockResolvedValue({
        id: 'token-id',
        userId,
        token: refreshToken,
        revoked: false,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      });

      mockUserFindUnique.mockResolvedValue(mockUser);

      (tokenLib.rotateRefreshToken as jest.Mock).mockResolvedValue({
        token: newRefreshToken,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      await authController.refreshToken(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'refreshToken',
        newRefreshToken,
        expect.objectContaining({
          secure: true,
        })
      );

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should revoke refresh token and clear cookie', async () => {
      const refreshToken = 'valid-token';
      mockRequest.cookies = { refreshToken };

      (tokenLib.revokeRefreshToken as jest.Mock).mockResolvedValue(undefined);

      await authController.logout(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      // Verify token revocation
      expect(tokenLib.revokeRefreshToken).toHaveBeenCalledWith(refreshToken);

      // Verify cookie is cleared
      expect(mockResponse.clearCookie).toHaveBeenCalledWith(
        'refreshToken',
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'lax',
          secure: false,
          path: '/',
        })
      );

      // Verify success response
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Logged out successfully',
      });
    });

    it('should clear cookie even if no refresh token provided', async () => {
      mockRequest.cookies = {};

      await authController.logout(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      // Should not call revokeRefreshToken
      expect(tokenLib.revokeRefreshToken).not.toHaveBeenCalled();

      // But should still clear cookie
      expect(mockResponse.clearCookie).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Logged out successfully',
      });
    });

    it('should handle errors gracefully', async () => {
      const refreshToken = 'valid-token';
      mockRequest.cookies = { refreshToken };

      (tokenLib.revokeRefreshToken as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      await authController.logout(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Failed to logout',
      });
    });
  });

  describe('Token rotation', () => {
    it('should invalidate old token when rotating', async () => {
      const refreshToken = 'old-token';
      const userId = 'user-123';
      const newRefreshToken = 'new-token';
      mockRequest.cookies = { refreshToken };

      const mockUser = {
        id: userId,
        email: 'test@example.com',
        name: 'Test User',
      };

      (tokenLib.verifyRefreshToken as jest.Mock).mockResolvedValue({
        id: 'token-id',
        userId,
        token: refreshToken,
        revoked: false,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      });

      mockUserFindUnique.mockResolvedValue(mockUser);

      (tokenLib.rotateRefreshToken as jest.Mock).mockResolvedValue({
        token: newRefreshToken,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      await authController.refreshToken(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      // Verify old token is revoked and new one is created
      expect(tokenLib.rotateRefreshToken).toHaveBeenCalledWith(
        refreshToken,
        userId
      );

      // Verify new token is set in cookie
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'refreshToken',
        newRefreshToken,
        expect.any(Object)
      );
    });
  });
});



