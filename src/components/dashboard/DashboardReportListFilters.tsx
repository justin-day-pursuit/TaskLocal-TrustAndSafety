"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import {
  dashboardHref,
  mergeDashboardParams,
  type DashboardParams,
} from "@/lib/dashboard/search-params";
import { REVIEWER_ROLES } from "@/lib/constants/enums";

interface DashboardReportListFiltersProps {
  params: DashboardParams;
}

export function DashboardReportListFilters({
  params,
}: DashboardReportListFiltersProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  function updateParams(updates: Partial<DashboardParams>) {
    startTransition(() => {
      router.push(dashboardHref(mergeDashboardParams(params, updates)), {
        scroll: false,
      });
    });
  }

  return (
    <form
      className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4 sm:flex-row sm:items-end"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        updateParams({
          q: String(formData.get("q") ?? "").trim() || undefined,
        });
      }}
    >
      <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm text-zinc-700">
        Search review text
        <input
          name="q"
          defaultValue={params.q ?? ""}
          placeholder="Search comment or reason"
          className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-base text-zinc-900"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-zinc-700">
        Reviewer role
        <select
          name="role"
          defaultValue={params.role}
          className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-base text-zinc-900"
          onChange={(event) => {
            const value = event.target.value;
            updateParams({
              role: value === "all" ? "all" : (value as (typeof REVIEWER_ROLES)[number]),
            });
          }}
        >
          <option value="all">All</option>
          {REVIEWER_ROLES.map((role) => (
            <option key={role} value={role}>
              {role.charAt(0).toUpperCase() + role.slice(1)}
            </option>
          ))}
        </select>
      </label>

      <div className="flex gap-2">
        <button
          type="submit"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Apply search
        </button>
        {params.q ? (
          <button
            type="button"
            className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
            onClick={() => updateParams({ q: undefined })}
          >
            Clear search
          </button>
        ) : null}
      </div>
    </form>
  );
}
