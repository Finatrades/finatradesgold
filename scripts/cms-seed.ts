import { db } from '../server/db';
import { contentPages, contentBlocks, templates, cmsLabels } from '../shared/schema';
import { eq } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';

const SEED_DATA_PATH = path.join(process.cwd(), 'data', 'cms-seed-data.json');

export interface CMSSeedData {
  exportedAt: string;
  pages: any[];
  blocks: any[];
  templates: any[];
  labels: any[];
}

export async function exportCMSData(): Promise<CMSSeedData> {
  const pages = await db.select().from(contentPages);
  const blocks = await db.select().from(contentBlocks);
  const templatesList = await db.select().from(templates);
  const labels = await db.select().from(cmsLabels);

  const data: CMSSeedData = {
    exportedAt: new Date().toISOString(),
    pages: pages.map(p => ({
      ...p,
      createdAt: undefined,
      updatedAt: undefined
    })),
    blocks: blocks.map(b => ({
      ...b,
      createdAt: undefined,
      updatedAt: undefined
    })),
    templates: templatesList.map(t => ({
      ...t,
      createdAt: undefined,
      updatedAt: undefined
    })),
    labels: labels.map(l => ({
      ...l,
      createdAt: undefined,
      updatedAt: undefined
    }))
  };

  return data;
}

export async function exportCMSToFile(): Promise<string> {
  const data = await exportCMSData();
  
  const dataDir = path.dirname(SEED_DATA_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  fs.writeFileSync(SEED_DATA_PATH, JSON.stringify(data, null, 2));
  return SEED_DATA_PATH;
}

export async function importCMSFromFile(): Promise<{ success: boolean; counts: any }> {
  if (!fs.existsSync(SEED_DATA_PATH)) {
    throw new Error(`Seed file not found at ${SEED_DATA_PATH}`);
  }

  const fileContent = fs.readFileSync(SEED_DATA_PATH, 'utf-8');
  const data: CMSSeedData = JSON.parse(fileContent);

  return await seedCMSData(data);
}

export async function seedCMSData(data: CMSSeedData): Promise<{ success: boolean; counts: any }> {
  const counts = {
    pages: { inserted: 0, updated: 0 },
    blocks: { inserted: 0, updated: 0 },
    templates: { inserted: 0, updated: 0 },
    labels: { inserted: 0, updated: 0 }
  };

  for (const page of data.pages) {
    const existing = await db.select().from(contentPages).where(eq(contentPages.id, page.id));
    if (existing.length > 0) {
      await db.update(contentPages)
        .set({ ...page, updatedAt: new Date() })
        .where(eq(contentPages.id, page.id));
      counts.pages.updated++;
    } else {
      await db.insert(contentPages).values({ ...page, createdAt: new Date(), updatedAt: new Date() });
      counts.pages.inserted++;
    }
  }

  for (const block of data.blocks) {
    const existing = await db.select().from(contentBlocks).where(eq(contentBlocks.id, block.id));
    if (existing.length > 0) {
      await db.update(contentBlocks)
        .set({ ...block, updatedAt: new Date() })
        .where(eq(contentBlocks.id, block.id));
      counts.blocks.updated++;
    } else {
      await db.insert(contentBlocks).values({ ...block, createdAt: new Date(), updatedAt: new Date() });
      counts.blocks.inserted++;
    }
  }

  for (const template of data.templates) {
    const existing = await db.select().from(templates).where(eq(templates.id, template.id));
    if (existing.length > 0) {
      await db.update(templates)
        .set({ ...template, updatedAt: new Date() })
        .where(eq(templates.id, template.id));
      counts.templates.updated++;
    } else {
      await db.insert(templates).values({ ...template, createdAt: new Date(), updatedAt: new Date() });
      counts.templates.inserted++;
    }
  }

  for (const label of data.labels) {
    const existing = await db.select().from(cmsLabels).where(eq(cmsLabels.id, label.id));
    if (existing.length > 0) {
      await db.update(cmsLabels)
        .set({ ...label, updatedAt: new Date() })
        .where(eq(cmsLabels.id, label.id));
      counts.labels.updated++;
    } else {
      await db.insert(cmsLabels).values({ ...label, createdAt: new Date(), updatedAt: new Date() });
      counts.labels.inserted++;
    }
  }

  return { success: true, counts };
}

const runCLI = async () => {
  const command = process.argv[2];
  
  if (command === 'export') {
    console.log('[CMS Seed] Exporting CMS data...');
    const filePath = await exportCMSToFile();
    console.log(`[CMS Seed] Data exported to: ${filePath}`);
  } else if (command === 'import' || command === 'seed') {
    console.log('[CMS Seed] Importing CMS data from seed file...');
    const result = await importCMSFromFile();
    console.log('[CMS Seed] Import complete:', result.counts);
  } else {
    console.log('Usage: npx tsx scripts/cms-seed.ts [export|import]');
    console.log('  export - Export current CMS data to data/cms-seed-data.json');
    console.log('  import - Import CMS data from data/cms-seed-data.json');
  }
  process.exit(0);
};

// ES module check for CLI execution
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  runCLI().catch(err => {
    console.error('[CMS Seed] Error:', err);
    process.exit(1);
  });
}
