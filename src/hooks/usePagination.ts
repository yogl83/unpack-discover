import { useSearchParams } from "react-router-dom";
import { useCallback, useMemo } from "react";

const PAGE_SIZE = 25;

export function usePagination() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const setPage = useCallback(
    (newPage: number) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (newPage <= 1) next.delete("page");
        else next.set("page", String(newPage));
        return next;
      });
    },
    [setSearchParams]
  );

  const totalPages = useCallback(
    (count: number) => Math.max(1, Math.ceil(count / PAGE_SIZE)),
    []
  );

  return useMemo(
    () => ({ page, from, to, setPage, totalPages, pageSize: PAGE_SIZE }),
    [page, from, to, setPage, totalPages]
  );
}
