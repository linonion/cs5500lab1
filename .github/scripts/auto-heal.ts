import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { relative, resolve } from "node:path";

interface ResponseContent {
  type?: string;
  text?: string;
}

interface ResponseOutput {
  content?: ResponseContent[];
}

interface OpenAIResponse {
  error?: { message?: string };
  output?: ResponseOutput[];
}

const MAX_CONTEXT_CHARACTERS = 120_000;
const failureLogPath = process.argv[2] ?? "test-results.log";
const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  throw new Error("OPENAI_API_KEY is required to run the auto-healing agent");
}

function runGit(args: string[]): string {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function listSourceFiles(): string[] {
  return runGit(["ls-files", "src/**/*.ts", "src/*.ts"])
    .split("\n")
    .filter(Boolean)
    .filter(
      (filePath) =>
        !filePath.includes("/__tests__/") &&
        !filePath.includes("/test/") &&
        !filePath.endsWith(".test.ts"),
    );
}

function changedSourceFiles(): Set<string> {
  const baseRef = process.env.BASE_REF;
  if (!baseRef) {
    return new Set<string>();
  }

  try {
    return new Set(
      runGit(["diff", "--name-only", `origin/${baseRef}...HEAD`, "--", "src"])
        .split("\n")
        .filter(Boolean),
    );
  } catch {
    return new Set<string>();
  }
}

function buildSourceContext(): string {
  const changedFiles = changedSourceFiles();
  const files = listSourceFiles().sort((left, right) => {
    return Number(changedFiles.has(right)) - Number(changedFiles.has(left));
  });
  let context = "";

  for (const filePath of files) {
    const section = `\n--- ${filePath} ---\n${readFileSync(filePath, "utf8")}`;
    if (context.length + section.length > MAX_CONTEXT_CHARACTERS) {
      break;
    }
    context += section;
  }

  return context;
}

function extractOutputText(response: OpenAIResponse): string {
  const texts =
    response.output?.flatMap(
      (item) =>
        item.content
          ?.filter((content) => content.type === "output_text")
          .map((content) => content.text ?? "") ?? [],
    ) ?? [];
  const output = texts.join("\n").trim();

  if (!output) {
    throw new Error(response.error?.message ?? "The AI response contained no patch");
  }
  return output;
}

function normalizePatch(output: string): string {
  const fencedPatch = output.match(/```(?:diff|patch)?\s*\n([\s\S]*?)```/i);
  const candidate = (fencedPatch?.[1] ?? output).trim();
  const start = candidate.indexOf("diff --git ");

  if (start < 0) {
    throw new Error("The AI response was not a unified git patch");
  }
  return `${candidate.slice(start).trim()}\n`;
}

function validatePatch(patch: string): void {
  const paths = [...patch.matchAll(/^diff --git a\/(.+) b\/(.+)$/gm)].flatMap(
    (match) => [match[1], match[2]],
  );

  if (paths.length === 0) {
    throw new Error("The patch does not modify any files");
  }

  for (const filePath of paths) {
    const normalizedPath = relative(process.cwd(), resolve(filePath));
    const isTestFile =
      normalizedPath.includes("/__tests__/") ||
      normalizedPath.includes("/test/") ||
      normalizedPath.endsWith(".test.ts");

    if (
      normalizedPath.startsWith("..") ||
      !normalizedPath.startsWith("src/") ||
      isTestFile
    ) {
      throw new Error(`The AI attempted to modify a disallowed file: ${filePath}`);
    }
  }
}

async function main(): Promise<void> {
  const failureLog = readFileSync(failureLogPath, "utf8");
  const sourceContext = buildSourceContext();
  const changedDiff = process.env.BASE_REF
    ? runGit(["diff", `origin/${process.env.BASE_REF}...HEAD`, "--", "src"])
    : "";
  const prompt = `Parse the attached Jest failure log. Locate the source code causing the failure in src/ and generate a patch that fixes the bug without breaking existing tests.

Return only a unified git diff beginning with "diff --git". Modify the smallest possible set of production files under src/. Do not modify tests, snapshots, configuration, dependencies, generated files, or CI files.

JEST FAILURE LOG:
${failureLog}

CURRENT BRANCH DIFF:
${changedDiff}

SOURCE FILE CONTEXT:
${sourceContext}`;

  const apiResponse = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-5-mini",
      input: prompt,
    }),
  });
  const responseBody: unknown = await apiResponse.json();

  if (!apiResponse.ok) {
    const message =
      typeof responseBody === "object" && responseBody !== null
        ? JSON.stringify(responseBody)
        : apiResponse.statusText;
    throw new Error(`OpenAI API request failed (${apiResponse.status}): ${message}`);
  }

  const patch = normalizePatch(extractOutputText(responseBody as OpenAIResponse));
  validatePatch(patch);
  writeFileSync("auto-heal.patch", patch, "utf8");
  execFileSync("git", ["apply", "--check", "auto-heal.patch"], {
    stdio: "inherit",
  });
  execFileSync("git", ["apply", "auto-heal.patch"], { stdio: "inherit" });
  console.log("Applied the validated AI patch to production source files.");
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
