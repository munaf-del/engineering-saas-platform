import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { RulePackIngestionService } from './rule-pack-ingestion.service';
import { PrismaService } from '../../common/prisma/prisma.service';

const mockPrisma = {
  standardRulePack: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  rulePackActivation: {
    findMany: jest.fn(),
    create: jest.fn(),
    updateMany: jest.fn(),
  },
};

describe('RulePackIngestionService', () => {
  let service: RulePackIngestionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RulePackIngestionService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get(RulePackIngestionService);
    jest.clearAllMocks();
  });

  describe('validateAndPreview', () => {
    it('should fail on empty rows', async () => {
      await expect(
        service.validateAndPreview([], 'load_combination_rules'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should fail when standardCode is missing from metadata', async () => {
      const rows = [
        {
          rowNumber: 1,
          data: {
            ruleKey: 'gamma_g',
            clauseRef: '4.2.2',
            description: 'Permanent action factor',
            value: 1.35,
            _yamlMeta: { version: '1.0', effectiveDate: '2024-01-01', sourceDataset: 'test' },
          },
        },
      ];

      await expect(
        service.validateAndPreview(rows, 'load_combination_rules'),
      ).rejects.toThrow('standardCode is required');
    });

    it('should fail when version is missing from metadata', async () => {
      const rows = [
        {
          rowNumber: 1,
          data: {
            ruleKey: 'gamma_g',
            clauseRef: '4.2.2',
            description: 'Permanent action factor',
            value: 1.35,
            _yamlMeta: { standardCode: 'AS/NZS 1170.0', effectiveDate: '2024-01-01', sourceDataset: 'test' },
          },
        },
      ];

      await expect(
        service.validateAndPreview(rows, 'load_combination_rules'),
      ).rejects.toThrow('version is required');
    });

    it('should detect conflicts with active rule packs', async () => {
      mockPrisma.rulePackActivation.findMany.mockResolvedValue([
        {
          isActive: true,
          rulePack: {
            standardCode: 'AS/NZS 1170.0',
            version: '1.0',
            rules: {
              gamma_g: { clauseRef: '4.2.2', description: 'Old factor', value: 1.2 },
            },
          },
        },
      ]);

      const rows = [
        {
          rowNumber: 1,
          data: {
            ruleKey: 'gamma_g',
            clauseRef: '4.2.2',
            description: 'Permanent action factor',
            value: 1.35,
            _yamlMeta: {
              standardCode: 'AS/NZS 1170.0',
              version: '2.0',
              effectiveDate: '2024-01-01',
              sourceDataset: 'test',
            },
          },
        },
      ];

      const result = await service.validateAndPreview(rows, 'load_combination_rules');
      expect(result.conflicts.length).toBe(1);
      expect(result.conflicts[0]!.ruleKey).toBe('gamma_g');
      expect(result.conflicts[0]!.existingVersion).toBe('1.0');
      expect(result.conflicts[0]!.incomingVersion).toBe('2.0');
    });

    it('should produce valid preview for well-formed rules', async () => {
      mockPrisma.rulePackActivation.findMany.mockResolvedValue([]);

      const rows = [
        {
          rowNumber: 1,
          data: {
            ruleKey: 'phi_g',
            clauseRef: '4.2.3',
            description: 'Geotechnical reduction factor',
            value: 0.65,
            _yamlMeta: {
              standardCode: 'AS 2159',
              version: '1.0',
              effectiveDate: '2024-01-01',
              sourceDataset: 'placeholder',
            },
          },
        },
      ];

      const result = await service.validateAndPreview(rows, 'pile_design_rules');
      expect(result.standardCode).toBe('AS 2159');
      expect(result.version).toBe('1.0');
      expect(result.ruleCount).toBe(1);
      expect(result.contentHash).toBeDefined();
      expect(result.contentHash.length).toBe(64);
      expect(result.conflicts).toEqual([]);
    });
  });

  describe('ingest', () => {
    it('should reject duplicate version with different content', async () => {
      mockPrisma.standardRulePack.findUnique.mockResolvedValue({
        id: 'existing-id',
        standardCode: 'AS/NZS 1170.0',
        version: '1.0',
        contentHash: 'different-hash',
      });

      await expect(
        service.ingest('user-1', 'AS/NZS 1170.0', '1.0', {}, 'new-hash'),
      ).rejects.toThrow('already exists with different content');
    });

    it('should return existing pack when content hash matches', async () => {
      mockPrisma.standardRulePack.findUnique.mockResolvedValue({
        id: 'existing-id',
        standardCode: 'AS/NZS 1170.0',
        version: '1.0',
        contentHash: 'same-hash',
      });

      const result = await service.ingest('user-1', 'AS/NZS 1170.0', '1.0', {}, 'same-hash');
      expect(result.isNew).toBe(false);
      expect(result.rulePackId).toBe('existing-id');
    });

    it('should create new rule pack when no existing version', async () => {
      mockPrisma.standardRulePack.findUnique.mockResolvedValue(null);
      mockPrisma.standardRulePack.create.mockResolvedValue({
        id: 'new-id',
        standardCode: 'AS 2159',
        version: '1.0',
        contentHash: 'hash',
      });

      const result = await service.ingest(
        'user-1',
        'AS 2159',
        '1.0',
        { phi_g: { clauseRef: '4.2.3', description: 'test', value: 0.65 } },
        'hash',
      );
      expect(result.isNew).toBe(true);
      expect(result.rulePackId).toBe('new-id');
    });
  });
});
