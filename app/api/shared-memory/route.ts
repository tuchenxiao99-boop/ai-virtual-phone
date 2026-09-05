import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_REPOSITORY = "tuchenxiao99-boop/gu-memory-vault";
const DEFAULT_PATH = "shared-memory.md";

function secretMatches(actual: string, expected: string): boolean {
    const left = Buffer.from(actual);
    const right = Buffer.from(expected);
    return left.length === right.length && timingSafeEqual(left, right);
}

export async function GET(request: NextRequest) {
    const githubToken = process.env.MEMORY_VAULT_TOKEN?.trim();
    const syncSecret = process.env.MEMORY_SYNC_SECRET?.trim();
    if (!githubToken || !syncSecret) {
        return NextResponse.json({ error: "共享记忆服务尚未配置" }, { status: 503 });
    }

    const authorization = request.headers.get("authorization") || "";
    const suppliedSecret = authorization.startsWith("Bearer ")
        ? authorization.slice("Bearer ".length).trim()
        : "";
    if (!suppliedSecret || !secretMatches(suppliedSecret, syncSecret)) {
        return NextResponse.json({ error: "同步口令不正确" }, { status: 401 });
    }

    const repository = process.env.MEMORY_VAULT_REPOSITORY?.trim() || DEFAULT_REPOSITORY;
    const path = process.env.MEMORY_VAULT_PATH?.trim() || DEFAULT_PATH;
    const response = await fetch(
        `https://api.github.com/repos/${repository}/contents/${path}`,
        {
            headers: {
                Accept: "application/vnd.github+json",
                Authorization: `Bearer ${githubToken}`,
                "X-GitHub-Api-Version": "2022-11-28",
            },
            cache: "no-store",
        },
    );

    if (!response.ok) {
        return NextResponse.json(
            { error: response.status === 404 ? "找不到共享记忆文件" : "读取私人记忆库失败" },
            { status: response.status === 404 ? 404 : 502 },
        );
    }

    const data = await response.json() as { content?: string; encoding?: string; sha?: string };
    if (data.encoding !== "base64" || !data.content) {
        return NextResponse.json({ error: "共享记忆文件格式不正确" }, { status: 502 });
    }

    return NextResponse.json(
        {
            content: Buffer.from(data.content.replace(/\n/g, ""), "base64").toString("utf8"),
            sha: data.sha || "",
            syncedAt: new Date().toISOString(),
        },
        { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
}
