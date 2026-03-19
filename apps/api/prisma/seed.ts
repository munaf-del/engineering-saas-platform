import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('DemoPassword1!', 12);

  // ── Users & Org ───────────────────────────────────────────────

  const user = await prisma.user.upsert({
    where: { email: 'admin@demo.eng' },
    update: {},
    create: {
      email: 'admin@demo.eng',
      name: 'Demo Admin',
      password: hashedPassword,
    },
  });

  const org = await prisma.organisation.upsert({
    where: { slug: 'demo-engineering' },
    update: {},
    create: {
      name: 'Demo Engineering Pty Ltd',
      slug: 'demo-engineering',
      abn: '12345678901',
    },
  });

  await prisma.organisationMember.upsert({
    where: {
      organisationId_userId: { organisationId: org.id, userId: user.id },
    },
    update: {},
    create: {
      organisationId: org.id,
      userId: user.id,
      role: 'owner',
    },
  });

  const project = await prisma.project.upsert({
    where: {
      organisationId_code: { organisationId: org.id, code: 'DEMO-001' },
    },
    update: {},
    create: {
      organisationId: org.id,
      name: 'Demo Bridge Assessment',
      code: 'DEMO-001',
      description: 'Demonstration project for the engineering platform',
    },
  });

  await prisma.projectMember.upsert({
    where: {
      projectId_userId: { projectId: project.id, userId: user.id },
    },
    update: {},
    create: {
      projectId: project.id,
      userId: user.id,
      role: 'lead',
    },
  });

  // ── Standards Registry (metadata-only, is_demo=true) ──────────

  const standardsDefs = [
    { code: 'AS/NZS 1170.0', title: 'Structural design actions, Part 0: General principles', category: 'loading' as const, edition: '2002', amendment: 'Amdt 5 (2021)', effectiveDate: '2002-06-04' },
    { code: 'AS/NZS 1170.1', title: 'Structural design actions, Part 1: Permanent, imposed and other actions', category: 'loading' as const, edition: '2002', amendment: 'Amdt 3 (2021)', effectiveDate: '2002-06-04' },
    { code: 'AS/NZS 1170.2', title: 'Structural design actions, Part 2: Wind actions', category: 'loading' as const, edition: '2021', effectiveDate: '2021-10-01' },
    { code: 'AS 1170.4', title: 'Structural design actions, Part 4: Earthquake actions in Australia', category: 'loading' as const, edition: '2024', effectiveDate: '2024-05-01' },
    { code: 'AS 3600', title: 'Concrete structures', category: 'concrete' as const, edition: '2018', amendment: 'Amdt 2 (2021)', effectiveDate: '2018-06-29' },
    { code: 'AS 4100', title: 'Steel structures', category: 'steel' as const, edition: '2020', effectiveDate: '2020-10-23' },
    { code: 'AS/NZS 4671', title: 'Steel for the reinforcement of concrete', category: 'reinforcement' as const, edition: '2019', effectiveDate: '2019-10-11' },
    { code: 'AS/NZS 3678', title: 'Structural steel: hot-rolled plates, floorplates and slabs', category: 'steel' as const, edition: '2016', effectiveDate: '2016-08-12' },
    { code: 'AS/NZS 3679.1', title: 'Structural steel, Part 1: Hot-rolled bars and sections', category: 'steel' as const, edition: '2016', effectiveDate: '2016-08-12' },
    { code: 'AS/NZS 3679.2', title: 'Structural steel, Part 2: Welded I sections', category: 'steel' as const, edition: '2016', effectiveDate: '2016-08-12' },
    { code: 'AS/NZS 1163', title: 'Cold-formed structural steel hollow sections', category: 'steel' as const, edition: '2016', effectiveDate: '2016-09-02' },
    { code: 'AS 2159', title: 'Piling: design and installation', category: 'geotech' as const, edition: '2009', amendment: 'Amdt 1 (2010)', effectiveDate: '2009-09-18' },
    { code: 'AS 1726', title: 'Geotechnical site investigations', category: 'geotech' as const, edition: '2017', effectiveDate: '2017-05-31' },
    { code: 'AS 1289', title: 'Methods of testing soils for engineering purposes (series)', category: 'geotech' as const, edition: 'various', effectiveDate: '2000-01-01', note: 'Multi-part series covering soil testing methods' },
    { code: 'AS 3798', title: 'Guidelines on earthworks for commercial and residential developments', category: 'geotech' as const, edition: '2007', effectiveDate: '2007-05-04' },
  ];

  for (const std of standardsDefs) {
    const standard = await prisma.standard.upsert({
      where: { code: std.code },
      update: { title: std.title, category: std.category },
      create: {
        code: std.code,
        title: std.title,
        category: std.category,
        isDemo: true,
      },
    });

    await prisma.standardEdition.upsert({
      where: { code_edition: { code: std.code, edition: std.edition } },
      update: {},
      create: {
        standardId: standard.id,
        code: std.code,
        title: std.title,
        edition: std.edition,
        amendment: std.amendment,
        sourceEdition: std.edition,
        sourceAmendment: std.amendment,
        effectiveDate: new Date(std.effectiveDate),
        status: 'current',
        isDemo: true,
        note: (std as Record<string, unknown>).note as string | undefined,
      },
    });
  }

  // ── Standards Profile ─────────────────────────────────────────

  const profile = await prisma.standardsProfile.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      organisationId: org.id,
      name: 'Australian Standards – Current',
      description: 'Default demo profile with all current Australian Standards',
      isDefault: true,
    },
  });

  const allEditions = await prisma.standardEdition.findMany({
    where: { isDemo: true, status: 'current' },
  });

  for (const edition of allEditions) {
    await prisma.pinnedStandard.upsert({
      where: {
        standardsProfileId_standardEditionId: {
          standardsProfileId: profile.id,
          standardEditionId: edition.id,
        },
      },
      update: {},
      create: {
        standardsProfileId: profile.id,
        standardEditionId: edition.id,
      },
    });
  }

  await prisma.project.update({
    where: { id: project.id },
    data: { standardsProfileId: profile.id },
  });

  // ── Material Families ─────────────────────────────────────────

  const concreteFam = await prisma.materialFamily.upsert({
    where: { code: 'CONCRETE' },
    update: {},
    create: {
      code: 'CONCRETE',
      name: 'Concrete',
      description: 'Normal and high-strength concrete per AS 3600',
      category: 'concrete',
      isDemo: true,
    },
  });

  const steelFam = await prisma.materialFamily.upsert({
    where: { code: 'STRUCTURAL_STEEL' },
    update: {},
    create: {
      code: 'STRUCTURAL_STEEL',
      name: 'Structural Steel',
      description: 'Hot-rolled structural steel per AS/NZS 3678 and AS/NZS 3679',
      category: 'structural_steel',
      isDemo: true,
    },
  });

  const rebarFam = await prisma.materialFamily.upsert({
    where: { code: 'REINFORCING_STEEL' },
    update: {},
    create: {
      code: 'REINFORCING_STEEL',
      name: 'Reinforcing Steel',
      description: 'Reinforcement per AS/NZS 4671',
      category: 'reinforcing_steel',
      isDemo: true,
    },
  });

  // ── Demo Material Grades ──────────────────────────────────────

  const demoMaterials = [
    { name: "N32 Concrete", category: 'concrete' as const, grade: 'N32', familyId: concreteFam.id, sourceStandard: 'AS 3600', sourceEdition: '2018', properties: { compressiveStrength: { value: 32, unit: 'MPa' }, elasticModulus: { value: 30100, unit: 'MPa' }, density: { value: 2400, unit: 'kg/m³' } } },
    { name: "N40 Concrete", category: 'concrete' as const, grade: 'N40', familyId: concreteFam.id, sourceStandard: 'AS 3600', sourceEdition: '2018', properties: { compressiveStrength: { value: 40, unit: 'MPa' }, elasticModulus: { value: 32800, unit: 'MPa' }, density: { value: 2400, unit: 'kg/m³' } } },
    { name: "Grade 300 Steel", category: 'structural_steel' as const, grade: '300', familyId: steelFam.id, sourceStandard: 'AS/NZS 3678', sourceEdition: '2016', properties: { yieldStrength: { value: 300, unit: 'MPa' }, tensileStrength: { value: 440, unit: 'MPa' }, elasticModulus: { value: 200000, unit: 'MPa' } } },
    { name: "Grade 350 Steel", category: 'structural_steel' as const, grade: '350', familyId: steelFam.id, sourceStandard: 'AS/NZS 3678', sourceEdition: '2016', properties: { yieldStrength: { value: 350, unit: 'MPa' }, tensileStrength: { value: 480, unit: 'MPa' }, elasticModulus: { value: 200000, unit: 'MPa' } } },
  ];

  for (const mat of demoMaterials) {
    const existing = await prisma.material.findFirst({
      where: { name: mat.name, isDemo: true },
    });
    if (!existing) {
      await prisma.material.create({
        data: {
          familyId: mat.familyId,
          category: mat.category,
          name: mat.name,
          grade: mat.grade,
          sourceStandard: mat.sourceStandard,
          sourceEdition: mat.sourceEdition,
          properties: mat.properties,
          isSystemDefault: true,
          isDemo: true,
        },
      });
    }
  }

  // ── Geotech Material Classes ──────────────────────────────────

  const geotechClasses = [
    { code: 'CL', name: 'Clay (low plasticity)', classification: 'USCS' },
    { code: 'CH', name: 'Clay (high plasticity)', classification: 'USCS' },
    { code: 'SP', name: 'Sand (poorly graded)', classification: 'USCS' },
    { code: 'SW', name: 'Sand (well graded)', classification: 'USCS' },
    { code: 'GW', name: 'Gravel (well graded)', classification: 'USCS' },
    { code: 'ML', name: 'Silt (low plasticity)', classification: 'USCS' },
  ];

  for (const cls of geotechClasses) {
    const geoCls = await prisma.geotechMaterialClass.upsert({
      where: { code: cls.code },
      update: {},
      create: { ...cls, isDemo: true },
    });

    if (cls.code === 'CL') {
      const existing = await prisma.geotechParameterSet.findFirst({
        where: { classId: geoCls.id, name: 'Stiff Clay – Typical', isDemo: true },
      });
      if (!existing) {
        await prisma.geotechParameterSet.create({
          data: {
            classId: geoCls.id,
            name: 'Stiff Clay – Typical',
            sourceStandard: 'AS 1726',
            sourceEdition: '2017',
            parameters: {
              unitWeight: { value: 19, unit: 'kN/m³' },
              cohesion: { value: 50, unit: 'kPa' },
              frictionAngle: { value: 25, unit: 'deg' },
            },
            isDemo: true,
          },
        });
      }
    }
  }

  // ── Demo Steel Section Catalog (snapshot) ─────────────────────

  let steelCatalog = await prisma.steelSectionCatalog.findFirst({
    where: { name: 'Demo ASI Open Sections', version: '2024.1', isDemo: true },
  });

  if (!steelCatalog) {
    steelCatalog = await prisma.steelSectionCatalog.create({
      data: {
        name: 'Demo ASI Open Sections',
        version: '2024.1',
        sourceStandard: 'AS/NZS 3679.1',
        sourceEdition: '2016',
        status: 'active',
        isDemo: true,
        snapshotHash: 'demo-seed-hash',
      },
    });

    const demoSections = [
      { designation: '200UB25.4', sectionType: 'UB', properties: { massPerMetre: 25.4, depth: 203, flangeWidth: 133, flangeThickness: 7.8, webThickness: 5.8 } },
      { designation: '310UB40.4', sectionType: 'UB', properties: { massPerMetre: 40.4, depth: 304, flangeWidth: 165, flangeThickness: 10.2, webThickness: 6.1 } },
      { designation: '460UB67.1', sectionType: 'UB', properties: { massPerMetre: 67.1, depth: 454, flangeWidth: 190, flangeThickness: 12.7, webThickness: 8.5 } },
      { designation: '150UC23.4', sectionType: 'UC', properties: { massPerMetre: 23.4, depth: 152, flangeWidth: 152, flangeThickness: 6.8, webThickness: 6.1 } },
      { designation: '250UC72.9', sectionType: 'UC', properties: { massPerMetre: 72.9, depth: 254, flangeWidth: 254, flangeThickness: 14.2, webThickness: 8.6 } },
    ];

    for (const s of demoSections) {
      await prisma.steelSection.create({
        data: {
          catalogId: steelCatalog.id,
          designation: s.designation,
          sectionType: s.sectionType,
          properties: s.properties,
          standardRef: 'AS/NZS 3679.1:2016',
          isDemo: true,
        },
      });
    }
  }

  // ── Demo Rebar Catalog (snapshot) ─────────────────────────────

  let rebarCatalog = await prisma.rebarCatalog.findFirst({
    where: { name: 'Demo AS/NZS 4671 Rebar', version: '2024.1', isDemo: true },
  });

  if (!rebarCatalog) {
    rebarCatalog = await prisma.rebarCatalog.create({
      data: {
        name: 'Demo AS/NZS 4671 Rebar',
        version: '2024.1',
        sourceStandard: 'AS/NZS 4671',
        sourceEdition: '2019',
        status: 'active',
        isDemo: true,
        snapshotHash: 'demo-rebar-seed-hash',
      },
    });

    const demoRebar = [
      { designation: 'N10', barDiameter: 10, nominalArea: 78.5, massPerMetre: 0.617, grade: 'D500N', ductilityClass: 'N' },
      { designation: 'N12', barDiameter: 12, nominalArea: 113.1, massPerMetre: 0.888, grade: 'D500N', ductilityClass: 'N' },
      { designation: 'N16', barDiameter: 16, nominalArea: 201.1, massPerMetre: 1.578, grade: 'D500N', ductilityClass: 'N' },
      { designation: 'N20', barDiameter: 20, nominalArea: 314.2, massPerMetre: 2.466, grade: 'D500N', ductilityClass: 'N' },
      { designation: 'N24', barDiameter: 24, nominalArea: 452.4, massPerMetre: 3.551, grade: 'D500N', ductilityClass: 'N' },
      { designation: 'N28', barDiameter: 28, nominalArea: 615.8, massPerMetre: 4.834, grade: 'D500N', ductilityClass: 'N' },
      { designation: 'N32', barDiameter: 32, nominalArea: 804.2, massPerMetre: 6.313, grade: 'D500N', ductilityClass: 'N' },
      { designation: 'N36', barDiameter: 36, nominalArea: 1017.9, massPerMetre: 7.990, grade: 'D500N', ductilityClass: 'N' },
      { designation: 'L10', barDiameter: 10, nominalArea: 78.5, massPerMetre: 0.617, grade: 'D500L', ductilityClass: 'L' },
      { designation: 'L12', barDiameter: 12, nominalArea: 113.1, massPerMetre: 0.888, grade: 'D500L', ductilityClass: 'L' },
    ];

    for (const r of demoRebar) {
      await prisma.rebarSize.create({
        data: {
          catalogId: rebarCatalog.id,
          ...r,
          standardRef: 'AS/NZS 4671:2019',
          isDemo: true,
        },
      });
    }
  }

  console.log('Seed data created successfully');
  console.log(`  User:    ${user.email} (password: DemoPassword1!)`);
  console.log(`  Org:     ${org.name} (${org.slug})`);
  console.log(`  Project: ${project.name} (${project.code})`);
  console.log(`  Standards: ${standardsDefs.length} standards with editions`);
  console.log(`  Steel catalog: ${steelCatalog.name} v${steelCatalog.version}`);
  console.log(`  Rebar catalog: ${rebarCatalog.name} v${rebarCatalog.version}`);
  console.log('  All demo data marked is_demo=true');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
