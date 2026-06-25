import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../../src/modules/auth/auth.service';
import { User } from '../../src/database/entities/user.entity';
import { RefreshToken } from '../../src/database/entities/refresh-token.entity';

const mockUserRepo = {
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
};

const mockRefreshTokenRepo = {
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
};

const mockJwtService = {
  signAsync: jest.fn(),
  verifyAsync: jest.fn(),
};

const mockConfigService = {
  get: jest.fn((key: string) => {
    const config: Record<string, string> = {
      'jwt.secret': 'test-secret-at-least-32-chars-long!',
      'jwt.accessExpiresIn': '15m',
      'jwt.refreshSecret': 'test-refresh-secret-at-least-32-chars!',
      'jwt.refreshExpiresIn': '7d',
    };
    return config[key];
  }),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        { provide: getRepositoryToken(RefreshToken), useValue: mockRefreshTokenRepo },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should throw ConflictException if email already exists', async () => {
      mockUserRepo.findOne.mockResolvedValue({ id: '1', email: 'test@test.com' });

      await expect(
        service.register({
          email: 'test@test.com',
          password: 'SecurePass123!',
          firstName: 'John',
          lastName: 'Doe',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should create user and return tokens on successful registration', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);
      const mockUser = {
        id: 'user-uuid-1',
        email: 'test@test.com',
        firstName: 'John',
        lastName: 'Doe',
        isActive: true,
        avatarUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockUserRepo.create.mockReturnValue(mockUser);
      mockUserRepo.save.mockResolvedValue(mockUser);
      mockJwtService.signAsync.mockResolvedValue('mock-jwt-token');
      mockRefreshTokenRepo.create.mockReturnValue({ id: 'rt-1' });
      mockRefreshTokenRepo.save.mockResolvedValue({ id: 'rt-1' });

      const result = await service.register({
        email: 'test@test.com',
        password: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe',
      });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
      expect(result.user).not.toHaveProperty('passwordHash');
      expect(mockUserRepo.save).toHaveBeenCalledTimes(1);
    });

    it('should hash password before saving', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);
      const mockUser = { id: '1', email: 'test@test.com', firstName: 'A', lastName: 'B' };
      mockUserRepo.create.mockImplementation((data: any) => data);
      mockUserRepo.save.mockImplementation((data: any) => Promise.resolve({ ...data, id: '1' }));
      mockJwtService.signAsync.mockResolvedValue('token');
      mockRefreshTokenRepo.create.mockReturnValue({});
      mockRefreshTokenRepo.save.mockResolvedValue({});

      await service.register({
        email: 'test@test.com',
        password: 'PlainPassword123',
        firstName: 'A',
        lastName: 'B',
      });

      const savedData = mockUserRepo.create.mock.calls[0][0];
      expect(savedData.passwordHash).not.toBe('PlainPassword123');
      expect(savedData.passwordHash).toMatch(/^\$2[aby]\$/);
    });
  });

  describe('validateUser', () => {
    it('should return null if user not found', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);
      const result = await service.validateUser('test@test.com', 'pass');
      expect(result).toBeNull();
    });

    it('should return null if user is inactive', async () => {
      mockUserRepo.findOne.mockResolvedValue({
        id: '1',
        email: 'test@test.com',
        passwordHash: '$2b$12$invalid',
        isActive: false,
      });
      const result = await service.validateUser('test@test.com', 'pass');
      expect(result).toBeNull();
    });
  });

  describe('logout', () => {
    it('should revoke all refresh tokens for user', async () => {
      mockRefreshTokenRepo.update.mockResolvedValue({ affected: 2 });

      await service.logout('user-id');

      expect(mockRefreshTokenRepo.update).toHaveBeenCalledWith(
        { userId: 'user-id', isRevoked: false },
        { isRevoked: true },
      );
    });
  });
});
