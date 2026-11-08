import { scopeProjectRef, scopedProjectKey } from "@t3tools/client-runtime/environment";
import type { EnvironmentId, LinearIssueDetail } from "@t3tools/contracts";
import { PlayIcon } from "lucide-react";
import { useState } from "react";
import { useNewThreadHandler } from "../../hooks/useHandleNewThread";
import { useProjects } from "../../state/entities";
import { useEnvironments } from "../../state/environments";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "../ui/dialog";
import { LinearSelect } from "./LinearControls";

export function LinearStartWork({
  environmentId,
  issue,
}: {
  environmentId: EnvironmentId;
  issue: LinearIssueDetail;
}) {
  const projects = useProjects();
  const { environments } = useEnvironments();
  const handleNewThread = useNewThreadHandler();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const available = projects
    .filter(
      (project) =>
        project.archivedAt == null &&
        !project.isScratch &&
        environments.some(
          (env) =>
            env.environmentId === project.environmentId && env.connection.phase === "connected",
        ),
    )
    .map((project) => ({
      ...project,
      key: scopedProjectKey(scopeProjectRef(project.environmentId, project.id)),
    }));
  const project =
    selected === null
      ? (available.find((project) => project.environmentId === environmentId) ?? available[0])
      : available.find((project) => project.key === selected);
  const start = async () => {
    if (!project || busy) return;
    setBusy(true);
    setError(null);
    const prompt = `Work on Linear issue ${issue.identifier}: ${issue.title}\n${issue.url}\n\n${issue.description ?? ""}\n\nRead the issue and its discussion before starting. Keep the issue updated as work progresses.`;
    try {
      const opened = await handleNewThread(scopeProjectRef(project.environmentId, project.id), {
        prompt: prompt.slice(0, 8000).replace(/[\uD800-\uDBFF]$/, ""),
      });
      if (opened) setOpen(false);
      else setError("The thread could not be opened. Try again.");
    } catch {
      setError("The thread could not be opened. Try again.");
    }
    setBusy(false);
  };
  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
      >
        <PlayIcon className="size-4" />
        Start work
      </Button>
      <Dialog open={open} onOpenChange={(next) => !busy && setOpen(next)}>
        <DialogPopup className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Start work on {issue.identifier}</DialogTitle>
            <DialogDescription>
              Add the issue context to a new thread. Review it before sending.
            </DialogDescription>
          </DialogHeader>
          <DialogPanel>
            {available.length > 0 ? (
              <LinearSelect
                label="T3 project"
                value={project?.key ?? ""}
                options={available.map((project) => ({
                  id: project.key,
                  name: `${project.title} · ${environments.find((env) => env.environmentId === project.environmentId)?.label ?? "Environment"}`,
                }))}
                onChange={setSelected}
                disabled={busy}
                empty="Choose a project"
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                Add a project to a connected T3 environment to start work here.
              </p>
            )}
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
          </DialogPanel>
          <DialogFooter>
            <Button variant="ghost" disabled={busy} onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button disabled={!project || busy} onClick={() => void start()}>
              {busy ? "Opening…" : "Open thread"}
            </Button>
          </DialogFooter>
        </DialogPopup>
      </Dialog>
    </>
  );
}
