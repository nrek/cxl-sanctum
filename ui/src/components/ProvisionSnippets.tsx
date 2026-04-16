import CopyButton from "./CopyButton";
import {
  heartbeatVerifyCommand,
  provisionCronFileContents,
  provisionOneShotCommand,
} from "@/lib/provision-snippets";

interface ProvisionSnippetsProps {
  apiBase: string;
  token: string;
  /** `dense` trims vertical spacing for inline use (ungrouped list). */
  variant?: "default" | "dense";
}

export default function ProvisionSnippets({
  apiBase,
  token,
  variant = "default",
}: ProvisionSnippetsProps) {
  const oneShot = provisionOneShotCommand(apiBase, token);
  const cronFile = provisionCronFileContents(apiBase, token);
  const cronFileDisplay = cronFile.replace(/\n+$/, "");
  const heartbeatCmd = heartbeatVerifyCommand(apiBase, token);

  const blockGap = variant === "dense" ? "mb-2" : "mb-3";
  const lastBlockGap = variant === "dense" ? "" : "mb-3";

  return (
    <>
      <p className="mb-1 text-xs font-medium text-sanctum-muted">
        Run once (bootstrap)
      </p>
      <div className={`${blockGap} flex flex-wrap items-center gap-2`}>
        <code className="min-w-0 flex-1 break-all rounded bg-[#0f1c24] px-2 py-1.5 font-mono text-xs text-sanctum-mist">
          {oneShot}
        </code>
        <CopyButton text={oneShot} />
      </div>
      <p className="mb-1 text-xs font-medium text-sanctum-muted">
        Cron (recommended) — save as{" "}
        <code className="text-sanctum-mist">/etc/cron.d/sanctum</code>{" "}
        (mode 0644; must end with a newline)
      </p>
      <div className={`${blockGap} flex flex-wrap items-start gap-2`}>
        <pre className="min-w-0 flex-1 whitespace-pre-wrap break-all rounded bg-[#0f1c24] px-2 py-1.5 font-mono text-xs text-sanctum-mist">
          {cronFileDisplay}
        </pre>
        <CopyButton text={cronFile} />
      </div>
      <p className="mb-1 text-xs font-medium text-sanctum-muted">
        Verify heartbeat (expect HTTP 200 and{" "}
        <code className="text-sanctum-mist">&quot;status&quot;:&quot;ok&quot;</code>
        )
      </p>
      <div className={`${lastBlockGap} flex flex-wrap items-center gap-2`}>
        <code className="min-w-0 flex-1 break-all rounded bg-[#0f1c24] px-2 py-1.5 font-mono text-xs text-sanctum-mist">
          {heartbeatCmd}
        </code>
        <CopyButton text={heartbeatCmd} />
      </div>
    </>
  );
}
