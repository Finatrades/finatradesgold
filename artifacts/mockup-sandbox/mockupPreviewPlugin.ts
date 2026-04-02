import type { Plugin, ViteDevServer } from "vite";
import fg from "fast-glob";
import path from "path";
import fs from "fs";

const MOCKUP_DIR = "src/components/mockups";
const GENERATED_FILE = "src/.generated/mockup-components.ts";

function getComponentName(filePath: string): string {
  return path.basename(filePath, path.extname(filePath));
}

function getFolderName(filePath: string): string {
  const parts = filePath.split("/");
  // File is either directly in mockups/ or in a subfolder
  if (parts.length === 1) return "";
  return parts.slice(0, -1).join("/");
}

async function generateRegistry(rootDir: string) {
  const pattern = `${MOCKUP_DIR}/**/*.tsx`;
  const files = await fg(pattern, {
    cwd: rootDir,
    ignore: ["**/_*", "**/_*/**"],
  });

  const imports: string[] = [];
  const entries: string[] = [];

  files.forEach((file, index) => {
    const name = getComponentName(file);
    const folder = getFolderName(file.replace(MOCKUP_DIR + "/", ""));
    const importPath = `../../${file}`;
    const varName = `Component${index}`;
    imports.push(`import ${varName} from "${importPath}";`);
    const routeKey = folder ? `${folder}/${name}` : name;
    entries.push(`  "${routeKey}": ${varName}`);
  });

  const content = `// Auto-generated — do not edit manually
${imports.join("\n")}

export const mockupComponents: Record<string, React.ComponentType> = {
${entries.join(",\n")}
};

export type MockupKey = keyof typeof mockupComponents;
`;

  const generatedDir = path.join(rootDir, "src/.generated");
  if (!fs.existsSync(generatedDir)) {
    fs.mkdirSync(generatedDir, { recursive: true });
  }
  fs.writeFileSync(path.join(rootDir, GENERATED_FILE), content, "utf-8");
}

export function mockupPreviewPlugin(): Plugin {
  let rootDir = "";

  return {
    name: "mockup-preview-plugin",
    configResolved(config) {
      rootDir = config.root;
    },
    async buildStart() {
      await generateRegistry(rootDir);
    },
    configureServer(server: ViteDevServer) {
      // Watch for new/deleted mockup files and regenerate the registry
      const watcher = server.watcher;
      const mockupGlob = path.join(rootDir, MOCKUP_DIR, "**/*.tsx");

      const regen = async () => {
        await generateRegistry(rootDir);
        // Invalidate the generated module so HMR picks it up
        const mod = server.moduleGraph.getModuleById(
          path.join(rootDir, GENERATED_FILE)
        );
        if (mod) server.moduleGraph.invalidateModule(mod);
      };

      watcher.on("add", (f) => {
        if (f.includes(MOCKUP_DIR) && !path.basename(f).startsWith("_")) regen();
      });
      watcher.on("unlink", (f) => {
        if (f.includes(MOCKUP_DIR)) regen();
      });

      // Handle 404s for preview routes by rescanning
      server.middlewares.use(async (req, res, next) => {
        if (req.url?.startsWith("/preview/")) {
          await generateRegistry(rootDir);
        }
        next();
      });
    },
  };
}
