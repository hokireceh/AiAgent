import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { workspacesTable, workspaceFilesTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";

const router: IRouter = Router();

const LANGUAGE_EXTENSIONS: Record<string, string> = {
  python: "py", javascript: "js", typescript: "ts", cpp: "cpp", c: "c",
  java: "java", go: "go", rust: "rs", php: "php", ruby: "rb",
  bash: "sh", r: "r", swift: "swift", kotlin: "kt", csharp: "cs",
};

const DEFAULT_CONTENT: Record<string, string> = {
  python: `# Welcome to your Python workspace\nprint("Hello, World!")\n`,
  javascript: `// Welcome to your JavaScript workspace\nconsole.log("Hello, World!");\n`,
  typescript: `// Welcome to your TypeScript workspace\nconst message: string = "Hello, World!";\nconsole.log(message);\n`,
  cpp: `#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello, World!" << endl;\n    return 0;\n}\n`,
  c: `#include <stdio.h>\n\nint main() {\n    printf("Hello, World!\\n");\n    return 0;\n}\n`,
  java: `public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}\n`,
  go: `package main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello, World!")\n}\n`,
  rust: `fn main() {\n    println!("Hello, World!");\n}\n`,
  php: `<?php\necho "Hello, World!\\n";\n`,
  ruby: `puts "Hello, World!"\n`,
  bash: `#!/bin/bash\necho "Hello, World!"\n`,
  r: `cat("Hello, World!\\n")\n`,
  swift: `import Foundation\nprint("Hello, World!")\n`,
};

// List workspaces
router.get("/", async (req, res) => {
  try {
    const workspaces = await db.select().from(workspacesTable).orderBy(workspacesTable.updatedAt);
    res.json({ workspaces });
  } catch (err) {
    req.log.error({ err }, "Failed to list workspaces");
    res.status(500).json({ error: "server_error", message: "Failed to list workspaces" });
  }
});

// Create workspace
router.post("/", async (req, res) => {
  try {
    const { name, language = "python", description } = req.body;
    if (!name) return res.status(400).json({ error: "validation_error", message: "name is required" });

    const [workspace] = await db
      .insert(workspacesTable)
      .values({ name, language, description })
      .returning();

    const ext = LANGUAGE_EXTENSIONS[language] ?? "txt";
    const fileName = language === "java" ? "Main.java" : `main.${ext}`;
    const content = DEFAULT_CONTENT[language] ?? `# ${name}\n`;

    await db.insert(workspaceFilesTable).values({
      workspaceId: workspace.id,
      name: fileName,
      path: fileName,
      content,
      language,
    });

    res.status(201).json(workspace);
  } catch (err) {
    req.log.error({ err }, "Failed to create workspace");
    res.status(500).json({ error: "server_error", message: "Failed to create workspace" });
  }
});

// Get workspace with files
router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id!, 10);
    const [workspace] = await db.select().from(workspacesTable).where(eq(workspacesTable.id, id));
    if (!workspace) return res.status(404).json({ error: "not_found", message: "Workspace not found" });

    const files = await db
      .select()
      .from(workspaceFilesTable)
      .where(eq(workspaceFilesTable.workspaceId, id))
      .orderBy(workspaceFilesTable.name);

    res.json({ workspace, files });
  } catch (err) {
    req.log.error({ err }, "Failed to get workspace");
    res.status(500).json({ error: "server_error", message: "Failed to get workspace" });
  }
});

// Update workspace
router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id!, 10);
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (req.body.name) updates.name = req.body.name;
    if (req.body.language) updates.language = req.body.language;
    if (req.body.description !== undefined) updates.description = req.body.description;

    const [workspace] = await db
      .update(workspacesTable)
      .set(updates)
      .where(eq(workspacesTable.id, id))
      .returning();

    if (!workspace) return res.status(404).json({ error: "not_found", message: "Workspace not found" });
    res.json(workspace);
  } catch (err) {
    req.log.error({ err }, "Failed to update workspace");
    res.status(500).json({ error: "server_error", message: "Failed to update workspace" });
  }
});

// Delete workspace
router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id!, 10);
    await db.delete(workspacesTable).where(eq(workspacesTable.id, id));
    res.json({ success: true, message: "Workspace deleted" });
  } catch (err) {
    req.log.error({ err }, "Failed to delete workspace");
    res.status(500).json({ error: "server_error", message: "Failed to delete workspace" });
  }
});

// Create file in workspace
router.post("/:id/files", async (req, res) => {
  try {
    const workspaceId = parseInt(req.params.id!, 10);
    const { name, path, content = "", language = "plaintext" } = req.body;
    if (!name || !path) return res.status(400).json({ error: "validation_error", message: "name and path required" });

    const [file] = await db
      .insert(workspaceFilesTable)
      .values({ workspaceId, name, path, content, language })
      .returning();

    res.status(201).json(file);
  } catch (err) {
    req.log.error({ err }, "Failed to create file");
    res.status(500).json({ error: "server_error", message: "Failed to create file" });
  }
});

// Update file
router.put("/:id/files/:fileId", async (req, res) => {
  try {
    const workspaceId = parseInt(req.params.id!, 10);
    const fileId = parseInt(req.params.fileId!, 10);
    const { content, name } = req.body;

    const updates: Record<string, unknown> = { content, updatedAt: new Date() };
    if (name) updates.name = name;

    const [file] = await db
      .update(workspaceFilesTable)
      .set(updates)
      .where(and(eq(workspaceFilesTable.id, fileId), eq(workspaceFilesTable.workspaceId, workspaceId)))
      .returning();

    if (!file) return res.status(404).json({ error: "not_found", message: "File not found" });

    await db.update(workspacesTable).set({ updatedAt: new Date() }).where(eq(workspacesTable.id, workspaceId));

    res.json(file);
  } catch (err) {
    req.log.error({ err }, "Failed to update file");
    res.status(500).json({ error: "server_error", message: "Failed to update file" });
  }
});

// Delete file
router.delete("/:id/files/:fileId", async (req, res) => {
  try {
    const workspaceId = parseInt(req.params.id!, 10);
    const fileId = parseInt(req.params.fileId!, 10);

    await db
      .delete(workspaceFilesTable)
      .where(and(eq(workspaceFilesTable.id, fileId), eq(workspaceFilesTable.workspaceId, workspaceId)));

    res.json({ success: true, message: "File deleted" });
  } catch (err) {
    req.log.error({ err }, "Failed to delete file");
    res.status(500).json({ error: "server_error", message: "Failed to delete file" });
  }
});

export default router;
